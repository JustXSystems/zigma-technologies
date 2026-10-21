import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase23 } from './phase23-advance.mjs';
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

/**
 * Phase 24 — Deploy Courier.
 * Autoclose live hasMap: SSH hot-patch + build + PM2 (preferred), else gh deploy pack.
 */
export async function advancePhase24(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p23 = { ok: true, message: 'phase23 skipped', data: {} };
  if (opts.skipHorizon !== true) {
    p23 = await advancePhase23(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
      skipObserve: opts.skipObserve === true,
      skipDesk: opts.skipDesk === true,
      skipPresence: opts.skipPresence === true,
      skipThrone: opts.skipThrone === true,
      skipDeploy: true, // courier owns ship path
      ack: opts.ack === true,
      parkGbp: opts.parkGbp !== false,
      gscProxy: opts.gscProxy !== false,
    });
    steps.push({ id: 'phase23', ok: p23.ok !== false, message: p23.message });
  }

  let live = await probeLiveThrone(profile, { outDir });
  steps.push({ id: 'live-probe', ok: live.ok !== false, message: live.message });

  const wantApply = opts.apply !== false;
  let hotpatch = { ok: true, status: 'skipped', message: 'hot-patch skipped — live hasMap already present' };
  if (live.data?.hasMap !== true && wantApply && opts.skipHotpatch !== true) {
    const args = ['scripts/meridian-prod-hasmap-ssh.mjs', '--apply', '--json'];
    if (opts.skipBuild === true) args.push('--skip-build');
    const r = await runNode(args, 960000);
    try {
      hotpatch = JSON.parse(r.stdout.trim());
    } catch {
      hotpatch = {
        ok: false,
        status: 'error',
        message: (r.stderr || r.stdout || `hotpatch exit ${r.code}`).trim().slice(0, 500),
      };
    }
    steps.push({ id: 'ssh-hasmap', ok: hotpatch.ok !== false, message: hotpatch.message });
    live = await probeLiveThrone(profile, { outDir });
    steps.push({ id: 'live-reprobe', ok: live.ok !== false, message: live.message });
  } else if (live.data?.hasMap === true) {
    steps.push({ id: 'ssh-hasmap', ok: true, message: hotpatch.message });
  } else if (!wantApply) {
    const dry = await runNode(['scripts/meridian-prod-hasmap-ssh.mjs', '--json']);
    try {
      hotpatch = JSON.parse(dry.stdout.trim());
    } catch {
      hotpatch = { ok: true, status: 'dry', message: 'dry-run unavailable' };
    }
    steps.push({ id: 'ssh-hasmap', ok: true, message: hotpatch.message });
  }

  // Fallback: gh Actions deploy if still missing and SSH failed / unavailable
  let ghDeploy = { ok: true, status: 'skipped', message: 'gh deploy skipped', triggered: false };
  const triggerGh =
    opts.triggerDeploy === true ||
    process.env.MERIDIAN_TRIGGER_DEPLOY === '1' ||
    (live.data?.hasMap !== true &&
      hotpatch.status === 'ssh_unavailable' &&
      opts.autoGhFallback !== false);
  if (live.data?.hasMap !== true && opts.skipDeploy !== true && (triggerGh || opts.forceGhDeploy)) {
    const args = ['scripts/meridian-deploy-prod.mjs', '--json'];
    if (triggerGh || opts.forceGhDeploy) args.push('--trigger');
    const r = await runNode(args, 120000);
    try {
      ghDeploy = JSON.parse(r.stdout.trim());
    } catch {
      ghDeploy = { ok: false, message: r.stderr || r.stdout || 'gh deploy failed' };
    }
    steps.push({ id: 'gh-deploy', ok: ghDeploy.ok !== false, message: ghDeploy.message });
  } else {
    steps.push({
      id: 'gh-deploy',
      ok: true,
      message: live.data?.hasMap
        ? 'gh deploy unnecessary — live sealed'
        : `gh deploy standby · ${ghDeploy.message || 'use --trigger-deploy if SSH unavailable'}`,
    });
  }

  const growth = await runGrowthRadar(profile, { outDir });
  steps.push({ id: 'growth-radar', ok: growth.ok !== false, message: growth.message });

  const debt = await assessHumanDebt(profile, { outDir, parkGbp: true });
  const unlock = await assessUnlockReadiness(profile, { outDir });
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const score = observatory?.score || archive?.score || report?.scorecard || {};
  const sealed = live.data?.liveThrone === true || (live.data?.hasMap === true && live.data?.sameAs === true);

  const courier = {
    generatedAt: new Date().toISOString(),
    phase: '24',
    origin,
    liveThrone: sealed,
    hasMapLive: live.data?.hasMap === true,
    hotpatch: {
      status: hotpatch.status,
      message: hotpatch.message,
      host: hotpatch.host,
    },
    ghDeploy: {
      status: ghDeploy.status,
      message: ghDeploy.message,
      triggered: !!ghDeploy.triggered,
      command: ghDeploy.command || 'gh workflow run "Deploy Production" -f confirm_production=DEPLOY_PROD',
    },
    boardLine: sealed
      ? 'Deploy courier — live throne SEALED; hasMap on Production JSON-LD.'
      : hotpatch.status === 'ssh_unavailable'
        ? 'Deploy courier — SSH unavailable; authenticate gh or fix deploy@ key, then re-run observe.'
        : 'Deploy courier — hot-patch attempted; re-probe or watch Actions if still pending.',
  };
  await writeFile(resolve(outDir, 'deploy-courier.json'), JSON.stringify(courier, null, 2), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 24 Deploy Courier — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#010208;--card:#0a1018;--line:#1c2836;--text:#e8eef8;--muted:#8799ad;--accent:#5eead4;--ok:#2fd67b;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 480px at 20% -10%,#123028,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.6rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem}
.banner{border:1px solid ${sealed ? '#2a5c3a' : '#3a5c58'};background:linear-gradient(105deg,${sealed ? '#0e2418' : '#0e201c'},#0a1018 55%);border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.25rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#142030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#04201a;border:0}
.ok{color:var(--ok)}.warn{color:var(--warn)}code{font-size:.78rem;background:#142030;padding:.1rem .35rem;border-radius:4px}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${sealed ? 'ok' : 'warn'}">${sealed ? 'LIVE THRONE SEALED' : 'DEPLOY COURIER ACTIVE'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(courier.boardLine)}</p>
</div>
<h1>Phase 24 — Deploy courier</h1>
<p class="sub">${esc(origin)} · SSH hot-patch preferred · gh Actions fallback · zero clipboard ritual</p>
<div class="hero">
  <div class="metric"><span class="sub">hasMap live</span><b class="${live.data?.hasMap ? 'ok' : 'warn'}">${live.data?.hasMap ? 'YES' : 'NO'}</b></div>
  <div class="metric"><span class="sub">Hot-patch</span><b>${esc(hotpatch.status || '—')}</b></div>
  <div class="metric"><span class="sub">Growth</span><b>${esc(growth.data?.opportunityCount ?? '—')}</b></div>
  <div class="metric"><span class="sub">Debt</span><b class="ok">${esc(debt.data?.debtScore ?? '—')}</b></div>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Ship path</h2>
  <ul>
    <li>SSH hot-patch: ${esc(hotpatch.message)}</li>
    <li>gh deploy: ${esc(ghDeploy.message)}</li>
  </ul>
  <p class="sub">Manual one-liners:</p>
  <code>npm run meridian:prod:hasmap</code>
  <br/><code>${esc(courier.ghDeploy.command)}</code>
</div>
<div class="card">
  <a class="btn primary" href="live-throne.md">Live throne</a>
  <a class="btn" href="phase23-ops.html">Horizon</a>
  <a class="btn" href="growth-radar.md">Growth radar</a>
  <a class="btn" href="deploy-courier.json">Courier JSON</a>
  <a class="btn" href="SEO-GUIDE.md">SEO-GUIDE.md</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: courier.generatedAt,
    phase: '24',
    origin,
    courier,
    live: live.data,
    growth: { opportunityCount: growth.data?.opportunityCount },
    humanDebt: debt.data,
    unlockPercent: unlock.data?.percent ?? null,
    score,
    steps,
  };

  await writeFile(resolve(outDir, 'phase24-ops.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'phase24-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase24-advance.md'),
    [
      `# Phase 24 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Live hasMap **${live.data?.hasMap ? 'YES' : 'NO'}** · throne **${sealed ? 'SEALED' : 'PENDING'}**`,
      `- Hot-patch: ${hotpatch.message}`,
      `- ${p23.message}`,
      '',
      courier.boardLine,
      '',
      'Open **`phase24-ops.html`**. One-liner: **`npm run meridian:prod:hasmap`**.',
      '',
    ].join('\n'),
    'utf8'
  );

  const ledger = await syncAppendixLedger(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'ledger', ok: ledger.ok !== false, message: ledger.message });
  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon', ok: canon.ok !== false, message: canon.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase24-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

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
      { id: 'phase24-advance', ok: true, message: courier.boardLine, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase24-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '24'),
    {
      id: '24',
      name: 'Phase 24 Deploy Courier',
      file: 'phase24-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase24-ops.html',
    },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  return {
    ok: p23.ok !== false,
    status: sealed ? 'ok' : 'pending',
    message: `Phase 24 courier · hasMap ${live.data?.hasMap ? 'LIVE' : 'pending'} · ${hotpatch.status || '—'} · growth ${growth.data?.opportunityCount ?? 0}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase24-ops.html'),
        md: resolve(outDir, 'phase24-advance.md'),
        courier: resolve(outDir, 'deploy-courier.json'),
        live: resolve(outDir, 'live-throne.json'),
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      {
        code: sealed ? 'PHASE24_LIVE_SEALED' : 'PHASE24_COURIER',
        severity: sealed ? 'low' : 'medium',
        title: sealed ? 'Deploy courier sealed live hasMap' : 'Deploy courier awaiting live hasMap',
        remediation: sealed
          ? 'Keep npm run meridian:observe.'
          : 'npm run meridian:prod:hasmap (SSH) or authenticate gh + MERIDIAN_TRIGGER_DEPLOY=1',
        owner: 'developer',
        pillar: 'technical',
      },
    ],
  };
}
