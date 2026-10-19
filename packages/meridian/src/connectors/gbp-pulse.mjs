import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * GBP has no public Performance API — Meridian minimizes human work to:
 * 1) MERIDIAN_GBP_* env / gbp-pulse.json paste, or
 * 2) GSC brand-query proxy (clicks + discovery impressions) so monthly digests fill unattended.
 */

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function numEnv(...keys) {
  for (const k of keys) {
    const v = (process.env[k] || '').trim();
    if (v !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

function brandMatch(q, brandTokens) {
  const s = String(q || '').toLowerCase();
  return brandTokens.some((t) => s.includes(t));
}

/**
 * Derive transparent GBP stand-ins from GSC brand / local queries.
 * Never overwrites env or hand-pasted (source=manual|env) values.
 */
export async function applyGscGbpProxy(pulse, outDir, profile) {
  if (pulse.source === 'env' || pulse.source === 'manual') return pulse;
  // Keep real pasted numbers for current month
  if (pulse.source && pulse.source !== 'gsc-proxy' && pulse.complete) return pulse;

  const cache = await readJson(resolve(outDir, 'signal-cache.json'));
  let topQueries = cache?.gsc?.topQueries || [];
  if (!topQueries.length) {
    try {
      const { collectGsc } = await import('./gsc.mjs');
      const gsc = await collectGsc(profile);
      topQueries = gsc.data?.topQueries || [];
    } catch {
      return pulse;
    }
  }
  if (!topQueries.length) return pulse;

  const brandName = String(profile.brand?.name || profile.displayName || 'zigma')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
  const tokens = [...new Set([brandName, 'zigma', 'zigmatechnologies'].filter(Boolean))];
  const brandRows = topQueries.filter((r) => brandMatch(r.query, tokens));
  if (!brandRows.length) return pulse;

  const clicks = Math.round(brandRows.reduce((s, r) => s + (Number(r.clicks) || 0), 0));
  // "Directions-like" discovery: brand+city / maps-ish impressions (not true GBP directions)
  const localRows = brandRows.filter((r) =>
    /bangalore|bengaluru|chennai|hyderabad|mumbai|pune|delhi|india|near me|maps/i.test(String(r.query || ''))
  );
  const directions = Math.round(
    (localRows.length ? localRows : brandRows).reduce((s, r) => s + (Number(r.impressions) || 0), 0)
  );

  return {
    ...pulse,
    clicks: pulse.clicks ?? clicks,
    directions: pulse.directions ?? directions,
    // calls / reviews stay null unless human/env — honest about API gap
    source: 'gsc-proxy',
    proxy: {
      kind: 'gsc-brand-queries',
      queries: brandRows.slice(0, 8).map((r) => r.query),
      note: 'Proxy for GBP website clicks / discovery — replace with Insights paste when available',
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Load / refresh gbp-pulse.json for the current month.
 * @returns {{ ok: boolean, status: string, message: string, data: object }}
 */
export async function loadGbpPulse(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const path = resolve(outDir, 'gbp-pulse.json');
  const key = monthKey();
  let prev = await readJson(path);

  const fromEnv = {
    calls: numEnv('MERIDIAN_GBP_CALLS', 'MERIDIAN_GBP_PHONE_CALLS'),
    clicks: numEnv('MERIDIAN_GBP_CLICKS', 'MERIDIAN_GBP_WEBSITE_CLICKS'),
    directions: numEnv('MERIDIAN_GBP_DIRECTIONS'),
    newReviews: numEnv('MERIDIAN_GBP_NEW_REVIEWS', 'MERIDIAN_GBP_REVIEWS'),
    rating: numEnv('MERIDIAN_GBP_RATING'),
  };
  const envFilled = Object.values(fromEnv).some((v) => v != null);

  let pulse =
    prev && prev.monthKey === key
      ? { ...prev }
      : {
          monthKey: key,
          calls: null,
          clicks: null,
          directions: null,
          newReviews: null,
          rating: null,
          source: null,
          updatedAt: null,
        };

  if (envFilled) {
    pulse = {
      ...pulse,
      monthKey: key,
      calls: fromEnv.calls ?? pulse.calls,
      clicks: fromEnv.clicks ?? pulse.clicks,
      directions: fromEnv.directions ?? pulse.directions,
      newReviews: fromEnv.newReviews ?? pulse.newReviews,
      rating: fromEnv.rating ?? pulse.rating,
      source: 'env',
      updatedAt: new Date().toISOString(),
    };
  }

  if (prev && prev.monthKey !== key) {
    pulse.priorMonth = {
      monthKey: prev.monthKey,
      calls: prev.calls,
      clicks: prev.clicks,
      directions: prev.directions,
      newReviews: prev.newReviews,
      rating: prev.rating,
    };
  }

  if (opts.gscProxy !== false && !envFilled) {
    pulse = await applyGscGbpProxy(pulse, outDir, profile);
  }

  const filled = ['calls', 'clicks', 'directions', 'newReviews', 'rating'].filter((k) => pulse[k] != null).length;
  pulse.filled = filled;
  pulse.complete = filled >= 2;
  if (!pulse.updatedAt) pulse.updatedAt = new Date().toISOString();

  await writeFile(path, JSON.stringify(pulse, null, 2), 'utf8');

  const srcLabel =
    pulse.source === 'gsc-proxy'
      ? '_Source: GSC brand-query proxy (not GBP Insights). Paste real Insights anytime to override._'
      : pulse.source === 'env'
        ? '_Source: MERIDIAN_GBP_* env._'
        : pulse.source === 'manual'
          ? '_Source: manual gbp-pulse.json._'
          : '';

  const md = [
    `# GBP pulse — ${key}`,
    '',
    'Google Business Profile has **no public Performance API**. Meridian auto-fills from **GSC brand queries** when Insights are empty.',
    '',
    'Override anytime:',
    '1. [Business Profile Performance](https://business.google.com/) → Insights',
    '2. Paste into `gbp-pulse.json` or set `MERIDIAN_GBP_CALLS` / `_CLICKS` / `_DIRECTIONS` / `_NEW_REVIEWS` / `_RATING`',
    '3. `npm run meridian:observe`',
    '',
    '| Metric | Value |',
    '| --- | --- |',
    `| Calls | ${pulse.calls ?? '—'} |`,
    `| Website clicks | ${pulse.clicks ?? '—'} |`,
    `| Directions / discovery | ${pulse.directions ?? '—'} |`,
    `| New reviews | ${pulse.newReviews ?? '—'} |`,
    `| Rating | ${pulse.rating ?? '—'} |`,
    '',
    srcLabel,
    pulse.proxy?.queries?.length ? `_Proxy queries: ${pulse.proxy.queries.join('; ')}_` : '',
    pulse.priorMonth
      ? `_Prior ${pulse.priorMonth.monthKey}: calls ${pulse.priorMonth.calls ?? '—'} · clicks ${pulse.priorMonth.clicks ?? '—'}._`
      : '',
    '',
  ]
    .filter(Boolean)
    .join('\n');
  await writeFile(resolve(outDir, 'gbp-pulse.md'), md, 'utf8');

  return {
    ok: true,
    status: pulse.complete ? 'ok' : 'degraded',
    message: pulse.complete
      ? `GBP pulse ${key} · ${filled}/5 · source ${pulse.source || 'manual'}`
      : `GBP pulse incomplete · ${filled}/5 — need GSC auth or Insights paste`,
    data: { ...pulse, path, mdPath: resolve(outDir, 'gbp-pulse.md') },
  };
}

export async function gbpPulseExists(outDir) {
  try {
    await access(resolve(outDir, 'gbp-pulse.json'));
    return true;
  } catch {
    return false;
  }
}
