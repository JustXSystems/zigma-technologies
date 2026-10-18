import {
  brandCount,
  canonicalOf,
  fetchFollow,
  fetchManual,
  h1Count,
  meta,
  prop,
  schemaTypesOf,
  titleOf,
} from '../lib/html.mjs';

/**
 * Technical truth layer — portable crawl of a SiteProfile.
 * @param {object} profile
 * @returns {Promise<{ pages: object[], findings: object[], extras: object }>}
 */
export async function runTechnicalEngine(profile) {
  const origin = profile.origin.replace(/\/$/, '');
  const indexable = !!profile.indexable;
  const brand = profile.brand?.name || '';
  const maxBrand = profile.brand?.maxBrandMentionsInTitle ?? 1;
  /** @type {object[]} */
  const pages = [];
  /** @type {object[]} */
  const findings = [];

  const pushFinding = (f) => findings.push(f);

  for (const path of profile.samplePaths || []) {
    const fact = await inspectPath(origin, path, { indexable, brand, maxBrand, expectNoindex: false });
    pages.push(fact);
    for (const issue of fact.issues) {
      pushFinding({
        code: issue.code,
        severity: issue.severity,
        title: issue.title,
        detail: issue.detail,
        evidence: `${origin}${path}`,
        remediation: issue.remediation,
        owner: issue.owner || 'dev',
        pillar: 'technical',
      });
    }
  }

  for (const path of profile.expectNoindex || []) {
    const fact = await inspectPath(origin, path, { indexable: true, brand, maxBrand, expectNoindex: true });
    pages.push(fact);
    for (const issue of fact.issues) {
      pushFinding({
        code: issue.code,
        severity: issue.severity,
        title: issue.title,
        detail: issue.detail,
        evidence: `${origin}${path}`,
        remediation: issue.remediation,
        owner: 'dev',
        pillar: 'technical',
      });
    }
  }

  for (const path of profile.allowRedirectHome || []) {
    const url = `${origin}${path}`;
    const res = await fetchManual(url);
    if (res.status >= 300 && res.status < 400) {
      pages.push({
        path,
        status: res.status,
        title: '(redirect)',
        canonical: '',
        robots: '',
        h1: 0,
        schemaTypes: [],
        issues: [],
        note: `Redirect ${res.status} → ${res.headers.location || ''}`,
      });
    } else {
      const fact = await inspectPath(origin, path, { indexable: true, brand, maxBrand, expectNoindex: true });
      pages.push(fact);
    }
  }

  if (profile.sampleDetailPath) {
    const fact = await inspectPath(origin, profile.sampleDetailPath, {
      indexable,
      brand,
      maxBrand,
      expectNoindex: !indexable,
    });
    pages.push(fact);
    for (const issue of fact.issues) {
      pushFinding({
        code: issue.code,
        severity: issue.severity,
        title: issue.title,
        detail: issue.detail,
        evidence: `${origin}${profile.sampleDetailPath}`,
        remediation: issue.remediation,
        owner: 'dev',
        pillar: 'technical',
      });
    }
  }

  const robotsExtras = await inspectRobotsSitemap(origin, profile, pushFinding);
  const redirectExtras = await inspectRedirects(origin, profile, pushFinding);
  const homeExtras = await inspectHomeExtras(origin, profile, pushFinding);

  return {
    pages,
    findings,
    extras: { ...robotsExtras, ...redirectExtras, ...homeExtras },
  };
}

async function inspectPath(origin, path, { indexable, brand, maxBrand, expectNoindex }) {
  const url = `${origin}${path}`;
  const issues = [];
  let res = await fetchManual(url, { forceBody: true });
  let html = res.body;
  let status = res.status;

  if (status >= 300 && status < 400) {
    const followed = await fetchFollow(url);
    html = followed.body;
    status = followed.status;
  }

  if (status < 200 || status >= 400) {
    issues.push({
      code: 'HTTP_ERROR',
      severity: 'critical',
      title: `HTTP ${status} on ${path}`,
      detail: `Expected 200, got ${status}`,
      remediation: 'Fix routing or server error before indexing.',
      owner: 'dev',
    });
  }

  const title = titleOf(html);
  const canonical = canonicalOf(html);
  const robots = meta(html, 'robots').toLowerCase();
  const h1 = h1Count(html);
  const ogImage = prop(html, 'og:image');
  const schemaTypes = schemaTypesOf(html);

  if (!title) {
    issues.push({
      code: 'TITLE_MISSING',
      severity: 'high',
      title: `Missing title on ${path}`,
      detail: 'No <title> tag found.',
      remediation: 'Set generateMetadata / meta title for this route.',
      owner: 'dev',
    });
  } else if (brand && brandCount(title, brand) > maxBrand) {
    issues.push({
      code: 'TITLE_BRAND_DUP',
      severity: 'medium',
      title: `Brand repeated in title on ${path}`,
      detail: title,
      remediation: 'Use absolute title or omit brand from page title (template already appends brand).',
      owner: 'marketing',
    });
  }

  if (expectNoindex) {
    if (!robots.includes('noindex')) {
      issues.push({
        code: 'EXPECTED_NOINDEX',
        severity: 'high',
        title: `${path} should be noindex`,
        detail: `robots="${robots || '(empty)'}"`,
        remediation: 'Pass noindex: true in buildPageMetadata for this route.',
        owner: 'dev',
      });
    }
  } else if (indexable) {
    if (!robots.includes('index') || robots.includes('noindex')) {
      issues.push({
        code: 'EXPECTED_INDEX',
        severity: 'critical',
        title: `${path} is not indexable`,
        detail: `robots="${robots || '(empty)'}"`,
        remediation: 'Ensure production build has NEXT_PUBLIC_SEO_INDEXABLE=true and page is not marked noindex.',
        owner: 'dev',
      });
    }
    const expected = normalizeUrl(`${origin}${path === '/' ? '' : path}`);
    const got = normalizeUrl(canonical);
    if (got && got !== expected) {
      issues.push({
        code: 'CANONICAL_MISMATCH',
        severity: 'critical',
        title: `Canonical mismatch on ${path}`,
        detail: `expected ${expected}, got ${canonical}`,
        remediation: 'Set alternates.canonical to this path only (never inherit homepage canonical from layout).',
        owner: 'dev',
      });
    } else if (!got) {
      issues.push({
        code: 'CANONICAL_MISSING',
        severity: 'high',
        title: `Missing canonical on ${path}`,
        detail: 'No rel=canonical found.',
        remediation: 'Emit canonical via buildPageMetadata({ path }).',
        owner: 'dev',
      });
    }
  } else if (!robots.includes('noindex')) {
    issues.push({
      code: 'STAGING_INDEXABLE',
      severity: 'critical',
      title: `Non-production URL is indexable: ${path}`,
      detail: `robots="${robots || '(empty)'}"`,
      remediation: 'Staging/PreProd must never set SEO_INDEXABLE=true; keep basePath + noindex.',
      owner: 'dev',
    });
  }

  if (status >= 200 && status < 400 && h1 !== 1) {
    issues.push({
      code: 'H1_COUNT',
      severity: 'high',
      title: `${path} has ${h1} H1 tags`,
      detail: 'Each page should have exactly one H1.',
      remediation: 'Use SiteHeading role=pageHero for the page title.',
      owner: 'dev',
    });
  }

  return { path, status, title, canonical, robots, h1, ogImage, schemaTypes, issues };
}

function normalizeUrl(u) {
  if (!u) return '';
  try {
    const x = new URL(u);
    const path = x.pathname.replace(/\/$/, '') || '';
    return `${x.origin}${path}`;
  } catch {
    return u.replace(/\/$/, '');
  }
}

async function inspectRobotsSitemap(origin, profile, pushFinding) {
  const robotsRes = await fetchManual(`${origin}/robots.txt`, { forceBody: true });
  const text = robotsRes.body || '';
  const sitemapRes = await fetchManual(`${origin}/sitemap.xml`, { forceBody: true });
  const locs = (sitemapRes.body.match(/<loc>/gi) || []).length;
  const hasSitemapLine = /sitemap:\s*\S+/i.test(text);
  const hasHost = /host:\s*\S+/i.test(text);

  if (robotsRes.status !== 200) {
    pushFinding({
      code: 'ROBOTS_HTTP',
      severity: 'critical',
      title: 'robots.txt unreachable',
      detail: `HTTP ${robotsRes.status}`,
      remediation: 'Ensure /robots.txt is served by the app.',
      owner: 'dev',
      pillar: 'technical',
      evidence: `${origin}/robots.txt`,
    });
  } else if (!/allow:\s*\//i.test(text)) {
    pushFinding({
      code: 'ROBOTS_ALLOW',
      severity: 'medium',
      title: 'robots.txt missing Allow: /',
      detail: text.slice(0, 200),
      remediation: 'Allow public crawling; Disallow only private paths.',
      owner: 'dev',
      pillar: 'technical',
      evidence: `${origin}/robots.txt`,
    });
  }

  if (profile.indexable) {
    if (!hasSitemapLine) {
      pushFinding({
        code: 'ROBOTS_SITEMAP',
        severity: 'high',
        title: 'robots.txt missing Sitemap line',
        detail: 'Production should advertise sitemap.xml',
        remediation: 'Advertise sitemap only when isIndexable() is true.',
        owner: 'dev',
        pillar: 'technical',
        evidence: `${origin}/robots.txt`,
      });
    }
    if (!hasHost) {
      pushFinding({
        code: 'ROBOTS_HOST',
        severity: 'low',
        title: 'robots.txt missing Host line',
        detail: 'Optional but useful for apex preference.',
        remediation: 'Emit Host: when indexable.',
        owner: 'dev',
        pillar: 'technical',
        evidence: `${origin}/robots.txt`,
      });
    }
    const min = profile.minSitemapLocs ?? 20;
    if (locs < min) {
      pushFinding({
        code: 'SITEMAP_THIN',
        severity: 'critical',
        title: `Sitemap too small (${locs} URLs)`,
        detail: `Expected at least ${min}`,
        remediation: 'Confirm SEO_INDEXABLE and database-backed sitemap generation.',
        owner: 'dev',
        pillar: 'technical',
        evidence: `${origin}/sitemap.xml`,
      });
    }
  } else {
    if (hasSitemapLine) {
      pushFinding({
        code: 'STAGING_SITEMAP_AD',
        severity: 'critical',
        title: 'Staging robots.txt advertises a sitemap',
        detail: 'PreProd must not invite crawling via Sitemap:',
        remediation: 'Omit sitemap from robots when not indexable.',
        owner: 'dev',
        pillar: 'technical',
        evidence: `${origin}/robots.txt`,
      });
    }
    if (locs !== 0) {
      pushFinding({
        code: 'STAGING_SITEMAP_LOCS',
        severity: 'critical',
        title: `Staging sitemap is not empty (${locs})`,
        detail: 'Non-production sitemap must return zero URLs.',
        remediation: 'Return [] from sitemap.ts when !isIndexable().',
        owner: 'dev',
        pillar: 'technical',
        evidence: `${origin}/sitemap.xml`,
      });
    }
  }

  return { robotsText: text, sitemapLocs: locs };
}

async function inspectRedirects(origin, profile, pushFinding) {
  if (!profile.indexable) return {};

  const apex = await fetchManual(`${origin}/`);
  if (apex.status !== 200) {
    pushFinding({
      code: 'APEX_DOWN',
      severity: 'critical',
      title: 'Apex homepage not 200',
      detail: `HTTP ${apex.status}`,
      remediation: 'Check origin health.',
      owner: 'ops',
      pillar: 'technical',
      evidence: origin,
    });
  }
  const xrobots = apex.headers['x-robots-tag'] || '';
  if (/noindex/i.test(xrobots)) {
    pushFinding({
      code: 'APEX_XROBOTS',
      severity: 'critical',
      title: 'Production sends X-Robots-Tag noindex',
      detail: xrobots,
      remediation: 'Rebuild production with NEXT_PUBLIC_SEO_INDEXABLE=true.',
      owner: 'dev',
      pillar: 'technical',
      evidence: origin,
    });
  }

  try {
    const httpOrigin = origin.replace(/^https:/, 'http:');
    const r = await fetchManual(`${httpOrigin}/`);
    const loc = r.headers.location || '';
    if (!(r.status >= 300 && r.status < 400 && /https:/i.test(loc))) {
      pushFinding({
        code: 'HTTP_REDIRECT',
        severity: 'high',
        title: 'http:// does not redirect to https',
        detail: `${r.status} ${loc}`,
        remediation: 'Configure nginx/CDN http→https 301.',
        owner: 'ops',
        pillar: 'technical',
        evidence: httpOrigin,
      });
    }
  } catch (e) {
    pushFinding({
      code: 'HTTP_UNREACHABLE',
      severity: 'low',
      title: 'Could not probe http://',
      detail: String(e.message || e),
      remediation: 'Verify from a network that allows port 80.',
      owner: 'ops',
      pillar: 'technical',
    });
  }

  if (profile.wwwHost) {
    const r = await fetchManual(`${profile.wwwHost.replace(/\/$/, '')}/`);
    const loc = r.headers.location || '';
    const toApex = r.status >= 300 && r.status < 400 && loc.includes(new URL(origin).host) && !/\/\/www\./i.test(loc);
    if (r.status === 200) {
      pushFinding({
        code: 'WWW_NO_REDIRECT',
        severity: 'high',
        title: 'www serves 200 instead of redirecting to apex',
        detail: profile.wwwHost,
        remediation: 'App redirect or nginx one-hop to apex.',
        owner: 'dev',
        pillar: 'technical',
        evidence: profile.wwwHost,
      });
    } else if (!toApex) {
      pushFinding({
        code: 'WWW_BAD_REDIRECT',
        severity: 'medium',
        title: 'www redirect target unexpected',
        detail: `${r.status} ${loc}`,
        remediation: 'Redirect www to https apex permanently.',
        owner: 'ops',
        pillar: 'technical',
        evidence: profile.wwwHost,
      });
    }
  }

  return {};
}

async function inspectHomeExtras(origin, profile, pushFinding) {
  if (!profile.indexable) return {};
  const res = await fetchFollow(`${origin}/`);
  const html = res.body;
  const og = prop(html, 'og:image');
  if (!og) {
    pushFinding({
      code: 'OG_MISSING',
      severity: 'medium',
      title: 'Missing og:image on home',
      detail: 'Social shares need a 1200×630 image.',
      remediation: 'Set DEFAULT_OG_IMAGE /og.png or Site Settings OG.',
      owner: 'marketing',
      pillar: 'onpage',
      evidence: origin,
    });
  } else if (/logo\.png/i.test(og)) {
    pushFinding({
      code: 'OG_LOGO',
      severity: 'low',
      title: 'og:image looks like a square logo',
      detail: og,
      remediation: 'Clear legacy OG field; use 1200×630 share card.',
      owner: 'marketing',
      pillar: 'onpage',
      evidence: og,
    });
  }

  const schemaTypes = schemaTypesOf(html);
  if (!schemaTypes.some((t) => /Organization|LocalBusiness/i.test(t))) {
    pushFinding({
      code: 'SCHEMA_ORG',
      severity: 'medium',
      title: 'Home missing Organization JSON-LD',
      detail: `types: ${schemaTypes.join(', ') || '(none)'}`,
      remediation: 'Emit Organization + LocalBusiness graph from site settings.',
      owner: 'dev',
      pillar: 'onpage',
      evidence: origin,
    });
  } else if (!/"sameAs"/i.test(html)) {
    pushFinding({
      code: 'SCHEMA_SAMEAS',
      severity: 'medium',
      title: 'Organization JSON-LD missing sameAs',
      detail: 'Social profile URLs are empty in Site Settings.',
      remediation: 'Add LinkedIn / YouTube / Facebook URLs in Site Settings → Social.',
      owner: 'marketing',
      pillar: 'local',
      evidence: origin,
    });
  }

  const gaHint = profile.connectors?.ga4?.measurementIdHint;
  if (gaHint && !html.includes(gaHint) && !/googletagmanager\.com\/gtag/i.test(html)) {
    pushFinding({
      code: 'GA4_MISSING',
      severity: 'medium',
      title: 'GA4 snippet not detected on home',
      detail: `Expected hint ${gaHint}`,
      remediation: 'Confirm analytics ID in Site Settings and consent banner allows tags.',
      owner: 'marketing',
      pillar: 'signals',
      evidence: origin,
    });
  }

  return { homeOg: og, homeSchemaTypes: schemaTypes };
}
