import { googleEnvStatus, googleFetch } from './google-auth.mjs';

/**
 * Google Search Console collector.
 * Profile: connectors.gsc.siteUrl e.g. "sc-domain:zigma-technologies.com" or "https://zigma-technologies.com/"
 *
 * @param {object} profile
 * @param {{ windowDays?: number, topN?: number, comparePrevious?: boolean }} [opts]
 */
export async function collectGsc(profile, opts = {}) {
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
  const windowDays = Math.min(90, Math.max(7, Number(opts.windowDays || cfg.windowDays || 28)));
  const topN = Math.min(50, Math.max(5, Number(opts.topN || cfg.topN || 15)));
  const comparePrevious = opts.comparePrevious !== false && cfg.comparePrevious !== false;

  try {
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - windowDays);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    const prevEnd = new Date(start);
    prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setUTCDate(prevStart.getUTCDate() - windowDays);
    const prevStartDate = prevStart.toISOString().slice(0, 10);
    const prevEndDate = prevEnd.toISOString().slice(0, 10);

    const queryBody = (dims, sd, ed) => ({
      startDate: sd,
      endDate: ed,
      dimensions: dims,
      rowLimit: topN,
    });

    const jobs = [
      googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encoded}/sitemaps`).catch((e) => ({
        _error: String(e.message || e),
      })),
      googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`, {
        method: 'POST',
        body: queryBody(['query'], startDate, endDate),
      }).catch((e) => ({ _error: String(e.message || e) })),
      googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`, {
        method: 'POST',
        body: { startDate, endDate },
      }).catch((e) => ({ _error: String(e.message || e) })),
      googleFetch('https://www.googleapis.com/webmasters/v3/sites').catch((e) => ({
        _error: String(e.message || e),
      })),
      googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`, {
        method: 'POST',
        body: queryBody(['page'], startDate, endDate),
      }).catch((e) => ({ _error: String(e.message || e) })),
      googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`, {
        method: 'POST',
        body: queryBody(['device'], startDate, endDate),
      }).catch((e) => ({ _error: String(e.message || e) })),
      googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`, {
        method: 'POST',
        body: queryBody(['country'], startDate, endDate),
      }).catch((e) => ({ _error: String(e.message || e) })),
    ];

    if (comparePrevious) {
      jobs.push(
        googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`, {
          method: 'POST',
          body: { startDate: prevStartDate, endDate: prevEndDate },
        }).catch((e) => ({ _error: String(e.message || e) }))
      );
    }

    const [
      sitemaps,
      analytics,
      aggregate,
      sites,
      pagesAnalytics,
      deviceAnalytics,
      countryAnalytics,
      prevAggregate,
    ] = await Promise.all(jobs);

    const mapRows = (rows, keyName) =>
      Array.isArray(rows)
        ? rows.map((r) => ({
            [keyName]: r.keys?.[0] || '',
            clicks: r.clicks ?? 0,
            impressions: r.impressions ?? 0,
            ctr: r.ctr ?? 0,
            position: r.position ?? 0,
          }))
        : [];

    const topQueries = mapRows(analytics?.rows, 'query');
    const topPages = mapRows(pagesAnalytics?.rows, 'page');
    const byDevice = mapRows(deviceAnalytics?.rows, 'device');
    const byCountry = mapRows(countryAnalytics?.rows, 'country');

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

    let previous = null;
    let delta = null;
    if (comparePrevious && prevAggregate && !prevAggregate._error) {
      const prevRow = Array.isArray(prevAggregate?.rows) ? prevAggregate.rows[0] : null;
      if (prevRow) {
        previous = {
          clicks: prevRow.clicks ?? 0,
          impressions: prevRow.impressions ?? 0,
          ctr: prevRow.ctr ?? 0,
          position: prevRow.position ?? null,
          window: { startDate: prevStartDate, endDate: prevEndDate },
        };
        const pct = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0);
        delta = {
          clicks: totals.clicks - previous.clicks,
          impressions: totals.impressions - previous.impressions,
          clicksPct: pct(totals.clicks, previous.clicks),
          impressionsPct: pct(totals.impressions, previous.impressions),
          ctrPts: (totals.ctr ?? 0) - (previous.ctr ?? 0),
          positionDelta:
            totals.position != null && previous.position != null
              ? totals.position - previous.position
              : null,
        };
      }
    }

    const sitemapList = Array.isArray(sitemaps?.sitemap) ? sitemaps.sitemap : [];
    const siteListed =
      Array.isArray(sites?.siteEntry) &&
      sites.siteEntry.some((s) => s.siteUrl === siteUrl || s.siteUrl === profile.origin + '/');

    // Opportunity: high impressions, low CTR, decent position (title/desc candidates)
    const opportunities = [...topQueries]
      .filter((q) => q.impressions >= 20 && q.ctr < 0.03 && q.position <= 15)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 8);

    // Rising / declining pages by clicks among top sample
    const pageAlerts = topPages
      .filter((p) => p.impressions >= 10 && p.position > 20)
      .slice(0, 5);

    return {
      id: 'gsc',
      label: 'Google Search Console',
      status: sitemaps?._error && analytics?._error ? 'error' : 'ok',
      message: siteListed
        ? `Last ${windowDays}d · ${totals.clicks} clicks · ${sitemapList.length} sitemap(s)`
        : `Connected · verify siteUrl "${siteUrl}" is listed in this Google account`,
      data: {
        siteUrl,
        window: { startDate, endDate, days: windowDays },
        sitemaps: sitemapList.map((s) => ({
          path: s.path,
          lastSubmitted: s.lastSubmitted,
          isPending: s.isPending,
          errors: s.errors,
          warnings: s.warnings,
        })),
        topQueries,
        topPages,
        byDevice,
        byCountry,
        totals,
        previous,
        delta,
        opportunities,
        pageAlerts,
        sampleTotals: totals,
        sitesError: sites?._error || null,
        sitemapsError: sitemaps?._error || null,
        analyticsError: analytics?._error || null,
        aggregateError: aggregate?._error || null,
        pagesError: pagesAnalytics?._error || null,
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
