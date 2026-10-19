import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase28 } from './phase28-advance.mjs';
import { runAutonomicChronos } from './autonomic-chronos.mjs';
import { assessHumanDebt } from './human-debt.mjs';
import { syncSeoGuideCanon } from './canon-sync.mjs';
import { syncAppendixLedger } from './ledger-sync.mjs';
import { advancePhase9 } from './phase9-advance.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';
import { probeLiveThrone } from './live-throne-probe.mjs';

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

/**
 * Phase 29 — Autonomic Chronos (Temporal Nexus).
 * Continuity stays locked; chronos tracks yield/SEO deltas and flags regressions automatically.
 */
export async function advancePhase29(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p28 = { ok: true, message: 'phase28 skipped', data: {} };
  if (opts.skipContinuity !== true) {
    p28 = await advancePhase28(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
      skipLatticeHeal: opts.skipLatticeHeal === true,
      skipLattice: opts.skipLattice === true,
      skipObserve: opts.skipObserve === true,
      skipDesk: opts.skipDesk === true,
      skipPresence: opts.skipPresence === true,
      skipThrone: opts.skipThrone === true,
      skipHorizon: opts.skipHorizon === true,
      skipCourier: opts.skipCourier === true,
      skipForge: opts.skipForge === true,
      skipHotpatch: opts.skipHotpatch === true,
      skipCloser: opts.skipCloser === true,
      skipIndex: opts.skipIndex === true,
      skipYield: opts.skipYield === true,
      skipSitemap: opts.skipSitemap === true,
      skipDeploy: opts.skipDeploy !== false,
      triggerDeploy: opts.triggerDeploy === true,
      ack: opts.ack === true,
      parkGbp: opts.parkGbp !== false,
      gscProxy: opts.gscProxy !== false,
    });
    steps.push({ id: 'phase28', ok: p28.ok !== false, message: p28.message });
  }

  const live = await probeLiveThrone(profile, { outDir });
  steps.push({ id: 'live-probe', ok: live.ok !== false, message: live.message });

  const chronos = await runAutonomicChronos(profile, { outDir });
  steps.push({ id: 'autonomic-chronos', ok: chronos.ok !== false, message: chronos.message });

  const debt = await assessHumanDebt(profile, { outDir, parkGbp: true });
  const unlock = await assessUnlockReadiness(profile, { outDir });
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const continuum = await readJson(resolve(outDir, 'conversion-continuum.json'));
  const continuity = await readJson(resolve(outDir, 'continuity-charter.json'));
  const score = observatory?.score || archive?.score || report?.scorecard || {};
  const sealed = live.data?.liveThrone === true;
  const armed = chronos.status === 'armed';
  const pulse = chronos.data?.point || {};

  const temporal = {
    generatedAt: new Date().toISOString(),
    phase: '29',
    origin,
    liveThrone: sealed,
    chronosArmed: armed,
    alertCount: chronos.data?.alertCount ?? 0,
    pointCount: chronos.data?.pointCount ?? 0,
    continuityLocked: !!continuity?.continuityLocked,
    continuumOnline: !!continuum?.continuumOnline,
    enquiries28: pulse.enquiries28 ?? continuum?.signals?.enquiries28 ?? null,
    boardLine: chronos.data?.boardLine || chronos.message,
  };
  await writeFile(resolve(outDir, 'temporal-nexus.json'), JSON.stringify(temporal, null, 2), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 29 Autonomic Chronos — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#01040a;--card:#081018;--line:#1a2838;--text:#e8eef8;--muted:#8799ad;--accent:#fbbf24;--ok:#2fd67b;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(1000px 520px at 20% -10%,#2a2010,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.6rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem}
.banner{border:1px solid ${armed ? '#3a3020' : '#5a3030'};background:linear-gradient(105deg,${armed ? '#1a160c' : '#2a1010'},#081018 55%);border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.2rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#122030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#1a1200;border:0}
.ok{color:var(--ok)}.warn{color:var(--warn)}code{font-size:.78rem;background:#122030;padding:.1rem .35rem;border-radius:4px}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${armed ? 'ok' : 'warn'}">${armed ? 'AUTONOMIC CHRONOS ARMED' : 'CHRONOS WATCHING / ALERT'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(temporal.boardLine)}</p>
</div>
<h1>Phase 29 — Autonomic chronos</h1>
<p class="sub">${esc(origin)} · temporal nexus · yield/SEO deltas · regression auto-detect</p>
<div class="hero">
  <div class="metric"><span class="sub">Chronos</span><b class="${armed ? 'ok' : 'warn'}">${armed ? 'ARMED' : 'ALERT'}</b></div>
  <div class="metric"><span class="sub">Points</span><b>${esc(temporal.pointCount)}</b></div>
  <div class="metric"><span class="sub">Alerts</span><b class="${temporal.alertCount ? 'warn' : 'ok'}">${esc(temporal.alertCount)}</b></div>
  <div class="metric"><span class="sub">Continuity</span><b class="${temporal.continuityLocked ? 'ok' : 'warn'}">${temporal.continuityLocked ? 'LOCKED' : 'OPEN'}</b></div>
  <div class="metric"><span class="sub">Enquiries</span><b>${esc(temporal.enquiries28 ?? '—')}</b></div>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Temporal nexus</h2>
  <ul>
    <li>Snapshot GSC · GA4 · enquiries each observe</li>
    <li>Δ vs prior cycle — no spreadsheet ritual</li>
    <li>Critical regressions: form · lattice · hasMap · enquiry cliff</li>
    <li>Requires continuity LOCKED + lattice SEALED + continuum ONLINE</li>
  </ul>
  <code>npm run meridian:observe</code>
</div>
<div class="card">
  <a class="btn primary" href="autonomic-chronos.md">Chronos brief</a>
  <a class="btn" href="phase28-ops.html">Continuity</a>
  <a class="btn" href="chronos-pulse.json">Pulse JSON</a>
  <a class="btn" href="chronos-series.json">Series</a>
  <a class="btn" href="phase27-ops.html">Lattice</a>
  <a class="btn" href="../../../../SEO-GUIDE.md">SEO-GUIDE.md</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: temporal.generatedAt,
    phase: '29',
    origin,
    temporal,
    live: live.data,
    chronos: chronos.data,
    humanDebt: debt.data,
    unlockPercent: unlock.data?.percent ?? null,
    score,
    steps,
  };

  await writeFile(resolve(outDir, 'phase29-ops.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'phase29-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase29-advance.md'),
    [
      `# Phase 29 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Chronos **${armed ? 'ARMED' : chronos.status.toUpperCase()}** · points **${temporal.pointCount}** · alerts **${temporal.alertCount}**`,
      `- Continuity **${temporal.continuityLocked ? 'LOCKED' : 'OPEN'}** · Yield **${temporal.continuumOnline ? 'ONLINE' : 'WATCHING'}**`,
      `- ${p28.message}`,
      '',
      temporal.boardLine,
      '',
      'Open **`phase29-ops.html`**. Forever: **`npm run meridian:observe`**.',
      '',
    ].join('\n'),
    'utf8'
  );

  const ledger = await syncAppendixLedger(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'ledger', ok: ledger.ok !== false, message: ledger.message });
  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon', ok: canon.ok !== false, message: canon.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase29-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const scan = {
    report: report || { scorecard: score, findings: [] },
    ok: true,
    hardFailCount: 0,
    paths: { outDir },
  };
  const p9 = await advancePhase9(profile, {
    outDir,
    scan,
    actions: [
      { id: 'phase29-advance', ok: true, message: temporal.boardLine, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase29-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '29'),
    {
      id: '29',
      name: 'Phase 29 Autonomic Chronos',
      file: 'phase29-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase29-ops.html',
    },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  // Second pulse after pack registration (series coalesce within 90s)
  const chronos2 = await runAutonomicChronos(profile, { outDir });
  steps.push({ id: 'chronos-reseal', ok: chronos2.ok !== false, message: chronos2.message });
  payload.chronos = chronos2.data;
  payload.temporal.chronosArmed = chronos2.status === 'armed';
  payload.temporal.alertCount = chronos2.data?.alertCount ?? 0;
  payload.temporal.pointCount = chronos2.data?.pointCount ?? 0;
  payload.temporal.boardLine = chronos2.data?.boardLine || chronos2.message;
  payload.steps = steps;
  await writeFile(resolve(outDir, 'temporal-nexus.json'), JSON.stringify(payload.temporal, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase29-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const armedFinal = chronos2.status === 'armed';

  return {
    ok: p28.ok !== false && chronos2.ok !== false,
    status: armedFinal && sealed ? 'ok' : chronos2.status === 'alert' ? 'alert' : 'pending',
    message: `Phase 29 chronos · ${armedFinal ? 'ARMED' : chronos2.status} · alerts ${payload.temporal.alertCount} · hasMap ${live.data?.hasMap ? 'LIVE' : 'pending'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase29-ops.html'),
        md: resolve(outDir, 'phase29-advance.md'),
        pulse: resolve(outDir, 'chronos-pulse.json'),
        series: resolve(outDir, 'chronos-series.json'),
        nexus: resolve(outDir, 'temporal-nexus.json'),
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      {
        code: armedFinal ? 'PHASE29_CHRONOS_ARMED' : 'PHASE29_CHRONOS_WATCHING',
        severity: chronos2.status === 'alert' ? 'high' : armedFinal ? 'low' : 'medium',
        title: armedFinal ? 'Autonomic chronos armed' : 'Autonomic chronos watching/alert',
        remediation: 'Keep npm run meridian:observe.',
        owner: 'developer',
        pillar: 'technical',
      },
      ...(chronos2.findings || []),
    ],
  };
}
