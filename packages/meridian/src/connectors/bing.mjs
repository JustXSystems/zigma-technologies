/**
 * Bing Webmaster Tools API (API key).
 * Env: MERIDIAN_BING_API_KEY
 * Docs: https://learn.microsoft.com/en-us/bing/webmaster-api/
 */

export async function collectBing(profile) {
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
  const qs = (path) =>
    `https://ssl.bing.com/webmaster/api.svc/json/${path}?apikey=${encodeURIComponent(apiKey)}&siteUrl=${encodeURIComponent(siteUrl)}`;

  try {
    const [crawl, sitemaps, queryStats] = await Promise.all([
      bingGet(qs('GetCrawlStats')),
      bingGet(qs('GetUrlSubmissionQuota')).catch(() => null),
      bingGet(
        `https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?apikey=${encodeURIComponent(apiKey)}&siteUrl=${encodeURIComponent(siteUrl)}`
      ).catch(() => null),
    ]);

    const crawlRows = Array.isArray(crawl?.d) ? crawl.d : Array.isArray(crawl) ? crawl : [];
    const latest = crawlRows[0] || null;

    return {
      id: 'bing',
      label: 'Bing Webmaster Tools',
      status: 'ok',
      message: latest
        ? `Crawl stats available · last Code ${latest.CrawledPages ?? latest.crawledPages ?? '—'} pages`
        : 'Connected to Bing Webmaster API',
      data: {
        siteUrl,
        crawlStatsSample: crawlRows.slice(0, 5),
        urlSubmissionQuota: sitemaps,
        queryStatsSample: Array.isArray(queryStats?.d) ? queryStats.d.slice(0, 5) : queryStats,
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
