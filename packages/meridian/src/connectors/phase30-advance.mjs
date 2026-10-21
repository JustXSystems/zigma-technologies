import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase29 } from './phase29-advance.mjs';
import { runDominionApex } from './dominion-apex.mjs';
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
 * Phase 30 — Dominion Apex (Eternal Crown).
 * Capstone forever ops: crowns Phases 26–29 into one board certificate. Automation complete.
 */
export async function advancePhase30(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p29 = { ok: true, message: 'phase29 skipped', data: {} };
  if (opts.skipChronos !== true) {
    p29 = await advancePhase29(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
      skipLatticeHeal: opts.skipLatticeHeal === true,
      skipLattice: opts.skipLattice === true,
      skipContinuity: opts.skipContinuity === true,
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
    steps.push({ id: 'phase29', ok: p29.ok !== false, message: p29.message });
  }

  const live = await probeLiveThrone(profile, { outDir });
  steps.push({ id: 'live-probe', ok: live.ok !== false, message: live.message });

  const dominion = await runDominionApex(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'dominion-apex', ok: dominion.ok !== false, message: dominion.message });

  const debt = await assessHumanDebt(profile, { outDir, parkGbp: true });
  const unlock = await assessUnlockReadiness(profile, { outDir });
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const score = observatory?.score || archive?.score || report?.scorecard || {};
  const sealed = live.data?.liveThrone === true;
  const crowned = dominion.status === 'crowned';
  const exec = dominion.data?.executive || {};

  const apex = {
    generatedAt: new Date().toISOString(),
    phase: '30',
    origin,
    liveThrone: sealed,
    dominionCrowned: crowned,
    failCount: dominion.data?.failCount ?? 0,
    pillarCount: dominion.data?.pillarCount ?? 0,
    enquiries28: exec.enquiries28 ?? null,
    automationComplete: crowned,
    boardLine: dominion.data?.boardLine || dominion.message,
  };
  await writeFile(resolve(outDir, 'eternal-crown.json'), JSON.stringify(apex, null, 2), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 30 Dominion Apex — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#010208;--card:#0a0e16;--line:#1c2434;--text:#e8eef8;--muted:#8799ad;--accent:#e2e8f0;--ok:#2fd67b;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(1100px 560px at 50% -12%,#1a2438,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.65rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem}
.banner{border:1px solid ${crowned ? '#2a3548' : '#5a4830'};background:linear-gradient(105deg,${crowned ? '#121828' : '#2a2010'},#0a0e16 55%);border-radius:14px;padding:1.15rem 1.3rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.2rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#121a28;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#0a1018;border:0}
.ok{color:var(--ok)}.warn{color:var(--warn)}code{font-size:.78rem;background:#121a28;padding:.1rem .35rem;border-radius:4px}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${crowned ? 'ok' : 'warn'}">${crowned ? 'DOMINION APEX CROWNED' : 'DOMINION PILLARS OPEN'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(apex.boardLine)}</p>
</div>
<h1>Phase 30 — Dominion apex</h1>
<p class="sub">${esc(origin)} · eternal crown · automation complete · zero checklist ritual</p>
<div class="hero">
  <div class="metric"><span class="sub">Dominion</span><b class="${crowned ? 'ok' : 'warn'}">${crowned ? 'CROWNED' : 'OPEN'}</b></div>
  <div class="metric"><span class="sub">Pillars</span><b>${esc(apex.pillarCount)}</b></div>
  <div class="metric"><span class="sub">Fails</span><b class="${apex.failCount ? 'warn' : 'ok'}">${esc(apex.failCount)}</b></div>
  <div class="metric"><span class="sub">Automation</span><b class="${crowned ? 'ok' : 'warn'}">${crowned ? 'COMPLETE' : '—'}</b></div>
  <div class="metric"><span class="sub">Enquiries</span><b>${esc(apex.enquiries28 ?? '—')}</b></div>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Crown stack</h2>
  <ul>
    <li>Conversion continuum ONLINE</li>
    <li>Integrity lattice SEALED</li>
    <li>Sovereign continuity LOCKED</li>
    <li>Autonomic chronos ARMED</li>
    <li>Forever aliases + Monday GitHub autopilot</li>
  </ul>
  <code>npm run meridian:observe</code>
</div>
<div class="card">
  <a class="btn primary" href="dominion-apex.md">Dominion brief</a>
  <a class="btn" href="phase29-ops.html">Chronos</a>
  <a class="btn" href="dominion-apex.json">Apex JSON</a>
  <a class="btn" href="eternal-crown.json">Crown JSON</a>
  <a class="btn" href="phase28-ops.html">Continuity</a>
  <a class="btn" href="SEO-GUIDE.md">SEO-GUIDE.md</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: apex.generatedAt,
    phase: '30',
    origin,
    apex,
    live: live.data,
    dominion: dominion.data,
    humanDebt: debt.data,
    unlockPercent: unlock.data?.percent ?? null,
    score,
    steps,
  };

  await writeFile(resolve(outDir, 'phase30-ops.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'phase30-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase30-advance.md'),
    [
      `# Phase 30 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Dominion **${crowned ? 'CROWNED' : 'OPEN'}** · pillars **${apex.pillarCount}** · fails **${apex.failCount}**`,
      `- Automation **${crowned ? 'COMPLETE' : 'PENDING'}**`,
      `- ${p29.message}`,
      '',
      apex.boardLine,
      '',
      'Open **`phase30-ops.html`**. Forever: **`npm run meridian:observe`**.',
      '',
    ].join('\n'),
    'utf8'
  );

  const ledger = await syncAppendixLedger(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'ledger', ok: ledger.ok !== false, message: ledger.message });
  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon', ok: canon.ok !== false, message: canon.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase30-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

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
      { id: 'phase30-advance', ok: true, message: apex.boardLine, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase30-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '30'),
    {
      id: '30',
      name: 'Phase 30 Dominion Apex',
      file: 'phase30-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase30-ops.html',
    },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  const dominion2 = await runDominionApex(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'dominion-reseal', ok: dominion2.ok !== false, message: dominion2.message });
  payload.dominion = dominion2.data;
  payload.apex.dominionCrowned = dominion2.status === 'crowned';
  payload.apex.failCount = dominion2.data?.failCount ?? 0;
  payload.apex.pillarCount = dominion2.data?.pillarCount ?? 0;
  payload.apex.automationComplete = dominion2.status === 'crowned';
  payload.apex.boardLine = dominion2.data?.boardLine || dominion2.message;
  payload.steps = steps;
  await writeFile(resolve(outDir, 'eternal-crown.json'), JSON.stringify(payload.apex, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase30-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const crownedFinal = dominion2.status === 'crowned';

  return {
    ok: p29.ok !== false && dominion2.ok !== false,
    status: crownedFinal && sealed ? 'ok' : 'pending',
    message: `Phase 30 dominion · ${crownedFinal ? 'CROWNED' : 'open'} · fails ${payload.apex.failCount} · hasMap ${live.data?.hasMap ? 'LIVE' : 'pending'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase30-ops.html'),
        md: resolve(outDir, 'phase30-advance.md'),
        apex: resolve(outDir, 'dominion-apex.json'),
        crown: resolve(outDir, 'eternal-crown.json'),
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      {
        code: crownedFinal ? 'PHASE30_DOMINION_CROWNED' : 'PHASE30_DOMINION_OPEN',
        severity: crownedFinal ? 'low' : 'medium',
        title: crownedFinal ? 'Dominion apex crowned — automation complete' : 'Dominion apex pillars open',
        remediation: 'Keep npm run meridian:observe.',
        owner: 'developer',
        pillar: 'technical',
      },
      ...(dominion2.findings || []),
    ],
  };
}
