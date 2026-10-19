import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';
import { advancePhase9 } from './phase9-advance.mjs';
import { advancePhase10 } from './phase10-advance.mjs';

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

function runNode(args, { cwd } = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, args, {
      cwd: cwd || process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
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
    headers: { 'user-agent': 'MeridianPhase11/1.0', accept: 'text/html' },
  });
  const body = await res.text();
  const urls = [];
  try {
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
        /* ignore block */
      }
    }
  } catch {
    /* ignore */
  }
  return {
    ok: res.ok,
    status: res.status,
    hasSameAs: urls.length > 0 || /"sameAs"\s*:/i.test(body),
    urls: [...new Set(urls)],
  };
}

function buildGbpDraft(profile, nap) {
  const brand = nap?.name || profile.brand?.name || 'Zigma Technologies';
  const city = nap?.addressLocality || 'Bengaluru';
  const services = profile.autopilot?.gbp?.services?.slice(0, 3) || [
    'Solar EPC',
    'UPS AMC',
    'Battery energy storage',
  ];
  const week = new Date().toISOString().slice(0, 10);
  return [
    `GBP update draft — ${week}`,
    '',
    `${brand} | ${city}`,
    '',
    `This week we’re helping facilities teams plan reliable power — ${services.join(', ')}.`,
    '',
    `Talk to us: ${nap?.telephone || '+91 95901 37666'} · ${profile.origin?.replace(/\/$/, '')}/contact`,
    '',
    '(Paste into Google Business Profile → Updates. Edit with a real job photo when available.)',
    '',
  ].join('\n');
}

/**
 * Phase 11 — Live convergence: verify deploy gate, refresh command center, collapse human ops.
 */
export async function advancePhase11(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const actions = Array.isArray(opts.actions) ? [...opts.actions] : [];

  // Light Phase 10 refresh (no apply / no GSC spam) so unlock % stays current
  if (opts.skipPhase10 !== true) {
    const p10 = await advancePhase10(profile, {
      outDir,
      apply: false,
      skipAct: true,
      skipLoop: true,
      skipPsi: true,
    });
    actions.push({ id: 'phase10-advance', ...p10 });
  }

  const unlock = await assessUnlockReadiness(profile, { outDir });
  actions.push({ id: 'unlock-readiness', ...unlock });

  let liveVerify = { ok: false, message: 'skipped' };
  if (opts.skipVerify !== true) {
    const r = await runNode(['scripts/verify-seo-live.mjs', '--env', 'prod', '--json']);
    try {
      const raw = r.stdout.trim();
      const start = raw.indexOf('{');
      const json = JSON.parse(start >= 0 ? raw.slice(start) : raw);
      liveVerify = {
        ok: json.ok === true,
        status: json.ok ? 'ok' : 'degraded',
        message: `Live verify · pass ${json.passed} · warn ${json.warnings} · fail ${json.failed}`,
        data: json,
      };
      await writeFile(resolve(outDir, 'live-verify.json'), JSON.stringify(json, null, 2), 'utf8');
    } catch {
      liveVerify = {
        ok: r.code === 0,
        status: r.code === 0 ? 'ok' : 'error',
        message: r.code === 0 ? 'Live verify OK' : `Live verify failed (exit ${r.code})`,
        data: { stdout: r.stdout.slice(-2000), stderr: r.stderr.slice(-1000) },
      };
      await writeFile(
        resolve(outDir, 'live-verify.json'),
        JSON.stringify({ ok: r.code === 0, parseError: true, code: r.code, stderr: r.stderr.slice(-500) }, null, 2),
        'utf8'
      );
    }
  }
  actions.push({ id: 'live-verify', ...liveVerify });

  let sameAs = { hasSameAs: false, urls: [] };
  try {
    sameAs = await probeLiveSameAs(origin);
  } catch (e) {
    sameAs = { error: String(e.message || e), hasSameAs: false, urls: [] };
  }
  actions.push({
    id: 'live-sameas',
    ok: true,
    message: sameAs.hasSameAs ? `Live sameAs ${sameAs.urls.length}` : 'Live sameAs missing',
    data: sameAs,
  });

  const nap = (await readJson(resolve(outDir, 'nap-audit.json')))?.nap || {};
  const gbpDraft = buildGbpDraft(profile, nap);
  await writeFile(resolve(outDir, 'phase11-gbp-draft.txt'), gbpDraft, 'utf8');

  // Load scan for digests
  let scan = opts.scan;
  if (!scan) {
    const report = await readJson(resolve(outDir, 'report-latest.json'));
    scan = report
      ? { ok: true, report, paths: { outDir }, hardFailCount: 0 }
      : { ok: true, report: { scorecard: {}, findings: [], signals: {} }, paths: { outDir } };
  }

  // Placeholder so Phase 9 matrix marks pack 11 ready during refresh
  if (!(await fileExists(resolve(outDir, 'phase11-ops.html')))) {
    await writeFile(
      resolve(outDir, 'phase11-ops.html'),
      '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Phase 11</title></head><body><p>Generating…</p></body></html>',
      'utf8'
    );
  }

  // Refresh Phase 9 command center with cadence-collapsed checklist + fresh unlock
  const p9 = await advancePhase9(profile, {
    outDir,
    scan,
    actions,
    skipForm: opts.skipForm !== false,
  });
  actions.push({ id: 'phase9-advance', ...p9 });

  const human = (p9.data?.weekly?.humanChecklist || []).slice(0, 12);
  const score = scan.report?.scorecard || {};
  const deployGate = {
    cmsSocial: unlock.data?.cmsSocialCount ?? 0,
    liveSameAs: sameAs.urls?.length || 0,
    needsDeploy: (unlock.data?.cmsSocialCount ?? 0) > 0 && !(sameAs.urls?.length > 0),
    liveVerifyOk: liveVerify.ok,
  };

  const packs = [
    { id: '9', name: 'Phase 9 Routine', file: 'phase9-ops.html' },
    { id: '10', name: 'Phase 10 Continuous', file: 'phase10-ops.html' },
    { id: '11', name: 'Phase 11 Convergence', file: 'phase11-ops.html' },
    { id: '12', name: 'Phase 12 Score Lift', file: 'phase12-ops.html' },
    { id: '13', name: 'Phase 13 Autoclose', file: 'phase13-ops.html' },
    { id: '14', name: 'Phase 14 Perpetual', file: 'phase14-ops.html' },
    { id: '5', name: 'Phase 5 GBP', file: 'phase5-ops.html' },
    { id: '8', name: 'Phase 8 Outreach', file: 'phase8-ops.html' },
    { id: 'cockpit', name: 'Ops cockpit', file: 'ops-cockpit.html' },
  ];
  const packStatus = [];
  for (const p of packs) {
    packStatus.push({ ...p, ready: p.id === '11' ? true : await fileExists(resolve(outDir, p.file)) });
  }

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 11 Live Convergence — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#05080c;--card:#0e1620;--line:#243041;--text:#e8eef5;--muted:#8b9aab;--accent:#a78bfa;--ok:#3dd68c;--warn:#e6b84d;--bad:#f07178}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 500px at 70% -15%,#2a1848,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:980px;margin:0 auto}h1{margin:0 0 .25rem;font-size:1.55rem;letter-spacing:-.02em}.sub{color:var(--muted);margin:0 0 1.2rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.3rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:.75rem}
a.primary{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.5rem .85rem;border-radius:8px;background:var(--accent);color:#12081f;font-weight:650;text-decoration:none;font-size:.84rem}
.ok{color:var(--ok)}.warn{color:var(--warn)}.bad{color:var(--bad)}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
.grid{display:grid;gap:.55rem;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
a.pill{display:block;padding:.55rem .7rem;border-radius:8px;background:#1a2636;color:var(--text);text-decoration:none;font-size:.84rem;border:1px solid var(--line)}
a.pill.on{border-color:#2a6a4a}code{font-size:.8rem;background:#1a2636;padding:.1rem .35rem;border-radius:4px}
</style></head><body><div class="wrap">
<h1>Phase 11 — Live convergence</h1>
<p class="sub">${esc(origin)} · stale dashboards refreshed · human list cadence-collapsed · deploy gate measured</p>
<div class="hero">
  <div class="metric"><span class="sub">Score</span><b>${esc(score.overall ?? '—')} <span class="${(score.overall ?? 0) >= 80 ? 'ok' : 'warn'}">${esc(score.grade || '')}</span></b></div>
  <div class="metric"><span class="sub">Unlock</span><b class="${(unlock.data?.percent ?? 0) >= 90 ? 'ok' : 'warn'}">${esc(unlock.data?.percent ?? '—')}%</b></div>
  <div class="metric"><span class="sub">Human tasks</span><b>${human.length}</b></div>
  <div class="metric"><span class="sub">Live verify</span><b class="${liveVerify.ok ? 'ok' : 'bad'}">${liveVerify.ok ? 'PASS' : 'CHECK'}</b></div>
</div>
<div class="card">
  <a class="primary" href="phase9-ops.html">Phase 9 (refreshed)</a>
  <a class="primary" href="phase10-ops.html">Phase 10 continuous</a>
  <a class="primary" href="phase11-gbp-draft.txt">GBP update draft</a>
  <a class="primary" href="live-verify.json">Live verify JSON</a>
  <a class="primary" href="${esc(origin)}/admin" target="_blank" rel="noreferrer">Admin</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Deploy gate</h2>
  <ul>
    <li>CMS social fields: <strong class="ok">${deployGate.cmsSocial}</strong></li>
    <li>Live sameAs URLs: <strong class="${deployGate.liveSameAs ? 'ok' : 'bad'}">${deployGate.liveSameAs}</strong>
      ${deployGate.needsDeploy ? '— <span class="warn">Production deploy required to ship JSON-LD sameAs</span>' : '— live schema OK'}</li>
    <li>${esc(liveVerify.message)}</li>
  </ul>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">This week — human only (collapsed)</h2>
  <ul>
    ${
      human.map((h) => `<li>${esc(h.task)} <span style="opacity:.6">(${esc(h.who)})</span></li>`).join('') ||
      '<li class="ok">No open human tasks — keep cron/autopilot running.</li>'
    }
  </ul>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Control plane</h2>
  <div class="grid">
    ${packStatus
      .map(
        (p) =>
          `<a class="pill ${p.ready ? 'on' : ''}" href="${esc(p.file)}">${esc(p.name)}${p.ready ? '' : ' (missing)'}</a>`
      )
      .join('')}
  </div>
</div>
<p class="sub">Open this file after every autopilot run. Phase 9 HTML above is regenerated with the same collapsed checklist.</p>
</div></body></html>`;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '11',
    score: { overall: score.overall, grade: score.grade },
    unlockPercent: unlock.data?.percent ?? null,
    humanTaskCount: human.length,
    humanChecklist: human,
    deployGate,
    liveVerify: { ok: liveVerify.ok, message: liveVerify.message, failed: liveVerify.data?.failed },
    sameAs,
    phase9: { message: p9.message },
  };

  const md = [
    `# Phase 11 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Unlock **${payload.unlockPercent ?? '—'}%** · score **${score.overall ?? '—'}** (${score.grade ?? '—'})`,
    `- ${liveVerify.message}`,
    `- Live sameAs: ${sameAs.urls?.length || 0}${deployGate.needsDeploy ? ' · **deploy required**' : ''}`,
    `- Human tasks (collapsed): **${human.length}**`,
    `- ${p9.message}`,
    '',
    'Open **`phase11-ops.html`** (primary) · Phase 9 refreshed underneath.',
    '',
    '## Human',
    '',
    ...human.map((h) => `- [ ] ${h.task}`),
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'phase11-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase11-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase11-ops.html'), html, 'utf8');

  // Ensure matrix includes 11
  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '11'),
    { id: '11', name: 'Phase 11 Convergence', file: 'phase11-ops.html', kind: 'html', ready: true, href: 'phase11-ops.html' },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  return {
    ok: liveVerify.ok || liveVerify.status === 'skipped',
    status: deployGate.needsDeploy || human.length > 5 ? 'degraded' : 'ok',
    message: `Phase 11 convergence · unlock ${payload.unlockPercent ?? '—'}% · human ${human.length} · live ${liveVerify.ok ? 'pass' : 'check'} · sameAs ${sameAs.urls?.length || 0}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase11-ops.html'),
        md: resolve(outDir, 'phase11-advance.md'),
        gbpDraft: resolve(outDir, 'phase11-gbp-draft.txt'),
        phase9: resolve(outDir, 'phase9-ops.html'),
      },
    },
    findings: [
      {
        code: 'PHASE11_CONVERGENCE',
        severity: 'low',
        title: 'Phase 11 live convergence pack ready',
        remediation: 'Use phase11-ops.html as primary dashboard; deploy when deploy gate warns; GBP draft is pre-written.',
        owner: 'developer',
        pillar: 'ops',
      },
      ...(deployGate.needsDeploy
        ? [
            {
              code: 'PHASE11_DEPLOY_SAMEAS',
              severity: 'medium',
              title: 'CMS sameAs ready — Production deploy required',
              remediation: 'Deploy Production so Organization JSON-LD emits LinkedIn sameAs on the live site.',
              owner: 'developer',
              pillar: 'onpage',
            },
          ]
        : []),
    ],
  };
}
