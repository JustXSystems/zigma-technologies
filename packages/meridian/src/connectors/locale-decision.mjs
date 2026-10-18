import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual, meta, titleOf } from '../lib/html.mjs';

/**
 * Phase 6.3 — Hindi/Kannada keep-or-off recommendation from live routes.
 */
export async function assessLocaleDecision(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const paths = opts.paths || profile.autopilot?.localePaths || ['/hi', '/kn', '/hi/locations/bengaluru', '/kn/locations/bengaluru'];

  const pages = [];
  for (const path of paths) {
    const url = `${origin}${path}`;
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetchManual(url, { forceBody: true });
      const robots = meta(res.body || '', 'robots').toLowerCase();
      const redirected = res.status >= 300 && res.status < 400;
      const noindex = /noindex/.test(robots);
      const title = titleOf(res.body || '');
      const text = String(res.body || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const words = text ? text.split(' ').filter(Boolean).length : 0;
      pages.push({
        path,
        url,
        status: res.status,
        redirected,
        noindex,
        title,
        words,
        looksLive: !redirected && res.status === 200 && !noindex,
      });
    } catch (e) {
      pages.push({ path, url, error: String(e.message || e) });
    }
  }

  const live = pages.filter((p) => p.looksLive).length;
  const recommendation =
    live === 0
      ? 'KEEP OFF — locale hubs redirected/noindex (matches SEO-GUIDE default for B2B English search). Switch on only with native-speaker maintenance.'
      : live > 0 && pages.some((p) => p.looksLive && (p.words || 0) < 400)
        ? 'REVIEW — some locale pages are indexable but thin; improve copy or switch off in Site Copy → Locales.'
        : 'KEEP ON — locale pages look indexable with substantial content; ensure native review cadence.';

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '6.3',
    liveCount: live,
    recommendation,
    pages,
  };

  const md = [
    `# Locale decision (Phase 6.3) — Hindi / Kannada`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `**Recommendation:** ${recommendation}`,
    '',
    '| Path | Status | noindex | Words | Live? |',
    '| --- | --- | --- | --- | --- |',
    ...pages.map(
      (p) =>
        `| ${p.path} | ${p.status ?? '—'} | ${p.noindex ? 'yes' : p.redirected ? 'redirect' : 'no'} | ${p.words ?? '—'} | ${p.looksLive ? 'yes' : 'no'} |`
    ),
    '',
    'Admin → Site Copy → Locales to switch. Native speaker required before enabling.',
    '',
  ].join('\n');

  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'locale-decision.json'), JSON.stringify(payload, null, 2), 'utf8');
    await writeFile(resolve(opts.outDir, 'locale-decision.md'), md, 'utf8');
  }

  return {
    ok: true,
    status: 'ok',
    message: `Locale decision: ${live} live locale URL(s) · ${recommendation.slice(0, 80)}…`,
    data: {
      ...payload,
      paths: opts.outDir ? { md: resolve(opts.outDir, 'locale-decision.md') } : null,
    },
    findings: [
      {
        code: 'LOCALE_DECISION',
        severity: 'low',
        title: 'Phase 6.3 locale keep/off recommendation ready',
        remediation: 'Read locale-decision.md; change Site Copy → Locales only with native speaker.',
        owner: 'marketing',
        pillar: 'onpage',
      },
    ],
  };
}
