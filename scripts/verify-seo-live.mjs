#!/usr/bin/env node
/**
 * Live SEO verification (Appendix C of SEO-GUIDE.md).
 *
 * Automates technical checks against a deployed site. Does NOT cover Google
 * Search Console, Bing, GBP, or content quality judgment.
 *
 * Usage:
 *   node scripts/verify-seo-live.mjs --env prod
 *   node scripts/verify-seo-live.mjs --env preprod
 *   node scripts/verify-seo-live.mjs --base https://zigma-technologies.com
 *   npm run seo:verify
 *   npm run seo:verify:preprod
 *
 * Exit 0 = all hard checks passed; exit 1 = failures; exit 2 = usage error.
 */
const args = process.argv.slice(2);

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

const envName = argValue('--env');
const baseOverride = argValue('--base');
const sampleProject = argValue('--project') || '/projects/amc-engineering-college-200kw-bangalore';

const PRESETS = {
  prod: {
    base: 'https://zigma-technologies.com',
    indexable: true,
    wwwHost: 'https://www.zigma-technologies.com',
  },
  preprod: {
    base: 'https://justxsystems.com/zigma-technologies',
    indexable: false,
    wwwHost: null,
  },
};

let preset;
if (baseOverride) {
  const trimmed = baseOverride.replace(/\/$/, '');
  preset = {
    base: trimmed,
    indexable: !trimmed.includes('justxsystems.com'),
    wwwHost: trimmed.includes('zigma-technologies.com') ? 'https://www.zigma-technologies.com' : null,
  };
} else if (envName === 'prod' || envName === 'preprod') {
  preset = PRESETS[envName];
} else {
  console.error(`Usage:
  node scripts/verify-seo-live.mjs --env prod|preprod
  node scripts/verify-seo-live.mjs --base https://example.com
`);
  process.exit(2);
}

const { base, indexable, wwwHost } = preset;
const failures = [];
const warnings = [];
const passes = [];

function pass(msg) {
  passes.push(msg);
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  failures.push(msg);
  console.error(`  ✗ ${msg}`);
}
function warn(msg) {
  warnings.push(msg);
  console.warn(`  ⚠ ${msg}`);
}

function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function meta(html, name) {
  const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}

function prop(html, property) {
  const m = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}

function titleOf(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1].replace(/\s+/g, ' ').trim()) : '';
}

function canonicalOf(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return m ? m[1].replace(/\/$/, '') || m[1] : '';
}

function h1Count(html) {
  return (html.match(/<h1[\s>]/gi) || []).length;
}

function brandCount(title) {
  const re = /zigma technologies/gi;
  return (title.match(re) || []).length;
}

async function fetchText(url, opts = {}) {
  const res = await fetch(url, {
    redirect: opts.redirect || 'manual',
    headers: { 'user-agent': 'zigma-seo-verify/1.0' },
    ...opts,
  });
  const headers = Object.fromEntries(res.headers.entries());
  let body = '';
  if (opts.includeBody !== false && res.status >= 200 && res.status < 400) {
    body = await res.text();
  } else if (opts.forceBody) {
    try {
      body = await res.text();
    } catch {
      body = '';
    }
  }
  return { status: res.status, headers, body, url };
}

async function fetchFollow(url) {
  // Manual redirects so we can assert intermediate hops; final HTML via follow.
  const first = await fetchText(url, { redirect: 'manual', includeBody: false });
  if (first.status >= 300 && first.status < 400 && first.headers.location) {
    const loc = first.headers.location.startsWith('http')
      ? first.headers.location
      : new URL(first.headers.location, url).href;
    const final = await fetch(loc, { headers: { 'user-agent': 'zigma-seo-verify/1.0' }, redirect: 'follow' });
    return {
      status: first.status,
      location: first.headers.location,
      finalStatus: final.status,
      body: await final.text(),
      finalUrl: final.url,
    };
  }
  const body = await fetch(url, { headers: { 'user-agent': 'zigma-seo-verify/1.0' }, redirect: 'follow' }).then((r) => r.text());
  return { status: first.status, location: null, finalStatus: first.status, body, finalUrl: url };
}

function expectCanonical(path, canon, origin) {
  const expected = `${origin}${path === '/' ? '' : path}`.replace(/\/$/, '') || origin;
  const got = (canon || '').replace(/\/$/, '') || canon;
  const ok = got === expected || got === `${expected}/` || (path === '/' && (got === origin || got === `${origin}/`));
  return ok;
}

async function checkPage(path, { expectNoindex = false, allowRedirectHome = false } = {}) {
  const url = `${base}${path}`;
  console.log(`\n→ ${url}`);
  const res = await fetchText(url, { redirect: 'manual', forceBody: true });

  if (allowRedirectHome && res.status >= 300 && res.status < 400) {
    const loc = res.headers.location || '';
    if (loc === '/' || loc.endsWith('/') || loc.includes(base)) {
      pass(`${path} redirects (${res.status}) — OK when feature disabled`);
      return;
    }
  }

  if (res.status !== 200) {
    // Follow once for real HTML checks when 200 expected
    const followed = await fetch(url, { headers: { 'user-agent': 'zigma-seo-verify/1.0' }, redirect: 'follow' });
    if (!followed.ok) {
      fail(`${path}: HTTP ${res.status} (followed ${followed.status})`);
      return;
    }
    const html = await followed.text();
    return assertPageHtml(path, html, { expectNoindex, followedUrl: followed.url });
  }

  return assertPageHtml(path, res.body, { expectNoindex });
}

function assertPageHtml(path, html, { expectNoindex, followedUrl } = {}) {
  const title = titleOf(html);
  const canon = canonicalOf(html);
  const robots = meta(html, 'robots').toLowerCase();
  const h1 = h1Count(html);
  const origin = base.replace(/\/$/, '');

  if (!title) fail(`${path}: missing <title>`);
  else if (brandCount(title) > 1) fail(`${path}: brand appears ${brandCount(title)}× in title: ${title}`);
  else pass(`${path}: title OK`);

  if (expectNoindex) {
    if (!robots.includes('noindex')) fail(`${path}: expected noindex, got "${robots || '(empty)'}"`);
    else pass(`${path}: noindex OK`);
  } else if (indexable) {
    if (!robots.includes('index') || robots.includes('noindex')) {
      fail(`${path}: expected indexable robots, got "${robots || '(empty)'}"`);
    } else pass(`${path}: robots indexable`);
    if (!expectCanonical(path, canon, origin)) {
      // When we followed a redirect to home, canonical may be home — already handled
      if (followedUrl && followedUrl.replace(/\/$/, '') === origin && path !== '/') {
        warn(`${path}: followed to home; canonical is apex (feature may be off)`);
      } else {
        fail(`${path}: canonical "${canon}" ≠ expected for ${path}`);
      }
    } else pass(`${path}: canonical OK`);
  } else {
    if (!robots.includes('noindex')) fail(`${path}: PreProd/non-indexable must be noindex, got "${robots || '(empty)'}"`);
    else pass(`${path}: noindex (non-production) OK`);
  }

  if (h1 !== 1) fail(`${path}: expected 1 H1, found ${h1}`);
  else pass(`${path}: H1 count = 1`);
}

async function checkRobotsAndSitemap() {
  console.log(`\n→ robots.txt / sitemap`);
  const robotsUrl = `${base}/robots.txt`;
  const sitemapUrl = `${base}/sitemap.xml`;
  const robots = await fetchText(robotsUrl);
  if (robots.status !== 200) {
    fail(`robots.txt HTTP ${robots.status}`);
    return;
  }
  const text = robots.body;
  if (!/allow:\s*\//i.test(text)) fail('robots.txt missing Allow: /');
  else pass('robots.txt Allow: /');

  for (const d of ['/admin/', '/api/admin/', '/partner/', '/ztools/']) {
    if (!text.toLowerCase().includes(`disallow: ${d}`)) warn(`robots.txt missing Disallow: ${d}`);
  }

  const hasSitemapLine = /sitemap:\s*\S+/i.test(text);
  const hasHost = /host:\s*\S+/i.test(text);
  if (indexable) {
    if (!hasSitemapLine) fail('robots.txt missing Sitemap: line (production)');
    else pass('robots.txt Sitemap line present');
    if (!hasHost) warn('robots.txt missing Host: line');
    else pass('robots.txt Host line present');
  } else {
    if (hasSitemapLine) fail('robots.txt must NOT advertise Sitemap on PreProd');
    else pass('robots.txt has no Sitemap line (PreProd)');
  }

  const sm = await fetchText(sitemapUrl);
  if (sm.status !== 200) {
    fail(`sitemap.xml HTTP ${sm.status}`);
    return;
  }
  const locs = (sm.body.match(/<loc>/gi) || []).length;
  if (indexable) {
    if (locs < 20) fail(`sitemap has only ${locs} <loc> (expected ~70+)`);
    else pass(`sitemap has ${locs} <loc>`);
  } else if (locs !== 0) {
    fail(`PreProd sitemap must be empty, found ${locs} <loc>`);
  } else {
    pass('PreProd sitemap empty');
  }
}

async function checkRedirects() {
  console.log(`\n→ redirects`);
  const apexHttps = await fetchText(`${base.replace(/\/$/, '')}/`, { redirect: 'manual', includeBody: false });
  if (indexable) {
    if (apexHttps.status !== 200) fail(`apex https home HTTP ${apexHttps.status}`);
    else pass('apex https home 200');
    const xrobots = apexHttps.headers['x-robots-tag'] || '';
    if (/noindex/i.test(xrobots)) fail(`apex has X-Robots-Tag: ${xrobots}`);
    else pass('apex has no noindex X-Robots-Tag');
  }

  if (indexable) {
    const httpApex = base.replace(/^https:/, 'http:').replace(/\/$/, '');
    try {
      const r = await fetchText(`${httpApex}/`, { redirect: 'manual', includeBody: false });
      const loc = r.headers.location || '';
      const toHttpsApex =
        r.status >= 300 &&
        r.status < 400 &&
        /https:\/\/zigma-technologies\.com\/?/i.test(loc);
      if (toHttpsApex) pass(`http apex → ${r.status} ${loc}`);
      else fail(`http apex expected 301 to https apex, got ${r.status} ${loc}`);
    } catch (e) {
      warn(`http apex unreachable: ${e.message}`);
    }
  }

  if (wwwHost && indexable) {
    const r = await fetchText(`${wwwHost}/`, { redirect: 'manual', includeBody: false });
    const loc = r.headers.location || '';
    if (r.status >= 300 && r.status < 400 && loc.includes('zigma-technologies.com') && !loc.includes('://www.')) {
      pass(`https www → ${r.status} ${loc}`);
    } else if (r.status === 200) {
      fail('https www still returns 200 (expected redirect to apex)');
    } else {
      fail(`https www expected redirect to apex, got ${r.status} ${loc}`);
    }
  }
}

async function checkHomeExtras() {
  if (!indexable) return;
  console.log(`\n→ home extras (OG, JSON-LD, GA4)`);
  const res = await fetchText(`${base}/`);
  if (res.status !== 200) {
    fail(`home extras: HTTP ${res.status}`);
    return;
  }
  const html = res.body;
  const og = prop(html, 'og:image');
  if (!og) fail('missing og:image');
  else if (/zigma-technologies-logo\.png/i.test(og)) warn(`og:image still square logo: ${og}`);
  else if (/\/og\.png/i.test(og)) pass('og:image is /og.png');
  else pass(`og:image set: ${og}`);

  const ldBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (!ldBlocks.length) fail('no JSON-LD on home');
  else {
    pass(`JSON-LD blocks: ${ldBlocks.length}`);
    const joined = ldBlocks.map((m) => m[1]).join('\n');
    if (!/"@type"\s*:\s*\[["']Organization["']/.test(joined) && !/"Organization"/.test(joined)) {
      fail('Organization JSON-LD not found on home');
    } else pass('Organization/LocalBusiness JSON-LD present');
    if (!/"sameAs"/.test(joined)) warn('JSON-LD missing sameAs (add social URLs in Site Settings)');
    if (!/"telephone"/.test(joined)) warn('JSON-LD missing telephone');
    if (!/"postalCode"/.test(joined)) warn('JSON-LD missing postalCode');
  }

  if (/G-[A-Z0-9]+/.test(html) || /googletagmanager\.com\/gtag/i.test(html)) pass('GA4 / gtag present in HTML');
  else warn('GA4 measurement snippet not detected in HTML (may load after consent)');
}

async function main() {
  console.log(`SEO live verify → ${base} (indexable=${indexable})`);
  const indexPaths = ['/', '/projects', '/products', '/services', '/locations', '/locations/bengaluru', '/contact'];
  for (const p of indexPaths) {
    await checkPage(p, { expectNoindex: !indexable });
  }
  if (indexable) {
    await checkPage('/thank-you', { expectNoindex: true });
    await checkPage('/locations/bengaluru/ups-amc', { expectNoindex: true });
    await checkPage('/search', { allowRedirectHome: true, expectNoindex: true });
    await checkPage(sampleProject, { expectNoindex: false });
  }
  await checkRobotsAndSitemap();
  await checkRedirects();
  await checkHomeExtras();

  console.log(`\n—— summary ——`);
  console.log(`passed:   ${passes.length}`);
  console.log(`warnings: ${warnings.length}`);
  console.log(`failed:   ${failures.length}`);
  if (failures.length) {
    console.error('\nFAILED:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  if (warnings.length) {
    console.log('\nWarnings (non-blocking):');
    for (const w of warnings) console.log(`  - ${w}`);
  }
  console.log('\nOK — technical SEO checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
