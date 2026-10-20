/**
 * Bing Webmaster Tools API (API key).
 * Env: MERIDIAN_BING_API_KEY
 * Docs: https://learn.microsoft.com/en-us/bing/webmaster-api/
 */

export async function collectBing(profile, opts = {}) {
  const cfg = profile.connectors?.bing || {};
  if (!cfg.enabled) {
    return { id: 'bing', label: 'Bing Webmaster Tools', status: 'skipped', message: 'Disabled in profile' };
  }

  const apiKey = (process.env.MERIDIAN_BING_API_KEY || '').trim();
  if (!apiKey) {
    return {
      id: 'bing',
      label: 'Bing Webmaster Tools',
      status: 'auth_required',
      message: 'Set MERIDIAN_BING_API_KEY (Bing Webmaster → Settings → API Access)',
      data: { siteUrl: profile.origin },
    };
  }

  const siteUrl = (cfg.siteUrl || profile.origin).replace(/\/$/, '');
  const topN = Math.min(50, Math.max(5, Number(opts.topN || cfg.topN || 15)));
  const qs = (path, extra = '') =>
    `https://ssl.bing.com/webmaster/api.svc/json/${path}?apikey=${encodeURIComponent(apiKey)}&siteUrl=${encodeURIComponent(siteUrl)}${extra}`;

  try {
    const [crawl, quota, queryStats, pageTraffic, rankTraffic] = await Promise.all([
      bingGet(qs('GetCrawlStats')),
      bingGet(qs('GetUrlSubmissionQuota')).catch(() => null),
      bingGet(qs('GetQueryStats')).catch(() => null),
      bingGet(qs('GetPageTrafficInfo')).catch(() => null),
      bingGet(qs('GetRankAndTrafficStats')).catch(() => null),
    ]);

    const crawlRows = Array.isArray(crawl?.d) ? crawl.d : Array.isArray(crawl) ? crawl : [];
    const latest = crawlRows[0] || null;

    const normalizeQuery = (row) => ({
      query: row.Query || row.query || row.Keyword || '',
      clicks: row.Clicks ?? row.clicks ?? 0,
      impressions: row.Impressions ?? row.impressions ?? 0,
      ctr: row.Ctr ?? row.ctr ?? null,
      position: row.AvgImpressionPosition ?? row.position ?? row.Rank ?? null,
      date: row.Date || row.date || null,
    });

    const queryRows = Array.isArray(queryStats?.d)
      ? queryStats.d
      : Array.isArray(queryStats)
        ? queryStats
        : [];
    const topQueries = queryRows.map(normalizeQuery).slice(0, topN);

    const pageRows = Array.isArray(pageTraffic?.d)
      ? pageTraffic.d
      : Array.isArray(pageTraffic)
        ? pageTraffic
        : [];
    const topPages = pageRows
      .map((r) => ({
        page: r.Url || r.url || r.Page || '',
        clicks: r.Clicks ?? r.clicks ?? 0,
        impressions: r.Impressions ?? r.impressions ?? 0,
      }))
      .slice(0, topN);

    const trafficRows = Array.isArray(rankTraffic?.d)
      ? rankTraffic.d
      : Array.isArray(rankTraffic)
        ? rankTraffic
        : [];
    const trafficSample = trafficRows.slice(0, 14).map((r) => ({
      date: r.Date || r.date || null,
      clicks: r.Clicks ?? r.clicks ?? 0,
      impressions: r.Impressions ?? r.impressions ?? 0,
    }));

    const totals = topQueries.reduce(
      (acc, q) => {
        acc.clicks += Number(q.clicks) || 0;
        acc.impressions += Number(q.impressions) || 0;
        return acc;
      },
      { clicks: 0, impressions: 0 }
    );
    // Prefer traffic sample sum when available (true window)
    if (trafficSample.length) {
      totals.clicks = trafficSample.reduce((s, r) => s + (Number(r.clicks) || 0), 0);
      totals.impressions = trafficSample.reduce((s, r) => s + (Number(r.impressions) || 0), 0);
    }

    const crawled = latest?.CrawledPages ?? latest?.crawledPages ?? null;
    const errors = latest?.Errors ?? latest?.errors ?? null;

    return {
      id: 'bing',
      label: 'Bing Webmaster Tools',
      status: 'ok',
      message: latest
        ? `Crawl · ${crawled ?? '—'} pages · ${totals.clicks} clicks (sample)`
        : 'Connected to Bing Webmaster API',
      data: {
        siteUrl,
        crawlStatsSample: crawlRows.slice(0, 7),
        latestCrawl: latest
          ? {
              crawledPages: crawled,
              errors,
              date: latest.Date || latest.date || null,
            }
          : null,
        urlSubmissionQuota: quota,
        topQueries,
        topPages,
        trafficSample,
        totals,
        queryStatsSample: topQueries.slice(0, 5),
      },
    };
  } catch (e) {
    return {
      id: 'bing',
      label: 'Bing Webmaster Tools',
      status: /401|403|invalid/i.test(String(e.message)) ? 'auth_required' : 'error',
      message: String(e.message || e),
      data: { siteUrl },
    };
  }
}

async function bingGet(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.Message || data?.error?.message || `Bing API ${res.status}`);
  }
  return data;
}
