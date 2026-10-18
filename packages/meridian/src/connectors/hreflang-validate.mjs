import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual } from '../lib/html.mjs';

function parseAlternates(html) {
  const map = {};
  for (const m of html.matchAll(
    /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["']/gi
  )) {
    map[m[1].toLowerCase()] = m[2];
  }
  for (const m of html.matchAll(
    /<link[^>]+hreflang=["']([^"']+)["'][^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/gi
  )) {
    map[m[1].toLowerCase()] = m[2];
  }
  return map;
}

/**
 * Phase 6.2 — verify reciprocal hreflang on locale city pages.
 */
export async function validateHreflang(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const pairs =
    opts.pairs ||
    profile.autopilot?.hreflangPairs || [
      { en: '/locations/bengaluru', hi: '/hi/locations/bengaluru', kn: '/kn/locations/bengaluru' },
    ];

  const pages = [];
  const findings = [];

  for (const pair of pairs) {
    for (const [lang, path] of Object.entries(pair)) {
      if (!path) continue;
      const url = `${origin}${path.startsWith('/') ? path : `/${path}`}`;
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await fetchManual(url, { forceBody: true });
        const alts = parseAlternates(res.body || '');
        const robots = (res.body || '').match(/name=["']robots["'][^>]+content=["']([^"']*)["']/i)?.[1] || '';
        pages.push({ lang, url, status: res.status, alternates: alts, robots });

        if (res.status >= 400) {
          findings.push({
            code: 'HREFLANG_FETCH',
            severity: 'medium',
            title: `hreflang page HTTP ${res.status}: ${path}`,
            remediation: 'Fix locale route or remove from hreflang map.',
            owner: 'developer',
            pillar: 'onpage',
          });
          continue;
        }

        // EN should advertise hi/kn when those paths exist in the pair
        if (lang === 'en') {
          for (const [other, otherPath] of Object.entries(pair)) {
            if (other === 'en' || !otherPath) continue;
            const expected = `${origin}${otherPath}`;
            const hit = Object.entries(alts).find(
              ([k, href]) => (k === other || k.startsWith(`${other}-`)) && href.replace(/\/$/, '') === expected.replace(/\/$/, '')
            );
            if (!hit) {
              findings.push({
                code: 'HREFLANG_MISSING',
                severity: 'medium',
                title: `EN page missing hreflang=${other}`,
                detail: path,
                remediation: 'Ensure localeAlternates() lists translated paths that exist.',
                owner: 'developer',
                pillar: 'onpage',
              });
            }
          }
        } else {
          const enPath = pair.en;
          const expectedEn = `${origin}${enPath}`;
          const hasEn = Object.entries(alts).some(
            ([k, href]) =>
              (k === 'en' || k === 'x-default') && href.replace(/\/$/, '') === expectedEn.replace(/\/$/, '')
          );
          if (!hasEn) {
            findings.push({
              code: 'HREFLANG_NOT_RECIPROCAL',
              severity: 'medium',
              title: `${lang} page missing reciprocal EN/x-default hreflang`,
              detail: path,
              remediation: 'Locale pages must point back to the English canonical.',
              owner: 'developer',
              pillar: 'onpage',
            });
          }
        }
      } catch (e) {
        pages.push({ lang, url, error: String(e.message || e) });
      }
    }
  }

  const payload = { generatedAt: new Date().toISOString(), pairs, pages, findingCount: findings.length };
  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'hreflang-validate.json'), JSON.stringify(payload, null, 2), 'utf8');
  }

  return {
    ok: findings.filter((f) => f.severity === 'high' || f.severity === 'critical').length === 0,
    status: findings.length ? 'degraded' : 'ok',
    message: findings.length
      ? `${findings.length} hreflang issue(s) across ${pages.length} locale URLs`
      : `hreflang OK on ${pages.length} locale URL(s)`,
    data: payload,
    findings,
  };
}
