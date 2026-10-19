import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual, schemaTypesOf } from '../lib/html.mjs';

const RRT = 'https://search.google.com/test/rich-results?url=';

/**
 * Phase 2.2 — live schema sniff + one-click Rich Results Test URLs.
 */
export async function writeRichResultsPack(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const detail = profile.sampleDetailPath || '/projects/amc-engineering-college-200kw-bangalore';
  const pages =
    opts.pages ||
    profile.autopilot?.richResultsPages ||
    [
      { path: '/', expect: ['Organization', 'LocalBusiness'] },
      { path: '/projects', expect: ['BreadcrumbList'] },
      { path: detail, expect: ['BreadcrumbList'] },
      { path: '/products', expect: ['BreadcrumbList'] },
      { path: '/services', expect: ['BreadcrumbList'] },
      { path: '/contact', expect: ['BreadcrumbList'] },
    ];

  const results = [];
  for (const p of pages) {
    const url = `${origin}${p.path === '/' ? '/' : p.path}`;
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetchManual(url, { forceBody: true });
      const types = schemaTypesOf(res.body || '');
      const missing = (p.expect || []).filter(
        (t) => !types.some((x) => x.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(x.toLowerCase()))
      );
      results.push({
        path: p.path,
        url,
        status: res.status,
        schemaTypes: types,
        expect: p.expect || [],
        missing,
        richResultsTest: `${RRT}${encodeURIComponent(url)}`,
        schemaValidator: `https://validator.schema.org/#url=${encodeURIComponent(url)}`,
        ok: res.status >= 200 && res.status < 400 && missing.length === 0,
      });
    } catch (e) {
      results.push({ path: p.path, url, error: String(e.message || e), ok: false });
    }
  }

  const fail = results.filter((r) => !r.ok).length;
  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '2.2',
    checked: results.length,
    fail,
    results,
  };

  const md = [
    `# Rich Results pack (Phase 2.2) — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    'Open each **Rich Results Test** link, wait for the green eligibility message, then tick it off.',
    '',
    '| Page | Live schema | Missing vs expect | Test |',
    '| --- | --- | --- | --- |',
    ...results.map(
      (r) =>
        `| ${r.path} | ${(r.schemaTypes || []).join(', ') || r.error || '—'} | ${(r.missing || []).join(', ') || '—'} | [Test](${r.richResultsTest || '#'}) |`
    ),
    '',
    'Also: LinkedIn Post Inspector on home + one project (Phase 2.4).',
    '',
  ].join('\n');

  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'rich-results-pack.json'), JSON.stringify(payload, null, 2), 'utf8');
    await writeFile(resolve(opts.outDir, 'rich-results-pack.md'), md, 'utf8');
  }

  return {
    ok: fail === 0,
    status: fail ? 'degraded' : 'ok',
    message: `Rich Results pack: ${results.length - fail}/${results.length} pages match expected schema types`,
    data: {
      ...payload,
      paths: opts.outDir
        ? { md: resolve(opts.outDir, 'rich-results-pack.md'), json: resolve(opts.outDir, 'rich-results-pack.json') }
        : null,
    },
    findings:
      fail > 0
        ? [
            {
              code: 'RICH_RESULTS_GAPS',
              severity: 'low',
              title: `${fail} page(s) missing expected JSON-LD types for Rich Results Test`,
              remediation: 'Open rich-results-pack.md links; fix Site Settings / page schema; re-run.',
              owner: 'developer',
              pillar: 'technical',
            },
          ]
        : [
            {
              code: 'RICH_RESULTS_PACK',
              severity: 'low',
              title: 'Rich Results Test pack ready — click through once in Google UI',
              remediation: 'Complete Phase 2.2 using rich-results-pack.md (cannot be fully automated).',
              owner: 'marketing',
              pillar: 'technical',
            },
          ],
  };
}
