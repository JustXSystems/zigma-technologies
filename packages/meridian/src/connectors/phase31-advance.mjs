import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase30 } from './phase30-advance.mjs';
import { runSilentSteward } from './silent-steward.mjs';
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
 * Phase 31 — Silent Steward.
 * Dominion stays crowned; steward auto-refreshes meta/city/review/growth drafts — zero checklist.
 */
export async function advancePhase31(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p30 = { ok: true, message: 'phase30 skipped', data: {} };
  if (opts.skipDominion !== true) {
    p30 = await advancePhase30(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
      skipLatticeHeal: opts.skipLatticeHeal === true,
      skipLattice: opts.skipLattice === true,
      skipContinuity: opts.skipContinuity === true,
      skipChronos: opts.skipChronos === true,
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
    steps.push({ id: 'phase30', ok: p30.ok !== false, message: p30.message });
  }

  const live = await probeLiveThrone(profile, { outDir });
  steps.push({ id: 'live-probe', ok: live.ok !== false, message: live.message });

  const steward = await runSilentSteward(profile, {
    outDir,
    apply: opts.apply !== false,
    skipCloser: opts.skipCloser === true,
    skipIndex: opts.skipIndex !== false,
    skipCatalogSteward: opts.skipCatalogSteward === true,
    skipCatalogProbe: opts.skipCatalogProbe === true,
  });
  steps.push({ id: 'silent-steward', ok: steward.ok !== false, message: steward.message });

  const debt = await assessHumanDebt(profile, { outDir, parkGbp: true });
  const unlock = await assessUnlockReadiness(profile, { outDir });
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const score = observatory?.score || archive?.score || report?.scorecard || {};
  const sealed = live.data?.liveThrone === true;
  const nominal = steward.status === 'nominal';
  const sig = steward.data?.signals || {};

  const stewardShip = {
    generatedAt: new Date().toISOString(),
    phase: '31',
    origin,
    liveThrone: sealed,
    stewardNominal: nominal,
    failCount: steward.data?.failCount ?? 0,
    stewardCount: steward.data?.stewardCount ?? 0,
    dominionCrowned: !!sig.dominionCrowned,
    enquiries28: sig.enquiries28 ?? null,
    boardLine: steward.data?.boardLine || steward.message,
  };
  await writeFile(resolve(outDir, 'steward-ship.json'), JSON.stringify(stewardShip, null, 2), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 31 Silent Steward — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#02060a;--card:#0a1218;--line:#1c2a36;--text:#e8eef8;--muted:#8799ad;--accent:#34d399;--ok:#2fd67b;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(1000px 520px at 70% -10%,#0c2820,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.6rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem}
.banner{border:1px solid ${nominal ? '#1a4038' : '#5a4830'};background:linear-gradient(105deg,${nominal ? '#0c241c' : '#2a2010'},#0a1218 55%);border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.2rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#122030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#042014;border:0}
.ok{color:var(--ok)}.warn{color:var(--warn)}code{font-size:.78rem;background:#122030;padding:.1rem .35rem;border-radius:4px}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${nominal ? 'ok' : 'warn'}">${nominal ? 'SILENT STEWARD NOMINAL' : 'STEWARD ALERT'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(stewardShip.boardLine)}</p>
</div>
<h1>Phase 31 — Silent steward</h1>
<p class="sub">${esc(origin)} · meta · city gate · review kit · growth defend · zero checklist</p>
<div class="hero">
  <div class="metric"><span class="sub">Steward</span><b class="${nominal ? 'ok' : 'warn'}">${nominal ? 'NOMINAL' : 'ALERT'}</b></div>
  <div class="metric"><span class="sub">Stewards</span><b>${esc(stewardShip.stewardCount)}</b></div>
  <div class="metric"><span class="sub">Fails</span><b class="${stewardShip.failCount ? 'warn' : 'ok'}">${esc(stewardShip.failCount)}</b></div>
  <div class="metric"><span class="sub">Dominion</span><b class="${stewardShip.dominionCrowned ? 'ok' : 'warn'}">${stewardShip.dominionCrowned ? 'CROWNED' : '—'}</b></div>
  <div class="metric"><span class="sub">Enquiries</span><b>${esc(stewardShip.enquiries28 ?? '—')}</b></div>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Auto stewards</h2>
  <ul>
    <li>Meta polish drafts · keyword map</li>
    <li>City templates held until unique content (quality gate)</li>
    <li>Review kit + growth FAQ defend refresh</li>
    <li>Phase 1 pack surface restored</li>
  </ul>
  <code>npm run meridian:observe</code>
</div>
<div class="card">
  <a class="btn primary" href="silent-steward.md">Steward brief</a>
  <a class="btn" href="phase30-ops.html">Dominion</a>
  <a class="btn" href="phase1-ops.html">Phase 1</a>
  <a class="btn" href="phase6-ops.html">City gate</a>
  <a class="btn" href="phase5-ops.html">Review kit</a>
  <a class="btn" href="SEO-GUIDE.md">SEO-GUIDE.md</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: stewardShip.generatedAt,
    phase: '31',
    origin,
    stewardShip,
    live: live.data,
    steward: steward.data,
    humanDebt: debt.data,
    unlockPercent: unlock.data?.percent ?? null,
    score,
    steps,
  };

  await writeFile(resolve(outDir, 'phase31-ops.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'phase31-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase31-advance.md'),
    [
      `# Phase 31 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Steward **${nominal ? 'NOMINAL' : 'ALERT'}** · stewards **${stewardShip.stewardCount}** · fails **${stewardShip.failCount}**`,
      `- ${p30.message}`,
      '',
      stewardShip.boardLine,
      '',
      'Open **`phase31-ops.html`**. Forever: **`npm run meridian:observe`**.',
      '',
    ].join('\n'),
    'utf8'
  );

  const ledger = await syncAppendixLedger(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'ledger', ok: ledger.ok !== false, message: ledger.message });
  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon', ok: canon.ok !== false, message: canon.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase31-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

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
      { id: 'phase31-advance', ok: true, message: stewardShip.boardLine, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase31-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '31' && m.id !== '1'),
    {
      id: '1',
      name: 'Phase 1 Technical',
      file: 'phase1-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase1-ops.html',
    },
    {
      id: '31',
      name: 'Phase 31 Silent Steward',
      file: 'phase31-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase31-ops.html',
    },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  const steward2 = await runSilentSteward(profile, {
    outDir,
    apply: false,
    skipCloser: true,
    skipCatalogSteward: true,
  });
  steps.push({ id: 'steward-reseal', ok: steward2.ok !== false, message: steward2.message });
  payload.steward = steward2.data;
  payload.stewardShip.stewardNominal = steward2.status === 'nominal';
  payload.stewardShip.failCount = steward2.data?.failCount ?? 0;
  payload.stewardShip.stewardCount = steward2.data?.stewardCount ?? 0;
  payload.stewardShip.boardLine = steward2.data?.boardLine || steward2.message;
  payload.steps = steps;
  await writeFile(resolve(outDir, 'steward-ship.json'), JSON.stringify(payload.stewardShip, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase31-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const nominalFinal = steward2.status === 'nominal';

  return {
    ok: p30.ok !== false && steward2.ok !== false,
    status: nominalFinal && sealed ? 'ok' : 'pending',
    message: `Phase 31 steward · ${nominalFinal ? 'NOMINAL' : 'alert'} · fails ${payload.stewardShip.failCount} · hasMap ${live.data?.hasMap ? 'LIVE' : 'pending'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase31-ops.html'),
        md: resolve(outDir, 'phase31-advance.md'),
        steward: resolve(outDir, 'silent-steward.json'),
        ship: resolve(outDir, 'steward-ship.json'),
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      {
        code: nominalFinal ? 'PHASE31_STEWARD_NOMINAL' : 'PHASE31_STEWARD_ALERT',
        severity: nominalFinal ? 'low' : 'medium',
        title: nominalFinal ? 'Silent steward nominal' : 'Silent steward alert',
        remediation: 'Keep npm run meridian:observe.',
        owner: 'developer',
        pillar: 'technical',
      },
      ...(steward2.findings || []),
    ],
  };
}
