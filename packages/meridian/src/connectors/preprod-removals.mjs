import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual, meta } from '../lib/html.mjs';

/**
 * Phase 1.8 — PreProd leak check + Removals checklist (only if still indexable by mistake).
 */
export async function writePreprodRemovals(profile, opts = {}) {
  const preprodOrigin =
    (opts.preprodOrigin || profile.autopilot?.preprodOrigin || 'https://justxsystems.com/zigma-technologies').replace(
      /\/$/,
      ''
    );
  const samplePaths = opts.paths || ['/', '/projects', '/contact'];
  const checks = [];

  for (const path of samplePaths) {
    const url = `${preprodOrigin}${path === '/' ? '' : path}`;
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetchManual(url, { forceBody: true });
      const robots = meta(res.body || '', 'robots').toLowerCase();
      const noindex = /noindex/.test(robots);
      checks.push({
        url,
        status: res.status,
        robots: robots || '(none)',
        noindex,
        ok: noindex || res.status === 404 || res.status >= 300,
      });
    } catch (e) {
      checks.push({ url, error: String(e.message || e), ok: true, note: 'unreachable — fine for removals' });
    }
  }

  const leak = checks.filter((c) => c.ok === false);
  const googleQuery = `site:justxsystems.com/zigma-technologies`;
  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '1.8',
    preprodOrigin,
    leakCount: leak.length,
    checks,
    googleQuery,
    removalsUrl: 'https://search.google.com/search-console/removals',
    steps: [
      `Search Google for: ${googleQuery}`,
      'If zero results → nothing to do (tick Phase 1.8 done).',
      'If hits appear → Search Console → Removals → Temporary removals → New request → prefix or URL.',
      'Confirm PreProd still serves noindex (checks below).',
    ],
  };

  const md = [
    `# PreProd removals checklist (Phase 1.8)`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    leak.length
      ? `**⚠ ${leak.length} PreProd sample(s) look indexable** — fix PreProd build flag immediately.`
      : '**PreProd samples look noindex / safe.** Only use Removals if Google still shows old URLs.',
    '',
    '## Live PreProd probe',
    '',
    '| URL | Status | robots | OK? |',
    '| --- | --- | --- | --- |',
    ...checks.map(
      (c) => `| ${c.url} | ${c.status ?? '—'} | ${c.robots || c.error || '—'} | ${c.ok ? 'yes' : 'NO'} |`
    ),
    '',
    '## Human steps',
    '',
    ...payload.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    `- Google query: \`${googleQuery}\``,
    `- Removals UI: ${payload.removalsUrl}`,
    '',
  ].join('\n');

  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'preprod-removals.json'), JSON.stringify(payload, null, 2), 'utf8');
    await writeFile(resolve(opts.outDir, 'preprod-removals.md'), md, 'utf8');
  }

  return {
    ok: leak.length === 0,
    status: leak.length ? 'error' : 'ok',
    message: leak.length
      ? `PreProd LEAK: ${leak.length} sample(s) may be indexable`
      : 'PreProd removals pack: samples noindex — Removals only if site: hits remain',
    data: {
      ...payload,
      paths: opts.outDir
        ? { md: resolve(opts.outDir, 'preprod-removals.md'), json: resolve(opts.outDir, 'preprod-removals.json') }
        : null,
    },
    findings: leak.length
      ? [
          {
            code: 'PREPROD_INDEXABLE',
            severity: 'critical',
            title: 'PreProd may be indexable — fix immediately',
            remediation: 'Clear NEXT_PUBLIC_SEO_INDEXABLE on PreProd; redeploy; then GSC Removals (preprod-removals.md).',
            owner: 'developer',
            pillar: 'technical',
          },
        ]
      : [
          {
            code: 'PREPROD_REMOVALS',
            severity: 'low',
            title: 'Phase 1.8 checklist ready',
            remediation: 'Once: Google site: query; Removals only if hits remain.',
            owner: 'marketing',
            pillar: 'technical',
          },
        ],
  };
}
