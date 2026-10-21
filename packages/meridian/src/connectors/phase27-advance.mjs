import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase26 } from './phase26-advance.mjs';
import { runIntegrityLattice } from './integrity-lattice.mjs';
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
 * Phase 27 — Integrity Lattice (Perpetual Seal).
 * Cross-check sealed stack · auto-heal hasMap / growth FAQ · board forever loop.
 */
export async function advancePhase27(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p26 = { ok: true, message: 'phase26 skipped', data: {} };
  if (opts.skipYield !== true) {
    p26 = await advancePhase26(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
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
      skipYield: opts.skipYieldDb === true,
      skipSitemap: opts.skipSitemap === true,
      skipDeploy: opts.skipDeploy !== false,
      triggerDeploy: opts.triggerDeploy === true,
      ack: opts.ack === true,
      parkGbp: opts.parkGbp !== false,
      gscProxy: opts.gscProxy !== false,
    });
    steps.push({ id: 'phase26', ok: p26.ok !== false, message: p26.message });
  }

  const live = await probeLiveThrone(profile, { outDir });
  steps.push({ id: 'live-probe', ok: live.ok !== false, message: live.message });

  const lattice = await runIntegrityLattice(profile, {
    outDir,
    live,
    apply: opts.apply !== false,
    skipHeal: opts.skipLatticeHeal === true || opts.skipHeal === true,
  });
  steps.push({ id: 'integrity-lattice', ok: lattice.ok !== false, message: lattice.message });

  const debt = await assessHumanDebt(profile, { outDir, parkGbp: true });
  const unlock = await assessUnlockReadiness(profile, { outDir });
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const continuum = await readJson(resolve(outDir, 'conversion-continuum.json'));
  const score = observatory?.score || archive?.score || report?.scorecard || {};
  const sealed = live.data?.liveThrone === true;
  const latticeSealed = lattice.status === 'sealed';

  const perpetual = {
    generatedAt: new Date().toISOString(),
    phase: '27',
    origin,
    liveThrone: sealed,
    latticeSealed,
    failCount: lattice.data?.failCount ?? 0,
    healCount: lattice.data?.heals?.length ?? 0,
    enquiries28: continuum?.signals?.enquiries28 ?? null,
    boardLine: lattice.data?.boardLine || lattice.message,
  };
  await writeFile(resolve(outDir, 'perpetual-seal.json'), JSON.stringify(perpetual, null, 2), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 27 Integrity Lattice — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#03040a;--card:#0c1018;--line:#1e2836;--text:#e8eef8;--muted:#8799ad;--accent:#c084fc;--ok:#2fd67b;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 480px at 50% -15%,#2a1840,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.6rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem}
.banner{border:1px solid ${latticeSealed ? '#3a2860' : '#5a4830'};background:linear-gradient(105deg,${latticeSealed ? '#1a1230' : '#2a2010'},#0c1018 55%);border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.2rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#142030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#1a0a28;border:0}
.ok{color:var(--ok)}.warn{color:var(--warn)}code{font-size:.78rem;background:#142030;padding:.1rem .35rem;border-radius:4px}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${latticeSealed ? 'ok' : 'warn'}">${latticeSealed ? 'PERPETUAL SEAL LOCKED' : 'INTEGRITY DRIFT DETECTED'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(perpetual.boardLine)}</p>
</div>
<h1>Phase 27 — Integrity lattice</h1>
<p class="sub">${esc(origin)} · cross-stack invariants · auto-heal · zero checklist ritual</p>
<div class="hero">
  <div class="metric"><span class="sub">Lattice</span><b class="${latticeSealed ? 'ok' : 'warn'}">${latticeSealed ? 'SEALED' : 'DRIFT'}</b></div>
  <div class="metric"><span class="sub">Checks</span><b>${esc(lattice.data?.checkCount ?? '—')}</b></div>
  <div class="metric"><span class="sub">Fails</span><b class="${(lattice.data?.failCount || 0) ? 'warn' : 'ok'}">${esc(lattice.data?.failCount ?? '—')}</b></div>
  <div class="metric"><span class="sub">Heals</span><b>${esc(perpetual.healCount)}</b></div>
  <div class="metric"><span class="sub">Enquiries</span><b>${esc(perpetual.enquiries28 ?? '—')}</b></div>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Invariants</h2>
  <ul>
    <li>Live throne (hasMap + sameAs)</li>
    <li>Homepage growth FAQ + FAQ blog (FAQPage)</li>
    <li>Enquiry form health</li>
    <li>Score / unlock floor · conversion continuum</li>
    <li>Auto-heal: courier hasMap · growth closer FAQ</li>
  </ul>
  <code>npm run meridian:observe</code>
</div>
<div class="card">
  <a class="btn primary" href="integrity-lattice.md">Lattice</a>
  <a class="btn" href="phase26-ops.html">Yield</a>
  <a class="btn" href="perpetual-seal.json">Seal JSON</a>
  <a class="btn" href="conversion-continuum.md">Continuum</a>
  <a class="btn" href="SEO-GUIDE.md">SEO-GUIDE.md</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: perpetual.generatedAt,
    phase: '27',
    origin,
    perpetual,
    live: live.data,
    lattice: lattice.data,
    humanDebt: debt.data,
    unlockPercent: unlock.data?.percent ?? null,
    score,
    steps,
  };

  await writeFile(resolve(outDir, 'phase27-ops.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'phase27-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase27-advance.md'),
    [
      `# Phase 27 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Lattice **${latticeSealed ? 'SEALED' : 'DRIFT'}** · fails **${perpetual.failCount}** · heals **${perpetual.healCount}**`,
      `- Live throne **${sealed ? 'SEALED' : 'PENDING'}**`,
      `- ${p26.message}`,
      '',
      perpetual.boardLine,
      '',
      'Open **`phase27-ops.html`**. Forever: **`npm run meridian:observe`**.',
      '',
    ].join('\n'),
    'utf8'
  );

  const ledger = await syncAppendixLedger(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'ledger', ok: ledger.ok !== false, message: ledger.message });
  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon', ok: canon.ok !== false, message: canon.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase27-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

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
      { id: 'phase27-advance', ok: true, message: perpetual.boardLine, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase27-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '27'),
    {
      id: '27',
      name: 'Phase 27 Integrity Lattice',
      file: 'phase27-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase27-ops.html',
    },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  return {
    ok: p26.ok !== false && lattice.ok !== false,
    status: latticeSealed && sealed ? 'ok' : 'pending',
    message: `Phase 27 lattice · ${latticeSealed ? 'SEALED' : 'drift'} · fails ${perpetual.failCount} · hasMap ${live.data?.hasMap ? 'LIVE' : 'pending'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase27-ops.html'),
        md: resolve(outDir, 'phase27-advance.md'),
        lattice: resolve(outDir, 'integrity-lattice.json'),
        seal: resolve(outDir, 'perpetual-seal.json'),
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      {
        code: latticeSealed ? 'PHASE27_LATTICE_SEALED' : 'PHASE27_LATTICE_DRIFT',
        severity: latticeSealed ? 'low' : 'medium',
        title: latticeSealed ? 'Integrity lattice sealed' : 'Integrity lattice detected drift',
        remediation: 'Keep npm run meridian:observe (auto-heal).',
        owner: 'developer',
        pillar: 'technical',
      },
      ...(lattice.findings || []),
    ],
  };
}
