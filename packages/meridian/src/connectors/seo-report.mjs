import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { googleEnvStatus } from './google-auth.mjs';
import { collectGsc } from './gsc.mjs';
import { collectBing } from './bing.mjs';
import { collectGa4 } from './ga4.mjs';
import { collectPagespeed } from './pagespeed.mjs';
import { runMeridian } from '../orchestrator.mjs';
import { writeCommandBrief } from './command-brief.mjs';

/**
 * On-demand SEO report automation.
 *
 * Each request:
 *  1. Authenticate to Google (OAuth refresh = "login") + Bing (API key)
 *  2. Pull live Search Console / Bing / GA4 / PageSpeed data
 *  3. Verify live site technical SEO (verify-seo-live + Meridian crawl)
 *  4. Emit one Command Brief HTML/JSON/MD report
 *
 * This uses official APIs — not browser password scraping of search-console.google.com
 * (fragile / ToS-risky). OAuth once via: npm run meridian:oauth
 */

function runNodeJson(args, { cwd } = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, args, {
      cwd: cwd || process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.on('close', (code) => {
      let json = null;
      const trimmed = stdout.trim();
      // verify-seo-live --json prints JSON as last stdout block
      const start = trimmed.lastIndexOf('{');
      if (start >= 0) {
        try {
          json = JSON.parse(trimmed.slice(start));
        } catch {
          json = null;
        }
      }
      resolvePromise({ ok: code === 0, code, stdout, stderr, json });
    });
  });
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * @param {object} profile
 * @param {{
 *   outDir?: string,
 *   windowDays?: number,
 *   topN?: number,
 *   theme?: string,
 *   skipScan?: boolean,
 *   skipLiveVerify?: boolean,
 *   skipPsi?: boolean,
 * }} [opts]
 */
export async function runSeoReport(profile, opts = {}) {
  const secretsPath = hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const started = Date.now();
  const steps = [];

  const google = googleEnvStatus();
  const bingKey = !!(process.env.MERIDIAN_BING_API_KEY || '').trim();
  const auth = {
    google: google.ok
      ? { ok: true, method: 'oauth_refresh', message: 'Google OAuth refresh token ready (GSC + GA4)' }
      : {
          ok: false,
          method: 'oauth_refresh',
          message: `Missing ${google.missing.join(', ')} — run: npm run meridian:oauth`,
          missing: google.missing,
        },
    bing: bingKey
      ? { ok: true, method: 'api_key', message: 'Bing Webmaster API key ready' }
      : {
          ok: false,
          method: 'api_key',
          message: 'Set MERIDIAN_BING_API_KEY (Bing Webmaster → Settings → API Access)',
        },
    secretsFile: secretsPath,
  };
  steps.push({
    id: 'authenticate',
    ok: auth.google.ok || auth.bing.ok,
    message: `Google ${auth.google.ok ? 'OK' : 'auth_required'} · Bing ${auth.bing.ok ? 'OK' : 'auth_required'}`,
  });

  // 1) Live technical verify against production URL
  let liveVerify = null;
  if (opts.skipLiveVerify !== true) {
    const envFlag = /preprod|justxsystems/i.test(profile.origin || '') ? 'preprod' : 'prod';
    const v = await runNodeJson(['scripts/verify-seo-live.mjs', '--env', envFlag, '--json'], {
      cwd: process.cwd(),
    });
    liveVerify = v.json || {
      ok: v.ok,
      failed: v.ok ? 0 : 1,
      failures: v.ok ? [] : [v.stderr.slice(0, 400) || 'verify-seo-live failed'],
      passes: [],
      warningMessages: [],
    };
    steps.push({
      id: 'live-verify',
      ok: liveVerify.ok !== false,
      message: liveVerify.ok
        ? `Live verify OK · ${liveVerify.passed ?? 0} checks`
        : `Live verify FAILED · ${liveVerify.failed ?? 0} · ${(liveVerify.failures || []).slice(0, 2).join('; ')}`,
    });
    await writeFile(resolve(outDir, 'seo-live-verify.json'), JSON.stringify(liveVerify, null, 2), 'utf8');
  } else {
    steps.push({ id: 'live-verify', ok: true, message: 'skipped', status: 'skipped' });
  }

  // 2) Full Meridian scan (technical crawl + connector shell) — fresh report-latest
  let scan = null;
  if (opts.skipScan !== true) {
    try {
      scan = await runMeridian(profile, { outDir });
      steps.push({
        id: 'meridian-scan',
        ok: scan?.ok !== false,
        message: `Meridian score ${scan?.report?.scorecard?.overall ?? '—'} ${scan?.report?.scorecard?.grade || ''}`,
      });
    } catch (e) {
      steps.push({ id: 'meridian-scan', ok: false, message: String(e.message || e) });
    }
  } else {
    steps.push({ id: 'meridian-scan', ok: true, message: 'skipped (using cached report-latest)', status: 'skipped' });
  }

  // 3) Explicit fresh pulls (even if scan already ran connectors — guarantees this request's window)
  const windowDays = opts.windowDays;
  const topN = opts.topN;
  const [gsc, bing, ga4, pagespeed] = await Promise.all([
    collectGsc(profile, { windowDays, topN, comparePrevious: true }),
    collectBing(profile, { topN }),
    collectGa4(profile).catch((e) => ({
      id: 'ga4',
      status: 'error',
      message: String(e.message || e),
      data: {},
    })),
    opts.skipPsi === true
      ? Promise.resolve({ id: 'pagespeed', status: 'skipped', message: 'skipped', data: {} })
      : collectPagespeed(profile),
  ]);
  steps.push({ id: 'gsc-pull', ok: gsc.status === 'ok', message: gsc.message });
  steps.push({ id: 'bing-pull', ok: bing.status === 'ok' || bing.status === 'skipped', message: bing.message });
  steps.push({ id: 'ga4-pull', ok: ga4.status === 'ok' || ga4.status === 'skipped', message: ga4.message });
  steps.push({
    id: 'pagespeed-pull',
    ok: pagespeed.status === 'ok' || pagespeed.status === 'skipped',
    message: pagespeed.message,
  });

  await writeFile(
    resolve(outDir, 'seo-report-sources.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        auth,
        gsc: { status: gsc.status, message: gsc.message, window: gsc.data?.window, totals: gsc.data?.totals },
        bing: { status: bing.status, message: bing.message, totals: bing.data?.totals },
        ga4: { status: ga4.status, message: ga4.message },
        pagespeed: { status: pagespeed.status, message: pagespeed.message, score: pagespeed.data?.performanceScore },
        liveVerify: liveVerify
          ? { ok: liveVerify.ok, passed: liveVerify.passed, failed: liveVerify.failed, failures: liveVerify.failures }
          : null,
      },
      null,
      2
    ),
    'utf8'
  );

  // 4) One-spot Command Brief (final report)
  const report = (await readJson(resolve(outDir, 'report-latest.json'))) || scan?.report || null;
  const brief = await writeCommandBrief(profile, {
    outDir,
    windowDays,
    topN,
    theme: opts.theme,
    sections: opts.sections,
    title: opts.title || 'SEO Verification Report',
    gsc,
    bing,
    ga4,
    report,
    liveVerify,
    pagespeed,
  });
  steps.push({ id: 'command-brief', ok: brief.ok !== false, message: brief.message });

  // Stable alias paths for "latest SEO report"
  try {
    const html = await readFile(resolve(outDir, 'command-brief.html'), 'utf8');
    await writeFile(resolve(outDir, 'seo-report-latest.html'), html, 'utf8');
  } catch {
    /* brief write failed */
  }

  const durationMs = Date.now() - started;
  const allAuthMissing = !auth.google.ok && !auth.bing.ok;
  const payload = {
    generatedAt: new Date().toISOString(),
    durationMs,
    origin: profile.origin,
    auth,
    steps,
    liveVerify,
    sources: {
      gsc: gsc.status,
      bing: bing.status,
      ga4: ga4.status,
      pagespeed: pagespeed.status,
    },
    scorecard: report?.scorecard || null,
    briefStatus: brief.data?.briefStatus,
    insights: brief.data?.insights || [],
    paths: {
      html: resolve(outDir, 'command-brief.html'),
      latest: resolve(outDir, 'seo-report-latest.html'),
      json: resolve(outDir, 'command-brief.json'),
      md: resolve(outDir, 'command-brief.md'),
      sources: resolve(outDir, 'seo-report-sources.json'),
      liveVerify: resolve(outDir, 'seo-live-verify.json'),
    },
  };

  await writeFile(resolve(outDir, 'seo-report.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'seo-report.md'),
    [
      `# SEO Verification Report — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt} · ${durationMs}ms`,
      '',
      `## Authentication (API login — not browser scraping)`,
      '',
      `- Google OAuth: **${auth.google.ok ? 'OK' : 'REQUIRED'}** — ${auth.google.message}`,
      `- Bing API key: **${auth.bing.ok ? 'OK' : 'REQUIRED'}** — ${auth.bing.message}`,
      '',
      `## Live site verify`,
      '',
      liveVerify
        ? `- **${liveVerify.ok ? 'PASS' : 'FAIL'}** · passed ${liveVerify.passed ?? 0} · failed ${liveVerify.failed ?? 0}`
        : '- skipped',
      ...(liveVerify?.failures || []).slice(0, 8).map((f) => `  - ✗ ${f}`),
      '',
      `## Search data pulled this request`,
      '',
      `- GSC: **${gsc.status}** — ${gsc.message}`,
      `- Bing: **${bing.status}** — ${bing.message}`,
      `- GA4: **${ga4.status}** — ${ga4.message}`,
      `- PageSpeed: **${pagespeed.status}** — ${pagespeed.message}`,
      '',
      `## Open the full report`,
      '',
      `- HTML: \`${payload.paths.html}\``,
      `- Admin: SEO → Meridian → **Command Brief** / Generate SEO report`,
      '',
      `Re-run anytime: \`npm run seo:report\``,
      '',
    ].join('\n'),
    'utf8'
  );

  const verifyOk = liveVerify == null || liveVerify.ok !== false;
  const softAuth =
    process.env.MERIDIAN_CI_SOFT_AUTH === '1' || process.env.MERIDIAN_CI_SOFT_HARD === '1';
  // Full success needs at least one search connector; CI soft-auth allows verify-only green.
  const signalsOk = gsc.status === 'ok' || bing.status === 'ok';
  const ok = allAuthMissing
    ? softAuth && verifyOk
    : verifyOk && (signalsOk || report?.scorecard != null);

  return {
    ok,
    status: allAuthMissing ? 'auth_required' : ok ? 'ok' : 'degraded',
    message: allAuthMissing
      ? softAuth && verifyOk
        ? 'Live verify OK · GSC/Bing auth_required (set MERIDIAN_GOOGLE_* + MERIDIAN_BING_API_KEY in GitHub Actions secrets or run npm run meridian:oauth)'
        : 'SEO report needs Google OAuth and/or Bing API key — run npm run meridian:oauth / set MERIDIAN_BING_API_KEY'
      : `SEO report ready · GSC ${gsc.status} · Bing ${bing.status} · verify ${liveVerify?.ok === false ? 'FAIL' : 'OK'} · ${durationMs}ms`,
    data: payload,
    findings: [
      ...(brief.findings || []),
      ...(liveVerify?.ok === false
        ? [
            {
              code: 'SEO_LIVE_VERIFY_FAIL',
              severity: 'high',
              title: 'Live SEO verification failed',
              remediation: (liveVerify.failures || []).slice(0, 3).join('; ') || 'See seo-live-verify.json',
              owner: 'developer',
              pillar: 'technical',
            },
          ]
        : []),
    ],
  };
}
