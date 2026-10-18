import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual, schemaTypesOf } from '../lib/html.mjs';

/**
 * Validate JSON-LD presence on key pages (Rich Results readiness — Phase 2.2 lite).
 */
export async function validateSchema(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const paths =
    opts.paths ||
    profile.autopilot?.schemaPaths || [
      '/',
      profile.sampleDetailPath || '/projects',
      '/products',
      '/services',
      '/contact',
      '/locations/bengaluru',
    ].filter(Boolean);

  const pages = [];
  const findings = [];

  for (const path of paths) {
    const url = path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetchManual(url, { forceBody: true });
      const types = schemaTypesOf(res.body || '');
      const hasBreadcrumb = types.some((t) => /BreadcrumbList/i.test(t));
      const hasOrg = types.some((t) => /Organization|LocalBusiness/i.test(t));
      const hasProduct = types.some((t) => /Product|Service|Article|Project/i.test(t));
      const sameAs = /"sameAs"\s*:/i.test(res.body || '');
      const page = {
        url,
        status: res.status,
        types,
        hasBreadcrumb,
        hasOrg,
        hasProduct,
        sameAs,
        ok: res.status >= 200 && res.status < 300 && types.length > 0,
      };
      pages.push(page);
      if (res.status >= 200 && res.status < 300 && types.length === 0) {
        findings.push({
          code: 'SCHEMA_MISSING',
          severity: 'medium',
          title: `No JSON-LD on ${path}`,
          remediation: 'Emit BreadcrumbList + entity schema for this template.',
          owner: 'developer',
          pillar: 'onpage',
          evidence: url,
        });
      }
    } catch (e) {
      pages.push({ url, ok: false, error: String(e.message || e) });
    }
  }

  const home = pages.find((p) => p.url === `${origin}/` || p.url === origin);
  if (home && home.hasOrg && !home.sameAs) {
    findings.push({
      code: 'SCHEMA_SAMEAS',
      severity: 'medium',
      title: 'Organization JSON-LD missing sameAs',
      remediation: 'Add social profile URLs in Site Settings → Social links.',
      owner: 'marketing',
      pillar: 'local',
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    checked: pages.length,
    pages,
    missingSameAs: !!(home && home.hasOrg && !home.sameAs),
  };

  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'schema-validate.json'), JSON.stringify(payload, null, 2), 'utf8');
  }

  const ok = !findings.some((f) => f.severity === 'critical' || f.severity === 'high');
  return {
    ok,
    status: findings.length ? 'degraded' : 'ok',
    message: findings.length
      ? `Schema issues on ${findings.length} check(s) across ${pages.length} pages`
      : `JSON-LD OK on ${pages.filter((p) => p.ok).length}/${pages.length} key pages`,
    data: payload,
    findings,
  };
}
