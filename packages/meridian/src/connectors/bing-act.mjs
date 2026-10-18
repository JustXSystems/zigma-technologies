/**
 * Bing Webmaster Act — submit sitemap / submit URLs.
 * Env: MERIDIAN_BING_API_KEY
 * Docs: https://learn.microsoft.com/en-us/bing/webmaster-api/
 */

function siteUrlOf(profile) {
  const cfg = profile.connectors?.bing || {};
  return (cfg.siteUrl || profile.origin).replace(/\/$/, '');
}

function apiKey() {
  return (process.env.MERIDIAN_BING_API_KEY || '').trim();
}

async function bingPost(path, body) {
  const key = apiKey();
  if (!key) {
    const err = new Error('Missing MERIDIAN_BING_API_KEY');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }
  const url = `https://ssl.bing.com/webmaster/api.svc/json/${path}?apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.Message || data?.error?.message || `Bing API ${res.status}`;
    const err = new Error(msg);
    err.code = /401|403|invalid|apikey/i.test(msg) ? 'AUTH_REQUIRED' : 'ERROR';
    throw err;
  }
  return data;
}

/** Submit (or refresh) the XML sitemap feed in Bing Webmaster. */
export async function submitBingSitemap(profile, feedUrl) {
  const siteUrl = siteUrlOf(profile);
  const feed = (feedUrl || `${profile.origin.replace(/\/$/, '')}/sitemap.xml`).trim();
  if (!apiKey()) {
    return {
      ok: false,
      status: 'auth_required',
      message: 'Missing MERIDIAN_BING_API_KEY',
      data: { siteUrl, feed },
    };
  }
  try {
    // SubmitFeed API: siteUrl + feedUrl
    await bingPost('SubmitFeed', { siteUrl, feedUrl: feed });
    return {
      ok: true,
      status: 'ok',
      message: 'Submitted sitemap to Bing Webmaster',
      data: { siteUrl, feed },
    };
  } catch (e) {
    return {
      ok: false,
      status: e.code === 'AUTH_REQUIRED' ? 'auth_required' : 'error',
      message: String(e.message || e),
      data: { siteUrl, feed },
    };
  }
}

/** Submit up to N URLs for Bing crawl (quota-limited). */
export async function submitBingUrls(profile, urls = []) {
  const siteUrl = siteUrlOf(profile);
  const list = (urls || []).filter(Boolean).slice(0, 10);
  if (!apiKey()) {
    return {
      ok: false,
      status: 'auth_required',
      message: 'Missing MERIDIAN_BING_API_KEY',
      data: { siteUrl, urls: list },
    };
  }
  if (!list.length) {
    return { ok: true, status: 'skipped', message: 'No URLs to submit to Bing', data: { siteUrl, urls: [] } };
  }
  const results = [];
  for (const url of list) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await bingPost('SubmitUrl', { siteUrl, url });
      results.push({ url, ok: true });
    } catch (e) {
      results.push({ url, ok: false, error: String(e.message || e) });
    }
  }
  const failed = results.filter((r) => !r.ok).length;
  return {
    ok: failed === 0,
    status: failed ? 'degraded' : 'ok',
    message: `Bing URL submit: ${results.length - failed}/${results.length} ok`,
    data: { siteUrl, results },
  };
}
