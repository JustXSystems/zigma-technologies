import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual, titleOf, meta as metaOf } from '../lib/html.mjs';

function scoreTitle(title, brand) {
  const t = (title || '').trim();
  const len = t.length;
  const brandHits = brand
    ? (t.match(new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    : 0;
  const issues = [];
  if (len < 30) issues.push('short');
  if (len > 65) issues.push('long');
  if (brandHits > 1) issues.push('brand-twice');
  if (!t) issues.push('empty');
  return { len, brandHits, issues, ok: issues.length === 0 };
}

function scoreDesc(desc) {
  const d = (desc || '').trim();
  const len = d.length;
  const issues = [];
  if (len < 70) issues.push('short');
  if (len > 165) issues.push('long');
  if (!d) issues.push('empty');
  return { len, issues, ok: issues.length === 0 };
}

/**
 * Phase 3 — priority meta audit for top commercial URLs (live SERP-ish preview).
 */
export async function writeTop20MetaPack(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const brand = profile.brand?.name || '';
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');

  let paths =
    opts.paths ||
    profile.autopilot?.topMetaPaths ||
    [
      '/',
      '/contact',
      '/projects',
      '/products',
      '/services',
      '/locations',
      '/locations/bengaluru',
      '/careers',
      '/certifications',
      '/industries',
    ];

  // Enrich from keyword map commercial rows when present
  try {
    const kw = JSON.parse(await readFile(resolve(outDir, 'keyword-map.json'), 'utf8'));
    const commercial = (kw.rows || kw.keywords || [])
      .filter((r) => /commercial|product|service|project/i.test(String(r.intent || r.type || '')))
      .map((r) => r.path || r.url)
      .filter(Boolean)
      .map((u) => (String(u).startsWith('http') ? new URL(u).pathname : u));
    paths = [...new Set([...paths, ...commercial])].slice(0, 24);
  } catch {
    /* optional */
  }

  if (profile.sampleDetailPath) paths = [...new Set([profile.sampleDetailPath, ...paths])].slice(0, 24);

  const pages = [];
  for (const path of paths) {
    const url = `${origin}${path === '/' ? '/' : path}`;
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetchManual(url, { forceBody: true });
      const title = titleOf(res.body || '');
      const description = metaOf(res.body || '', 'description');
      const tScore = scoreTitle(title, brand);
      const dScore = scoreDesc(description);
      const needsPolish = !tScore.ok || !dScore.ok;
      pages.push({
        path,
        url,
        status: res.status,
        title,
        description,
        titleScore: tScore,
        descScore: dScore,
        needsPolish,
        adminHint:
          path === '/' || ['/contact', '/careers', '/certifications', '/industries'].includes(path)
            ? 'Admin → Pages → Page details / SEO'
            : path.startsWith('/projects/') || path.startsWith('/products/') || path.startsWith('/services/')
              ? 'Admin → Inventory → Edit → SEO tab'
              : 'Admin → Pages or Inventory SEO',
      });
    } catch (e) {
      pages.push({ path, url, error: String(e.message || e), needsPolish: true });
    }
  }

  const polish = pages.filter((p) => p.needsPolish).length;
  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '3',
    brand,
    checked: pages.length,
    needsPolish: polish,
    pages,
  };

  const md = [
    `# Top meta pack (Phase 3) — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt} · **${polish}** of ${pages.length} need polish`,
    '',
    'Rules: title 50–60 chars · do **not** type `| ${brand}` · description 120–160 chars.',
    '',
    '| Path | Title len | Desc len | Issues | Where to edit |',
    '| --- | --- | --- | --- | --- |',
    ...pages.map((p) => {
      const issues = [...(p.titleScore?.issues || []), ...(p.descScore?.issues || []).map((i) => `desc-${i}`)].join(', ') || 'ok';
      return `| ${p.path} | ${p.titleScore?.len ?? '—'} | ${p.descScore?.len ?? '—'} | ${issues} | ${p.adminHint || '—'} |`;
    }),
    '',
    '## Live previews (need polish first)',
    '',
    ...pages
      .filter((p) => p.needsPolish)
      .slice(0, 12)
      .map(
        (p) =>
          `### ${p.path}\n\n- **Title:** ${p.title || '—'}\n- **Description:** ${p.description || '—'}\n- Edit: ${p.adminHint}\n`
      ),
    '',
  ].join('\n');

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'top20-meta-pack.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'top20-meta-pack.md'), md, 'utf8');

  return {
    ok: true,
    status: polish ? 'degraded' : 'ok',
    message: `Top meta pack: ${polish}/${pages.length} page(s) need Phase 3 polish`,
    data: { ...payload, paths: { md: resolve(outDir, 'top20-meta-pack.md'), json: resolve(outDir, 'top20-meta-pack.json') } },
    findings: [
      {
        code: 'TOP20_META',
        severity: polish >= 5 ? 'medium' : 'low',
        title: `${polish} priority page(s) outside ideal title/description length`,
        remediation: 'Hand-polish using top20-meta-pack.md (Phase 3). Autopilot already fills empty CMS meta.',
        owner: 'marketing',
        pillar: 'onpage',
      },
    ],
  };
}
