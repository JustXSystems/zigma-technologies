import { collectGsc } from './gsc.mjs';
import { collectGa4 } from './ga4.mjs';
import { collectBing } from './bing.mjs';
import { collectPagespeed } from './pagespeed.mjs';

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

  const collected = await Promise.all(jobs);
  results.push(...collected);

  if (cfg.cms?.enabled) {
    results.push({
      id: 'cms',
      label: `CMS adapter (${cfg.cms.adapter || 'generic'})`,
      status: 'degraded',
      message: 'Write-back adapter reserved for M2 (meta patch via host CMS APIs)',
      data: { adapter: cfg.cms.adapter || null },
    });
  } else {
    results.push({ id: 'cms', label: 'CMS write adapter', status: 'skipped', message: 'Disabled in profile' });
  }

  return results;
}

/** Pull signal payloads from connector results into report.signals */
export function signalsFromConnectors(connectors) {
  const byId = Object.fromEntries((connectors || []).map((c) => [c.id, c]));
  return {
    gsc: byId.gsc?.status === 'ok' ? byId.gsc.data : null,
    bing: byId.bing?.status === 'ok' ? byId.bing.data : null,
    ga4: byId.ga4?.status === 'ok' ? byId.ga4.data : null,
    pagespeed: byId.pagespeed?.status === 'ok' ? byId.pagespeed.data : null,
    note:
      byId.gsc?.status === 'ok' || byId.ga4?.status === 'ok' || byId.bing?.status === 'ok' || byId.pagespeed?.status === 'ok'
        ? 'Live signal payloads attached from authenticated connectors.'
        : 'Signal payloads appear when connectors authenticate — see connector cards and packages/meridian/README.md.',
  };
}
