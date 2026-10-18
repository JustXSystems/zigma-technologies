import { collectGsc } from './gsc.mjs';
import { collectGa4 } from './ga4.mjs';
import { collectBing } from './bing.mjs';
import { collectPagespeed } from './pagespeed.mjs';
import { collectCmsGaps } from './cms-gaps.mjs';

/**
 * Run all enabled connectors. http-site always reports from the technical engine.
 * @returns {Promise<object[]>}
 */
export async function runConnectors(profile, { technical } = {}) {
  const cfg = profile.connectors || {};
  const results = [];

  results.push({
    id: 'http-site',
    label: 'Live site (HTTP)',
    status: 'ok',
    message: `Crawled ${technical?.pages?.length || 0} URLs · sitemap ${technical?.extras?.sitemapLocs ?? '—'} locs`,
    data: {
      sitemapLocs: technical?.extras?.sitemapLocs ?? null,
      pagesChecked: technical?.pages?.length || 0,
    },
  });

  const jobs = [];
  if (cfg.gsc?.enabled !== false) jobs.push(collectGsc(profile));
  else results.push({ id: 'gsc', label: 'Google Search Console', status: 'skipped', message: 'Disabled in profile' });

  if (cfg.ga4?.enabled !== false) jobs.push(collectGa4(profile));
  else results.push({ id: 'ga4', label: 'Google Analytics 4', status: 'skipped', message: 'Disabled in profile' });

  if (cfg.bing?.enabled !== false) jobs.push(collectBing(profile));
  else results.push({ id: 'bing', label: 'Bing Webmaster Tools', status: 'skipped', message: 'Disabled in profile' });

  if (cfg.pagespeed?.enabled !== false) jobs.push(collectPagespeed(profile));
  else results.push({ id: 'pagespeed', label: 'PageSpeed / CrUX', status: 'skipped', message: 'Disabled in profile' });

  // CMS gaps: default on when script exists (Zigma); profile can disable
  if (cfg.cmsGaps?.enabled !== false && cfg['cms-gaps']?.enabled !== false) {
    jobs.push(collectCmsGaps(profile));
  } else {
    results.push({ id: 'cms-gaps', label: 'CMS SEO gaps', status: 'skipped', message: 'Disabled in profile' });
  }

  const collected = await Promise.all(jobs);
  results.push(...collected);

  if (cfg.cms?.enabled) {
    results.push({
      id: 'cms',
      label: `CMS write adapter (${cfg.cms.adapter || 'generic'})`,
      status: 'degraded',
      message: 'Write-back reserved for later (auto-patch meta via CMS APIs)',
      data: { adapter: cfg.cms.adapter || null },
    });
  } else {
    results.push({ id: 'cms', label: 'CMS write adapter', status: 'skipped', message: 'Disabled in profile' });
  }

  return results;
}

/** Findings emitted by connectors (e.g. cms-gaps). */
export function findingsFromConnectors(connectors) {
  const out = [];
  for (const c of connectors || []) {
    if (Array.isArray(c.findings)) out.push(...c.findings);
  }
  return out;
}

/** Pull signal payloads from connector results into report.signals */
export function signalsFromConnectors(connectors) {
  const byId = Object.fromEntries((connectors || []).map((c) => [c.id, c]));
  return {
    gsc: byId.gsc?.status === 'ok' ? byId.gsc.data : null,
    bing: byId.bing?.status === 'ok' ? byId.bing.data : null,
    ga4: byId.ga4?.status === 'ok' ? byId.ga4.data : null,
    pagespeed: byId.pagespeed?.status === 'ok' ? byId.pagespeed.data : null,
    cmsGaps: byId['cms-gaps']?.status === 'ok' ? byId['cms-gaps'].data : null,
    note:
      byId.gsc?.status === 'ok' || byId.ga4?.status === 'ok' || byId.bing?.status === 'ok' || byId.pagespeed?.status === 'ok'
        ? 'Live signal payloads attached from authenticated connectors.'
        : 'Signal payloads appear when connectors authenticate — see SETUP.md / Appendix G.',
  };
}
