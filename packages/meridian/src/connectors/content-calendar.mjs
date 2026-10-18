import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Phase 7 — 4-week content calendar seeded from keyword map + content briefs.
 */
export async function writeContentCalendar(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  let keywords = [];
  let briefs = [];
  try {
    const kw = JSON.parse(await readFile(resolve(outDir, 'keyword-map.json'), 'utf8'));
    keywords = kw.rows || kw.keywords || kw.items || [];
  } catch {
    /* optional */
  }
  try {
    const br = JSON.parse(await readFile(resolve(outDir, 'content-briefs.json'), 'utf8'));
    briefs = br.briefs || br.items || [];
  } catch {
    /* optional */
  }

  const pick = (arr, n) => arr.slice(0, n);
  const commercial = keywords.filter((r) =>
    /commercial|transaction|product|service|project|local/i.test(String(r.intent || r.type || r.priority || ''))
  );
  const pool = (commercial.length ? commercial : keywords).map((r) => ({
    topic: r.keyword || r.query || r.title || r.topic || 'Untitled topic',
    path: r.path || r.url || '',
    intent: r.intent || r.type || '',
    notes: r.notes || r.remediation || '',
  }));

  const briefTopics = briefs.slice(0, 8).map((b) => ({
    topic: b.title || b.path || 'Expand thin page',
    path: b.path || b.url || '',
    intent: 'thin-expansion',
    notes: b.brief || b.summary || 'See content-briefs.md',
  }));

  const topics = [...pool, ...briefTopics];
  const weeks = [1, 2, 3, 4].map((week) => {
    const start = (week - 1) * 2;
    const slots = topics.slice(start, start + 2);
    while (slots.length < 2) {
      slots.push({
        topic: week === 4 ? 'Case study from latest project' : 'FAQ / guide from keyword map',
        path: '',
        intent: 'fill',
        notes: 'Pick next commercial keyword from keyword-map.md',
      });
    }
    return {
      week,
      publish: slots[0],
      improve: slots[1],
      caseStudy: week % 2 === 0,
    };
  });

  const now = new Date();
  const monthLabel = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const payload = {
    generatedAt: now.toISOString(),
    phase: '7',
    month: monthLabel,
    cadence: '2–4 articles + 1 case study per month (SEO-GUIDE Phase 7)',
    weeks,
    sourceCounts: { keywords: keywords.length, briefs: briefs.length },
  };

  const md = [
    `# Content calendar (Phase 7) — ${monthLabel}`,
    '',
    `Generated: ${payload.generatedAt} · ${profile.displayName || profile.id}`,
    '',
    'Autopilot seeds this from `keyword-map.json` + thin-page briefs. Publish in Admin → Resources / Inventory.',
    '',
    '| Week | Publish | Improve / expand | Case study? |',
    '| --- | --- | --- | --- |',
    ...weeks.map(
      (w) =>
        `| ${w.week} | ${w.publish.topic}${w.publish.path ? ` (${w.publish.path})` : ''} | ${w.improve.topic}${w.improve.path ? ` (${w.improve.path})` : ''} | ${w.caseStudy ? 'yes' : 'optional'} |`
    ),
    '',
    'After publishing: request indexing in GSC (when secrets set) or Admin → Meridian → Inspect URL.',
    '',
  ].join('\n');

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'content-calendar.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'content-calendar.md'), md, 'utf8');

  return {
    ok: true,
    status: 'ok',
    message: `Content calendar ${monthLabel}: 4 weeks seeded (${topics.length} topic candidates)`,
    data: { ...payload, paths: { md: resolve(outDir, 'content-calendar.md') } },
    findings: [
      {
        code: 'CONTENT_CALENDAR',
        severity: 'low',
        title: `Phase 7 calendar ready for ${monthLabel}`,
        remediation: 'Publish from content-calendar.md; tick weekly digest when done.',
        owner: 'marketing',
        pillar: 'onpage',
      },
    ],
  };
}
