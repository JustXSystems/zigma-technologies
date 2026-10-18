import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual, prop, titleOf, meta } from '../lib/html.mjs';

const LI = 'https://www.linkedin.com/post-inspector/inspect/';

/**
 * Phase 2.4 — Open Graph / Twitter card audit + LinkedIn inspector links.
 */
export async function writeOgSharePack(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const paths =
    opts.paths ||
    profile.autopilot?.ogPaths ||
    ['/', profile.sampleDetailPath || '/projects/amc-engineering-college-200kw-bangalore', '/products', '/contact'];

  const pages = [];
  for (const path of paths) {
    const url = `${origin}${path === '/' ? '/' : path}`;
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetchManual(url, { forceBody: true });
      const ogTitle = prop(res.body || '', 'og:title') || titleOf(res.body || '');
      const ogDesc = prop(res.body || '', 'og:description') || meta(res.body || '', 'description');
      const ogImage = prop(res.body || '', 'og:image');
      const twCard = meta(res.body || '', 'twitter:card');
      const issues = [];
      if (!ogImage) issues.push('missing-og-image');
      if (ogImage && /logo\.(png|svg|jpg)/i.test(ogImage) && !/og\.png/i.test(ogImage)) issues.push('logo-as-og');
      if (!ogTitle) issues.push('missing-og-title');
      if (!ogDesc || ogDesc.length < 50) issues.push('weak-og-desc');
      pages.push({
        path,
        url,
        ogTitle,
        ogDesc,
        ogImage,
        twCard,
        issues,
        ok: issues.length === 0,
        linkedInInspect: `${LI}${encodeURIComponent(url)}`,
      });
    } catch (e) {
      pages.push({ path, url, error: String(e.message || e), ok: false });
    }
  }

  const fail = pages.filter((p) => !p.ok).length;
  const payload = { generatedAt: new Date().toISOString(), phase: '2.4', checked: pages.length, fail, pages };

  const md = [
    `# OG / social share pack (Phase 2.4)`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    '| Page | og:image | Issues | LinkedIn |',
    '| --- | --- | --- | --- |',
    ...pages.map(
      (p) =>
        `| ${p.path} | ${p.ogImage || '—'} | ${(p.issues || []).join(', ') || p.error || 'ok'} | [Inspect](${p.linkedInInspect || '#'}) |`
    ),
    '',
    'WhatsApp caches hard — append `?v=2` once if an old preview sticks.',
    '',
  ].join('\n');

  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'og-share-pack.json'), JSON.stringify(payload, null, 2), 'utf8');
    await writeFile(resolve(opts.outDir, 'og-share-pack.md'), md, 'utf8');
  }

  return {
    ok: fail === 0,
    status: fail ? 'degraded' : 'ok',
    message: `OG share pack: ${pages.length - fail}/${pages.length} pages OK`,
    data: {
      ...payload,
      paths: opts.outDir ? { md: resolve(opts.outDir, 'og-share-pack.md') } : null,
    },
    findings: [
      {
        code: fail ? 'OG_SHARE_GAPS' : 'OG_SHARE_PACK',
        severity: 'low',
        title: fail ? `${fail} page(s) have weak OG tags` : 'OG/share pack ready — run LinkedIn inspector once',
        remediation: fail ? 'Fix og:image/title in Site Settings or page SEO.' : 'Click LinkedIn links in og-share-pack.md (Phase 2.4).',
        owner: fail ? 'developer' : 'marketing',
        pillar: 'onpage',
      },
    ],
  };
}
