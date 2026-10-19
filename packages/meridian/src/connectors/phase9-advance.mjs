import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { writeWeeklyDigest } from './weekly-digest.mjs';
import { writeMonthlyDigest } from './monthly-digest.mjs';
import { writeQuarterlyDigest } from './quarterly-digest.mjs';
import { writeOpsCockpit } from './ops-cockpit.mjs';
import { probeFormHealth } from './form-health.mjs';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';

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

function icsEscape(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function stamp(dt) {
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(dt.getUTCDate()).padStart(2, '0')}T${String(dt.getUTCHours()).padStart(2, '0')}${String(dt.getUTCMinutes()).padStart(2, '0')}00Z`;
}

/** Recurring Phase 9 reminders (weekly / monthly / quarterly). */
function buildRoutineIcs(origin) {
  const now = new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meridian//Phase9 Routine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const add = (uid, summary, desc, start, rrule) => {
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      `RRULE:${rrule}`,
      'END:VEVENT'
    );
  };

  // Next Monday 09:00 UTC
  const weekly = new Date(now);
  const day = weekly.getUTCDay();
  const addDays = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  weekly.setUTCDate(weekly.getUTCDate() + addDays);
  weekly.setUTCHours(9, 0, 0, 0);
  add(
    'meridian-p9-weekly@zigma',
    'Zigma SEO · Weekly (15 min)',
    `Open phase9-ops.html · Reply GBP reviews · Post GBP update · Skim enquiries · ${origin}/admin`,
    weekly,
    'FREQ=WEEKLY;BYDAY=MO'
  );

  const monthly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + (now.getUTCDate() > 1 ? 1 : 0), 1, 9, 0, 0));
  add(
    'meridian-p9-monthly@zigma',
    'Zigma SEO · Monthly report (1–2 h)',
    'Fill monthly-digest.md · CWV · Enhancements · Publish calendar · Ask reviews · ${origin}',
    monthly,
    'FREQ=MONTHLY;BYMONTHDAY=1'
  );

  const qMonth = Math.floor(now.getUTCMonth() / 3) * 3;
  let quarterly = new Date(Date.UTC(now.getUTCFullYear(), qMonth, 1, 9, 0, 0));
  if (quarterly <= now) quarterly = new Date(Date.UTC(now.getUTCFullYear(), qMonth + 3, 1, 9, 0, 0));
  add(
    'meridian-p9-quarterly@zigma',
    'Zigma SEO · Quarterly ops (half day)',
    'quarterly-digest.md · Crawl · PSI · Keywords · NAP · PreProd verify · Access review',
    quarterly,
    'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1'
  );

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

const PHASE_PACKS = [
  { id: '0', name: 'Phase 0 Unlock', file: 'phase0-wizard.html', kind: 'html' },
  { id: '2', name: 'Phase 2 Structured data', file: 'phase2-advance.md', kind: 'md' },
  { id: '3', name: 'Phase 3 Meta', file: 'phase3-advance.md', kind: 'md' },
  { id: '4', name: 'Phase 4 Speed', file: 'phase4-ops.html', kind: 'html' },
  { id: '5', name: 'Phase 5 Local / GBP', file: 'phase5-ops.html', kind: 'html' },
  { id: '6', name: 'Phase 6 City / locale', file: 'phase6-ops.html', kind: 'html' },
  { id: '7', name: 'Phase 7 Content', file: 'phase7-ops.html', kind: 'html' },
  { id: '8', name: 'Phase 8 Authority', file: 'phase8-ops.html', kind: 'html' },
  { id: '9', name: 'Phase 9 Routine', file: 'phase9-ops.html', kind: 'html' },
  { id: '10', name: 'Phase 10 Continuous', file: 'phase10-ops.html', kind: 'html' },
];

/**
 * Reconstruct lightweight action stubs from artefacts so digests work standalone.
 */
async function artefactActions(outDir, liveActions = []) {
  const byId = new Map(liveActions.map((a) => [a.id, a]));
  const ensure = async (id, file, mapFn) => {
    if (byId.has(id)) return;
    const j = await readJson(resolve(outDir, file));
    if (!j) return;
    byId.set(id, mapFn(j));
  };

  await ensure('sitemap-health', 'sitemap-health.json', (j) => ({
    id: 'sitemap-health',
    ok: true,
    message: `Artefact · ${j.checked ?? j.urls?.length ?? '?'} URLs`,
    data: j,
  }));
  await ensure('image-weight', 'image-weight.json', (j) => ({
    id: 'image-weight',
    ok: true,
    message: `Artefact · heavy ${j.heavyCount ?? 0}`,
    data: j,
  }));
  await ensure('form-health', 'form-health.json', (j) => ({
    id: 'form-health',
    ok: j.ok !== false,
    message: j.message || 'form artefact',
    data: j,
  }));
  await ensure('unlock-readiness', 'unlock-readiness.json', (j) => ({
    id: 'unlock-readiness',
    ok: true,
    data: j,
    message: `Unlock ${j.percent ?? '?'}%`,
  }));
  await ensure('citations-playbook', 'citations-playbook.json', (j) => ({
    id: 'citations-playbook',
    ok: true,
    data: j,
  }));
  await ensure('city-pages-readiness', 'city-pages-readiness.json', (j) => ({
    id: 'city-pages-readiness',
    ok: true,
    data: j,
  }));
  await ensure('backlink-outreach', 'backlink-outreach.json', (j) => ({
    id: 'backlink-outreach',
    ok: true,
    data: j,
  }));
  await ensure('phase8-advance', 'phase8-advance.json', (j) => ({
    id: 'phase8-advance',
    ok: true,
    data: j,
  }));
  await ensure('content-calendar', 'content-calendar.json', (j) => ({
    id: 'content-calendar',
    ok: true,
    data: j,
  }));
  await ensure('phase7-advance', 'phase7-advance.json', (j) => ({
    id: 'phase7-advance',
    ok: true,
    data: j,
  }));
  await ensure('review-kit', 'review-kit.json', (j) => ({
    id: 'review-kit',
    ok: true,
    data: j,
  }));
  await ensure('rich-results-pack', 'rich-results-pack.json', (j) => ({
    id: 'rich-results-pack',
    ok: j.fail === 0,
    data: j,
  }));
  await ensure('top20-meta-pack', 'top20-meta-pack.json', (j) => ({
    id: 'top20-meta-pack',
    ok: true,
    data: j,
  }));
  await ensure('draft-meta', 'meta-drafts.json', (j) => ({
    id: 'draft-meta',
    ok: true,
    message: `${j.count ?? 0} drafts`,
    data: j,
  }));

  return [...byId.values()];
}

async function loadScan(outDir, optsScan) {
  if (optsScan?.report) return optsScan;
  const auto = await readJson(resolve(outDir, 'autopilot-latest.json'));
  if (auto?.scorecard) {
    return {
      ok: auto.scanOk !== false,
      hardFailCount: auto.hardFailCount || 0,
      report: {
        scorecard: auto.scorecard,
        trend: auto.trend,
        findings: [],
        signals: {},
        profile: auto.profile,
        meta: auto.meta,
      },
      paths: { outDir },
    };
  }
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  if (report) {
    return {
      ok: true,
      hardFailCount: (report.findings || []).filter((f) => f.severity === 'critical' || f.severity === 'high').length,
      report,
      paths: { outDir },
    };
  }
  return {
    ok: true,
    hardFailCount: 0,
    report: {
      scorecard: {},
      trend: null,
      findings: [],
      signals: {},
      profile: {},
      meta: {},
    },
    paths: { outDir },
  };
}

/**
 * Phase 9 advance — master ops: digests + cockpit + routine ICS + command-center HTML.
 */
export async function advancePhase9(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');

  const scan = await loadScan(outDir, opts.scan);
  let actions = Array.isArray(opts.actions) ? [...opts.actions] : [];

  // Fresh form probe for weekly checklist accuracy
  if (opts.skipForm !== true) {
    const form = await probeFormHealth(profile, { outDir });
    actions = actions.filter((a) => a.id !== 'form-health');
    actions.push({ id: 'form-health', ...form });
  }

  actions = await artefactActions(outDir, actions);

  const weekly = await writeWeeklyDigest(profile, { scan, actions, outDir });
  const monthly = await writeMonthlyDigest(profile, { scan, actions, outDir });
  const quarterly = await writeQuarterlyDigest(profile, { outDir, scan, actions });
  const cockpit = await writeOpsCockpit(profile, {
    outDir,
    scan,
    actions,
    unlock: actions.find((a) => a.id === 'unlock-readiness')?.data,
    scorecard: scan.report?.scorecard,
  });

  const human = (weekly.data?.humanChecklist || []).slice(0, 12);
  const score = scan.report?.scorecard || {};
  const unlock = actions.find((a) => a.id === 'unlock-readiness')?.data?.percent;

  const ics = buildRoutineIcs(origin);
  await writeFile(resolve(outDir, 'phase9-routine.ics'), ics, 'utf8');

  // Phase 9 HTML is written below — treat pack 9 as ready in this run.
  const matrix = [];
  for (const p of PHASE_PACKS) {
    const path = resolve(outDir, p.file);
    const ready = p.id === '9' ? true : await fileExists(path);
    matrix.push({
      ...p,
      ready,
      href: p.file,
    });
  }

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 9 Command Center — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#070b10;--card:#121a24;--line:#243041;--text:#e8eef5;--muted:#8b9aab;--accent:#3d9cf0;--ok:#3dd68c;--warn:#e6b84d}
*{box-sizing:border-box}
body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 480px at 80% -20%,#1a3048,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:980px;margin:0 auto}
h1{font-size:1.6rem;margin:0 0 .25rem;letter-spacing:-.02em}
.sub{color:var(--muted);margin:0 0 1.25rem}
.hero{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}
.metric b{display:block;font-size:1.35rem;margin-top:.2rem}
.grid{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem}
.card h2{font-size:.92rem;margin:0 0 .5rem}
a.pill{display:block;padding:.55rem .7rem;border-radius:8px;background:#1a2636;color:var(--text);text-decoration:none;font-size:.84rem;border:1px solid var(--line);margin:.3rem 0}
a.pill.on{border-color:#2a6a4a}
a.pill.off{opacity:.55}
a.primary{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.5rem .85rem;border-radius:8px;background:var(--accent);color:#041018;font-weight:650;text-decoration:none;font-size:.84rem}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
.badge{font-size:.68rem;padding:.12rem .4rem;border-radius:999px;background:#243040;color:var(--muted)}
.badge.on{background:#163326;color:var(--ok)}.badge.off{background:#3a2a14;color:var(--warn)}
</style></head><body><div class="wrap">
<h1>Phase 9 — SEO command center</h1>
<p class="sub">${esc(origin)} · digests refreshed · import <code>phase9-routine.ics</code> for recurring reminders</p>
<div class="hero">
  <div class="metric"><span class="sub">Score</span><b>${esc(score.overall ?? '—')} <span class="badge">${esc(score.grade || '')}</span></b></div>
  <div class="metric"><span class="sub">Unlock</span><b>${unlock != null ? esc(unlock) + '%' : '—'}</b></div>
  <div class="metric"><span class="sub">Human tasks</span><b>${human.length}</b></div>
  <div class="metric"><span class="sub">Hard findings</span><b>${esc(weekly.data?.hardFindingCount ?? 0)}</b></div>
</div>
<div class="card" style="margin-bottom:1rem">
  <a class="primary" href="ops-cockpit.html">Ops cockpit</a>
  <a class="primary" href="phase9-routine.ics">Routine calendar (.ics)</a>
  <a class="primary" href="weekly-digest.md">Weekly digest</a>
  <a class="primary" href="monthly-digest.md">Monthly</a>
  <a class="primary" href="quarterly-digest.md">Quarterly</a>
  <a class="primary" href="${esc(origin)}/admin" target="_blank" rel="noreferrer">Admin</a>
</div>
<div class="card" style="margin-bottom:1rem">
  <h2>This week — human only</h2>
  <ul>
    ${human.map((h) => `<li>${esc(h.task)} <span class="badge">${esc(h.who)}</span></li>`).join('') || '<li>No open human tasks — keep autopilot on cron.</li>'}
  </ul>
</div>
<div class="card">
  <h2>Phase packs</h2>
  <div class="grid">
    ${matrix
      .map(
        (p) => `<a class="pill ${p.ready ? 'on' : 'off'}" href="${esc(p.href)}">${esc(p.name)} <span class="badge ${p.ready ? 'on' : 'off'}">${p.ready ? 'ready' : 'missing'}</span></a>`
      )
      .join('')}
  </div>
</div>
<p class="sub" style="margin-top:1.25rem">${esc(weekly.message)} · ${esc(monthly.message)} · ${esc(quarterly.message)}</p>
</div></body></html>`;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '9',
    score: { overall: score.overall, grade: score.grade },
    unlockPercent: unlock ?? null,
    humanTaskCount: human.length,
    hardFindingCount: weekly.data?.hardFindingCount ?? 0,
    matrix,
    digests: {
      weekly: weekly.message,
      monthly: monthly.message,
      quarterly: quarterly.message,
      cockpit: cockpit.message,
    },
  };

  const md = [
    `# Phase 9 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Score: **${score.overall ?? '—'}** (${score.grade ?? '—'}) · unlock ${unlock ?? '—'}%`,
    `- ${weekly.message}`,
    `- ${monthly.message}`,
    `- ${quarterly.message}`,
    `- ${cockpit.message}`,
    '',
    'Open **`phase9-ops.html`** · import **`phase9-routine.ics`**.',
    '',
    '## Human this week',
    '',
    ...human.map((h) => `- [ ] ${h.task} (${h.who})`),
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'phase9-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase9-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase9-ops.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'phase-matrix.json'), JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  return {
    ok: true,
    status: human.length > 8 ? 'degraded' : 'ok',
    message: `Phase 9 command center · score ${score.overall ?? '—'} · ${human.length} human task(s) · packs ${matrix.filter((m) => m.ready).length}/${matrix.length}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase9-ops.html'),
        ics: resolve(outDir, 'phase9-routine.ics'),
        md: resolve(outDir, 'phase9-advance.md'),
        cockpit: cockpit.data?.paths?.html,
      },
      weekly: weekly.data,
      monthly: monthly.data,
      quarterly: quarterly.data,
    },
    findings: [
      {
        code: 'PHASE9_OPS',
        severity: 'low',
        title: 'Phase 9 routine command center ready',
        remediation: 'Import phase9-routine.ics; open phase9-ops.html each week; keep Meridian autopilot on cron.',
        owner: 'marketing',
        pillar: 'ops',
      },
    ],
  };
}
