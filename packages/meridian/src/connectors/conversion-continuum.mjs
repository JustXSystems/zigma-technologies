import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { probeFormHealth } from './form-health.mjs';
import { collectGa4 } from './ga4.mjs';
import { submitSitemap } from './gsc-act.mjs';
import { submitBingSitemap } from './bing-act.mjs';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function sh(cmd, args, timeoutMs = 120000) {
  return new Promise((resolveP) => {
    const child = spawn(cmd, args, { cwd: process.cwd(), shell: false, env: process.env });
    let stdout = '';
    let stderr = '';
    const t = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }, timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      clearTimeout(t);
      resolveP({ code, stdout, stderr });
    });
  });
}

async function fetchEnquiryYield() {
  const HOST = process.env.MERIDIAN_PROD_SSH || 'deploy@200.234.45.106';
  const APP = process.env.MERIDIAN_PROD_APP || '/var/www/zigma-technologies';
  const LOCAL = resolve(process.cwd(), 'scripts/_remote-enquiry-yield.mjs');
  const REMOTE = '/tmp/meridian-enquiry-yield.mjs';

  const ping = await sh('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', HOST, 'echo ok'], 30000);
  if (ping.code !== 0) {
    // Local DB fallback
    const r = await sh(process.execPath, ['scripts/_remote-enquiry-yield.mjs'], 60000);
    try {
      return JSON.parse((r.stdout || '').trim());
    } catch {
      return { ok: false, message: 'SSH + local enquiry yield unavailable', enquiries28: null };
    }
  }
  const scp = await sh('scp', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', LOCAL, `${HOST}:${REMOTE}`], 60000);
  if (scp.code !== 0) {
    return { ok: false, message: (scp.stderr || 'scp failed').trim().slice(0, 300), enquiries28: null };
  }
  const run = await sh(
    'ssh',
    ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', HOST, `cd ${APP} && NODE_PATH=./node_modules node ${REMOTE}`],
    60000
  );
  try {
    return JSON.parse((run.stdout || '').trim());
  } catch {
    return {
      ok: false,
      message: (run.stderr || run.stdout || 'enquiry yield failed').trim().slice(0, 400),
      enquiries28: null,
    };
  }
}

/**
 * Conversion continuum — SEO → enquiry yield board (no spreadsheet ritual).
 */
export async function runConversionContinuum(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');

  const form = await probeFormHealth(profile, { outDir });
  let ga4 = await collectGa4(profile);
  const cache = await readJson(resolve(outDir, 'signal-cache.json'));
  if (ga4.status !== 'ok' && cache?.ga4) {
    ga4 = { status: 'ok', message: 'GA4 from signal-cache', data: cache.ga4 };
  }
  const gscClicks = cache?.gsc?.totals?.clicks ?? cache?.gsc?.clicks ?? null;
  const yieldDb = opts.skipYield !== true ? await fetchEnquiryYield() : { ok: true, enquiries28: null, skipped: true };

  const organicSessions = ga4.data?.organic?.sessions ?? ga4.data?.organic?.sessions ?? null;
  const organicKeyEvents = ga4.data?.organic?.keyEvents ?? null;
  const enquiries28 = yieldDb.enquiries28 ?? null;
  const enquiries7 = yieldDb.enquiries7 ?? null;

  const yieldRate =
    organicSessions && enquiries28 != null && organicSessions > 0
      ? Math.round((enquiries28 / organicSessions) * 1000) / 10
      : null;
  const keyEventRate =
    organicSessions && organicKeyEvents != null && organicSessions > 0
      ? Math.round((organicKeyEvents / organicSessions) * 1000) / 10
      : null;

  const formOk = form.ok !== false && !form.findings?.some((f) => f.severity === 'high');

  let gscMap = { ok: true, status: 'skipped', message: 'sitemap submit skipped' };
  let bingMap = { ok: true, status: 'skipped', message: 'bing submit skipped' };
  if (opts.skipSitemap !== true && opts.apply !== false) {
    gscMap = await submitSitemap(profile);
    bingMap = await submitBingSitemap(profile);
  }

  const continuumOnline = formOk && (ga4.status === 'ok' || ga4.status === 'auth_required' || !!cache?.ga4);

  const board = {
    generatedAt: new Date().toISOString(),
    phase: '26',
    origin,
    formOk,
    continuumOnline,
    signals: {
      gscClicks28: gscClicks,
      ga4OrganicSessions28: organicSessions,
      ga4OrganicKeyEvents28: organicKeyEvents,
      enquiries28,
      enquiries7,
      openPipeline: yieldDb.openPipeline ?? null,
      yieldRatePct: yieldRate,
      keyEventRatePct: keyEventRate,
    },
    form: { message: form.message, checks: form.data?.checks || form.checks },
    ga4: { status: ga4.status, message: ga4.message },
    yield: yieldDb,
    sitemap: { gsc: gscMap, bing: bingMap },
    boardLine: continuumOnline
      ? `Conversion continuum ONLINE · enquiries 28d=${enquiries28 ?? '—'} · organic ${organicSessions ?? '—'} · yield ${yieldRate ?? '—'}% · form ${formOk ? 'OK' : 'ALERT'}`
      : `Conversion continuum WATCHING · form ${formOk ? 'OK' : 'ALERT'} · ${ga4.message || 'GA4'}`,
  };

  await writeFile(resolve(outDir, 'conversion-continuum.json'), JSON.stringify(board, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'conversion-continuum.md'),
    [
      `# Conversion continuum — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${board.generatedAt}`,
      '',
      board.boardLine,
      '',
      '| Signal | 28d |',
      '| --- | ---: |',
      `| GSC clicks | ${gscClicks ?? '—'} |`,
      `| GA4 organic sessions | ${organicSessions ?? '—'} |`,
      `| GA4 organic key events | ${organicKeyEvents ?? '—'} |`,
      `| Site enquiries | ${enquiries28 ?? '—'} |`,
      `| Enquiries (7d) | ${enquiries7 ?? '—'} |`,
      `| Open pipeline | ${yieldDb.openPipeline ?? '—'} |`,
      `| Yield (enq / organic sess) | ${yieldRate != null ? yieldRate + '%' : '—'} |`,
      '',
      `- Form health: ${form.message}`,
      `- GSC sitemap: ${gscMap.message}`,
      `- Bing sitemap: ${bingMap.message}`,
      '',
      'Forever: `npm run meridian:observe` — no CRM export ritual.',
      '',
    ].join('\n'),
    'utf8'
  );

  return {
    ok: formOk && yieldDb.ok !== false,
    status: continuumOnline ? 'online' : 'watching',
    message: board.boardLine,
    data: {
      ...board,
      paths: {
        json: resolve(outDir, 'conversion-continuum.json'),
        md: resolve(outDir, 'conversion-continuum.md'),
      },
    },
    findings: form.findings || [],
  };
}
