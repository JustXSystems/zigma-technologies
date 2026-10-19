import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildKeywordMap } from './keyword-map.mjs';
import { writeContentBriefs } from './content-briefs.mjs';
import { seedThinContent } from './content-seed.mjs';
import { writeContentCalendar } from './content-calendar.mjs';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function mondayOfWeek(weekOffset) {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff + weekOffset * 7);
  d.setUTCHours(9, 0, 0, 0);
  return d;
}

function icsEscape(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function buildIcs(weeks, month, origin) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meridian//Phase7 Content//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const w of weeks || []) {
    const start = mondayOfWeek(w.week - 1);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const stamp = (dt) =>
      `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(dt.getUTCDate()).padStart(2, '0')}T${String(dt.getUTCHours()).padStart(2, '0')}${String(dt.getUTCMinutes()).padStart(2, '0')}00Z`;
    const summary = `Zigma SEO · Week ${w.week}: ${w.publish?.topic || 'Publish'}`;
    const desc = [
      `Publish: ${w.publish?.topic || ''}`,
      w.publish?.path ? `Path: ${w.publish.path}` : '',
      `Improve: ${w.improve?.topic || ''}`,
      w.caseStudy ? 'Include case study this week' : '',
      `Admin: ${origin}/admin`,
    ]
      .filter(Boolean)
      .join('\\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:meridian-p7-w${w.week}-${month}@zigma`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Phase 7 advance — keyword map + briefs + FAQ seed + calendar + ICS + HTML ops.
 */
export async function advancePhase7(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');

  const wantSeed =
    opts.seed !== false &&
    (opts.apply === true ||
      process.env.MERIDIAN_AUTO_SEED_CONTENT === '1' ||
      profile.autopilot?.autoSeedContent === true);

  const kw = opts.skipKeywordMap
    ? { ok: true, message: 'keyword-map skipped', data: { count: 0 } }
    : await buildKeywordMap(profile, { outDir });

  const briefs = opts.skipBriefs
    ? { ok: true, message: 'briefs skipped', data: { count: 0 } }
    : await writeContentBriefs(profile, { outDir });

  let seed = { ok: true, message: 'seed skipped', data: {} };
  if (wantSeed) {
    seed = await seedThinContent(profile, { outDir, apply: true });
  }

  const cal = await writeContentCalendar(profile, { outDir });
  const weeks = cal.data?.weeks || [];
  const month = cal.data?.month || 'month';

  let kwRows = [];
  try {
    const j = JSON.parse(await readFile(resolve(outDir, 'keyword-map.json'), 'utf8'));
    kwRows = j.rows || j.keywords || [];
  } catch {
    /* optional */
  }
  const commercial = kwRows
    .filter((r) => /commercial|transaction|product|service|project|local/i.test(String(r.intent || r.type || '')))
    .slice(0, 12);

  const ics = buildIcs(weeks, month, origin);
  await writeFile(resolve(outDir, 'content-calendar.ics'), ics, 'utf8');

  const csv = [
    'week,slot,topic,path,intent,case_study',
    ...weeks.flatMap((w) => [
      [w.week, 'publish', w.publish?.topic, w.publish?.path, w.publish?.intent, w.caseStudy ? 'yes' : 'no']
        .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
        .join(','),
      [w.week, 'improve', w.improve?.topic, w.improve?.path, w.improve?.intent, '']
        .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
        .join(','),
    ]),
  ].join('\n');
  await writeFile(resolve(outDir, 'content-calendar.csv'), csv, 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 7 Content Ops — ${esc(profile.displayName || profile.id)}</title>
<style>
body{font-family:Segoe UI,system-ui,sans-serif;background:#0c1117;color:#e8eef5;margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:920px;margin:0 auto}
h1{font-size:1.45rem;margin:0 0 .35rem}
.sub{color:#8b9aab;margin:0 0 1rem}
.card{background:#151c26;border:1px solid #243041;border-radius:12px;padding:1rem;margin:.7rem 0}
table{width:100%;border-collapse:collapse;font-size:.84rem}
th,td{text-align:left;padding:.4rem .3rem;border-bottom:1px solid #243041}
a{color:#5b9fd4}
.badge{font-size:.68rem;padding:.12rem .4rem;border-radius:999px;background:#243040;color:#8b9aab}
.actions a{display:inline-block;margin:.2rem .35rem 0 0;padding:.45rem .75rem;border-radius:8px;background:#1e2c3d;color:#e8eef5;text-decoration:none;font-size:.82rem;border:1px solid #243041}
.actions a.primary{background:#3d9cf0;color:#041018;border:0;font-weight:650}
</style></head><body><div class="wrap">
<h1>Phase 7 — Content command</h1>
<p class="sub">${esc(origin)} · ${esc(month)} · keywords ${kwRows.length} · briefs ${briefs.data?.count ?? '—'} · ${esc(seed.message)}</p>
<div class="card actions">
  <a class="primary" href="${esc(origin)}/admin" target="_blank" rel="noreferrer">Open Admin</a>
  <a href="content-calendar.ics">Download calendar (.ics)</a>
  <a href="content-calendar.csv">Download CSV</a>
  <a href="content-briefs.md">Thin-page briefs</a>
  <a href="keyword-map.md">Keyword map</a>
</div>
<div class="card">
  <strong>4-week calendar</strong>
  <table>
    <thead><tr><th>Week</th><th>Publish</th><th>Improve</th><th>Case study</th></tr></thead>
    <tbody>
      ${weeks
        .map(
          (w) => `<tr>
        <td>${w.week}</td>
        <td>${esc(w.publish?.topic || '—')}${w.publish?.path ? `<div class="sub">${esc(w.publish.path)}</div>` : ''}</td>
        <td>${esc(w.improve?.topic || '—')}${w.improve?.path ? `<div class="sub">${esc(w.improve.path)}</div>` : ''}</td>
        <td>${w.caseStudy ? '<span class="badge">yes</span>' : '—'}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>
</div>
<div class="card">
  <strong>Top commercial intents</strong>
  <table>
    <thead><tr><th>Keyword</th><th>Path</th><th>Intent</th></tr></thead>
    <tbody>
      ${(commercial.length ? commercial : kwRows.slice(0, 12))
        .map(
          (r) => `<tr>
        <td>${esc(r.keyword || r.query || r.title || '—')}</td>
        <td>${esc(r.path || r.url || '—')}</td>
        <td>${esc(r.intent || r.type || '—')}</td>
      </tr>`
        )
        .join('') || '<tr><td colspan="3">Run keyword map on a host with DB access</td></tr>'}
    </tbody>
  </table>
</div>
<p class="sub">FAQ blocks auto-seed on thin catalog pages when autoSeedContent is on. Publish resources in Admin → Blog / Resources.</p>
</div></body></html>`;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '7',
    month,
    keywordCount: kwRows.length,
    briefCount: Number(briefs.data?.count || 0),
    seedMessage: seed.message,
    calendarMessage: cal.message,
  };

  const md = [
    `# Phase 7 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt} · ${month}`,
    '',
    `- Keywords: ${kw.message}`,
    `- Briefs: ${briefs.message}`,
    `- Seed: ${seed.message}`,
    `- Calendar: ${cal.message}`,
    '',
    'Open **`phase7-ops.html`** · import **`content-calendar.ics`** into Outlook/Google Calendar.',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'phase7-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase7-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase7-ops.html'), html, 'utf8');

  return {
    ok: kw.ok !== false && cal.ok !== false,
    status: 'ok',
    message: `Phase 7 · keywords ${kwRows.length} · briefs ${payload.briefCount} · calendar ${month}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase7-ops.html'),
        ics: resolve(outDir, 'content-calendar.ics'),
        csv: resolve(outDir, 'content-calendar.csv'),
        md: resolve(outDir, 'phase7-advance.md'),
      },
      calendar: cal.data,
    },
    findings: [
      {
        code: 'PHASE7_OPS',
        severity: 'low',
        title: 'Phase 7 content ops pack ready',
        remediation: 'Import content-calendar.ics; publish week slots in Admin; expand briefs as needed.',
        owner: 'marketing',
        pillar: 'onpage',
      },
      ...(kw.findings || []),
      ...(briefs.findings || []),
      ...(cal.findings || []),
    ],
  };
}
