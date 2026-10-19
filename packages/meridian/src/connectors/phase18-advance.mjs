import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { collectGsc } from './gsc.mjs';
import { collectGa4 } from './ga4.mjs';
import { loadGbpPulse } from './gbp-pulse.mjs';
import { writeMonthlyDigest } from './monthly-digest.mjs';
import { writeWeeklyDigest } from './weekly-digest.mjs';
import { writeQuarterlyDigest } from './quarterly-digest.mjs';
import { writeOpsCockpit } from './ops-cockpit.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';
import { advancePhase17 } from './phase17-advance.mjs';
import { advancePhase9 } from './phase9-advance.mjs';
import { fetchManual, meta } from '../lib/html.mjs';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function probeSameAs(origin) {
  try {
    const res = await fetchManual(`${origin}/`, { forceBody: true });
    const body = res.body || '';
    return { ok: /"sameAs"\s*:/i.test(body), robots: meta(body, 'robots'), status: res.status };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

/**
 * Phase 18 — Observatory (post-archive epoch).
 * Silent drift heal · GSC→GBP proxy · heartbeat. No new human SEO ladder.
 */
export async function advancePhase18(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  // 1) Fresh signals → cache
  const gsc = await collectGsc(profile);
  const ga4 = await collectGa4(profile);
  const prevCache = (await readJson(resolve(outDir, 'signal-cache.json'))) || {};
  const signalCache = {
    generatedAt: new Date().toISOString(),
    gsc: gsc.status === 'ok' ? gsc.data : prevCache.gsc || null,
    ga4: ga4.status === 'ok' ? ga4.data : prevCache.ga4 || null,
    pagespeed: prevCache.pagespeed || null,
  };
  await writeFile(resolve(outDir, 'signal-cache.json'), JSON.stringify(signalCache, null, 2), 'utf8');
  steps.push({
    id: 'signals',
    ok: gsc.status === 'ok' || ga4.status === 'ok',
    message: `GSC ${gsc.status} · GA4 ${ga4.status}`,
  });

  // 2) Ensure sitemap/orphan artefacts exist for monthly fill
  if (!(await fileExists(resolve(outDir, 'sitemap-health.json'))) && opts.skipHealth !== true) {
    try {
      const { crawlSitemapHealth } = await import('./sitemap-health.mjs');
      const health = await crawlSitemapHealth(profile, {
        outDir,
        limit: opts.healthLimit ?? profile.autopilot?.healthLimit ?? 80,
      });
      steps.push({ id: 'sitemap-health', ok: health.ok !== false, message: health.message });
    } catch (e) {
      steps.push({ id: 'sitemap-health', ok: true, message: `health skipped — ${String(e.message || e).slice(0, 80)}` });
    }
  }

  // 3) GBP pulse with GSC proxy (closes last monthly gap)
  const gbp = await loadGbpPulse(profile, { outDir, gscProxy: opts.gscProxy !== false });
  steps.push({ id: 'gbp-proxy', ok: gbp.ok !== false, message: gbp.message });

  // 4) Drift sensors
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const unlock = await assessUnlockReadiness(profile, { outDir });
  const sameAs = await probeSameAs(origin);
  const score = report?.scorecard?.overall ?? archive?.score?.overall ?? null;
  const unlockPct = unlock.data?.percent ?? archive?.unlockPercent ?? null;

  const drift = {
    scoreDrop: score != null && score < 97,
    unlockDrop: unlockPct != null && unlockPct < 100,
    sameAsLost: sameAs.ok === false,
    archiveBroken: archive?.sealed !== true && archive != null,
  };
  const needsHeal = drift.scoreDrop || drift.unlockDrop || drift.sameAsLost;
  steps.push({
    id: 'drift',
    ok: !needsHeal,
    message: needsHeal
      ? `Drift · scoreDrop=${drift.scoreDrop} unlockDrop=${drift.unlockDrop} sameAsLost=${drift.sameAsLost}`
      : `Stable · score ${score ?? '—'} · unlock ${unlockPct ?? '—'}% · sameAs ${sameAs.ok ? 'live' : '—'}`,
  });

  // 5) Silent heal via Phase 17 archive when drifted
  let heal = { ok: true, status: 'skipped', message: 'heal skipped — stable' };
  if (needsHeal && opts.skipHeal !== true) {
    heal = await advancePhase17(profile, {
      outDir,
      apply: opts.apply !== false,
      skipScan: false,
      skipPhase16: false,
      skipPhase15: true,
      syncGh: opts.syncGh === true,
    });
    steps.push({ id: 'heal', ok: heal.ok !== false, message: heal.message });
  } else {
    steps.push({ id: 'heal', ok: true, message: heal.message });
  }

  const scan = {
    report: (await readJson(resolve(outDir, 'report-latest.json'))) || report || { scorecard: {}, findings: [] },
    ok: true,
    hardFailCount: 0,
    paths: { outDir },
  };
  if (heal.data?.score?.overall != null) {
    scan.report.scorecard = { ...scan.report.scorecard, ...heal.data.score };
  }

  const weekly = await writeWeeklyDigest(profile, { scan, actions: [], outDir });
  const monthly = await writeMonthlyDigest(profile, { scan, actions: [], outDir, gbpPulse: gbp.data });
  const quarterly = await writeQuarterlyDigest(profile, {
    outDir,
    scan,
    actions: [{ id: 'unlock-readiness', ...unlock }],
  });
  const cockpit = await writeOpsCockpit(profile, {
    outDir,
    scan,
    actions: [],
    unlock: unlock.data,
    scorecard: scan.report?.scorecard,
  });
  steps.push({ id: 'digests', ok: true, message: `${weekly.message} · ${monthly.message}` });

  const finalScore = scan.report?.scorecard || {};
  const observatory = {
    generatedAt: new Date().toISOString(),
    phase: '18',
    epoch: 'post-archive',
    origin,
    score: { overall: finalScore.overall, grade: finalScore.grade },
    unlockPercent: unlock.data?.percent ?? null,
    sameAsLive: sameAs.ok === true,
    drift,
    healed: needsHeal && heal.ok !== false,
    gbp: {
      complete: !!gbp.data?.complete,
      source: gbp.data?.source || null,
      clicks: gbp.data?.clicks ?? null,
      directions: gbp.data?.directions ?? null,
    },
    monthly: {
      filledAuto: monthly.data?.filledAuto,
      fillable: monthly.data?.fillable,
      alwaysManual: monthly.data?.alwaysManual?.length ?? 0,
    },
    signals: {
      gscClicks: signalCache.gsc?.totals?.clicks ?? signalCache.gsc?.sampleTotals?.clicks ?? null,
      ga4Organic: signalCache.ga4?.organic?.sessions ?? null,
    },
    forever: ['npm run meridian:observe', 'npm run meridian:guard', 'Monday meridian-autopilot.yml'],
  };

  await writeFile(
    resolve(outDir, 'phase18-ops.html'),
    '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Phase 18</title></head><body><p>Phase 18 writing…</p></body></html>',
    'utf8'
  );

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 18 Observatory — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#01040a;--card:#081018;--line:#243041;--text:#e8eef5;--muted:#8b9aab;--accent:#67e8f9;--ok:#3dd68c;--warn:#e6b84d;--bad:#f07178}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(1000px 500px at 70% -15%,#0c3a48,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:980px;margin:0 auto}h1{margin:0 0 .25rem;font-size:1.55rem;letter-spacing:-.02em}.sub{color:var(--muted);margin:0 0 1.2rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.25rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:.75rem}
a.primary{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.5rem .85rem;border-radius:8px;background:var(--accent);color:#042018;font-weight:650;text-decoration:none;font-size:.84rem}
.ok{color:var(--ok)}.warn{color:var(--warn)}ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
.banner{border:1px solid #1a4a55;background:linear-gradient(90deg,#0a2830,#081018);border-radius:12px;padding:1rem 1.15rem;margin-bottom:1rem}
code{font-size:.78rem;background:#1a2636;padding:.1rem .35rem;border-radius:4px}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${needsHeal ? 'warn' : 'ok'}">${needsHeal ? 'DRIFT → HEAL ENGAGED' : 'OBSERVATORY NOMINAL'}</strong>
  <p class="sub" style="margin:.35rem 0 0">Post-archive epoch · GSC→GBP proxy · silent heal · forever <code>npm run meridian:observe</code></p>
</div>
<h1>Phase 18 — Observatory</h1>
<p class="sub">${esc(origin)} · no new SEO ladder · sensors + auto-heal only</p>
<div class="hero">
  <div class="metric"><span class="sub">Score</span><b class="ok">${esc(finalScore.overall ?? '—')} ${esc(finalScore.grade || '')}</b></div>
  <div class="metric"><span class="sub">Unlock</span><b class="ok">${esc(unlock.data?.percent ?? '—')}%</b></div>
  <div class="metric"><span class="sub">sameAs</span><b class="${sameAs.ok ? 'ok' : 'warn'}">${sameAs.ok ? 'LIVE' : '—'}</b></div>
  <div class="metric"><span class="sub">GBP source</span><b>${esc(gbp.data?.source || '—')}</b></div>
  <div class="metric"><span class="sub">Monthly</span><b>${esc(monthly.data?.filledAuto ?? '—')}/${esc(monthly.data?.fillable ?? '—')}</b></div>
  <div class="metric"><span class="sub">Manual left</span><b class="${(monthly.data?.alwaysManual?.length ?? 0) === 0 ? 'ok' : 'warn'}">${esc(monthly.data?.alwaysManual?.length ?? 0)}</b></div>
</div>
<div class="card">
  <a class="primary" href="phase17-ops.html">Phase 17 archive</a>
  <a class="primary" href="phase16-ops.html">Phase 16</a>
  <a class="primary" href="phase9-ops.html">Phase 9</a>
  <a class="primary" href="gbp-pulse.md">GBP pulse</a>
  <a class="primary" href="observatory.json">Observatory JSON</a>
  <a class="primary" href="monthly-digest.md">Monthly</a>
  <a class="primary" href="${esc(origin)}/admin" target="_blank" rel="noreferrer">Admin</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Sensors</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Forever commands</h2>
  <ul>
    <li><code>npm run meridian:observe</code> — this pack (default weekly top)</li>
    <li><code>npm run meridian:guard</code> — full archive re-seal when you want</li>
    <li>GitHub <code>meridian-autopilot.yml</code> Mondays</li>
    <li>Optional: paste true GBP Insights over proxy numbers in <code>gbp-pulse.json</code></li>
  </ul>
</div>
</div></body></html>`;

  const payload = {
    ...observatory,
    steps,
    digests: {
      weekly: weekly.message,
      monthly: monthly.message,
      quarterly: quarterly.message,
      cockpit: cockpit.message,
      heal: heal.message,
    },
  };

  const md = [
    `# Phase 18 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Observatory **${needsHeal ? 'healed' : 'nominal'}** · Score **${finalScore.overall ?? '—'}** · Unlock **${unlock.data?.percent ?? '—'}%**`,
    `- GBP **${gbp.data?.source || '—'}** · monthly ${monthly.data?.filledAuto}/${monthly.data?.fillable} · manual ${monthly.data?.alwaysManual?.length ?? 0}`,
    `- sameAs ${sameAs.ok ? 'live' : 'check'} · GSC clicks ${observatory.signals.gscClicks ?? '—'}`,
    '',
    'Open **`phase18-ops.html`**. Forever: `npm run meridian:observe`.',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'observatory.json'), JSON.stringify(observatory, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase18-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase18-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase18-ops.html'), html, 'utf8');

  const p9 = await advancePhase9(profile, {
    outDir,
    scan,
    actions: [
      { id: 'phase18-advance', ok: true, message: `Phase 18 observatory · ${needsHeal ? 'healed' : 'nominal'}`, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  payload.digests.phase9 = p9.message;
  await writeFile(resolve(outDir, 'phase18-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '18'),
    { id: '18', name: 'Phase 18 Observatory', file: 'phase18-ops.html', kind: 'html', ready: true, href: 'phase18-ops.html' },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  if (!(await fileExists(resolve(outDir, 'phase18-ops.html')))) {
    /* written */
  }

  return {
    ok: true,
    status: needsHeal && heal.ok === false ? 'degraded' : 'ok',
    message: `Phase 18 observatory · ${needsHeal ? 'healed' : 'nominal'} · GBP ${gbp.data?.source || '—'} · monthly ${monthly.data?.filledAuto}/${monthly.data?.fillable}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase18-ops.html'),
        md: resolve(outDir, 'phase18-advance.md'),
        observatory: resolve(outDir, 'observatory.json'),
      },
    },
    findings: [
      {
        code: 'PHASE18_OBSERVATORY',
        severity: 'low',
        title: needsHeal ? 'Phase 18 observatory healed drift' : 'Phase 18 observatory nominal',
        remediation: 'Keep npm run meridian:observe on cron; optional GBP Insights paste overrides GSC proxy.',
        owner: 'developer',
        pillar: 'ops',
      },
    ],
  };
}
