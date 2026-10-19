import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { draftMeta, applyMeta } from './meta-automation.mjs';
import { polishMeta } from './meta-polish.mjs';
import { advancePhase2 } from './phase2-advance.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';
import { advancePhase11 } from './phase11-advance.mjs';
import { runMeridian } from '../orchestrator.mjs';
import { markCompleted, loadOpsCadence, saveOpsCadence } from '../lib/ops-cadence.mjs';
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

async function probeLiveSameAs(origin) {
  const res = await fetch(`${origin}/`, {
    headers: { 'user-agent': 'MeridianPhase12/1.0', accept: 'text/html' },
  });
  const body = await res.text();
  const urls = [];
  const blocks = [...body.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of blocks) {
    try {
      const data = JSON.parse(m[1]);
      const nodes = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
      for (const n of nodes) {
        const sa = n?.sameAs;
        if (Array.isArray(sa)) urls.push(...sa.filter((u) => typeof u === 'string'));
        else if (typeof sa === 'string') urls.push(sa);
      }
    } catch {
      /* ignore */
    }
  }
  return { ok: res.ok, hasSameAs: urls.length > 0, urls: [...new Set(urls)] };
}

/**
 * Phase 12 — Score lift & closure: fill CMS meta, auto-publish calendar week, deploy gate, rescan.
 */
export async function advancePhase12(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const wantApply = opts.apply !== false;
  const triggerDeploy = opts.triggerDeploy === true || process.env.MERIDIAN_TRIGGER_DEPLOY === '1';

  const steps = [];

  // 1) sameAs ensure in CMS
  const p2 = await advancePhase2(profile, { outDir, apply: wantApply });
  steps.push({ id: 'phase2', message: p2.message, ok: p2.ok !== false });

  // 2) Draft + apply all missing CMS meta (pages/catalog/posts)
  const draftOut = resolve(outDir, 'meta-drafts.json');
  const drafted = await draftMeta(profile, { outFile: draftOut });
  steps.push({ id: 'draft-meta', message: drafted.message, ok: drafted.ok !== false, count: drafted.data?.count });
  let applied = { data: { updated: 0 } };
  if (wantApply && (drafted.data?.count || 0) > 0) {
    applied = await applyMeta(profile, { apply: true, force: true, file: draftOut });
    steps.push({ id: 'apply-meta', message: applied.message, ok: applied.ok !== false, updated: applied.data?.updated });
  }

  // 3) Length/brand polish force-apply
  const polish = await polishMeta(profile, { outDir, apply: wantApply });
  steps.push({ id: 'meta-polish', message: polish.message, ok: polish.ok !== false });

  // 4) Calendar week auto-publish
  let calendar = { ok: true, message: 'calendar skipped', metaUpdated: false, faqSeeded: false };
  if (!dbReady()) {
    calendar = { ok: true, message: `calendar skipped — ${dbSkipReason()}`, metaUpdated: false, faqSeeded: false };
    steps.push({ id: 'calendar-publish', message: calendar.message, ok: true });
  } else {
    const r = await runNode([
      'scripts/meridian-calendar-publish.mjs',
      ...(wantApply ? ['--apply'] : []),
      '--json',
    ]);
    try {
      calendar = JSON.parse(r.stdout.trim());
    } catch {
      calendar = { ok: r.code === 0, message: r.stderr || r.stdout || `exit ${r.code}` };
    }
    steps.push({ id: 'calendar-publish', message: calendar.message, ok: calendar.ok !== false });
  }

  // 5) Deploy pack / optional trigger
  let deploy = { ok: true, message: 'deploy check skipped', authed: false, triggered: false, command: '' };
  {
    const args = ['scripts/meridian-deploy-prod.mjs', '--json'];
    if (triggerDeploy) args.push('--trigger');
    const r = await runNode(args);
    try {
      deploy = JSON.parse(r.stdout.trim());
    } catch {
      deploy = { ok: false, message: r.stderr || r.stdout || 'deploy script failed' };
    }
    await writeFile(resolve(outDir, 'phase12-deploy.json'), JSON.stringify(deploy, null, 2), 'utf8');
    steps.push({ id: 'deploy', message: deploy.message, ok: deploy.ok !== false });
  }

  // 6) Fresh Meridian scan for score lift
  let scan = opts.scan;
  let scoreBefore = null;
  let scoreAfter = null;
  if (opts.skipScan !== true) {
    try {
      const prev = await readJson(resolve(outDir, 'report-latest.json'));
      scoreBefore = prev?.scorecard?.overall ?? null;
      scan = await runMeridian(profile, { outDir });
      scoreAfter = scan.report?.scorecard?.overall ?? null;
      steps.push({
        id: 'rescan',
        message: `Rescan score ${scoreBefore ?? '—'} → ${scoreAfter ?? '—'} (${scan.report?.scorecard?.grade || ''})`,
        ok: scan.ok !== false,
      });
    } catch (e) {
      steps.push({ id: 'rescan', message: `Rescan failed: ${e.message || e}`, ok: false });
    }
  } else {
    const prev = await readJson(resolve(outDir, 'report-latest.json'));
    scan = prev
      ? { ok: true, report: prev, paths: { outDir } }
      : { ok: true, report: { scorecard: {}, findings: [] }, paths: { outDir } };
    scoreAfter = scan.report?.scorecard?.overall ?? null;
  }

  const unlock = await assessUnlockReadiness(profile, { outDir });
  let sameAs = { hasSameAs: false, urls: [] };
  try {
    sameAs = await probeLiveSameAs(origin);
  } catch (e) {
    sameAs = { error: String(e.message || e), hasSameAs: false, urls: [] };
  }

  const deployGate = {
    needsDeploy: (unlock.data?.cmsSocialCount ?? 0) > 0 && !sameAs.hasSameAs,
    liveSameAs: sameAs.urls?.length || 0,
    cmsSocial: unlock.data?.cmsSocialCount ?? 0,
  };

  // Cadence: if calendar auto-published, ensure completed flag
  if (wantApply && calendar.ok && (calendar.metaUpdated || calendar.faqSeeded || calendar.calendarPatched)) {
    let cadence = await loadOpsCadence(outDir);
    cadence = markCompleted(cadence, 'calendar-publish', calendar.message);
    await saveOpsCadence(outDir, cadence);
  }

  // Stub so Phase 9/11 matrix can link Phase 12 during refresh
  await writeFile(
    resolve(outDir, 'phase12-ops.html'),
    '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Phase 12</title></head><body><p>Generating…</p></body></html>',
    'utf8'
  );

  // 7) Refresh Phase 11 dashboards (skip nested phase10 heavy work optional)
  let p11 = { message: 'phase11 skipped', data: { humanTaskCount: null } };
  if (opts.skipPhase11 !== true) {
    p11 = await advancePhase11(profile, {
      outDir,
      scan,
      skipForm: true,
      skipPhase10: true,
      skipVerify: opts.skipVerify === true,
    });
    steps.push({ id: 'phase11', message: p11.message, ok: p11.ok !== false });
  }

  const score = scan?.report?.scorecard || {};
  const human = p11.data?.humanChecklist || [];

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 12 Score Lift — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#04060a;--card:#0c121a;--line:#243041;--text:#e8eef5;--muted:#8b9aab;--accent:#38bdf8;--ok:#3dd68c;--warn:#e6b84d;--bad:#f07178}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 480px at 20% -20%,#0c2a3a,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:980px;margin:0 auto}h1{margin:0 0 .25rem;font-size:1.55rem;letter-spacing:-.02em}.sub{color:var(--muted);margin:0 0 1.2rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.3rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:.75rem}
a.primary{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.5rem .85rem;border-radius:8px;background:var(--accent);color:#041018;font-weight:650;text-decoration:none;font-size:.84rem}
.ok{color:var(--ok)}.warn{color:var(--warn)}.bad{color:var(--bad)}ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
code{font-size:.78rem;background:#1a2636;padding:.15rem .4rem;border-radius:4px;display:inline-block;margin-top:.35rem;word-break:break-all}
</style></head><body><div class="wrap">
<h1>Phase 12 — Score lift &amp; closure</h1>
<p class="sub">${esc(origin)} · CMS meta filled · calendar week auto-published · deploy one-command</p>
<div class="hero">
  <div class="metric"><span class="sub">Score</span><b>${esc(scoreBefore ?? '—')} → ${esc(scoreAfter ?? score.overall ?? '—')}</b></div>
  <div class="metric"><span class="sub">Grade</span><b class="${(score.overall ?? 0) >= 80 ? 'ok' : 'warn'}">${esc(score.grade || '—')}</b></div>
  <div class="metric"><span class="sub">Unlock</span><b class="ok">${esc(unlock.data?.percent ?? '—')}%</b></div>
  <div class="metric"><span class="sub">Human left</span><b>${human.length}</b></div>
</div>
<div class="card">
  <a class="primary" href="phase11-ops.html">Phase 11 convergence</a>
  <a class="primary" href="phase9-ops.html">Phase 9 (refreshed)</a>
  <a class="primary" href="phase7-ops.html">Content calendar</a>
  <a class="primary" href="${esc(origin)}/admin" target="_blank" rel="noreferrer">Admin</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Automated this run</h2>
  <ul>
    ${steps.map((s) => `<li class="${s.ok ? 'ok' : 'bad'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}
  </ul>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Deploy gate (last human / developer step)</h2>
  <ul>
    <li>Live sameAs: <strong class="${sameAs.hasSameAs ? 'ok' : 'bad'}">${sameAs.urls?.length || 0}</strong>
      ${deployGate.needsDeploy ? '— <span class="warn">dispatch Production deploy</span>' : '— live OK'}</li>
    <li>GitHub auth: <strong class="${deploy.authed ? 'ok' : 'warn'}">${deploy.authed ? 'ready' : 'run gh auth login'}</strong></li>
  </ul>
  ${
    deployGate.needsDeploy
      ? `<p class="sub">One command:</p><code>${esc(deploy.command || 'gh workflow run "Deploy Production" -f confirm_production=DEPLOY_PROD')}</code>
         <p class="sub" style="margin-top:.75rem">Or: <code>node scripts/meridian-deploy-prod.mjs --trigger</code> · then <code>npm run meridian:act:phase11</code></p>`
      : `<p class="ok">Deploy gate clear — live sameAs present.</p>`
  }
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Human checklist (post-collapse)</h2>
  <ul>
    ${
      human.map((h) => `<li>${esc(h.task)}</li>`).join('') ||
      '<li class="ok">No open human tasks.</li>'
    }
  </ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '12',
    scoreBefore,
    scoreAfter: scoreAfter ?? score.overall ?? null,
    grade: score.grade ?? null,
    unlockPercent: unlock.data?.percent ?? null,
    steps,
    calendar,
    deploy: {
      authed: !!deploy.authed,
      triggered: !!deploy.triggered,
      status: deploy.status,
      command: deploy.command,
      message: deploy.message,
    },
    deployGate,
    sameAs,
    humanTaskCount: human.length,
    humanChecklist: human,
    phase11: { message: p11.message },
  };

  const md = [
    `# Phase 12 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Score: **${scoreBefore ?? '—'} → ${payload.scoreAfter ?? '—'}** (${payload.grade ?? '—'})`,
    `- Unlock: **${payload.unlockPercent ?? '—'}%**`,
    `- Calendar: ${calendar.message}`,
    `- Deploy: ${deploy.message}`,
    `- Live sameAs: ${sameAs.urls?.length || 0}${deployGate.needsDeploy ? ' · **deploy required**' : ''}`,
    `- Human tasks: **${human.length}**`,
    '',
    'Open **`phase12-ops.html`**.',
    '',
    '## Steps',
    '',
    ...steps.map((s) => `- ${s.ok ? 'x' : ' '} **${s.id}**: ${s.message}`),
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'phase12-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase12-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase12-ops.html'), html, 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '12'),
    { id: '12', name: 'Phase 12 Score Lift', file: 'phase12-ops.html', kind: 'html', ready: true, href: 'phase12-ops.html' },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  // Placeholder for phase9 matrix if phase11 didn't see 12
  if (!(await fileExists(resolve(outDir, 'phase12-ops.html')))) {
    /* written above */
  }

  return {
    ok: true,
    status: deployGate.needsDeploy || human.length > 2 ? 'degraded' : 'ok',
    message: `Phase 12 score lift · ${scoreBefore ?? '—'}→${payload.scoreAfter ?? '—'} · human ${human.length} · sameAs ${sameAs.urls?.length || 0} · deploy ${deploy.triggered ? 'triggered' : deploy.authed ? 'ready' : 'auth'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase12-ops.html'),
        md: resolve(outDir, 'phase12-advance.md'),
        deploy: resolve(outDir, 'phase12-deploy.json'),
      },
    },
    findings: [
      {
        code: 'PHASE12_SCORE_LIFT',
        severity: 'low',
        title: 'Phase 12 score lift & closure pack ready',
        remediation: 'Open phase12-ops.html; dispatch Production deploy if gate warns; re-run phase11 after deploy.',
        owner: 'developer',
        pillar: 'onpage',
      },
      ...(deployGate.needsDeploy
        ? [
            {
              code: 'PHASE12_DEPLOY',
              severity: 'medium',
              title: 'Production deploy required for live sameAs',
              remediation: deploy.command || 'gh workflow run "Deploy Production" -f confirm_production=DEPLOY_PROD',
              owner: 'developer',
              pillar: 'technical',
            },
          ]
        : []),
    ],
  };
}
