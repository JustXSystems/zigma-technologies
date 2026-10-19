import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase24 } from './phase24-advance.mjs';
import { runGrowthCloser } from './growth-closer.mjs';
import { runGrowthRadar } from './growth-radar.mjs';
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
 * Phase 25 — Growth Closer (Signal Forge).
 * Autoclose GSC opportunities: FAQ blog + homepage proof + indexing queue.
 */
export async function advancePhase25(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p24 = { ok: true, message: 'phase24 skipped', data: {} };
  if (opts.skipCourier !== true) {
    p24 = await advancePhase24(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
      skipObserve: opts.skipObserve === true,
      skipDesk: opts.skipDesk === true,
      skipPresence: opts.skipPresence === true,
      skipThrone: opts.skipThrone === true,
      skipHorizon: opts.skipHorizon === true,
      skipHotpatch: opts.skipHotpatch === true,
      skipBuild: opts.skipBuild === true,
      skipDeploy: opts.skipDeploy !== false,
      triggerDeploy: opts.triggerDeploy === true,
      ack: opts.ack === true,
      parkGbp: opts.parkGbp !== false,
      gscProxy: opts.gscProxy !== false,
    });
    steps.push({ id: 'phase24', ok: p24.ok !== false, message: p24.message });
  }

  const live = await probeLiveThrone(profile, { outDir });
  steps.push({ id: 'live-probe', ok: live.ok !== false, message: live.message });

  const growth = await runGrowthRadar(profile, { outDir });
  steps.push({ id: 'growth-radar', ok: growth.ok !== false, message: growth.message });

  const closer = await runGrowthCloser(profile, {
    outDir,
    apply: opts.apply !== false,
    radar: growth,
    skipRemote: opts.skipCloser === true,
    skipIndex: opts.skipIndex === true,
  });
  steps.push({ id: 'growth-closer', ok: closer.ok !== false, message: closer.message });

  const debt = await assessHumanDebt(profile, { outDir, parkGbp: true });
  const unlock = await assessUnlockReadiness(profile, { outDir });
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const score = observatory?.score || archive?.score || report?.scorecard || {};
  const sealed = live.data?.liveThrone === true;
  const growthClosed =
    closer.status === 'closed' || closer.status === 'clear' || (closer.data?.closedCount || 0) > 0;

  const forge = {
    generatedAt: new Date().toISOString(),
    phase: '25',
    origin,
    liveThrone: sealed,
    opportunityCount: growth.data?.opportunityCount ?? 0,
    closedCount: closer.data?.closedCount ?? 0,
    closerStatus: closer.status,
    boardLine: closer.data?.boardLine || closer.message,
  };
  await writeFile(resolve(outDir, 'signal-forge.json'), JSON.stringify(forge, null, 2), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 25 Growth Closer — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#02050c;--card:#0c121c;--line:#1e2a3a;--text:#e8eef8;--muted:#8799ad;--accent:#38bdf8;--ok:#2fd67b;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 480px at 80% -10%,#0c2840,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.6rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem}
.banner{border:1px solid ${growthClosed ? '#1e4a5c' : '#3a4a58'};background:linear-gradient(105deg,${growthClosed ? '#0a2030' : '#121820'},#0c121c 55%);border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.25rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#142030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#041018;border:0}
.ok{color:var(--ok)}.warn{color:var(--warn)}code{font-size:.78rem;background:#142030;padding:.1rem .35rem;border-radius:4px}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${growthClosed ? 'ok' : 'warn'}">${growthClosed ? 'SIGNAL FORGE ACTIVE' : 'GROWTH CLOSER STAGED'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(forge.boardLine)}</p>
</div>
<h1>Phase 25 — Growth closer</h1>
<p class="sub">${esc(origin)} · FAQ publish · homepage proof · indexing queue · zero spreadsheet</p>
<div class="hero">
  <div class="metric"><span class="sub">Opportunities</span><b>${esc(forge.opportunityCount)}</b></div>
  <div class="metric"><span class="sub">Closed</span><b class="ok">${esc(forge.closedCount)}</b></div>
  <div class="metric"><span class="sub">hasMap</span><b class="${live.data?.hasMap ? 'ok' : 'warn'}">${live.data?.hasMap ? 'YES' : 'NO'}</b></div>
  <div class="metric"><span class="sub">Debt</span><b class="ok">${esc(debt.data?.debtScore ?? '—')}</b></div>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Autoclose path</h2>
  <ul>
    <li>Radar → FAQ blog (FAQPage JSON-LD) + homepage rich_text proof</li>
    <li>Soft meta polish for brand+city defend-winners</li>
    <li>Indexing queue for home / contact / FAQ URLs</li>
  </ul>
  <code>npm run meridian:observe</code>
</div>
<div class="card">
  <a class="btn primary" href="growth-closer.md">Growth closer</a>
  <a class="btn" href="growth-radar.md">Radar</a>
  <a class="btn" href="phase24-ops.html">Courier</a>
  <a class="btn" href="signal-forge.json">Forge JSON</a>
  <a class="btn" href="../../../../SEO-GUIDE.md">SEO-GUIDE.md</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: forge.generatedAt,
    phase: '25',
    origin,
    forge,
    live: live.data,
    growth: { opportunityCount: growth.data?.opportunityCount },
    closer: closer.data,
    humanDebt: debt.data,
    unlockPercent: unlock.data?.percent ?? null,
    score,
    steps,
  };

  await writeFile(resolve(outDir, 'phase25-ops.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'phase25-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase25-advance.md'),
    [
      `# Phase 25 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Opportunities **${forge.opportunityCount}** · closed **${forge.closedCount}**`,
      `- Live throne **${sealed ? 'SEALED' : 'PENDING'}**`,
      `- ${p24.message}`,
      '',
      forge.boardLine,
      '',
      'Open **`phase25-ops.html`**. Forever: **`npm run meridian:observe`**.',
      '',
    ].join('\n'),
    'utf8'
  );

  const ledger = await syncAppendixLedger(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'ledger', ok: ledger.ok !== false, message: ledger.message });
  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon', ok: canon.ok !== false, message: canon.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase25-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

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
      { id: 'phase25-advance', ok: true, message: forge.boardLine, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase25-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '25'),
    {
      id: '25',
      name: 'Phase 25 Growth Closer',
      file: 'phase25-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase25-ops.html',
    },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  return {
    ok: p24.ok !== false && closer.ok !== false,
    status: growthClosed && sealed ? 'ok' : 'pending',
    message: `Phase 25 forge · closed ${forge.closedCount}/${forge.opportunityCount} · hasMap ${live.data?.hasMap ? 'LIVE' : 'pending'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase25-ops.html'),
        md: resolve(outDir, 'phase25-advance.md'),
        closer: resolve(outDir, 'growth-closer.json'),
        forge: resolve(outDir, 'signal-forge.json'),
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      {
        code: growthClosed ? 'PHASE25_FORGE_CLOSED' : 'PHASE25_FORGE',
        severity: 'low',
        title: growthClosed ? 'Growth closer bridged radar opportunities' : 'Growth closer awaiting apply',
        remediation: 'Keep npm run meridian:observe.',
        owner: 'developer',
        pillar: 'content',
      },
    ],
  };
}
