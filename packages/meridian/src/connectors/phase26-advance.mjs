import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase25 } from './phase25-advance.mjs';
import { runConversionContinuum } from './conversion-continuum.mjs';
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
 * Phase 26 — Conversion Continuum (Yield Apex).
 * SEO → form health → enquiry yield → sitemap refresh. Board-ready forever loop.
 */
export async function advancePhase26(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p25 = { ok: true, message: 'phase25 skipped', data: {} };
  if (opts.skipForge !== true) {
    p25 = await advancePhase25(profile, {
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
      skipHotpatch: opts.skipHotpatch === true,
      skipCloser: opts.skipCloser === true,
      skipIndex: opts.skipIndex === true,
      skipDeploy: opts.skipDeploy !== false,
      triggerDeploy: opts.triggerDeploy === true,
      ack: opts.ack === true,
      parkGbp: opts.parkGbp !== false,
      gscProxy: opts.gscProxy !== false,
    });
    steps.push({ id: 'phase25', ok: p25.ok !== false, message: p25.message });
  }

  let live = await probeLiveThrone(profile, { outDir });
  steps.push({ id: 'live-probe', ok: live.ok !== false, message: live.message });

  let continuum = await runConversionContinuum(profile, {
    outDir,
    apply: opts.apply !== false,
    skipYield: opts.skipYield === true,
    skipSitemap: opts.skipSitemap === true,
  });
  // Transient form 502 → one quiet re-probe before marking WATCHING
  if (continuum.data?.formOk === false || continuum.status !== 'online') {
    continuum = await runConversionContinuum(profile, {
      outDir,
      apply: false,
      skipYield: opts.skipYield === true,
      skipSitemap: true,
    });
  }
  steps.push({ id: 'conversion-continuum', ok: continuum.ok !== false, message: continuum.message });

  if (live.data?.hasMap !== true) {
    live = await probeLiveThrone(profile, { outDir });
  }

  const debt = await assessHumanDebt(profile, { outDir, parkGbp: true });
  const unlock = await assessUnlockReadiness(profile, { outDir });
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const score = observatory?.score || archive?.score || report?.scorecard || {};
  const sealed = live.data?.liveThrone === true || (live.data?.hasMap === true && live.data?.sameAs === true);
  const online = continuum.status === 'online' || continuum.data?.continuumOnline === true;
  const sig = continuum.data?.signals || {};

  const apex = {
    generatedAt: new Date().toISOString(),
    phase: '26',
    origin,
    liveThrone: sealed,
    continuumOnline: online,
    signals: sig,
    boardLine: continuum.data?.boardLine || continuum.message,
  };
  await writeFile(resolve(outDir, 'yield-apex.json'), JSON.stringify(apex, null, 2), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 26 Conversion Continuum — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#04060a;--card:#0e141c;--line:#243041;--text:#e8eef8;--muted:#8799ad;--accent:#a3e635;--ok:#2fd67b;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 480px at 10% -10%,#1a2e14,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.6rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem}
.banner{border:1px solid ${online ? '#2a4a28' : '#3a4a58'};background:linear-gradient(105deg,${online ? '#142418' : '#121820'},#0e141c 55%);border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.2rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#142030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#14200a;border:0}
.ok{color:var(--ok)}.warn{color:var(--warn)}code{font-size:.78rem;background:#142030;padding:.1rem .35rem;border-radius:4px}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${online ? 'ok' : 'warn'}">${online ? 'YIELD APEX ONLINE' : 'CONVERSION CONTINUUM WATCHING'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(apex.boardLine)}</p>
</div>
<h1>Phase 26 — Conversion continuum</h1>
<p class="sub">${esc(origin)} · form health · GA4 organic · enquiry yield · sitemap refresh</p>
<div class="hero">
  <div class="metric"><span class="sub">Enquiries 28d</span><b class="ok">${esc(sig.enquiries28 ?? '—')}</b></div>
  <div class="metric"><span class="sub">Organic sess</span><b>${esc(sig.ga4OrganicSessions28 ?? '—')}</b></div>
  <div class="metric"><span class="sub">Yield</span><b>${esc(sig.yieldRatePct != null ? sig.yieldRatePct + '%' : '—')}</b></div>
  <div class="metric"><span class="sub">Form</span><b class="${continuum.data?.formOk ? 'ok' : 'warn'}">${continuum.data?.formOk ? 'OK' : 'ALERT'}</b></div>
  <div class="metric"><span class="sub">Open</span><b>${esc(sig.openPipeline ?? '—')}</b></div>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Closed loop</h2>
  <ul>
    <li>Probe enquiry schema + contact page (no spam submits)</li>
    <li>Pull GA4 organic sessions / key events (28d)</li>
    <li>Count Production enquiries over SSH (DB yield)</li>
    <li>Refresh GSC + Bing sitemap when secrets present</li>
  </ul>
  <code>npm run meridian:observe</code>
</div>
<div class="card">
  <a class="btn primary" href="conversion-continuum.md">Continuum</a>
  <a class="btn" href="phase25-ops.html">Forge</a>
  <a class="btn" href="yield-apex.json">Yield JSON</a>
  <a class="btn" href="form-health.json">Form health</a>
  <a class="btn" href="SEO-GUIDE.md">SEO-GUIDE.md</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: apex.generatedAt,
    phase: '26',
    origin,
    apex,
    live: live.data,
    continuum: continuum.data,
    humanDebt: debt.data,
    unlockPercent: unlock.data?.percent ?? null,
    score,
    steps,
  };

  await writeFile(resolve(outDir, 'phase26-ops.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'phase26-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase26-advance.md'),
    [
      `# Phase 26 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Continuum **${online ? 'ONLINE' : 'WATCHING'}** · enquiries 28d **${sig.enquiries28 ?? '—'}**`,
      `- Live throne **${sealed ? 'SEALED' : 'PENDING'}**`,
      `- ${p25.message}`,
      '',
      apex.boardLine,
      '',
      'Open **`phase26-ops.html`**. Forever: **`npm run meridian:observe`**.',
      '',
    ].join('\n'),
    'utf8'
  );

  const ledger = await syncAppendixLedger(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'ledger', ok: ledger.ok !== false, message: ledger.message });
  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon', ok: canon.ok !== false, message: canon.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase26-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

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
      { id: 'phase26-advance', ok: true, message: apex.boardLine, data: payload },
      { id: 'unlock-readiness', ...unlock },
      { id: 'form-health', ...continuum, data: continuum.data?.form },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase26-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '26'),
    {
      id: '26',
      name: 'Phase 26 Conversion Continuum',
      file: 'phase26-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase26-ops.html',
    },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  return {
    ok: p25.ok !== false && continuum.ok !== false,
    status: online && sealed ? 'ok' : 'pending',
    message: `Phase 26 continuum · ${online ? 'ONLINE' : 'watching'} · enq ${sig.enquiries28 ?? '—'} · hasMap ${live.data?.hasMap ? 'LIVE' : 'pending'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase26-ops.html'),
        md: resolve(outDir, 'phase26-advance.md'),
        continuum: resolve(outDir, 'conversion-continuum.json'),
        apex: resolve(outDir, 'yield-apex.json'),
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      {
        code: online ? 'PHASE26_YIELD_ONLINE' : 'PHASE26_CONTINUUM',
        severity: continuum.data?.formOk === false ? 'high' : 'low',
        title: online ? 'Conversion continuum measuring SEO yield' : 'Conversion continuum watching signals',
        remediation: 'Keep npm run meridian:observe.',
        owner: 'developer',
        pillar: 'technical',
      },
      ...(continuum.findings || []),
    ],
  };
}
