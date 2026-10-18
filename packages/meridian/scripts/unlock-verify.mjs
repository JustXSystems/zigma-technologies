#!/usr/bin/env node
/**
 * Meridian unlock verifier — tests each connector and prints pass/fail results.
 *
 *   node packages/meridian/scripts/unlock-verify.mjs
 *   node packages/meridian/scripts/unlock-verify.mjs --json --out storage/meridian/zigma-prod/unlock-verify.json
 *   node packages/meridian/scripts/unlock-verify.mjs --act   # also submit sitemap + inspect home
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
process.chdir(ROOT);

function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

loadEnv();

const { googleEnvStatus, getGoogleAccessToken, googleFetch } = await import('../src/connectors/google-auth.mjs');
const { submitSitemap, inspectUrl } = await import('../src/connectors/gsc-act.mjs');
const { submitBingSitemap } = await import('../src/connectors/bing-act.mjs');
const { loadProfile } = await import('../src/orchestrator.mjs');

const profilePath = resolve(ROOT, 'packages/meridian/profiles/zigma.prod.json');
const profile = await loadProfile(profilePath);
const doAct = process.argv.includes('--act');
const steps = [];

function record(id, title, status, detail, next) {
  steps.push({ id, title, status, detail, next: next || null });
  const icon = status === 'pass' ? 'PASS' : status === 'skip' ? 'SKIP' : status === 'warn' ? 'WARN' : 'FAIL';
  console.log(`\n[${icon}] ${title}`);
  console.log(`      ${detail}`);
  if (next) console.log(`      → Next: ${next}`);
}

// --- Step 1: Google OAuth env ---
const google = googleEnvStatus();
if (!google.ok) {
  record(
    'google_oauth_env',
    'Google OAuth credentials present',
    'fail',
    `Missing: ${google.missing.join(', ')}`,
    'Login to Google Cloud → create Desktop OAuth client → paste Client ID + Secret, then run google-oauth-setup.mjs'
  );
} else {
  record('google_oauth_env', 'Google OAuth credentials present', 'pass', 'CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN set');
}

// --- Step 2: Token refresh ---
let accessOk = false;
if (google.ok) {
  try {
    const tok = await getGoogleAccessToken();
    accessOk = !!tok.accessToken;
    record('google_token', 'Refresh Google access token', 'pass', `Access token OK (expires ~${tok.expiresIn}s)`);
  } catch (e) {
    record(
      'google_token',
      'Refresh Google access token',
      'fail',
      String(e.message || e).slice(0, 200),
      'Re-run google-oauth-setup.mjs with company Google account; revoke old app access if needed'
    );
  }
} else {
  record('google_token', 'Refresh Google access token', 'skip', 'Waiting on OAuth env');
}

// --- Step 3: GSC sites ---
const siteUrl = profile.connectors?.gsc?.siteUrl || `sc-domain:${new URL(profile.origin).hostname}`;
if (accessOk) {
  try {
    const sites = await googleFetch('https://www.googleapis.com/webmasters/v3/sites');
    const list = (sites.siteEntry || []).map((s) => s.siteUrl);
    const has = list.some((s) => s === siteUrl || s.includes('zigma-technologies.com'));
    record(
      'gsc_sites',
      'Search Console API — list sites',
      has ? 'pass' : 'warn',
      has
        ? `Found property matching ${siteUrl} (${list.length} site(s) total)`
        : `API OK but ${siteUrl} not in account. Sites: ${list.slice(0, 5).join(', ') || '(none)'}`,
      has
        ? null
        : 'Verify domain in Search Console with this Google account, or fix connectors.gsc.siteUrl'
    );
  } catch (e) {
    record(
      'gsc_sites',
      'Search Console API — list sites',
      'fail',
      String(e.message || e).slice(0, 200),
      'Enable Search Console API; ensure OAuth has webmasters scope'
    );
  }
} else {
  record('gsc_sites', 'Search Console API — list sites', 'skip', 'Waiting on access token');
}

// --- Step 4: GA4 property ---
const ga4Id = (process.env.MERIDIAN_GA4_PROPERTY_ID || '').trim();
if (!ga4Id) {
  record(
    'ga4_property',
    'GA4 Property ID set',
    'fail',
    'MERIDIAN_GA4_PROPERTY_ID missing (numeric, not G-…)',
    'Login to analytics.google.com → Admin → Property settings → copy Property ID'
  );
} else if (/^G-/i.test(ga4Id)) {
  record(
    'ga4_property',
    'GA4 Property ID set',
    'fail',
    `Got measurement ID ${ga4Id} — need numeric Property ID`,
    'Admin → Property settings → Property ID (digits only)'
  );
} else if (accessOk) {
  try {
    await googleFetch(`https://analyticsdata.googleapis.com/v1beta/properties/${ga4Id}:runReport`, {
      method: 'POST',
      body: {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }],
      },
    });
    record('ga4_property', 'GA4 Data API report', 'pass', `Property ${ga4Id} returned sessions report`);
  } catch (e) {
    record(
      'ga4_property',
      'GA4 Data API report',
      'fail',
      String(e.message || e).slice(0, 200),
      'Enable Google Analytics Data API; confirm Property ID and account access'
    );
  }
} else {
  record('ga4_property', 'GA4 Data API report', 'skip', `Property ID ${ga4Id} set; waiting on token`);
}

// --- Step 5: Bing ---
const bing = (process.env.MERIDIAN_BING_API_KEY || '').trim();
if (!bing) {
  record(
    'bing_key',
    'Bing Webmaster API key',
    'fail',
    'MERIDIAN_BING_API_KEY missing',
    'Login to bing.com/webmasters → Import from GSC → Settings → API Access → create key'
  );
} else {
  try {
    const r = await submitBingSitemap(profile);
    record(
      'bing_key',
      'Bing sitemap submit',
      r.ok ? 'pass' : r.status === 'auth_required' ? 'fail' : 'warn',
      r.message || r.status,
      r.ok ? null : 'Regenerate Bing API key; confirm site imported'
    );
  } catch (e) {
    record('bing_key', 'Bing sitemap submit', 'fail', String(e.message || e).slice(0, 200));
  }
}

// --- Step 6: PSI ---
const psi = (process.env.MERIDIAN_PSI_API_KEY || '').trim();
if (!psi) {
  record(
    'psi_key',
    'PageSpeed Insights API key',
    'warn',
    'Optional MERIDIAN_PSI_API_KEY missing',
    'Google Cloud → Credentials → API key → enable PageSpeed Insights API'
  );
} else {
  try {
    const url = encodeURIComponent(profile.origin + '/');
    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&strategy=mobile&category=PERFORMANCE&key=${psi}`
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const score = Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100);
      record('psi_key', 'PageSpeed Insights API', 'pass', `Mobile performance score ${score}`);
    } else {
      record('psi_key', 'PageSpeed Insights API', 'fail', data?.error?.message || `HTTP ${res.status}`);
    }
  } catch (e) {
    record('psi_key', 'PageSpeed Insights API', 'fail', String(e.message || e).slice(0, 200));
  }
}

// --- Step 7: Act (optional) ---
if (doAct && accessOk) {
  const sub = await submitSitemap(profile);
  record('gsc_sitemap', 'GSC submit sitemap', sub.ok ? 'pass' : 'fail', sub.message);
  const ins = await inspectUrl(profile, profile.origin + '/');
  record('gsc_inspect', 'GSC inspect home URL', ins.ok ? 'pass' : 'fail', ins.message);
} else if (doAct) {
  record('gsc_sitemap', 'GSC submit sitemap', 'skip', 'Needs OAuth');
} else {
  record('gsc_sitemap', 'GSC submit sitemap', 'skip', 'Pass --act to submit + inspect after OAuth works');
}

const pass = steps.filter((s) => s.status === 'pass').length;
const fail = steps.filter((s) => s.status === 'fail').length;
const warn = steps.filter((s) => s.status === 'warn').length;

const payload = {
  generatedAt: new Date().toISOString(),
  origin: profile.origin,
  summary: { pass, fail, warn, skip: steps.filter((s) => s.status === 'skip').length },
  steps,
};

console.log(`\n═══ Unlock verify: ${pass} pass · ${fail} fail · ${warn} warn ═══\n`);

const outArg = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'storage/meridian/zigma-prod/unlock-verify.json';
const outPath = resolve(ROOT, outArg);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(payload, null, 2));
}

process.exit(fail > 0 ? 1 : 0);
