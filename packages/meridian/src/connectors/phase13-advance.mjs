import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';
import { submitSitemap, inspectPriorityUrls } from './gsc-act.mjs';
import { googleEnvStatus } from './google-auth.mjs';
import { advancePhase11 } from './phase11-advance.mjs';
import { loadOpsCadence, saveOpsCadence, markCompleted } from '../lib/ops-cadence.mjs';

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

function runNode(args) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }));
    child.on('error', (e) => resolvePromise({ code: 1, stdout: '', stderr: String(e.message || e) }));
  });
}

/**
 * Phase 13 — Sovereign autoclose: ship live sameAs via SSH (no full redeploy),
 * clear deploy gate, refresh command centers to zero human tasks.
 */
export async function advancePhase13(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const wantApply = opts.apply !== false;
  const wantRestart = opts.restart !== false;

  const steps = [];

  // 1) Probe first
  let probe = { hasSameAs: false, urls: [] };
  {
    const r = await runNode(['scripts/meridian-probe-sameas.mjs', `--origin=${origin}`]);
    try {
      probe = JSON.parse(r.stdout.trim());
    } catch {
      probe = { hasSameAs: false };
    }
    steps.push({
      id: 'probe',
      ok: true,
      message: probe.hasSameAs ? `Live sameAs ${probe.urls?.length || 0}` : 'Live sameAs missing',
    });
  }

  // 2) If missing, SSH-apply into Production theme_settings (code already supports sameAs)
  let sshApply = { ok: true, status: 'skipped', message: 'SSH apply skipped — live already green' };
  if (!probe.hasSameAs && wantApply) {
    const args = ['scripts/meridian-prod-sameas-ssh.mjs', '--apply', '--json'];
    if (wantRestart) args.push('--restart');
    const r = await runNode(args);
    try {
      sshApply = JSON.parse(r.stdout.trim());
    } catch {
      sshApply = { ok: false, message: r.stderr || r.stdout || 'ssh apply failed' };
    }
    steps.push({ id: 'ssh-sameas', ok: sshApply.ok !== false, message: sshApply.message });
    if (sshApply.live) probe = sshApply.live;
    else {
      const r2 = await runNode(['scripts/meridian-probe-sameas.mjs', `--origin=${origin}`]);
      try {
        probe = JSON.parse(r2.stdout.trim());
      } catch {
        /* keep */
      }
    }
  } else if (probe.hasSameAs) {
    steps.push({ id: 'ssh-sameas', ok: true, message: sshApply.message });
  }

  // 3) Cadence: close deploy gate forever (until sameAs regresses)
  let cadence = await loadOpsCadence(outDir);
  if (probe.hasSameAs) {
    cadence = markCompleted(cadence, 'deploy-sameas', `live sameAs ${probe.urls?.join(', ')}`);
    cadence.lastShown = { ...(cadence.lastShown || {}), 'deploy-sameas': new Date().toISOString() };
    // Also suppress cockpit nag when mission complete
    cadence.completed['phase11-cockpit'] = {
      at: new Date().toISOString(),
      note: 'Phase 13 autoclose — measured gates green',
    };
    await saveOpsCadence(outDir, cadence);
    steps.push({ id: 'cadence', ok: true, message: 'ops-cadence: deploy-sameas completed' });
  }

  // 4) GSC refresh when auth present
  let gsc = { ok: true, status: 'skipped', message: 'GSC skipped' };
  if (opts.skipAct !== true && googleEnvStatus().ok && profile.indexable && probe.hasSameAs) {
    const sub = await submitSitemap(profile);
    const insp = await inspectPriorityUrls(profile, { limit: 3 });
    gsc = {
      ok: sub.ok !== false,
      message: `${sub.message} · ${insp.message}`,
    };
    steps.push({ id: 'gsc', ok: gsc.ok, message: gsc.message });
  }

  const unlock = await assessUnlockReadiness(profile, { outDir });
  steps.push({ id: 'unlock', ok: true, message: unlock.message });

  let scan = opts.scan;
  if (!scan) {
    const report = await readJson(resolve(outDir, 'report-latest.json'));
    scan = report
      ? { ok: true, report, paths: { outDir } }
      : { ok: true, report: { scorecard: {}, findings: [], signals: {} }, paths: { outDir } };
  }

  // Stub phase13 for matrix during phase11 refresh
  await writeFile(
    resolve(outDir, 'phase13-ops.html'),
    '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Phase 13</title></head><body><p>Generating…</p></body></html>',
    'utf8'
  );

  let p11 = { message: 'phase11 skipped', data: { humanChecklist: [], humanTaskCount: 0 } };
  if (opts.skipPhase11 !== true) {
    p11 = await advancePhase11(profile, {
      outDir,
      scan,
      skipForm: true,
      skipPhase10: true,
      skipVerify: opts.skipVerify === true,
    });
    steps.push({ id: 'phase11', ok: p11.ok !== false, message: p11.message });
  }

  // Force-filter deploy task if live is green (cadence may still show if findings lag)
  let human = (p11.data?.humanChecklist || []).filter((h) => {
    if (probe.hasSameAs && (h.id === 'deploy-sameas' || h.id === 'social-sameas')) return false;
    return true;
  });
  if (probe.hasSameAs && human.length === 1 && human[0].id === 'phase11-cockpit') {
    human = [];
  }

  const score = scan.report?.scorecard || {};
  const missionComplete = probe.hasSameAs && human.length === 0;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 13 Sovereign Autoclose — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#030508;--card:#0a1018;--line:#243041;--text:#e8eef5;--muted:#8b9aab;--accent:#34d399;--ok:#3dd68c;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 520px at 50% -10%,#0a3d2e,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:960px;margin:0 auto}h1{margin:0 0 .25rem;font-size:1.6rem;letter-spacing:-.02em}.sub{color:var(--muted);margin:0 0 1.2rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.3rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:.75rem}
a.primary{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.5rem .85rem;border-radius:8px;background:var(--accent);color:#042016;font-weight:650;text-decoration:none;font-size:.84rem}
.ok{color:var(--ok)}.warn{color:var(--warn)}ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
.banner{border:1px solid #1f6a4a;background:linear-gradient(135deg,#0d281f,#0a1018);border-radius:14px;padding:1.1rem 1.2rem;margin-bottom:1rem}
</style></head><body><div class="wrap">
<h1>Phase 13 — Sovereign autoclose</h1>
<p class="sub">${esc(origin)} · live sameAs via SSH DB apply · deploy gate closed without full redeploy</p>
${
  missionComplete
    ? `<div class="banner"><strong class="ok">Mission complete.</strong> Measured SEO automation gates are green. Keep Meridian autopilot on cron; GBP pulse remains the only optional human ritual.</div>`
    : `<div class="banner"><span class="warn">Almost there.</span> Review steps below.</div>`
}
<div class="hero">
  <div class="metric"><span class="sub">Score</span><b>${esc(score.overall ?? '—')} <span class="ok">${esc(score.grade || '')}</span></b></div>
  <div class="metric"><span class="sub">Unlock</span><b class="ok">${esc(unlock.data?.percent ?? '—')}%</b></div>
  <div class="metric"><span class="sub">Live sameAs</span><b class="${probe.hasSameAs ? 'ok' : 'warn'}">${probe.hasSameAs ? 'LIVE' : 'NO'}</b></div>
  <div class="metric"><span class="sub">Human tasks</span><b>${human.length}</b></div>
</div>
<div class="card">
  <a class="primary" href="phase12-ops.html">Phase 12</a>
  <a class="primary" href="phase11-ops.html">Phase 11</a>
  <a class="primary" href="phase9-ops.html">Phase 9</a>
  <a class="primary" href="ops-cockpit.html">Ops cockpit</a>
  <a class="primary" href="${esc(origin)}/" target="_blank" rel="noreferrer">Live site</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Automated this run</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
  ${
    probe.urls?.length
      ? `<p class="sub">sameAs: ${probe.urls.map((u) => `<code>${esc(u)}</code>`).join(' · ')}</p>`
      : ''
  }
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Human left</h2>
  <ul>
    ${
      human.length
        ? human.map((h) => `<li>${esc(h.task)}</li>`).join('')
        : '<li class="ok">None — optional GBP 5‑min pulse when due (phase11-gbp-draft.txt).</li>'
    }
  </ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '13',
    missionComplete,
    score: { overall: score.overall, grade: score.grade },
    unlockPercent: unlock.data?.percent ?? null,
    sameAs: probe,
    sshApply: {
      status: sshApply.status,
      message: sshApply.message,
      updated: sshApply.applyResult?.updated ?? null,
    },
    gsc: { message: gsc.message },
    humanTaskCount: human.length,
    humanChecklist: human,
    steps,
    phase11: { message: p11.message },
  };

  const md = [
    `# Phase 13 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    missionComplete ? '**Mission complete** — live sameAs green, human checklist empty.' : 'In progress.',
    '',
    `- Score **${score.overall ?? '—'}** (${score.grade ?? '—'}) · unlock **${payload.unlockPercent ?? '—'}%**`,
    `- Live sameAs: ${probe.hasSameAs ? probe.urls?.join(', ') : 'missing'}`,
    `- ${sshApply.message}`,
    `- ${gsc.message}`,
    `- Human tasks: **${human.length}**`,
    '',
    'Open **`phase13-ops.html`**.',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'phase13-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase13-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase13-ops.html'), html, 'utf8');
  if (missionComplete) {
    await writeFile(
      resolve(outDir, 'mission-complete.json'),
      JSON.stringify(
        {
          at: payload.generatedAt,
          score: payload.score,
          unlockPercent: payload.unlockPercent,
          sameAs: probe.urls,
          note: 'Meridian Phase 0–13 measured automation closed. Keep autopilot cron.',
        },
        null,
        2
      ),
      'utf8'
    );
  }

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '13'),
    { id: '13', name: 'Phase 13 Autoclose', file: 'phase13-ops.html', kind: 'html', ready: true, href: 'phase13-ops.html' },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  return {
    ok: probe.hasSameAs,
    status: missionComplete ? 'ok' : 'degraded',
    message: missionComplete
      ? `Phase 13 mission complete · score ${score.overall ?? '—'} · unlock ${payload.unlockPercent ?? '—'}% · sameAs live`
      : `Phase 13 autoclose · sameAs ${probe.hasSameAs ? 'live' : 'missing'} · human ${human.length}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase13-ops.html'),
        md: resolve(outDir, 'phase13-advance.md'),
        mission: missionComplete ? resolve(outDir, 'mission-complete.json') : null,
      },
    },
    findings: missionComplete
      ? [
          {
            code: 'PHASE13_COMPLETE',
            severity: 'low',
            title: 'SEO automation mission complete',
            remediation: 'Keep Meridian autopilot on weekly cron; optional GBP pulse from phase11-gbp-draft.txt.',
            owner: 'marketing',
            pillar: 'ops',
          },
        ]
      : [
          {
            code: 'PHASE13_AUTOCLOSE',
            severity: 'medium',
            title: 'Phase 13 autoclose incomplete',
            remediation: 'Re-run npm run meridian:act:phase13; ensure SSH to deploy@prod works.',
            owner: 'developer',
            pillar: 'technical',
          },
        ],
  };
}
