import { googleEnvStatus, googleFetch } from './google-auth.mjs';

/**
 * Google Search Console collector.
 * Profile: connectors.gsc.siteUrl e.g. "sc-domain:zigma-technologies.com" or "https://zigma-technologies.com/"
 */
export async function collectGsc(profile) {
  const cfg = profile.connectors?.gsc || {};
  if (!cfg.enabled) {
    return { id: 'gsc', label: 'Google Search Console', status: 'skipped', message: 'Disabled in profile' };
  }

  const auth = googleEnvStatus();
  if (!auth.ok) {
    return {
      id: 'gsc',
      label: 'Google Search Console',
      status: 'auth_required',
      message: `Missing env: ${auth.missing.join(', ')}. Run: node packages/meridian/scripts/google-oauth-setup.mjs`,
      data: { siteUrl: cfg.siteUrl || null },
    };
  }

  const siteUrl = (cfg.siteUrl || `sc-domain:${new URL(profile.origin).hostname}`).trim();
  const encoded = encodeURIComponent(siteUrl);

  try {
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 28);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    const [sitemaps, analytics, aggregate, sites] = await Promise.all([
      googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encoded}/sitemaps`).catch((e) => ({
        _error: String(e.message || e),
      })),
      googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`, {
        method: 'POST',
        body: {
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 10,
        },
      }).catch((e) => ({ _error: String(e.message || e) })),
      // Dimensionless query = true property totals (not sum of top-10 sample)
      googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`, {
        method: 'POST',
        body: {
          startDate,
          endDate,
        },
      }).catch((e) => ({ _error: String(e.message || e) })),
      googleFetch('https://www.googleapis.com/webmasters/v3/sites').catch((e) => ({
        _error: String(e.message || e),
      })),
    ]);

    const sitemapList = Array.isArray(sitemaps?.sitemap) ? sitemaps.sitemap : [];
    const topQueries = Array.isArray(analytics?.rows)
      ? analytics.rows.map((r) => ({
          query: r.keys?.[0] || '',
          clicks: r.clicks ?? 0,
          impressions: r.impressions ?? 0,
          ctr: r.ctr ?? 0,
          position: r.position ?? 0,
        }))
      : [];

    const aggRow = Array.isArray(aggregate?.rows) ? aggregate.rows[0] : null;
    const totals = aggRow
      ? {
          clicks: aggRow.clicks ?? 0,
          impressions: aggRow.impressions ?? 0,
          ctr: aggRow.ctr ?? 0,
          position: aggRow.position ?? null,
        }
      : topQueries.reduce(
          (acc, q) => {
            acc.clicks += q.clicks;
            acc.impressions += q.impressions;
            return acc;
          },
          { clicks: 0, impressions: 0, ctr: null, position: null }
        );

    const siteListed =
      Array.isArray(sites?.siteEntry) &&
      sites.siteEntry.some((s) => s.siteUrl === siteUrl || s.siteUrl === profile.origin + '/');

    return {
      id: 'gsc',
      label: 'Google Search Console',
      status: sitemaps?._error && analytics?._error ? 'error' : 'ok',
      message: siteListed
        ? `Last 28d top queries sampled · ${sitemapList.length} sitemap(s)`
        : `Connected · verify siteUrl "${siteUrl}" is listed in this Google account`,
      data: {
        siteUrl,
        window: { startDate, endDate },
        sitemaps: sitemapList.map((s) => ({
          path: s.path,
          lastSubmitted: s.lastSubmitted,
          isPending: s.isPending,
          errors: s.errors,
          warnings: s.warnings,
        })),
        topQueries,
        totals,
        sampleTotals: totals,
        sitesError: sites?._error || null,
        sitemapsError: sitemaps?._error || null,
        analyticsError: analytics?._error || null,
        aggregateError: aggregate?._error || null,
      },
    };
  } catch (e) {
    return {
      id: 'gsc',
      label: 'Google Search Console',
      status: e.code === 'AUTH_REQUIRED' ? 'auth_required' : 'error',
      message: String(e.message || e),
      data: { siteUrl },
    };
  }
}
