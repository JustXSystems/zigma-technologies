import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase27 } from './phase27-advance.mjs';
import { runSovereignContinuity } from './sovereign-continuity.mjs';
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
 * Phase 28 — Sovereign Continuity (Board Forever Charter).
 * Lattice + yield stay sealed; continuity gates prove the forever loop is operable.
 */
export async function advancePhase28(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p27 = { ok: true, message: 'phase27 skipped', data: {} };
  if (opts.skipLattice !== true) {
    p27 = await advancePhase27(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
      skipLatticeHeal: opts.skipLatticeHeal === true,
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
    steps.push({ id: 'phase27', ok: p27.ok !== false, message: p27.message });
  }

  const live = await probeLiveThrone(profile, { outDir });
  steps.push({ id: 'live-probe', ok: live.ok !== false, message: live.message });

  const continuity = await runSovereignContinuity(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'sovereign-continuity', ok: continuity.ok !== false, message: continuity.message });

  const debt = await assessHumanDebt(profile, { outDir, parkGbp: true });
  const unlock = await assessUnlockReadiness(profile, { outDir });
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const continuum = await readJson(resolve(outDir, 'conversion-continuum.json'));
  const lattice = await readJson(resolve(outDir, 'integrity-lattice.json'));
  const score = observatory?.score || archive?.score || report?.scorecard || {};
  const sealed = live.data?.liveThrone === true;
  const locked = continuity.status === 'locked';
  const exec = continuity.data?.executive || {};

  const sovereign = {
    generatedAt: new Date().toISOString(),
    phase: '28',
    origin,
    liveThrone: sealed,
    continuityLocked: locked,
    failCount: continuity.data?.failCount ?? 0,
    latticeSealed: !!lattice?.latticeSealed,
    continuumOnline: !!continuum?.continuumOnline,
    enquiries28: exec.enquiries28 ?? continuum?.signals?.enquiries28 ?? null,
    boardLine: continuity.data?.boardLine || continuity.message,
  };
  await writeFile(resolve(outDir, 'sovereign-charter.json'), JSON.stringify(sovereign, null, 2), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 28 Sovereign Continuity — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#02060c;--card:#0a121c;--line:#1c2a3a;--text:#e8eef8;--muted:#8799ad;--accent:#38bdf8;--ok:#2fd67b;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(1000px 520px at 80% -10%,#0c2a3a,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.6rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem}
.banner{border:1px solid ${locked ? '#1a4050' : '#5a4830'};background:linear-gradient(105deg,${locked ? '#0c2430' : '#2a2010'},#0a121c 55%);border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.2rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#122030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#041018;border:0}
.ok{color:var(--ok)}.warn{color:var(--warn)}code{font-size:.78rem;background:#122030;padding:.1rem .35rem;border-radius:4px}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${locked ? 'ok' : 'warn'}">${locked ? 'SOVEREIGN CONTINUITY LOCKED' : 'CONTINUITY GATES OPEN'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(sovereign.boardLine)}</p>
</div>
<h1>Phase 28 — Sovereign continuity</h1>
<p class="sub">${esc(origin)} · board charter · forever loop proven · zero checklist ritual</p>
<div class="hero">
  <div class="metric"><span class="sub">Continuity</span><b class="${locked ? 'ok' : 'warn'}">${locked ? 'LOCKED' : 'OPEN'}</b></div>
  <div class="metric"><span class="sub">Lattice</span><b class="${sovereign.latticeSealed ? 'ok' : 'warn'}">${sovereign.latticeSealed ? 'SEALED' : 'DRIFT'}</b></div>
  <div class="metric"><span class="sub">Yield</span><b class="${sovereign.continuumOnline ? 'ok' : 'warn'}">${sovereign.continuumOnline ? 'ONLINE' : '—'}</b></div>
  <div class="metric"><span class="sub">Gates</span><b>${esc(continuity.data?.gateCount ?? '—')}</b></div>
  <div class="metric"><span class="sub">Enquiries</span><b>${esc(sovereign.enquiries28 ?? '—')}</b></div>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Charter</h2>
  <ul>
    <li>Integrity lattice perpetual seal</li>
    <li>Conversion continuum / enquiry yield</li>
    <li>Forever aliases + Monday GitHub autopilot</li>
    <li>Human debt zero · live throne hasMap</li>
  </ul>
  <code>npm run meridian:observe</code>
</div>
<div class="card">
  <a class="btn primary" href="sovereign-continuity.md">Continuity brief</a>
  <a class="btn" href="phase27-ops.html">Lattice</a>
  <a class="btn" href="continuity-charter.json">Charter JSON</a>
  <a class="btn" href="phase26-ops.html">Yield</a>
  <a class="btn" href="SEO-GUIDE.md">SEO-GUIDE.md</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: sovereign.generatedAt,
    phase: '28',
    origin,
    sovereign,
    live: live.data,
    continuity: continuity.data,
    humanDebt: debt.data,
    unlockPercent: unlock.data?.percent ?? null,
    score,
    steps,
  };

  await writeFile(resolve(outDir, 'phase28-ops.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'phase28-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase28-advance.md'),
    [
      `# Phase 28 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Continuity **${locked ? 'LOCKED' : 'OPEN'}** · fails **${sovereign.failCount}**`,
      `- Lattice **${sovereign.latticeSealed ? 'SEALED' : 'DRIFT'}** · Yield **${sovereign.continuumOnline ? 'ONLINE' : 'WATCHING'}**`,
      `- ${p27.message}`,
      '',
      sovereign.boardLine,
      '',
      'Open **`phase28-ops.html`**. Forever: **`npm run meridian:observe`**.',
      '',
    ].join('\n'),
    'utf8'
  );

  const ledger = await syncAppendixLedger(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'ledger', ok: ledger.ok !== false, message: ledger.message });
  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon', ok: canon.ok !== false, message: canon.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase28-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

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
      { id: 'phase28-advance', ok: true, message: sovereign.boardLine, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase28-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '28'),
    {
      id: '28',
      name: 'Phase 28 Sovereign Continuity',
      file: 'phase28-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase28-ops.html',
    },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  // Re-run continuity after pack 28 registered so phase-packs gate stays green
  const continuity2 = await runSovereignContinuity(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'continuity-reseal', ok: continuity2.ok !== false, message: continuity2.message });
  payload.continuity = continuity2.data;
  payload.sovereign.continuityLocked = continuity2.status === 'locked';
  payload.sovereign.failCount = continuity2.data?.failCount ?? 0;
  payload.sovereign.boardLine = continuity2.data?.boardLine || continuity2.message;
  payload.steps = steps;
  await writeFile(resolve(outDir, 'sovereign-charter.json'), JSON.stringify(payload.sovereign, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase28-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const lockedFinal = continuity2.status === 'locked';

  return {
    ok: p27.ok !== false && continuity2.ok !== false,
    status: lockedFinal && sealed ? 'ok' : 'pending',
    message: `Phase 28 continuity · ${lockedFinal ? 'LOCKED' : 'open'} · fails ${payload.sovereign.failCount} · hasMap ${live.data?.hasMap ? 'LIVE' : 'pending'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase28-ops.html'),
        md: resolve(outDir, 'phase28-advance.md'),
        continuity: resolve(outDir, 'continuity-charter.json'),
        charter: resolve(outDir, 'sovereign-charter.json'),
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      {
        code: lockedFinal ? 'PHASE28_CONTINUITY_LOCKED' : 'PHASE28_CONTINUITY_OPEN',
        severity: lockedFinal ? 'low' : 'medium',
        title: lockedFinal ? 'Sovereign continuity locked' : 'Sovereign continuity gates open',
        remediation: 'Keep npm run meridian:observe.',
        owner: 'developer',
        pillar: 'technical',
      },
      ...(continuity2.findings || []),
    ],
  };
}
