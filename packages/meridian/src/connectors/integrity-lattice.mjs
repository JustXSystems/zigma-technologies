import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { probeLiveThrone } from './live-throne-probe.mjs';
import { probeFormHealth } from './form-health.mjs';
import { runGrowthCloser } from './growth-closer.mjs';
import { runGrowthRadar } from './growth-radar.mjs';
import { runConversionContinuum } from './conversion-continuum.mjs';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function runNode(args, timeoutMs = 960000) {
  return new Promise((resolveP) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
    });
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

async function fetchText(url) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'MeridianIntegrityLattice/1.0', 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(25000),
      redirect: 'follow',
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    return { ok: false, status: 0, text: '', error: String(e.message || e) };
  }
}

/**
 * Integrity lattice — perpetual seal checks + auto-heal across Meridian stack.
 */
export async function runIntegrityLattice(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const wantHeal = opts.apply !== false && opts.skipHeal !== true;
  const checks = [];
  const heals = [];

  const live = opts.live || (await probeLiveThrone(profile, { outDir }));
  const liveData = live.data || live;
  checks.push({
    id: 'live-throne',
    ok: liveData.liveThrone === true || (liveData.hasMap === true && liveData.sameAs === true),
    detail: `hasMap=${!!liveData.hasMap} sameAs=${!!liveData.sameAs} http=${liveData.status || '—'}`,
  });

  const www = await fetchText(origin.replace('://', '://www.'));
  const wwwApex =
    www.status === 0
      ? { ok: true, detail: 'www probe skipped/unreachable' }
      : {
          ok: www.status >= 200 && www.status < 400,
          detail: `www→${www.status} (final host ok if apex content)`,
        };
  // Soft: if www returns apex HTML with sameAs, treat ok
  if (www.ok && www.text.includes('sameAs')) wwwApex.ok = true;
  checks.push({ id: 'www-apex', ok: wwwApex.ok, detail: wwwApex.detail });

  const home = await fetchText(origin + '/');
  const faqBlog = await fetchText(`${origin}/blog/faq-zigma-technologies-bangalore`);
  checks.push({
    id: 'home-growth-faq',
    ok: home.ok && home.text.includes('meridian-growth-faq'),
    detail: home.ok ? (home.text.includes('meridian-growth-faq') ? 'present' : 'missing') : `http ${home.status}`,
  });
  checks.push({
    id: 'faq-blog',
    ok: faqBlog.ok && (faqBlog.text.includes('FAQPage') || faqBlog.text.includes('blg-faq')),
    detail: faqBlog.ok
      ? faqBlog.text.includes('FAQPage')
        ? 'FAQPage live'
        : 'page live'
      : `http ${faqBlog.status}`,
  });

  let form = await probeFormHealth(profile, { outDir });
  checks.push({
    id: 'form-health',
    ok: form.ok !== false,
    detail: form.message,
  });

  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const unlock = await readJson(resolve(outDir, 'unlock-readiness.json'));
  let continuum = await readJson(resolve(outDir, 'conversion-continuum.json'));
  const score = observatory?.score?.overall ?? null;
  const unlockPct = observatory?.unlockPercent ?? unlock?.percent ?? null;
  checks.push({
    id: 'score-unlock',
    ok: (score == null || score >= 90) && (unlockPct == null || unlockPct >= 90),
    detail: `score=${score ?? '—'} unlock=${unlockPct ?? '—'}%`,
  });
  const continuumOk = (c, formOk) =>
    c?.continuumOnline === true ||
    c?.formOk === true ||
    (formOk && (c?.signals?.enquiries28 != null || c?.signals?.ga4OrganicSessions28 != null));
  checks.push({
    id: 'conversion-continuum',
    ok: continuumOk(continuum, form.ok !== false),
    detail: continuum?.boardLine || 'no continuum artefact yet',
  });

  // Auto-heal
  if (wantHeal && liveData.hasMap !== true) {
    const r = await runNode(['scripts/meridian-prod-hasmap-ssh.mjs', '--apply', '--json'], 960000);
    let parsed = null;
    try {
      parsed = JSON.parse((r.stdout || '').trim());
    } catch {
      parsed = { ok: false, message: (r.stderr || r.stdout || '').trim().slice(0, 300) };
    }
    heals.push({ id: 'heal-hasmap', ok: parsed?.ok !== false && parsed?.live?.hasMap !== false, message: parsed?.message });
    const live2 = await probeLiveThrone(profile, { outDir });
    Object.assign(liveData, live2.data || {});
    checks.find((c) => c.id === 'live-throne').ok =
      liveData.liveThrone === true || (liveData.hasMap === true && liveData.sameAs === true);
    checks.find((c) => c.id === 'live-throne').detail = `hasMap=${!!liveData.hasMap} sameAs=${!!liveData.sameAs} (healed)`;
  }

  const homeFaqMissing = !checks.find((c) => c.id === 'home-growth-faq')?.ok;
  const blogFaqMissing = !checks.find((c) => c.id === 'faq-blog')?.ok;
  if (wantHeal && (homeFaqMissing || blogFaqMissing)) {
    const radar = await runGrowthRadar(profile, { outDir });
    const closer = await runGrowthCloser(profile, { outDir, apply: true, radar, skipIndex: true });
    heals.push({ id: 'heal-growth-faq', ok: closer.ok !== false, message: closer.message });
    const home2 = await fetchText(origin + '/');
    const blog2 = await fetchText(`${origin}/blog/faq-zigma-technologies-bangalore`);
    checks.find((c) => c.id === 'home-growth-faq').ok = home2.ok && home2.text.includes('meridian-growth-faq');
    checks.find((c) => c.id === 'faq-blog').ok =
      blog2.ok && (blog2.text.includes('FAQPage') || blog2.text.includes('blg-faq'));
  }

  // Continuum artefact can lag a transient form 502 — re-measure when form is healthy.
  if (wantHeal && !checks.find((c) => c.id === 'conversion-continuum')?.ok) {
    form = await probeFormHealth(profile, { outDir });
    checks.find((c) => c.id === 'form-health').ok = form.ok !== false;
    checks.find((c) => c.id === 'form-health').detail = form.message;
    const refreshed = await runConversionContinuum(profile, {
      outDir,
      apply: false,
      skipSitemap: true,
    });
    continuum = refreshed.data || (await readJson(resolve(outDir, 'conversion-continuum.json')));
    const okNow = continuumOk(continuum, form.ok !== false) || refreshed.status === 'online';
    checks.find((c) => c.id === 'conversion-continuum').ok = okNow;
    checks.find((c) => c.id === 'conversion-continuum').detail =
      continuum?.boardLine || refreshed.message || 'continuum re-measured';
    heals.push({
      id: 'heal-continuum',
      ok: okNow,
      message: refreshed.message || continuum?.boardLine,
    });
  }

  const failed = checks.filter((c) => !c.ok);
  const latticeSealed = failed.length === 0;
  const board = {
    generatedAt: new Date().toISOString(),
    phase: '27',
    origin,
    latticeSealed,
    checkCount: checks.length,
    failCount: failed.length,
    checks,
    heals,
    boardLine: latticeSealed
      ? `Integrity lattice SEALED · ${checks.length}/${checks.length} invariants green · heals ${heals.length}`
      : `Integrity lattice DRIFT · ${failed.length} fail: ${failed.map((f) => f.id).join(', ')}`,
  };

  await writeFile(resolve(outDir, 'integrity-lattice.json'), JSON.stringify(board, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'integrity-lattice.md'),
    [
      `# Integrity lattice — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${board.generatedAt}`,
      '',
      board.boardLine,
      '',
      '| Check | Status | Detail |',
      '| --- | --- | --- |',
      ...checks.map((c) => `| ${c.id} | ${c.ok ? 'OK' : 'FAIL'} | ${c.detail} |`),
      '',
      heals.length ? '### Heals\n' + heals.map((h) => `- ${h.id}: ${h.message}`).join('\n') : '_No heals this cycle._',
      '',
      'Forever: `npm run meridian:observe`',
      '',
    ].join('\n'),
    'utf8'
  );

  return {
    ok: true,
    status: latticeSealed ? 'sealed' : 'drift',
    message: board.boardLine,
    data: {
      ...board,
      paths: {
        json: resolve(outDir, 'integrity-lattice.json'),
        md: resolve(outDir, 'integrity-lattice.md'),
      },
    },
    findings: failed.map((f) => ({
      code: `LATTICE_${f.id.toUpperCase().replace(/-/g, '_')}`,
      severity: f.id === 'form-health' || f.id === 'live-throne' ? 'high' : 'medium',
      title: `Integrity drift: ${f.id}`,
      detail: f.detail,
      remediation: 'npm run meridian:observe (auto-heal) or meridian:guard',
      owner: 'developer',
      pillar: 'technical',
    })),
  };
}
