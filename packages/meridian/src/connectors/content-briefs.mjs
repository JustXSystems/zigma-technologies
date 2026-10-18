import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Phase 7 lite — content briefs for thin / orphan pages from sitemap-health.json.
 */
export async function writeContentBriefs(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  let issues = [];
  try {
    const health = JSON.parse(await readFile(resolve(outDir, 'sitemap-health.json'), 'utf8'));
    issues = (health.issues || []).filter((i) => i.code === 'THIN_CONTENT' || i.code === 'ORPHAN_PAGE');
  } catch {
    issues = [];
  }

  const byUrl = new Map();
  for (const iss of issues) {
    const cur = byUrl.get(iss.url) || { url: iss.url, codes: [] };
    cur.codes.push(iss.code);
    if (iss.code === 'THIN_CONTENT') cur.detail = iss.detail;
    byUrl.set(iss.url, cur);
  }

  const briefs = [...byUrl.values()].map((row) => {
    let pathname = '/';
    try {
      pathname = new URL(row.url).pathname;
    } catch {
      /* */
    }
    const titleHint = pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, ' ') || 'page';
    return {
      url: row.url,
      pathname,
      codes: row.codes,
      brief: {
        workingTitle: titleHint.replace(/\b\w/g, (c) => c.toUpperCase()),
        audience: 'Facility / procurement managers evaluating power & energy vendors in India',
        intent: row.codes.includes('THIN_CONTENT') ? 'Expand thin page to rank for commercial intent' : 'Strengthen internal links + unique value',
        outline: [
          'Open with who this is for + city/industry context',
          'What Zigma delivers (concrete scope, not keyword list)',
          'Proof: 1 project / metric / OEM partnership',
          'Process / SLA / response time',
          'FAQ (3 questions buyers ask)',
          'CTA: enquire / site survey',
        ],
        internalLinks: ['/projects', '/products', '/services', '/contact'],
        targetLength: '600–900 words',
      },
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    count: briefs.length,
    formula: 'SEO-GUIDE Phase 7 content expansion — auto brief from thin/orphan crawl',
    briefs,
  };

  await mkdir(outDir, { recursive: true });
  const jsonPath = resolve(outDir, 'content-briefs.json');
  const mdPath = resolve(outDir, 'content-briefs.md');
  await writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    mdPath,
    [
      `# Content briefs — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt} · ${briefs.length} page(s)`,
      '',
      ...briefs.flatMap((b) => [
        `## ${b.brief.workingTitle}`,
        '',
        `- URL: ${b.pathname}`,
        `- Flags: ${b.codes.join(', ')}`,
        `- Intent: ${b.brief.intent}`,
        `- Length: ${b.brief.targetLength}`,
        '',
        'Outline:',
        ...b.brief.outline.map((o, i) => `${i + 1}. ${o}`),
        '',
        `Internal links: ${b.brief.internalLinks.join(', ')}`,
        '',
      ]),
    ].join('\n'),
    'utf8'
  );

  return {
    ok: true,
    status: 'ok',
    message: briefs.length ? `Wrote ${briefs.length} content brief(s)` : 'No thin/orphan pages needing briefs',
    data: { ...payload, paths: { jsonPath, mdPath } },
    findings:
      briefs.length >= 5
        ? [
            {
              code: 'CONTENT_BRIEFS',
              severity: 'low',
              title: `${briefs.length} content brief(s) ready for thin/orphan pages`,
              remediation: 'Open content-briefs.md and expand pages in Admin (Phase 7).',
              owner: 'marketing',
              pillar: 'onpage',
            },
          ]
        : [],
  };
}
