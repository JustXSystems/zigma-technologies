import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual, meta } from '../lib/html.mjs';

/**
 * Phase 6 — list sample city×service templates still noindex / thin (ready when real content exists).
 */
export async function assessCityPages(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const samples =
    opts.samples ||
    profile.autopilot?.cityPageSamples || [
      '/locations/bengaluru/ups-amc',
      '/locations/chennai/solar-epc',
      '/locations/pune/ups-amc',
      '/locations/hyderabad/solar-epc',
      '/locations/mumbai/ups-amc',
    ];

  const pages = [];
  for (const path of samples) {
    const url = `${origin}${path}`;
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetchManual(url, { forceBody: true });
      const robots = meta(res.body || '', 'robots').toLowerCase();
      const noindex = /noindex/.test(robots);
      const text = String(res.body || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const words = text ? text.split(' ').filter(Boolean).length : 0;
      const readyToIndex = !noindex && words >= 600;
      pages.push({
        path,
        url,
        status: res.status,
        noindex,
        words,
        readyToIndex,
        action: readyToIndex
          ? 'Already indexable — verify uniqueness vs other cities'
          : noindex
            ? `Write unique ${Math.max(0, 600 - words)}+ more words, then add to INDEXABLE_CITY_SERVICES`
            : `Expand content (now ${words} words; target ≥600) before promoting`,
      });
    } catch (e) {
      pages.push({ path, url, error: String(e.message || e) });
    }
  }

  const blocked = pages.filter((p) => p.noindex).length;
  const ready = pages.filter((p) => p.readyToIndex).length;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '6.1',
    note: 'City×service pages stay noindex until INDEXABLE_CITY_SERVICES includes city/service (src/lib/location-services.ts).',
    checked: pages.length,
    blocked,
    ready,
    pages,
  };

  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'city-pages-readiness.json'), JSON.stringify(payload, null, 2), 'utf8');
    await writeFile(
      resolve(opts.outDir, 'city-pages-readiness.md'),
      [
        `# City × service page readiness (Phase 6)`,
        '',
        `Generated: ${payload.generatedAt}`,
        '',
        `| Path | noindex | Words | Action |`,
        `| --- | --- | --- | --- |`,
        ...pages.map((p) => `| ${p.path} | ${p.noindex ? 'yes' : 'no'} | ${p.words ?? '—'} | ${p.action || p.error || ''} |`),
        '',
        'When a page has unique local proof (≥600 words), add `city/service` to `INDEXABLE_CITY_SERVICES` and redeploy.',
        '',
      ].join('\n'),
      'utf8'
    );
  }

  return {
    ok: true,
    status: 'ok',
    message: `City pages: ${ready} ready · ${blocked} still noindex (of ${pages.length} samples)`,
    data: payload,
    findings:
      blocked > 0
        ? [
            {
              code: 'CITY_PAGES_NOINDEX',
              severity: 'low',
              title: `${blocked} sample city×service page(s) correctly noindex until unique content`,
              remediation: 'See city-pages-readiness.md — write real local content before indexing (Phase 6).',
              owner: 'marketing',
              pillar: 'onpage',
            },
          ]
        : [],
  };
}
