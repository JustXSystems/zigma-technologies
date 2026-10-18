import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual, canonicalOf, meta } from '../lib/html.mjs';

function normalizeUrl(href, origin) {
  try {
    const u = new URL(href, origin);
    if (u.origin !== new URL(origin).origin) return null;
    u.hash = '';
    // Drop tracking query for link graph
    if ([...u.searchParams.keys()].every((k) => /^(utm_|gclid|fbclid)/i.test(k))) {
      u.search = '';
    }
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return `${u.origin}${path}`;
  } catch {
    return null;
  }
}

function extractInternalLinks(html, pageUrl, origin) {
  const out = new Set();
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#][^"']*)["']/gi)) {
    const n = normalizeUrl(m[1], pageUrl);
    if (n && n.startsWith(origin)) out.add(n);
  }
  return [...out];
}

function wordCount(html) {
  const text = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

/**
 * Crawl sitemap URLs for health + internal link graph (orphans / thin pages) in one pass.
 */
export async function crawlSitemapHealth(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const sitemapUrl = `${origin}/sitemap.xml`;
  const concurrency = opts.concurrency ?? profile.autopilot?.healthConcurrency ?? 6;
  const hardLimit = opts.limit ?? profile.autopilot?.healthLimit ?? 120;
  const thinWords = opts.thinWords ?? profile.autopilot?.thinWords ?? 280;

  let locs = [];
  try {
    const res = await fetchManual(sitemapUrl, { forceBody: true });
    if (res.status < 200 || res.status >= 300) {
      return {
        ok: false,
        status: 'error',
        message: `Sitemap HTTP ${res.status}`,
        data: { issues: [], checked: 0 },
        findings: [
          {
            code: 'SITEMAP_HEALTH_FETCH',
            severity: 'high',
            title: `Cannot fetch sitemap for health crawl (HTTP ${res.status})`,
            remediation: 'Fix /sitemap.xml on Production',
            owner: 'developer',
            pillar: 'technical',
          },
        ],
      };
    }
    locs = [...(res.body || '').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((m) => m[1].trim()).filter(Boolean);
  } catch (e) {
    return {
      ok: false,
      status: 'error',
      message: String(e.message || e),
      data: { issues: [], checked: 0 },
      findings: [],
    };
  }

  if (!profile.indexable && locs.length === 0) {
    return {
      ok: true,
      status: 'ok',
      message: 'Non-indexable profile with empty sitemap — health crawl skipped',
      data: { issues: [], checked: 0, totalLocs: 0 },
      findings: [],
    };
  }

  const locNorm = new Set(locs.map((u) => normalizeUrl(u, origin)).filter(Boolean));
  const toCheck = locs.slice(0, hardLimit);
  const issues = [];
  const pageMeta = new Map(); // url -> { inDegree, outDegree, words }
  const inbound = new Map();
  let okCount = 0;

  for (const u of locNorm) inbound.set(u, 0);

  async function checkOne(url) {
    const self = normalizeUrl(url, origin) || url;
    try {
      const res = await fetchManual(url, { forceBody: true });
      const html = res.body || '';
      const robots = meta(html, 'robots').toLowerCase();
      const canonical = canonicalOf(html);
      const noindex = /noindex/.test(robots);
      const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
      const words = wordCount(html);
      const links = extractInternalLinks(html, url, origin);
      pageMeta.set(self, { outDegree: links.length, words, status: res.status });
      for (const t of links) {
        if (inbound.has(t)) inbound.set(t, (inbound.get(t) || 0) + 1);
      }

      if (res.status >= 400) {
        issues.push({
          url,
          code: res.status >= 500 ? 'HTTP_5XX' : 'HTTP_4XX',
          severity: res.status >= 500 ? 'critical' : 'high',
          detail: `HTTP ${res.status}`,
        });
        return;
      }
      if (res.status >= 300 && res.status < 400) {
        issues.push({
          url,
          code: 'SITEMAP_REDIRECT',
          severity: 'medium',
          detail: `HTTP ${res.status} → ${res.headers?.location || '?'}`,
        });
        return;
      }
      if (noindex && profile.indexable) {
        issues.push({
          url,
          code: 'SITEMAP_NOINDEX',
          severity: 'high',
          detail: `robots=${robots || 'noindex'} but URL is in sitemap`,
        });
        return;
      }
      if (/not found|page not found|404/i.test(title) && !/thank-you/i.test(url)) {
        issues.push({
          url,
          code: 'SOFT_404',
          severity: 'high',
          detail: `Title suggests soft-404: “${title.slice(0, 80)}”`,
        });
        return;
      }
      if (canonical) {
        try {
          const can = new URL(canonical, origin);
          const page = new URL(url);
          if (can.origin === page.origin && can.pathname !== page.pathname) {
            issues.push({
              url,
              code: 'CANONICAL_MISMATCH',
              severity: 'medium',
              detail: `canonical → ${canonical}`,
            });
            return;
          }
        } catch {
          /* ignore */
        }
      }
      if (words > 0 && words < thinWords && !/\/(thank-you|cookies|privacy|terms|sla)/i.test(self)) {
        issues.push({
          url,
          code: 'THIN_CONTENT',
          severity: 'low',
          detail: `${words} words (threshold ${thinWords})`,
        });
      }
      okCount++;
    } catch (e) {
      issues.push({
        url,
        code: 'FETCH_ERROR',
        severity: 'high',
        detail: String(e.message || e).slice(0, 120),
      });
    }
  }

  for (let i = 0; i < toCheck.length; i += concurrency) {
    const batch = toCheck.slice(i, i + concurrency);
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(batch.map(checkOne));
  }

  // Orphans: in sitemap, crawled, not home, inbound 0 from other crawled pages
  const home = normalizeUrl(origin + '/', origin);
  const orphans = [];
  for (const u of locNorm) {
    if (u === home) continue;
    if (!pageMeta.has(u)) continue;
    if ((inbound.get(u) || 0) === 0) {
      orphans.push(u);
      issues.push({
        url: u,
        code: 'ORPHAN_PAGE',
        severity: 'medium',
        detail: 'No internal links from other crawled sitemap pages',
      });
    }
  }

  const findings = [];
  const byCode = {};
  for (const iss of issues) {
    byCode[iss.code] = (byCode[iss.code] || 0) + 1;
  }
  const hardIssues = issues.filter((i) => i.severity === 'critical' || i.severity === 'high');
  if (hardIssues.length) {
    findings.push({
      code: 'SITEMAP_HEALTH',
      severity: hardIssues.some((i) => i.severity === 'critical') ? 'critical' : 'high',
      title: `${hardIssues.length} hard sitemap health issue(s) across ${toCheck.length} URLs`,
      detail: Object.entries(byCode)
        .filter(([k]) => !['THIN_CONTENT', 'ORPHAN_PAGE'].includes(k))
        .map(([k, v]) => `${k}:${v}`)
        .join(', '),
      remediation: 'Fix broken/noindex/canonical mismatches. Full list in sitemap-health.json.',
      owner: 'developer',
      pillar: 'technical',
      evidence: hardIssues
        .slice(0, 8)
        .map((i) => `${i.code} ${i.url}`)
        .join('; '),
    });
  }
  if (orphans.length >= 3) {
    findings.push({
      code: 'ORPHAN_PAGES',
      severity: 'medium',
      title: `${orphans.length} sitemap page(s) with no internal inbound links`,
      detail: orphans.slice(0, 6).join('; '),
      remediation: 'Add contextual links from hubs (Projects/Products/Services/Locations) or related case studies.',
      owner: 'marketing',
      pillar: 'onpage',
    });
  }
  const thinCount = byCode.THIN_CONTENT || 0;
  if (thinCount >= 5) {
    findings.push({
      code: 'THIN_PAGES',
      severity: 'low',
      title: `${thinCount} thin page(s) under ~${thinWords} words`,
      remediation: 'Expand content or noindex utility pages. See sitemap-health.json THIN_CONTENT rows.',
      owner: 'marketing',
      pillar: 'onpage',
    });
  }

  const linkGraph = {
    pagesChecked: pageMeta.size,
    orphanCount: orphans.length,
    orphans: orphans.slice(0, 40),
    thinCount,
    topOrphans: orphans.slice(0, 10),
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    sitemapUrl,
    totalLocs: locs.length,
    checked: toCheck.length,
    okCount,
    issueCount: issues.length,
    byCode,
    issues: issues.slice(0, 250),
    linkGraph,
  };

  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'sitemap-health.json'), JSON.stringify(payload, null, 2), 'utf8');
    await writeFile(
      resolve(opts.outDir, 'link-graph.json'),
      JSON.stringify({ generatedAt: payload.generatedAt, ...linkGraph, inboundSample: [...inbound.entries()].slice(0, 30) }, null, 2),
      'utf8'
    );
  }

  return {
    ok: hardIssues.length === 0,
    status: hardIssues.length ? 'degraded' : issues.length ? 'ok' : 'ok',
    message: hardIssues.length
      ? `${hardIssues.length} hard issue(s); ${orphans.length} orphan(s); ${thinCount} thin`
      : `All ${toCheck.length} URLs healthy · ${orphans.length} orphan(s) · ${thinCount} thin`,
    data: payload,
    findings,
  };
}
