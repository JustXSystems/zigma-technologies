import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase22 } from './phase22-advance.mjs';
import { probeLiveThrone } from './live-throne-probe.mjs';
import { runGrowthRadar } from './growth-radar.mjs';
import { assessHumanDebt } from './human-debt.mjs';
import { syncSeoGuideCanon } from './canon-sync.mjs';
import { syncAppendixLedger } from './ledger-sync.mjs';
import { advancePhase9 } from './phase9-advance.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';

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

function runNode(args) {
  return new Promise((resolveP) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolveP({ code, stdout, stderr }));
  });
}

/**
 * Phase 23 — Eternal Horizon.
 * Post-mission epoch: seal Quiet Throne on Production (hasMap), growth radar from GSC, optional deploy.
 */
export async function advancePhase23(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p22 = { ok: true, message: 'phase22 skipped', data: {} };
  if (opts.skipThrone !== true) {
    p22 = await advancePhase22(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
      skipObserve: opts.skipObserve === true,
      skipDesk: opts.skipDesk === true,
      skipPresence: opts.skipPresence === true,
      ack: opts.ack === true,
      parkGbp: opts.parkGbp !== false,
      gscProxy: opts.gscProxy !== false,
    });
    steps.push({ id: 'phase22', ok: p22.ok !== false, message: p22.message });
  }

  const live = await probeLiveThrone(profile, { outDir });
  steps.push({ id: 'live-throne', ok: live.ok !== false, message: live.message });

  const growth = await runGrowthRadar(profile, { outDir });
  steps.push({ id: 'growth-radar', ok: growth.ok !== false, message: growth.message });

  const triggerDeploy =
    opts.triggerDeploy === true || process.env.MERIDIAN_TRIGGER_DEPLOY === '1';
  let deploy = { ok: true, message: 'deploy check skipped', triggered: false, command: '' };
  if (opts.skipDeploy !== true) {
    const args = ['scripts/meridian-deploy-prod.mjs', '--json'];
    if (triggerDeploy && live.data?.needsDeploy) args.push('--trigger');
    const r = await runNode(args);
    try {
      deploy = JSON.parse(r.stdout.trim());
    } catch {
      deploy = { ok: r.code === 0, message: r.stderr || r.stdout || 'deploy script', triggered: false };
    }
    await writeFile(resolve(outDir, 'phase23-deploy.json'), JSON.stringify(deploy, null, 2), 'utf8');
    steps.push({ id: 'deploy', ok: deploy.ok !== false, message: deploy.message });
  }

  // Re-probe after optional trigger (best-effort; deploy is async)
  let liveAfter = live;
  if (deploy.triggered && opts.skipDeploy !== true) {
    liveAfter = await probeLiveThrone(profile, { outDir });
    steps.push({ id: 'live-throne-reprobe', ok: liveAfter.ok !== false, message: liveAfter.message });
  }

  const debt = await assessHumanDebt(profile, { outDir, parkGbp: true });
  const unlock = await assessUnlockReadiness(profile, { outDir });
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const throne = await readJson(resolve(outDir, 'quiet-throne.json'));
  const score = observatory?.score || archive?.score || report?.scorecard || {};

  const liveSealed = liveAfter.data?.liveThrone === true;
  const horizon = {
    generatedAt: new Date().toISOString(),
    phase: '23',
    origin,
    missionComplete: throne?.missionComplete === true,
    liveThrone: liveSealed,
    needsDeploy: liveAfter.data?.needsDeploy === true,
    growthOpportunities: growth.data?.opportunityCount ?? 0,
    deploy: {
      message: deploy.message,
      triggered: !!deploy.triggered,
      command: deploy.command || 'gh workflow run "Deploy Production" -f confirm_production=DEPLOY_PROD',
    },
    boardLine: liveSealed
      ? 'Eternal horizon — live throne sealed; growth radar steering content.'
      : 'Eternal horizon — deploy Production to seal hasMap on live JSON-LD; growth radar already online.',
  };
  await writeFile(resolve(outDir, 'eternal-horizon.json'), JSON.stringify(horizon, null, 2), 'utf8');

  const oppRows = (growth.data?.opportunities || [])
    .slice(0, 8)
    .map(
      (o) =>
        `<tr><td>${esc(o.query)}</td><td>${esc(o.impressions)}</td><td>${esc((o.ctr * 100).toFixed(1))}%</td><td>${esc(o.position)}</td><td>${esc(o.kind)}</td></tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 23 Eternal Horizon — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#010308;--card:#0a1018;--line:#1c2836;--text:#e8eef8;--muted:#8799ad;--accent:#7eb8ff;--gold:#c9a227;--ok:#2fd67b;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(1000px 520px at 70% -20%,#122038,transparent),radial-gradient(700px 400px at 0% 10%,#1a1408,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.6rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem;font-size:.9rem}
.banner{border:1px solid ${liveSealed ? '#2a5c3a' : '#3a4a68'};background:linear-gradient(105deg,${liveSealed ? '#0e2418' : '#0e1828'},#0a1018 55%);border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.25rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#142030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#041018;border:0}
.ok{color:var(--ok)}.warn{color:var(--warn)}code{font-size:.78rem;background:#142030;padding:.1rem .35rem;border-radius:4px}
table{width:100%;border-collapse:collapse;font-size:.82rem}td,th{border-bottom:1px solid var(--line);padding:.4rem .3rem;text-align:left}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${liveSealed ? 'ok' : 'warn'}">${liveSealed ? 'LIVE THRONE SEALED' : 'HORIZON — DEPLOY TO SEAL LIVE THRONE'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(horizon.boardLine)}</p>
</div>
<h1>Phase 23 — Eternal horizon</h1>
<p class="sub">${esc(origin)} · post-mission growth epoch · live seal + GSC radar</p>
<div class="hero">
  <div class="metric"><span class="sub">Score</span><b class="ok">${esc(score.overall ?? '—')} ${esc(score.grade || '')}</b></div>
  <div class="metric"><span class="sub">Live hasMap</span><b class="${liveAfter.data?.hasMap ? 'ok' : 'warn'}">${liveAfter.data?.hasMap ? 'YES' : 'NO'}</b></div>
  <div class="metric"><span class="sub">Growth ops</span><b>${esc(growth.data?.opportunityCount ?? '—')}</b></div>
  <div class="metric"><span class="sub">Debt</span><b class="ok">${esc(debt.data?.debtScore ?? '—')}</b></div>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Production seal</h2>
  <ul>
    <li>sameAs live: <strong class="${liveAfter.data?.sameAs ? 'ok' : 'warn'}">${liveAfter.data?.sameAs ? 'YES' : 'NO'}</strong> (${esc(liveAfter.data?.sameAsCount ?? 0)})</li>
    <li>hasMap live: <strong class="${liveAfter.data?.hasMap ? 'ok' : 'warn'}">${liveAfter.data?.hasMap ? 'YES' : 'NO'}</strong></li>
    <li>Deploy: ${esc(deploy.message)}${deploy.triggered ? ' · <span class="ok">triggered</span>' : ''}</li>
  </ul>
  ${
    liveAfter.data?.needsDeploy
      ? `<p class="sub">One command (when <code>gh</code> authed):</p><code>${esc(horizon.deploy.command)}</code>
         <p class="sub" style="margin-top:.5rem">Or: <code>MERIDIAN_TRIGGER_DEPLOY=1 npm run meridian:observe</code></p>`
      : '<p class="ok">Production JSON-LD matches Quiet Throne expectations.</p>'
  }
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Growth radar</h2>
  <table><thead><tr><th>Query</th><th>Imp</th><th>CTR</th><th>Pos</th><th>Kind</th></tr></thead>
  <tbody>${oppRows || '<tr><td colspan="5">No high-signal opportunities this cycle</td></tr>'}</tbody></table>
  <p style="margin:.7rem 0 0">
    <a class="btn" href="growth-radar.md">Full radar</a>
    <a class="btn" href="growth-briefs.json">Briefs JSON</a>
  </p>
</div>
<div class="card">
  <a class="btn primary" href="live-throne.md">Live throne report</a>
  <a class="btn" href="phase22-ops.html">Quiet throne</a>
  <a class="btn" href="sovereign-certificate.html">Certificate</a>
  <a class="btn" href="SEO-GUIDE.md">SEO-GUIDE.md</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
</div></body></html>`;

  await writeFile(resolve(outDir, 'phase23-ops.html'), html, 'utf8');
  await writeFile(
    resolve(outDir, 'phase23-advance.md'),
    [
      `# Phase 23 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${horizon.generatedAt}`,
      '',
      `- Live throne **${liveSealed ? 'SEALED' : 'PENDING'}** · hasMap **${liveAfter.data?.hasMap ? 'yes' : 'no'}**`,
      `- Growth opportunities **${growth.data?.opportunityCount ?? 0}**`,
      `- ${p22.message}`,
      `- Deploy: ${deploy.message}`,
      '',
      horizon.boardLine,
      '',
      'Open **`phase23-ops.html`**.',
      '',
    ].join('\n'),
    'utf8'
  );

  const payload = {
    generatedAt: horizon.generatedAt,
    phase: '23',
    origin,
    horizon,
    live: liveAfter.data,
    growth: {
      opportunityCount: growth.data?.opportunityCount,
      opportunities: growth.data?.opportunities,
    },
    humanDebt: debt.data,
    unlockPercent: unlock.data?.percent ?? null,
    score,
    steps,
  };
  await writeFile(resolve(outDir, 'phase23-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const ledger = await syncAppendixLedger(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'ledger', ok: ledger.ok !== false, message: ledger.message });
  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon', ok: canon.ok !== false, message: canon.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase23-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

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
      { id: 'phase23-advance', ok: true, message: horizon.boardLine, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase23-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '23'),
    {
      id: '23',
      name: 'Phase 23 Eternal Horizon',
      file: 'phase23-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase23-ops.html',
    },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  return {
    ok: p22.ok !== false && live.ok !== false,
    status: liveSealed ? 'ok' : 'pending',
    message: `Phase 23 horizon · live ${liveSealed ? 'SEALED' : 'pending deploy'} · growth ${growth.data?.opportunityCount ?? 0} · debt ${debt.data?.debtScore ?? '—'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase23-ops.html'),
        md: resolve(outDir, 'phase23-advance.md'),
        live: liveAfter.data?.paths?.json || resolve(outDir, 'live-throne.json'),
        growth: growth.data?.paths?.md,
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      {
        code: liveSealed ? 'PHASE23_LIVE_SEALED' : 'PHASE23_DEPLOY_HASMAP',
        severity: liveSealed ? 'low' : 'medium',
        title: liveSealed ? 'Live throne sealed on Production' : 'Deploy Production to emit hasMap on live JSON-LD',
        remediation: liveSealed
          ? 'Keep npm run meridian:observe — growth radar refreshes each cycle.'
          : deploy.command ||
            'gh workflow run "Deploy Production" -f confirm_production=DEPLOY_PROD (or MERIDIAN_TRIGGER_DEPLOY=1)',
        owner: 'developer',
        pillar: 'technical',
      },
    ],
  };
}
