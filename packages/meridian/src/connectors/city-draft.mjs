import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Auto-draft one unique city×service page from NAP + live projects (staged, stays noindex).
 * Eliminates blank-page ritual — human only reviews before INDEXABLE_CITY_SERVICES promote.
 */
export async function writeCityDraft(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');

  const nap = (await readJson(resolve(outDir, 'nap-audit.json')))?.nap || {};
  const brand = nap.name || profile.brand?.name || 'Zigma Technologies';
  const city = opts.city || 'Bengaluru';
  const service = opts.service || 'UPS AMC';
  const slugCity = city.toLowerCase().replace(/\s+/g, '-');
  const slugService = service.toLowerCase().replace(/\s+/g, '-');
  const path = `/locations/${slugCity}/${slugService}`;

  let projects = [];
  try {
    const res = await fetch(`${origin}/api/public/projects?limit=8`, {
      headers: { 'user-agent': 'MeridianCityDraft/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) {
      const json = await res.json();
      projects = Array.isArray(json) ? json : json?.items || json?.data || [];
    }
  } catch {
    projects = [];
  }

  const proofLines = (projects || [])
    .slice(0, 4)
    .map((p) => {
      const title = p.title || p.name || p.slug || 'Project';
      const loc = p.city || p.location || city;
      return `- **${title}** — ${loc}`;
    })
    .join('\n');

  const address = [nap.streetAddress, nap.addressLocality || city, nap.addressRegion, nap.postalCode]
    .filter(Boolean)
    .join(', ');
  const phone = nap.telephone || '';
  const maps = nap.hasMap || nap.mapsUrl || `${origin}/contact`;

  const body = [
    `# ${service} in ${city} — ${brand}`,
    '',
    `Generated: ${new Date().toISOString()} · **STAGED DRAFT** (keep noindex until reviewed)`,
    '',
    `${brand} provides professional **${service}** for facilities, plants, and data rooms across **${city}** and nearby industrial corridors. This page is drafted from live NAP and project proof — expand with local site photos before indexing.`,
    '',
    '## Who this is for',
    '',
    `- Facility and plant managers in ${city} needing reliable UPS uptime`,
    '- Procurement teams evaluating AMC / EPC partners with OEM depth',
    '- Multi-site operators who need documented SLAs and response times',
    '',
    '## What we deliver',
    '',
    `- Preventive and corrective **${service}** with documented visit reports`,
    '- OEM-aligned UPS, power, and energy systems support',
    '- Coordination from our Bengaluru base for South India coverage',
    '',
    '## Local proof',
    '',
    proofLines || `- Projects delivered for industrial and commercial clients near ${city} — see ${origin}/projects`,
    '',
    '## Process',
    '',
    '1. Enquiry / site survey',
    '2. Scope + SLA confirmation',
    '3. Scheduled preventive visits + emergency response',
    '4. Visit reports and parts recommendations',
    '',
    '## FAQ',
    '',
    `**Do you cover ${city}?** Yes — ${brand} serves ${city} with field engineers and a local ops base.`,
    '',
    '**How fast is emergency response?** Scope-dependent; commercial AMC contracts include defined response windows.',
    '',
    '**Which OEMs?** ABB, APC/Schneider, Studer, and related power/solar partners — see /products.',
    '',
    '## Contact',
    '',
    address ? `${address}` : '',
    phone ? `Phone: ${phone}` : '',
    `Maps: ${maps}`,
    `Enquire: ${origin}/contact`,
    '',
    '---',
    '',
    '### Promote checklist (auto)',
    '',
    '- [ ] Add unique site photos / local references',
    '- [ ] Confirm ≥600 unique words after edit',
    '- [ ] Add `city/service` to `INDEXABLE_CITY_SERVICES` then redeploy',
    '',
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  const words = body.split(/\s+/).filter(Boolean).length;
  const payload = {
    generatedAt: new Date().toISOString(),
    path,
    city,
    service,
    words,
    staged: true,
    indexable: false,
    note: 'Staged draft only — quality gate keeps URL noindex until INDEXABLE_CITY_SERVICES promote',
  };

  await writeFile(resolve(outDir, 'city-draft.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'city-draft.md'), body, 'utf8');

  return {
    ok: true,
    status: 'staged',
    message: `City draft staged · ${path} · ~${words} words (noindex until promote)`,
    data: {
      ...payload,
      paths: {
        json: resolve(outDir, 'city-draft.json'),
        md: resolve(outDir, 'city-draft.md'),
      },
    },
  };
}
