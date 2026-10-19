import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { collectGsc } from './gsc.mjs';
import { collectGa4 } from './ga4.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';
import { writeMonthlyDigest } from './monthly-digest.mjs';
import { writeWeeklyDigest } from './weekly-digest.mjs';
import { writeQuarterlyDigest } from './quarterly-digest.mjs';
import { writeOpsCockpit } from './ops-cockpit.mjs';
import { advancePhase13 } from './phase13-advance.mjs';

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

async function checkCronHealth(root) {
  const checks = {
    githubWorkflow: await fileExists(resolve(root, '.github/workflows/meridian-autopilot.yml')),
    cronSh: await fileExists(resolve(root, 'scripts/meridian-cron.sh')),
    cronPs1: await fileExists(resolve(root, 'scripts/meridian-cron.ps1')),
    schtasks: await fileExists(resolve(root, 'storage/meridian/zigma-prod/phase10-schtasks.xml')),
  };
  const ready = Object.values(checks).filter(Boolean).length;
  return {
    ok: checks.githubWorkflow || checks.cronSh || checks.cronPs1,
    message: `Cron pack ${ready}/4 present (Actions=${checks.githubWorkflow} sh=${checks.cronSh} ps1=${checks.cronPs1} schtasks=${checks.schtasks})`,
    checks,
  };
}

/**
 * Phase 14 — Perpetual ops: unlock 100%, live signal digests, sameAs self-heal, cron guardian.
 */
export async function advancePhase14(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const root = process.cwd();
  const steps = [];

  // 1) Self-heal sameAs via Phase 13 (no-op if already live)
  let p13 = { ok: true, message: 'phase13 skipped', data: { missionComplete: false, sameAs: {} } };
  if (opts.skipHeal !== true) {
    p13 = await advancePhase13(profile, {
      outDir,
      apply: opts.apply !== false,
      skipPhase11: true,
      skipVerify: true,
      skipAct: true,
    });
    steps.push({ id: 'heal-sameas', ok: p13.ok !== false, message: p13.message });
  }

  // 2) Fresh GSC + GA4 → signal-cache
  const gsc = await collectGsc(profile);
  const ga4 = await collectGa4(profile);
  let psiScore = null;
  try {
    const speed = await readJson(resolve(outDir, 'phase4-advance.json'));
    psiScore = speed?.psi?.home ?? speed?.scores?.home ?? null;
  } catch {
    /* ignore */
  }
  if (psiScore == null) {
    const report = await readJson(resolve(outDir, 'report-latest.json'));
    psiScore = report?.signals?.pagespeed?.performanceScore ?? null;
  }

  const signalCache = {
    generatedAt: new Date().toISOString(),
    gsc: gsc.status === 'ok' ? gsc.data : null,
    ga4: ga4.status === 'ok' ? ga4.data : null,
    pagespeed: psiScore != null ? { performanceScore: psiScore } : null,
    status: { gsc: gsc.status, ga4: ga4.status, gscMsg: gsc.message, ga4Msg: ga4.message },
  };
  await writeFile(resolve(outDir, 'signal-cache.json'), JSON.stringify(signalCache, null, 2), 'utf8');
  steps.push({
    id: 'signals',
    ok: gsc.status === 'ok' || ga4.status === 'ok',
    message: `GSC ${gsc.status} · GA4 ${ga4.status}${
      gsc.data?.totals ? ` · clicks ${gsc.data.totals.clicks} / impr ${gsc.data.totals.impressions}` : ''
    }${ga4.data?.organic ? ` · organic ${ga4.data.organic.sessions}` : ''}`,
  });

  // Merge into scan for digests
  let scan = opts.scan;
  if (!scan) {
    const report = await readJson(resolve(outDir, 'report-latest.json'));
    scan = report
      ? { ok: true, report, paths: { outDir } }
      : { ok: true, report: { scorecard: {}, findings: [], signals: {} }, paths: { outDir } };
  }
  scan.report = scan.report || {};
  scan.report.signals = {
    ...(scan.report.signals || {}),
    gsc: signalCache.gsc || scan.report.signals?.gsc,
    ga4: signalCache.ga4 || scan.report.signals?.ga4,
    pagespeed: signalCache.pagespeed || scan.report.signals?.pagespeed,
  };

  const unlock = await assessUnlockReadiness(profile, { outDir });
  steps.push({ id: 'unlock', ok: true, message: unlock.message });

  const actions = [
    { id: 'unlock-readiness', ...unlock },
    { id: 'phase13-advance', ...p13 },
    { id: 'gsc', ...gsc },
    { id: 'ga4', ...ga4 },
  ];

  const weekly = await writeWeeklyDigest(profile, { scan, actions, outDir });
  const monthly = await writeMonthlyDigest(profile, { scan, actions, outDir });
  const quarterly = await writeQuarterlyDigest(profile, { outDir, scan, actions });
  const cockpit = await writeOpsCockpit(profile, {
    outDir,
    scan,
    actions,
    unlock: unlock.data,
    scorecard: scan.report?.scorecard,
  });
  steps.push({ id: 'digests', ok: true, message: `${weekly.message} · ${monthly.message}` });

  const cron = await checkCronHealth(root);
  steps.push({ id: 'cron', ok: cron.ok, message: cron.message });

  // Sentinel: write perpetual state
  const score = scan.report?.scorecard || {};
  let sameAsLive = !!p13.data?.sameAs?.hasSameAs;
  if (!sameAsLive) {
    try {
      const pr = await runNode(['scripts/meridian-probe-sameas.mjs']);
      sameAsLive = !!JSON.parse(pr.stdout.trim()).hasSameAs;
    } catch {
      sameAsLive = false;
    }
  }
  const perpetual = {
    generatedAt: new Date().toISOString(),
    unlockPercent: unlock.data?.percent ?? null,
    unlockGrade: unlock.data?.grade ?? null,
    score: { overall: score.overall, grade: score.grade, pillars: score.pillars },
    sameAsLive,
    signals: {
      gscClicks: signalCache.gsc?.totals?.clicks ?? null,
      gscImpressions: signalCache.gsc?.totals?.impressions ?? null,
      gscPosition: signalCache.gsc?.totals?.position ?? null,
      ga4OrganicSessions: signalCache.ga4?.organic?.sessions ?? null,
      ga4OrganicKeyEvents: signalCache.ga4?.organic?.keyEvents ?? null,
      psi: psiScore,
    },
    monthlyFill: { auto: monthly.data?.filledAuto, fillable: monthly.data?.fillable },
    cron: cron.checks,
    humanTaskCount: (weekly.data?.humanChecklist || []).length,
    missionComplete: !!(await readJson(resolve(outDir, 'mission-complete.json'))),
  };
  await writeFile(resolve(outDir, 'perpetual-ops.json'), JSON.stringify(perpetual, null, 2), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 14 Perpetual Ops — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#02040a;--card:#0a0f18;--line:#243041;--text:#e8eef5;--muted:#8b9aab;--accent:#22d3ee;--ok:#3dd68c;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(1000px 520px at 80% -15%,#0b3a4a,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:980px;margin:0 auto}h1{margin:0 0 .25rem;font-size:1.55rem;letter-spacing:-.02em}.sub{color:var(--muted);margin:0 0 1.2rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.25rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:.75rem}
a.primary{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.5rem .85rem;border-radius:8px;background:var(--accent);color:#042018;font-weight:650;text-decoration:none;font-size:.84rem}
.ok{color:var(--ok)}.warn{color:var(--warn)}ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
table{width:100%;border-collapse:collapse;font-size:.84rem}td,th{padding:.4rem .3rem;border-bottom:1px solid var(--line);text-align:left}
</style></head><body><div class="wrap">
<h1>Phase 14 — Perpetual ops</h1>
<p class="sub">${esc(origin)} · unlock without optional webhook · live GSC/GA4 digests · sameAs self-heal · cron guardian</p>
<div class="hero">
  <div class="metric"><span class="sub">Unlock</span><b class="${(unlock.data?.percent ?? 0) >= 100 ? 'ok' : 'warn'}">${esc(unlock.data?.percent ?? '—')}%</b></div>
  <div class="metric"><span class="sub">Score</span><b>${esc(score.overall ?? '—')} ${esc(score.grade || '')}</b></div>
  <div class="metric"><span class="sub">sameAs</span><b class="${sameAsLive ? 'ok' : 'warn'}">${sameAsLive ? 'LIVE' : 'CHECK'}</b></div>
  <div class="metric"><span class="sub">Monthly auto</span><b>${esc(monthly.data?.filledAuto ?? '—')}/${esc(monthly.data?.fillable ?? '—')}</b></div>
  <div class="metric"><span class="sub">GSC clicks</span><b>${esc(perpetual.signals.gscClicks ?? '—')}</b></div>
  <div class="metric"><span class="sub">Organic sess.</span><b>${esc(perpetual.signals.ga4OrganicSessions ?? '—')}</b></div>
</div>
<div class="card">
  <a class="primary" href="phase13-ops.html">Phase 13 mission</a>
  <a class="primary" href="phase9-ops.html">Phase 9</a>
  <a class="primary" href="monthly-digest.md">Monthly digest</a>
  <a class="primary" href="signal-cache.json">Signal cache</a>
  <a class="primary" href="perpetual-ops.json">Perpetual state</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Guardian steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Signal board (28d)</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>GSC clicks</td><td>${esc(perpetual.signals.gscClicks ?? '—')}</td></tr>
    <tr><td>GSC impressions</td><td>${esc(perpetual.signals.gscImpressions ?? '—')}</td></tr>
    <tr><td>GSC avg position</td><td>${esc(perpetual.signals.gscPosition != null ? Number(perpetual.signals.gscPosition).toFixed(1) : '—')}</td></tr>
    <tr><td>GA4 organic sessions</td><td>${esc(perpetual.signals.ga4OrganicSessions ?? '—')}</td></tr>
    <tr><td>GA4 organic key events</td><td>${esc(perpetual.signals.ga4OrganicKeyEvents ?? '—')}</td></tr>
    <tr><td>PSI mobile</td><td>${esc(perpetual.signals.psi ?? '—')}</td></tr>
  </table>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Keep forever</h2>
  <ul>
    <li>GitHub Action <code>meridian-autopilot.yml</code> (Mondays) — ${cron.checks.githubWorkflow ? '<span class="ok">present</span>' : '<span class="warn">missing</span>'}</li>
    <li>VPS <code>scripts/meridian-cron.sh</code> or Windows <code>meridian-cron.ps1</code></li>
    <li>Re-run <code>npm run meridian:act:phase14</code> anytime — self-heals sameAs + refreshes digests</li>
    <li>GBP metrics stay manual (no public API) — optional pulse from <code>phase11-gbp-draft.txt</code></li>
  </ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: perpetual.generatedAt,
    phase: '14',
    ...perpetual,
    steps,
    digests: { weekly: weekly.message, monthly: monthly.message, quarterly: quarterly.message, cockpit: cockpit.message },
  };

  const md = [
    `# Phase 14 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Unlock **${payload.unlockPercent ?? '—'}%** (optional webhook excluded)`,
    `- Score **${score.overall ?? '—'}** (${score.grade ?? '—'}) · sameAs ${sameAsLive ? 'live' : 'check'}`,
    `- Monthly auto-fill **${monthly.data?.filledAuto}/${monthly.data?.fillable}**`,
    `- GSC clicks ${perpetual.signals.gscClicks ?? '—'} · organic sessions ${perpetual.signals.ga4OrganicSessions ?? '—'}`,
    `- ${cron.message}`,
    '',
    'Open **`phase14-ops.html`** — perpetual guardian.',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'phase14-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase14-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase14-ops.html'), html, 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '14'),
    { id: '14', name: 'Phase 14 Perpetual', file: 'phase14-ops.html', kind: 'html', ready: true, href: 'phase14-ops.html' },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  // Refresh phase9 matrix stub
  if (!(await fileExists(resolve(outDir, 'phase14-ops.html')))) {
    /* written */
  }

  return {
    ok: true,
    status: (unlock.data?.percent ?? 0) >= 100 && sameAsLive ? 'ok' : 'degraded',
    message: `Phase 14 perpetual · unlock ${payload.unlockPercent ?? '—'}% · monthly ${monthly.data?.filledAuto}/${monthly.data?.fillable} · sameAs ${sameAsLive ? 'live' : 'check'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase14-ops.html'),
        md: resolve(outDir, 'phase14-advance.md'),
        signals: resolve(outDir, 'signal-cache.json'),
        perpetual: resolve(outDir, 'perpetual-ops.json'),
      },
    },
    findings: [
      {
        code: 'PHASE14_PERPETUAL',
        severity: 'low',
        title: 'Phase 14 perpetual ops guardian ready',
        remediation: 'Keep weekly autopilot/cron; open phase14-ops.html for signal board; webhook remains optional.',
        owner: 'developer',
        pillar: 'ops',
      },
    ],
  };
}
