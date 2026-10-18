import { googleEnvStatus, googleFetch } from './google-auth.mjs';

function siteUrlOf(profile) {
  const cfg = profile.connectors?.gsc || {};
  return (cfg.siteUrl || `sc-domain:${new URL(profile.origin).hostname}`).trim();
}

/**
 * Submit (or refresh) the sitemap in Google Search Console.
 * Requires OAuth scope https://www.googleapis.com/auth/webmasters (not readonly).
 */
export async function submitSitemap(profile, feedUrl) {
  const auth = googleEnvStatus();
  if (!auth.ok) {
    return { ok: false, status: 'auth_required', message: `Missing env: ${auth.missing.join(', ')}` };
  }
  const siteUrl = siteUrlOf(profile);
  const feed = (feedUrl || `${profile.origin.replace(/\/$/, '')}/sitemap.xml`).trim();
  const encodedSite = encodeURIComponent(siteUrl);
  const encodedFeed = encodeURIComponent(feed);

  try {
    await googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedFeed}`, {
      method: 'PUT',
    });
    return {
      ok: true,
      status: 'ok',
      message: `Submitted sitemap to GSC`,
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

/**
 * URL Inspection API — index status for one URL.
 * Requires Search Console API + webmasters scope.
 */
export async function inspectUrl(profile, pageUrl) {
  const auth = googleEnvStatus();
  if (!auth.ok) {
    return { ok: false, status: 'auth_required', message: `Missing env: ${auth.missing.join(', ')}` };
  }
  const siteUrl = siteUrlOf(profile);
  const inspectionUrl = (pageUrl || profile.origin).trim();

  try {
    const data = await googleFetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      body: {
        inspectionUrl,
        siteUrl,
        languageCode: 'en-US',
      },
    });
    const result = data.inspectionResult || {};
    const index = result.indexStatusResult || {};
    return {
      ok: true,
      status: 'ok',
      message: `${inspectionUrl} → ${index.coverageState || index.verdict || 'inspected'}`,
      data: {
        siteUrl,
        inspectionUrl,
        verdict: index.verdict,
        coverageState: index.coverageState,
        robotsTxtState: index.robotsTxtState,
        indexingState: index.indexingState,
        lastCrawlTime: index.lastCrawlTime,
        pageFetchState: index.pageFetchState,
        referringUrls: index.referringUrls,
        richResults: result.richResultsResult || null,
      },
    };
  } catch (e) {
    return {
      ok: false,
      status: e.code === 'AUTH_REQUIRED' ? 'auth_required' : 'error',
      message: String(e.message || e),
      data: { siteUrl, inspectionUrl },
    };
  }
}

/**
 * Inspect a short queue of priority URLs (home + sample paths).
 */
export async function inspectPriorityUrls(profile, { limit = 5 } = {}) {
  const paths = ['/', ...(profile.samplePaths || []).filter((p) => p !== '/')].slice(0, limit);
  const origin = profile.origin.replace(/\/$/, '');
  const results = [];
  for (const path of paths) {
    const url = path === '/' ? `${origin}/` : `${origin}${path}`;
    // eslint-disable-next-line no-await-in-loop
    results.push(await inspectUrl(profile, url));
  }
  const failed = results.filter((r) => !r.ok).length;
  return {
    ok: failed === 0,
    status: failed ? 'degraded' : 'ok',
    message: `Inspected ${results.length} URL(s), ${failed} failed`,
    data: { results },
  };
}
