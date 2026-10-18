import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const PSI_UI = 'https://pagespeed.web.dev/analysis?url=';

/**
 * Phase 4 — one-click PageSpeed URLs + optional PSI API lab scores when key present.
 */
export async function writeSpeedBaseline(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const paths =
    opts.paths ||
    profile.autopilot?.speedPaths ||
    ['/', '/projects', '/products', '/contact'];

  const key = (process.env.MERIDIAN_PSI_API_KEY || '').trim();
  const pages = [];

  for (const path of paths) {
    const url = `${origin}${path === '/' ? '/' : path}`;
    const entry = {
      path,
      url,
      psiMobile: `${PSI_UI}${encodeURIComponent(url)}`,
      lab: null,
    };
    if (key && !opts.skipApi) {
      try {
        const params = new URLSearchParams({
          url,
          category: 'PERFORMANCE',
          strategy: 'mobile',
          key,
        });
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const audits = data.lighthouseResult?.audits || {};
          entry.lab = {
            performance: Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100),
            lcp: audits['largest-contentful-paint']?.displayValue || null,
            cls: audits['cumulative-layout-shift']?.displayValue || null,
            inp: audits['interaction-to-next-paint']?.displayValue || audits['total-blocking-time']?.displayValue || null,
          };
        } else {
          entry.labError = data?.error?.message || `PSI ${res.status}`;
        }
      } catch (e) {
        entry.labError = String(e.message || e);
      }
    }
    pages.push(entry);
  }

  const withLab = pages.filter((p) => p.lab).length;
  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '4',
    psiKeyPresent: !!key,
    checked: pages.length,
    withLab,
    pages,
    note: key
      ? 'Lab scores from PageSpeed API (mobile). Field CWV still from Search Console / CrUX.'
      : 'Set MERIDIAN_PSI_API_KEY to auto-fill lab scores; until then use the psiMobile links.',
  };

  const md = [
    `# Speed baseline (Phase 4) — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    payload.note,
    '',
    '| Page | Perf | LCP | CLS | Open PSI |',
    '| --- | --- | --- | --- | --- |',
    ...pages.map(
      (p) =>
        `| ${p.path} | ${p.lab?.performance ?? '—'} | ${p.lab?.lcp ?? '—'} | ${p.lab?.cls ?? '—'} | [PageSpeed](${p.psiMobile}) |`
    ),
    '',
    'Meridian autopilot already compresses heavy images (WebP). Re-run after large media uploads.',
    '',
  ].join('\n');

  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'speed-baseline.json'), JSON.stringify(payload, null, 2), 'utf8');
    await writeFile(resolve(opts.outDir, 'speed-baseline.md'), md, 'utf8');
  }

  return {
    ok: true,
    status: key && withLab === 0 ? 'degraded' : 'ok',
    message: key
      ? `Speed baseline: lab scores for ${withLab}/${pages.length} key page(s)`
      : `Speed baseline: ${pages.length} PageSpeed links (no PSI key)`,
    data: {
      ...payload,
      paths: opts.outDir
        ? { md: resolve(opts.outDir, 'speed-baseline.md'), json: resolve(opts.outDir, 'speed-baseline.json') }
        : null,
    },
    findings: [
      {
        code: 'SPEED_BASELINE',
        severity: 'low',
        title: 'Phase 4 speed pack ready',
        remediation: key
          ? 'Review speed-baseline.md lab scores; fix LCP/CLS outliers.'
          : 'Open PSI links in speed-baseline.md, or set MERIDIAN_PSI_API_KEY for auto lab scores.',
        owner: key ? 'developer' : 'marketing',
        pillar: 'technical',
      },
    ],
  };
}
