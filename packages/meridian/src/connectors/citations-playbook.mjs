import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { auditNap } from './nap-audit.mjs';

const DIRECTORIES = [
  { id: 'linkedin', name: 'LinkedIn company page', url: 'https://www.linkedin.com/company/setup/new/', why: 'B2B trust + Site Settings social' },
  { id: 'indiamart', name: 'IndiaMART', url: 'https://seller.indiamart.com', why: 'Largest Indian B2B marketplace' },
  { id: 'tradeindia', name: 'TradeIndia', url: 'https://www.tradeindia.com', why: 'B2B marketplace' },
  { id: 'justdial', name: 'Justdial', url: 'https://www.justdial.com/Free-Listing', why: 'Local search presence' },
  { id: 'sulekha', name: 'Sulekha', url: 'https://www.sulekha.com', why: 'Local services' },
  { id: 'exportersindia', name: 'ExportersIndia', url: 'https://www.exportersindia.com', why: 'B2B' },
  { id: 'facebook', name: 'Facebook page', url: 'https://www.facebook.com/pages/create', why: 'Citations + photos' },
  { id: 'youtube', name: 'YouTube channel', url: 'https://www.youtube.com', why: 'Project videos in Google' },
  { id: 'oem', name: 'OEM partner dealer locators', url: '', why: 'Strong relevant backlinks — ask OEM managers' },
  { id: 'assoc', name: 'Industry associations / MSME / chamber', url: '', why: 'Trust + directory listing' },
];

/**
 * Phase 5.5 — citation playbook pre-filled with live NAP (never invents social URLs).
 */
export async function writeCitationsPlaybook(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  let nap = opts.nap || null;
  if (!nap) {
    try {
      nap = JSON.parse(await readFile(resolve(outDir, 'nap-audit.json'), 'utf8')).nap;
    } catch {
      const audited = await auditNap(profile, { outDir });
      nap = audited.data?.nap || {};
    }
  }

  const rows = DIRECTORIES.map((d) => ({
    ...d,
    paste: {
      name: nap.name || '',
      phone: nap.telephone || '',
      street: nap.streetAddress || '',
      city: nap.addressLocality || '',
      region: nap.addressRegion || '',
      pin: nap.postalCode || '',
      website: profile.origin,
      email: nap.email || '',
    },
    status: 'todo',
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '5.5',
    nap,
    directories: rows,
    rule: 'Search/claim existing listing first. Paste NAP exactly — do not retype from memory.',
  };

  const md = [
    `# Citation playbook (Phase 5.5) — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    '## NAP to paste everywhere (live from site JSON-LD)',
    '',
    `- **Name:** ${nap.name || '—'}`,
    `- **Phone:** ${nap.telephone || '—'}`,
    `- **Address:** ${[nap.streetAddress, nap.addressLocality, nap.addressRegion, nap.postalCode].filter(Boolean).join(', ') || '—'}`,
    `- **Website:** ${profile.origin}`,
    `- **Email:** ${nap.email || '—'}`,
    '',
    '## Directories (in order)',
    '',
    '| # | Directory | Open | Status |',
    '| --- | --- | --- | --- |',
    ...rows.map((r, i) => `| ${i + 1} | ${r.name} | ${r.url || '(ask OEM / association)'} | todo |`),
    '',
    'After creating LinkedIn / Facebook / YouTube, paste those URLs into **Admin → Site Settings → Social links** to clear SCHEMA_SAMEAS.',
    '',
  ].join('\n');

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'citations-playbook.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'citations-playbook.md'), md, 'utf8');

  return {
    ok: true,
    status: 'ok',
    message: `Citation playbook: ${rows.length} directories pre-filled with live NAP`,
    data: { ...payload, paths: { md: resolve(outDir, 'citations-playbook.md') } },
    findings: [
      {
        code: 'CITATIONS_PLAYBOOK',
        severity: 'low',
        title: `${rows.length} directory listings ready to claim/create`,
        remediation: 'Follow citations-playbook.md (Phase 5.5). Then add social URLs in Site Settings.',
        owner: 'marketing',
        pillar: 'local',
      },
    ],
  };
}
