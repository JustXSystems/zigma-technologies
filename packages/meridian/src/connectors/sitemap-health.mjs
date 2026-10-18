import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual, canonicalOf, meta } from '../lib/html.mjs';

/**
 * Crawl sitemap URLs for broken pages, soft-404s, unexpected noindex.
 * No Google/Bing auth required — maximum automation for Phase 9 / quarterly crawl.
 *
 * @param {object} profile
 * @param {{ outDir?: string, concurrency?: number, limit?: number }} [opts]
 */
export async function crawlSitemapHealth(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const sitemapUrl = `${origin}/sitemap.xml`;
  const concurrency = opts.concurrency ?? profile.autopilot?.healthConcurrency ?? 6;
  const hardLimit = opts.limit ?? profile.autopilot?.healthLimit ?? 120;

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

  const toCheck = locs.slice(0, hardLimit);
  const issues = [];
  let okCount = 0;

  async function checkOne(url) {
    try {
      const res = await fetchManual(url, { forceBody: true });
      const robots = meta(res.body || '', 'robots').toLowerCase();
      const canonical = canonicalOf(res.body || '');
      const noindex = /noindex/.test(robots);
      const title = (res.body || '').match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';

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
          /* ignore bad canonical URL */
        }
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

  const findings = [];
  const byCode = {};
  for (const iss of issues) {
    byCode[iss.code] = (byCode[iss.code] || 0) + 1;
  }
  if (issues.length) {
    const worst = issues.some((i) => i.severity === 'critical')
      ? 'critical'
      : issues.some((i) => i.severity === 'high')
        ? 'high'
        : 'medium';
    findings.push({
      code: 'SITEMAP_HEALTH',
      severity: worst,
      title: `${issues.length} sitemap health issue(s) across ${toCheck.length} URLs`,
      detail: Object.entries(byCode)
        .map(([k, v]) => `${k}:${v}`)
        .join(', '),
      remediation: 'Fix broken/noindex/canonical mismatches; remove bad URLs from sitemap or add redirects. Full list in sitemap-health.json.',
      owner: 'developer',
      pillar: 'technical',
      evidence: issues
        .slice(0, 8)
        .map((i) => `${i.code} ${i.url}`)
        .join('; '),
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sitemapUrl,
    totalLocs: locs.length,
    checked: toCheck.length,
    okCount,
    issueCount: issues.length,
    byCode,
    issues: issues.slice(0, 200),
  };

  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'sitemap-health.json'), JSON.stringify(payload, null, 2), 'utf8');
  }

  return {
    ok: !issues.some((i) => i.severity === 'critical' || i.severity === 'high'),
    status: issues.length ? 'degraded' : 'ok',
    message: issues.length
      ? `${issues.length} issue(s) in ${toCheck.length} sitemap URLs (${locs.length} total)`
      : `All ${toCheck.length} checked sitemap URLs healthy`,
    data: payload,
    findings,
  };
}
