import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual } from '../lib/html.mjs';

function extractJsonLd(html) {
  const blocks = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      /* ignore */
    }
  }
  return blocks;
}

function walk(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const n of node) walk(n, out);
    return out;
  }
  if (typeof node === 'object') {
    if (node['@type']) out.push(node);
    if (node['@graph']) walk(node['@graph'], out);
  }
  return out;
}

/**
 * Phase 5.1 — extract NAP from live Organization JSON-LD + GBP copy checklist.
 */
export async function auditNap(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const res = await fetchManual(`${origin}/`, { forceBody: true });
  const entities = extractJsonLd(res.body || '').flatMap((b) => walk(b));
  const org = entities.find((e) => {
    const t = e['@type'];
    const types = Array.isArray(t) ? t : [t];
    return types.some((x) => /Organization|LocalBusiness/i.test(String(x || '')));
  });

  const addr = org?.address || {};
  const nap = {
    name: org?.name || null,
    telephone: org?.telephone || null,
    email: org?.email || null,
    streetAddress: addr.streetAddress || null,
    addressLocality: addr.addressLocality || null,
    addressRegion: addr.addressRegion || null,
    postalCode: addr.postalCode || null,
    addressCountry: addr.addressCountry || null,
    sameAs: Array.isArray(org?.sameAs) ? org.sameAs : org?.sameAs ? [org.sameAs] : [],
    openingHours: org?.openingHours || org?.openingHoursSpecification || null,
  };

  const missing = Object.entries({
    name: nap.name,
    telephone: nap.telephone,
    streetAddress: nap.streetAddress,
    addressLocality: nap.addressLocality,
    postalCode: nap.postalCode,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  const findings = [];
  if (missing.length) {
    findings.push({
      code: 'NAP_INCOMPLETE',
      severity: 'high',
      title: `Organization NAP missing: ${missing.join(', ')}`,
      remediation: 'Fill Site Settings company address/phone identically for GBP.',
      owner: 'marketing',
      pillar: 'local',
    });
  }
  if (!nap.sameAs.length) {
    findings.push({
      code: 'SCHEMA_SAMEAS',
      severity: 'medium',
      title: 'No sameAs social profiles on Organization JSON-LD',
      remediation: 'Admin → Site Settings → Social links (LinkedIn, Facebook, YouTube).',
      owner: 'marketing',
      pillar: 'local',
    });
  }

  const gbpChecklist = [
    { id: 'name', label: 'Business name', value: nap.name, instruction: 'Must match GBP exactly (no keyword stuffing)' },
    { id: 'phone', label: 'Primary phone', value: nap.telephone, instruction: 'Same format on GBP + site + directories' },
    { id: 'street', label: 'Street address', value: nap.streetAddress, instruction: 'Copy into GBP → Location' },
    {
      id: 'city',
      label: 'City / Region / PIN',
      value: [nap.addressLocality, nap.addressRegion, nap.postalCode].filter(Boolean).join(', '),
      instruction: 'Bengaluru / Karnataka / PIN identical everywhere',
    },
    { id: 'hours', label: 'Hours', value: typeof nap.openingHours === 'string' ? nap.openingHours : 'See Site Settings', instruction: 'Match GBP hours (Mon–Sat…)' },
    { id: 'website', label: 'Website', value: origin, instruction: 'GBP website = apex https URL' },
    {
      id: 'social',
      label: 'Social profiles',
      value: nap.sameAs.length ? nap.sameAs.join(' · ') : '(none — add in Site Settings)',
      instruction: 'Add real profile URLs then re-run Meridian schema/NAP audit',
    },
  ];

  const md = [
    `# GBP / NAP checklist — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Copy these values into Google Business Profile (Phase 5.1). Do not invent differences.',
    '',
    '| Field | Live site value | GBP instruction |',
    '| --- | --- | --- |',
    ...gbpChecklist.map((r) => `| ${r.label} | ${r.value || '—'} | ${r.instruction} |`),
    '',
  ].join('\n');

  const payload = {
    generatedAt: new Date().toISOString(),
    nap,
    missing,
    gbpChecklist,
    sameAsCount: nap.sameAs.length,
  };

  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'nap-audit.json'), JSON.stringify(payload, null, 2), 'utf8');
    await writeFile(resolve(opts.outDir, 'gbp-checklist.md'), md, 'utf8');
  }

  return {
    ok: missing.length === 0,
    status: missing.length ? 'degraded' : nap.sameAs.length ? 'ok' : 'degraded',
    message: missing.length
      ? `NAP incomplete (${missing.join(', ')})`
      : nap.sameAs.length
        ? `NAP complete · ${nap.sameAs.length} sameAs profile(s)`
        : 'NAP complete · sameAs empty (add social URLs)',
    data: { ...payload, paths: opts.outDir ? { md: resolve(opts.outDir, 'gbp-checklist.md') } : null },
    findings,
  };
}
