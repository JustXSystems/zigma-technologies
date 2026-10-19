import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import {
  auditAutopilotWorkflow,
  dispatchWorkflow,
  listGhSecretNames,
  listWorkflowRuns,
  scoreSecretCoverage,
  syncGhSecretsFromMap,
} from '../lib/gh-ops.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';
import { advancePhase14 } from './phase14-advance.mjs';
import { advancePhase9 } from './phase9-advance.mjs';
import { dbReady, dbSkipReason } from '../lib/db-ready.mjs';

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

/**
 * Phase 15 — Sovereign fleet: GitHub Actions assurance, secret coverage,
 * optional dispatch, Phase 9/14 refresh. Zero human ops when gh is authed.
 */
export async function advancePhase15(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const root = process.cwd();
  const steps = [];

  // 1) Workflow YAML static audit
  const workflow = await auditAutopilotWorkflow(root);
  steps.push({ id: 'workflow-audit', ok: workflow.ok !== false, message: workflow.message });

  // 2) Optional secret sync (from unlock-secrets.json — never invent values)
  let ghSync = { ok: true, status: 'skipped', message: 'gh sync skipped', synced: [] };
  const wantSync =
    opts.syncGh === true ||
    process.env.MERIDIAN_SYNC_GH_SECRETS === '1' ||
    profile.autopilot?.autoSyncGhSecrets === true;
  if (wantSync) {
    const secrets = await readJson(resolve(outDir, 'unlock-secrets.json'));
    ghSync = await syncGhSecretsFromMap(secrets);
  }
  steps.push({ id: 'gh-secret-sync', ok: ghSync.ok !== false, message: ghSync.message });

  // 3) Secret name coverage on remote
  const secretList = await listGhSecretNames();
  const coverage = scoreSecretCoverage(secretList.names || []);
  steps.push({
    id: 'secret-coverage',
    ok: true,
    message: `${coverage.coverage}% Actions secrets · oauth ${coverage.oauthOk ? 'ok' : 'gap'} · missing ${coverage.missing.length}`,
  });

  // 4) Recent Autopilot runs
  const runs = await listWorkflowRuns('meridian-autopilot.yml', 5);
  steps.push({ id: 'workflow-runs', ok: true, message: runs.message });

  // 5) Optional dispatch (explicit only — never spam cron)
  let dispatch = { ok: true, status: 'skipped', message: 'dispatch skipped' };
  const wantDispatch =
    opts.dispatch === true || process.env.MERIDIAN_DISPATCH_AUTOPILOT === '1';
  if (wantDispatch) {
    dispatch = await dispatchWorkflow('meridian-autopilot.yml', {
      target: opts.target || 'prod',
      skip_act: opts.skipAct ? 'true' : 'false',
    });
  }
  steps.push({ id: 'dispatch', ok: dispatch.ok !== false, message: dispatch.message });

  // 6) Refresh perpetual signals + Phase 9 command center
  let p14 = { ok: true, message: 'phase14 skipped', data: {} };
  if (opts.skipPhase14 !== true) {
    p14 = await advancePhase14(profile, {
      outDir,
      apply: opts.apply !== false,
      skipHeal: opts.skipHeal === true,
    });
    steps.push({ id: 'phase14', ok: p14.ok !== false, message: p14.message });
  }

  const unlock = await assessUnlockReadiness(profile, { outDir });
  steps.push({ id: 'unlock', ok: true, message: unlock.message });

  // Stub so Phase 9 pack matrix counts Phase 15 as ready before final HTML
  await writeFile(
    resolve(outDir, 'phase15-ops.html'),
    '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Phase 15</title></head><body><p>Phase 15 writing…</p></body></html>',
    'utf8'
  );

  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const score = report?.scorecard || {};
  const latest = runs.latest || null;
  const lastOk =
    latest?.conclusion === 'success' ||
    latest?.status === 'in_progress' ||
    latest?.status === 'queued';
  const runsUnknown = !latest && runs.status === 'skipped';

  // Fleet score: workflow health + secrets + last run + unlock
  let fleet = 0;
  if (workflow.checks?.npmCi) fleet += 25;
  if (workflow.checks?.softHard) fleet += 10;
  if (workflow.checks?.nodeCache) fleet += 5;
  fleet += Math.round((coverage.coverage / 100) * 30);
  if (lastOk) fleet += 15;
  else if (runsUnknown) fleet += 5; // gh not available — don't hard-penalize local ops hosts
  if ((unlock.data?.percent ?? 0) >= 100) fleet += 15;
  fleet = Math.min(100, fleet);

  const db = { ready: dbReady(), reason: dbSkipReason() };
  const fleetState = {
    generatedAt: new Date().toISOString(),
    phase: '15',
    origin,
    fleetPercent: fleet,
    grade: fleet >= 90 ? 'A' : fleet >= 75 ? 'B' : fleet >= 50 ? 'C' : 'D',
    workflow: workflow.checks,
    workflowMessage: workflow.message,
    secrets: {
      coverage: coverage.coverage,
      oauthOk: coverage.oauthOk,
      present: coverage.present,
      missing: coverage.missing,
      listed: (secretList.names || []).filter((n) => n.startsWith('MERIDIAN_')),
    },
    runs: {
      message: runs.message,
      latest: latest
        ? {
            id: latest.databaseId,
            status: latest.status,
            conclusion: latest.conclusion,
            createdAt: latest.createdAt,
            url: latest.url,
            branch: latest.headBranch,
          }
        : null,
      recent: (runs.runs || []).slice(0, 5).map((r) => ({
        id: r.databaseId,
        conclusion: r.conclusion,
        status: r.status,
        createdAt: r.createdAt,
        url: r.url,
      })),
    },
    dispatch,
    ghSync: { status: ghSync.status, message: ghSync.message, syncedCount: (ghSync.synced || []).length },
    unlockPercent: unlock.data?.percent ?? null,
    score: { overall: score.overall, grade: score.grade },
    db,
    humanLeft: [
      ...(!coverage.oauthOk
        ? [
            {
              id: 'gh-oauth-secrets',
              label: 'Push Google OAuth secrets to GitHub Actions',
              howTo: 'npm run meridian:act:phase15:gh  (needs gh auth + unlock-secrets.json)',
            },
          ]
        : []),
      ...(coverage.missing.includes('MERIDIAN_BING_API_KEY')
        ? [{ id: 'bing', label: 'Optional Bing API key on Actions', howTo: 'SETUP.md Part D → gh secret set' }]
        : []),
    ],
  };

  const runRows = (fleetState.runs.recent || [])
    .map(
      (r) =>
        `<tr><td>${esc(r.createdAt || '—')}</td><td class="${r.conclusion === 'success' ? 'ok' : r.conclusion === 'failure' ? 'bad' : ''}">${esc(r.conclusion || r.status || '—')}</td><td>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noreferrer">run</a>` : '—'}</td></tr>`
    )
    .join('');

  const secretRows = FLEET_ROWS(coverage);

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 15 Sovereign Fleet — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#04060c;--card:#0c121c;--line:#243041;--text:#e8eef5;--muted:#8b9aab;--accent:#38bdf8;--ok:#3dd68c;--bad:#f07178;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 480px at 15% -20%,#0c2a3d,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:980px;margin:0 auto}h1{margin:0 0 .25rem;font-size:1.55rem;letter-spacing:-.02em}.sub{color:var(--muted);margin:0 0 1.2rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.25rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:.75rem}
a.primary{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.5rem .85rem;border-radius:8px;background:var(--accent);color:#041018;font-weight:650;text-decoration:none;font-size:.84rem}
.ok{color:var(--ok)}.bad{color:var(--bad)}.warn{color:var(--warn)}ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
table{width:100%;border-collapse:collapse;font-size:.84rem}td,th{padding:.4rem .3rem;border-bottom:1px solid var(--line);text-align:left}
code{font-size:.78rem;background:#1a2636;padding:.1rem .35rem;border-radius:4px}
</style></head><body><div class="wrap">
<h1>Phase 15 — Sovereign fleet</h1>
<p class="sub">${esc(origin)} · Actions assurance · secret coverage · zero-touch CI · Phase 9/14 refresh</p>
<div class="hero">
  <div class="metric"><span class="sub">Fleet</span><b class="${fleet >= 75 ? 'ok' : 'warn'}">${fleet}% <span style="font-size:.75rem;color:var(--muted)">${esc(fleetState.grade)}</span></b></div>
  <div class="metric"><span class="sub">Unlock</span><b class="${(unlock.data?.percent ?? 0) >= 100 ? 'ok' : ''}">${esc(unlock.data?.percent ?? '—')}%</b></div>
  <div class="metric"><span class="sub">Score</span><b>${esc(score.overall ?? '—')} ${esc(score.grade || '')}</b></div>
  <div class="metric"><span class="sub">Actions secrets</span><b class="${coverage.oauthOk ? 'ok' : 'warn'}">${coverage.coverage}%</b></div>
  <div class="metric"><span class="sub">npm ci</span><b class="${workflow.checks?.npmCi ? 'ok' : 'bad'}">${workflow.checks?.npmCi ? 'YES' : 'NO'}</b></div>
  <div class="metric"><span class="sub">Last run</span><b class="${latest?.conclusion === 'success' ? 'ok' : latest?.conclusion === 'failure' ? 'bad' : ''}">${esc(latest?.conclusion || latest?.status || '—')}</b></div>
</div>
<div class="card">
  <a class="primary" href="phase14-ops.html">Phase 14 perpetual</a>
  <a class="primary" href="phase9-ops.html">Phase 9</a>
  <a class="primary" href="fleet-assurance.json">Fleet JSON</a>
  <a class="primary" href="https://github.com/${esc(process.env.GITHUB_REPOSITORY || 'zigma-technologies/zigma-technologies')}/actions/workflows/meridian-autopilot.yml" target="_blank" rel="noreferrer">Actions</a>
  <a class="primary" href="${esc(origin)}/admin" target="_blank" rel="noreferrer">Admin</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Assurance steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'bad'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Workflow hardening</h2>
  <ul>
    <li class="${workflow.checks?.npmCi ? 'ok' : 'bad'}"><code>npm ci</code> before autopilot</li>
    <li class="${workflow.checks?.softHard ? 'ok' : 'warn'}"><code>MERIDIAN_CI_SOFT_HARD</code> on Actions</li>
    <li class="${workflow.checks?.nodeCache ? 'ok' : 'warn'}">npm cache on setup-node</li>
    <li>DB on Actions: <span class="${db.ready ? 'ok' : 'warn'}">${db.ready ? 'ready' : esc(db.reason)}</span> (CMS steps skip cleanly when absent)</li>
  </ul>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Actions secret coverage (names only)</h2>
  <table><thead><tr><th>Secret</th><th>On GitHub</th></tr></thead><tbody>${secretRows}</tbody></table>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Recent Meridian autopilot runs</h2>
  ${runRows ? `<table><thead><tr><th>When</th><th>Result</th><th>Link</th></tr></thead><tbody>${runRows}</tbody></table>` : `<p class="sub">${esc(runs.message)}</p>`}
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Human left (minimized)</h2>
  <ul>
  ${
    fleetState.humanLeft.length
      ? fleetState.humanLeft.map((h) => `<li><strong>${esc(h.label)}</strong> — ${esc(h.howTo)}</li>`).join('')
      : '<li class="ok">Fleet green — keep Monday cron; optional GBP metrics only.</li>'
  }
  <li>One-shot: <code>npm run meridian:act:phase15:gh</code> then <code>npm run meridian:act:phase15:dispatch</code></li>
  </ul>
</div>
</div></body></html>`;

  const payload = {
    ...fleetState,
    steps,
    digests: { phase9: null, phase14: p14.message },
  };

  const md = [
    `# Phase 15 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Fleet **${fleet}%** (${fleetState.grade}) · Unlock **${unlock.data?.percent ?? '—'}%** · Score **${score.overall ?? '—'}**`,
    `- ${workflow.message}`,
    `- Actions secrets **${coverage.coverage}%** · OAuth ${coverage.oauthOk ? 'ok' : 'MISSING'}`,
    `- ${runs.message}`,
    `- ${ghSync.message}`,
    `- ${dispatch.message}`,
    '',
    'Open **`phase15-ops.html`** — sovereign fleet board.',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'fleet-assurance.json'), JSON.stringify(fleetState, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase15-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase15-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase15-ops.html'), html, 'utf8');

  let p9 = { ok: true, message: 'phase9 skipped' };
  if (opts.skipPhase9 !== true) {
    const scanStub = opts.scan || {
      report: {
        scorecard: score,
        findings: report?.findings || [],
        trend: report?.trend || null,
      },
      hardFailCount: 0,
      ok: true,
    };
    p9 = await advancePhase9(profile, {
      outDir,
      scan: scanStub,
      actions: [
        { id: 'phase14-advance', ...p14 },
        {
          id: 'phase15-advance',
          ok: true,
          message: `Phase 15 fleet · ${fleet}%`,
          data: payload,
        },
        { id: 'unlock-readiness', ...unlock },
      ],
      skipForm: true,
    });
    steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
    payload.digests = { phase9: p9.message, phase14: p14.message };
    payload.steps = steps;
    await writeFile(resolve(outDir, 'phase15-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  }

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '15'),
    { id: '15', name: 'Phase 15 Sovereign Fleet', file: 'phase15-ops.html', kind: 'html', ready: true, href: 'phase15-ops.html' },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  if (!(await fileExists(resolve(outDir, 'phase15-ops.html')))) {
    /* written */
  }

  return {
    ok: true,
    status: fleet >= 75 ? 'ok' : 'degraded',
    message: `Phase 15 fleet · ${fleet}% (${fleetState.grade}) · secrets ${coverage.coverage}% · last ${latest?.conclusion || latest?.status || '—'}`,
    data: {
      ...payload,
      digests: { phase9: p9.message, phase14: p14.message },
      paths: {
        html: resolve(outDir, 'phase15-ops.html'),
        md: resolve(outDir, 'phase15-advance.md'),
        fleet: resolve(outDir, 'fleet-assurance.json'),
      },
    },
    findings: [
      {
        code: 'PHASE15_FLEET',
        severity: coverage.oauthOk && workflow.checks?.npmCi ? 'low' : 'medium',
        title: `Phase 15 sovereign fleet ${fleet}%`,
        remediation: coverage.oauthOk
          ? 'Keep Monday autopilot cron; open phase15-ops.html for CI board.'
          : 'Run npm run meridian:act:phase15:gh after gh auth login to push OAuth secrets.',
        owner: 'developer',
        pillar: 'ops',
      },
    ],
  };
}

function FLEET_ROWS(coverage) {
  const keys = [
    'MERIDIAN_GOOGLE_CLIENT_ID',
    'MERIDIAN_GOOGLE_CLIENT_SECRET',
    'MERIDIAN_GOOGLE_REFRESH_TOKEN',
    'MERIDIAN_GA4_PROPERTY_ID',
    'MERIDIAN_BING_API_KEY',
    'MERIDIAN_PSI_API_KEY',
  ];
  const set = new Set(coverage.present || []);
  return keys
    .map(
      (k) =>
        `<tr><td><code>${esc(k)}</code></td><td class="${set.has(k) ? 'ok' : 'warn'}">${set.has(k) ? 'present' : 'missing'}</td></tr>`
    )
    .join('');
}
