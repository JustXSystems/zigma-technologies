import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadOpsCadence, saveOpsCadence, markCompleted } from '../lib/ops-cadence.mjs';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function placesKey() {
  return (
    (process.env.MERIDIAN_PLACES_API_KEY || '').trim() ||
    (process.env.MERIDIAN_GOOGLE_MAPS_KEY || '').trim() ||
    (process.env.MERIDIAN_PSI_API_KEY || '').trim() ||
    ''
  );
}

/**
 * Probe live homepage JSON-LD for maps / geo presence signals.
 */
async function probeLiveJsonLd(origin) {
  const evidence = [];
  try {
    const res = await fetch(origin, {
      headers: { 'user-agent': 'MeridianPresenceSentinel/1.0 (+https://zigma-technologies.com)' },
      signal: AbortSignal.timeout(20000),
    });
    const html = await res.text();
    const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of blocks) {
      let data;
      try {
        data = JSON.parse(m[1]);
      } catch {
        continue;
      }
      const nodes = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
      for (const n of nodes) {
        if (!n || typeof n !== 'object') continue;
        if (n.hasMap) {
          evidence.push({
            kind: 'jsonld-hasMap',
            strength: 'strong',
            value: String(n.hasMap),
            note: 'Organization/LocalBusiness hasMap on live site',
          });
        }
        if (n.geo && (n.geo.latitude || n.geo['@type'])) {
          evidence.push({
            kind: 'jsonld-geo',
            strength: 'weak',
            value: JSON.stringify(n.geo),
            note: 'Geo coordinates present in JSON-LD',
          });
        }
        const sameAs = Array.isArray(n.sameAs) ? n.sameAs : [];
        for (const u of sameAs) {
          if (/google\.(com|co\.)|maps\.app\.goo\.gl|g\.page\//i.test(String(u))) {
            evidence.push({
              kind: 'jsonld-sameAs-maps',
              strength: 'strong',
              value: String(u),
              note: 'sameAs points at Google Maps / g.page',
            });
          }
        }
      }
    }
  } catch (e) {
    evidence.push({ kind: 'jsonld-fetch', strength: 'none', note: String(e?.message || e) });
  }
  return evidence;
}

function originHostOf(profile) {
  return String(profile.origin || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

function websiteMatches(site, originHost) {
  const s = String(site || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase();
  if (!s || !originHost) return false;
  const host = s.split('/')[0];
  return host === originHost || host.endsWith(`.${originHost}`) || originHost.endsWith(host);
}

function scoreCandidates(candidates, originHost) {
  const evidence = [];
  let match = null;
  for (const c of candidates) {
    const websiteMatch = websiteMatches(c.website, originHost);
    evidence.push({
      kind: 'places-candidate',
      strength: websiteMatch ? 'sealed' : 'weak',
      value: c.place_id,
      name: c.name,
      website: c.website || null,
      mapsUrl: c.url || null,
      rating: c.rating ?? null,
      reviews: c.user_ratings_total ?? null,
      note: websiteMatch ? 'Website matches production origin — GBP presence confirmed' : 'Candidate without website match',
    });
    if (websiteMatch && !match) match = c;
  }
  return { evidence, match };
}

/** Places API (New) — preferred. */
async function probePlacesNew(key, textQuery, originHost) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount',
    },
    body: JSON.stringify({ textQuery, pageSize: 5 }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    return { ok: false, message: `Places API (New) ${msg}`, evidence: [], match: null };
  }
  const places = data.places || [];
  const candidates = places.map((p) => ({
    place_id: String(p.id || '').replace(/^places\//, ''),
    name: p.displayName?.text || p.displayName || null,
    website: p.websiteUri || null,
    url: p.googleMapsUri || null,
    rating: p.rating ?? null,
    user_ratings_total: p.userRatingCount ?? null,
  }));
  const { evidence, match } = scoreCandidates(candidates, originHost);
  return {
    ok: true,
    message: match
      ? `Places (New) match · place_id ${match.place_id}`
      : candidates.length
        ? `Places (New) ${candidates.length} candidate(s), no website match`
        : 'Places (New) empty — listing not public yet',
    evidence,
    match,
  };
}

/** Legacy Find Place — fallback when New API unavailable. */
async function probePlacesLegacy(key, textQuery, originHost) {
  const fields = 'place_id,name,formatted_address,website,url,rating,user_ratings_total';
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(textQuery)}&inputtype=textquery&fields=${fields}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const data = await res.json();
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return {
      ok: false,
      message: `Places legacy ${data.status}${data.error_message ? ': ' + data.error_message : ''}`,
      evidence: [],
      match: null,
    };
  }
  const candidates = data.candidates || [];
  const { evidence, match } = scoreCandidates(candidates, originHost);
  return {
    ok: true,
    message: match
      ? `Places match · place_id ${match.place_id}`
      : candidates.length
        ? `Places found ${candidates.length} candidate(s), no website match`
        : 'Places ZERO_RESULTS — listing not public yet',
    evidence,
    match,
  };
}

/**
 * Optional Places probe — only when an API key is available.
 * Prefers Places API (New); falls back to legacy Find Place.
 */
async function probePlaces(profile, nap) {
  const key = placesKey();
  if (!key) {
    return { ok: false, skipped: true, message: 'No Places/Maps/PSI key — env probe skipped', evidence: [] };
  }
  const name = nap?.name || profile.brand?.name || profile.displayName || 'Zigma Technologies';
  const city = nap?.addressLocality || 'Bengaluru';
  const textQuery = `${name} ${city}`;
  const originHost = originHostOf(profile);
  try {
    const neu = await probePlacesNew(key, textQuery, originHost);
    if (neu.ok) {
      return { ok: true, skipped: false, message: neu.message, match: neu.match, evidence: neu.evidence };
    }
    const legacy = await probePlacesLegacy(key, textQuery, originHost);
    if (legacy.ok) {
      return { ok: true, skipped: false, message: legacy.message, match: legacy.match, evidence: legacy.evidence };
    }
    const disabled =
      /not been used|REQUEST_DENIED|not enabled|PERMISSION_DENIED/i.test(`${neu.message} ${legacy.message}`);
    return {
      ok: false,
      skipped: disabled,
      message: disabled
        ? 'Places API not enabled on this key — use ack-gbp / MERIDIAN_GBP_PLACE_ID / gbp-presence.json (optional: enable places.googleapis.com)'
        : `${neu.message} · ${legacy.message}`,
      evidence: [],
      match: null,
    };
  } catch (e) {
    return { ok: false, skipped: false, message: String(e?.message || e), evidence: [] };
  }
}

function envEvidence() {
  const evidence = [];
  const placeId = (process.env.MERIDIAN_GBP_PLACE_ID || '').trim();
  const mapsUrl = (process.env.MERIDIAN_GBP_MAPS_URL || process.env.MERIDIAN_GBP_HAS_MAP || '').trim();
  const review = (process.env.MERIDIAN_GBP_REVIEW_LINK || '').trim();
  if (placeId) {
    evidence.push({
      kind: 'env-place-id',
      strength: 'sealed',
      value: placeId,
      note: 'MERIDIAN_GBP_PLACE_ID set',
    });
  }
  if (mapsUrl) {
    evidence.push({
      kind: 'env-maps-url',
      strength: 'strong',
      value: mapsUrl,
      note: 'MERIDIAN_GBP_MAPS_URL / HAS_MAP set',
    });
  }
  if (review) {
    evidence.push({
      kind: 'env-review-link',
      strength: 'strong',
      value: review,
      note: 'MERIDIAN_GBP_REVIEW_LINK set — implies verified profile',
    });
  }
  return evidence;
}

function rankStrength(s) {
  return { none: 0, weak: 1, bridged: 2, strong: 3, sealed: 4 }[s] || 0;
}

function bestStrength(evidence) {
  let best = 'none';
  for (const e of evidence) {
    if (rankStrength(e.strength) > rankStrength(best)) best = e.strength;
  }
  return best;
}

/**
 * Presence sentinel — detect / seal Google Business Profile without human nag loops.
 */
export async function runPresenceSentinel(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');

  const napAudit = await readJson(resolve(outDir, 'nap-audit.json'));
  const nap = napAudit?.nap || {};
  const gbp = await readJson(resolve(outDir, 'gbp-pulse.json'));
  const prior = await readJson(resolve(outDir, 'presence-sentinel.json'));
  let cadence = await loadOpsCadence(outDir);

  const evidence = [...envEvidence()];

  if (opts.ack === true || opts.forceAck === true) {
    evidence.push({
      kind: 'human-ack',
      strength: 'sealed',
      value: new Date().toISOString(),
      note: 'Operator acknowledged GBP verified (meridian act ack-gbp / --ack-gbp)',
    });
  }

  if (prior?.sealed && prior?.seal?.placeId) {
    evidence.push({
      kind: 'prior-seal',
      strength: 'sealed',
      value: prior.seal.placeId,
      note: 'Prior presence seal retained',
    });
  }

  if (gbp?.rating != null || gbp?.newReviews != null || gbp?.source === 'insights-paste') {
    evidence.push({
      kind: 'gbp-pulse-metrics',
      strength: 'strong',
      value: `rating=${gbp.rating ?? '—'} reviews=${gbp.newReviews ?? '—'}`,
      note: 'Pulse has review metrics — profile is live',
    });
  }

  const jsonLd = await probeLiveJsonLd(origin);
  evidence.push(...jsonLd);

  const places = await probePlaces(profile, nap);
  evidence.push(...(places.evidence || []));

  // Manual file drop: storage/.../gbp-presence.json { placeId, mapsUrl, reviewLink }
  const fileDrop = await readJson(resolve(outDir, 'gbp-presence.json'));
  if (fileDrop?.placeId || fileDrop?.mapsUrl || fileDrop?.reviewLink) {
    evidence.push({
      kind: 'file-gbp-presence',
      strength: fileDrop.placeId || fileDrop.reviewLink ? 'sealed' : 'strong',
      value: fileDrop.placeId || fileDrop.mapsUrl || fileDrop.reviewLink,
      note: 'gbp-presence.json drop-in',
    });
  }

  const strength = bestStrength(evidence);
  const shouldSeal =
    strength === 'sealed' ||
    (strength === 'strong' && (places.match || evidence.some((e) => e.kind === 'env-review-link' || e.kind === 'jsonld-sameAs-maps')));

  let sealed = false;
  let seal = prior?.seal || null;

  if (shouldSeal || cadence?.completed?.['gbp-verify']) {
    sealed = true;
    const placeHit = places.match || evidence.find((e) => e.kind === 'env-place-id' || e.kind === 'places-candidate' && e.strength === 'sealed');
    seal = {
      at: prior?.seal?.at || new Date().toISOString(),
      placeId:
        (process.env.MERIDIAN_GBP_PLACE_ID || '').trim() ||
        fileDrop?.placeId ||
        places.match?.place_id ||
        prior?.seal?.placeId ||
        null,
      mapsUrl:
        (process.env.MERIDIAN_GBP_MAPS_URL || '').trim() ||
        fileDrop?.mapsUrl ||
        places.match?.url ||
        evidence.find((e) => e.kind === 'jsonld-hasMap' || e.kind === 'jsonld-sameAs-maps')?.value ||
        prior?.seal?.mapsUrl ||
        null,
      reviewLink: (process.env.MERIDIAN_GBP_REVIEW_LINK || '').trim() || fileDrop?.reviewLink || prior?.seal?.reviewLink || null,
      rating: places.match?.rating ?? gbp?.rating ?? prior?.seal?.rating ?? null,
      method: evidence.find((e) => e.strength === 'sealed')?.kind || 'strong-evidence',
    };
    if (!cadence?.completed?.['gbp-verify']) {
      cadence = markCompleted(cadence, 'gbp-verify', `Presence sentinel · ${seal.method}`);
      await saveOpsCadence(outDir, cadence);
    }
  }

  const verifyKit = {
    businessName: nap.name || profile.brand?.name || 'Zigma Technologies',
    phone: nap.telephone || '',
    address: [nap.streetAddress, nap.addressLocality, nap.addressRegion, nap.postalCode].filter(Boolean).join(', '),
    website: origin,
    category: profile.autopilot?.gbp?.primaryCategory || 'Solar energy company',
    paths: [
      {
        id: 'search-claim',
        title: 'Search & claim (fastest if listing exists)',
        steps: [
          'Open phase21-ops.html → Search Maps',
          'If listing exists → Claim this business → verify (phone / email / video)',
          'When verified: npm run meridian:ack-gbp  (or drop place id into gbp-presence.json)',
        ],
      },
      {
        id: 'create',
        title: 'Create new profile',
        steps: [
          'business.google.com/create → paste NAP vault exactly (desk / phase20)',
          'Primary category: Solar energy company',
          'Add website + hours Mon–Sat 9:30–18:30 IST',
          'Complete Google verification → then meridian:ack-gbp',
        ],
      },
    ],
    autoClose: [
      'Set MERIDIAN_GBP_PLACE_ID or MERIDIAN_GBP_REVIEW_LINK in .env',
      'Or write storage/meridian/zigma-prod/gbp-presence.json { "placeId": "…", "mapsUrl": "…" }',
      'Or enable Places API on the PSI key — sentinel auto-seals when website matches',
      'Or: npm run meridian:ack-gbp after you verify in the browser',
    ],
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    origin,
    strength,
    sealed,
    seal,
    evidence,
    places: {
      skipped: places.skipped === true,
      message: places.message,
      match: places.match
        ? {
            place_id: places.match.place_id,
            name: places.match.name,
            website: places.match.website,
            url: places.match.url,
            rating: places.match.rating,
          }
        : null,
    },
    verifyKit,
    forever: sealed
      ? ['npm run meridian:observe — zero human debt']
      : ['npm run meridian:observe', 'Complete GBP once → meridian:ack-gbp'],
  };

  await writeFile(resolve(outDir, 'presence-sentinel.json'), JSON.stringify(payload, null, 2), 'utf8');
  if (sealed) {
    await writeFile(
      resolve(outDir, 'presence-seal.json'),
      JSON.stringify({ generatedAt: payload.generatedAt, sealed: true, seal, origin }, null, 2),
      'utf8'
    );
  }

  const md = [
    `# Presence sentinel — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `**Strength:** ${strength} · **Sealed:** ${sealed ? 'YES' : 'NO'}`,
    '',
    sealed
      ? `Presence seal active (${seal?.method || '—'}). Human debt for GBP is closed.`
      : 'GBP not sealed yet — use verify kit / ack-gbp / env place id. Sentinel re-probes every observe.',
    '',
    '## Evidence',
    '',
    ...evidence.map((e) => `- **${e.strength}** · ${e.kind}${e.value ? ` · \`${e.value}\`` : ''} — ${e.note || ''}`),
    '',
    '## Auto-close options',
    '',
    ...verifyKit.autoClose.map((x) => `- ${x}`),
    '',
  ].join('\n');
  await writeFile(resolve(outDir, 'presence-sentinel.md'), md, 'utf8');

  return {
    ok: true,
    status: sealed ? 'ok' : strength === 'none' ? 'pending' : 'ok',
    message: sealed
      ? `Presence SEALED · ${seal?.method || 'evidence'} · place ${seal?.placeId || '—'}`
      : `Presence ${strength} · not sealed · ${places.message || 'awaiting GBP'}`,
    data: {
      ...payload,
      paths: {
        json: resolve(outDir, 'presence-sentinel.json'),
        md: resolve(outDir, 'presence-sentinel.md'),
        seal: sealed ? resolve(outDir, 'presence-seal.json') : null,
      },
    },
  };
}

/** Operator ack — marks GBP verified without waiting for Places. */
export async function ackGbpPresence(profile, opts = {}) {
  return runPresenceSentinel(profile, { ...opts, ack: true });
}
