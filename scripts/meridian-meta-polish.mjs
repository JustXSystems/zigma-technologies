#!/usr/bin/env node
/**
 * Phase 3 polish — rewrite CMS meta that is empty, too short, too long, or brand-duplicated.
 * Output format matches meridian-meta-apply.mjs drafts.
 *
 *   node scripts/meridian-meta-polish.mjs --json --out storage/meridian/zigma-prod/meta-polish.json
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import mysql from 'mysql2/promise';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

function plain(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(s, max) {
  const t = plain(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trim() + '…';
}

function stripBrand(title, brand) {
  let t = plain(title);
  if (!brand) return t;
  const re = new RegExp(`\\s*[|–—-]\\s*${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
  t = t.replace(re, '').trim();
  const re2 = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  if ((t.match(re2) || []).length > 1) t = t.replace(re2, '').replace(/\s{2,}/g, ' ').trim();
  return t;
}

function issuesOf(metaTitle, metaDesc, brand) {
  const t = stripBrand(metaTitle || '', brand);
  const d = plain(metaDesc || '');
  const issues = [];
  if (!t || t.length < 20) issues.push('title-short');
  if (t.length > 58) issues.push('title-long');
  if (brand && (plain(metaTitle).match(new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length > 1)
    issues.push('brand-twice');
  if (!d || d.length < 70) issues.push('desc-short');
  if (d.length > 160) issues.push('desc-long');
  return issues;
}

function polishCatalog(row, brand) {
  const type = row.item_type;
  const base = stripBrand(row.meta_title || row.title, brand) || plain(row.title);
  const proof = plain(row.summary) || plain(row.description).slice(0, 180);
  let metaTitle = base;
  if (type === 'service') metaTitle = clip(`${base} in India – Reliable Support`, 58);
  else if (type === 'product') metaTitle = clip(base.includes('–') || base.includes('-') ? base : `${base} – Specs & AMC`, 58);
  else if (type === 'project') metaTitle = clip(base, 58);
  else metaTitle = clip(base, 58);

  const cta = ' Get a quote.';
  let metaDescription = proof
    ? clip(proof.replace(/\s*Enquire with Zigma\.?\s*$/i, ''), 160 - cta.length) + cta
    : clip(`${base} from Zigma Technologies — engineering, supply and AMC across India.`, 160 - cta.length) + cta;
  return { meta_title: clip(metaTitle, 58), meta_description: clip(metaDescription, 160) };
}

function polishPage(row, brand) {
  const slug = String(row.slug || '');
  const base = stripBrand(row.meta_title || row.title, brand) || plain(row.title) || slug.replace(/-/g, ' ');
  let metaTitle = clip(base, 58);
  if (slug === '/' || slug === '' || slug === 'home') {
    metaTitle = clip('Solar EPC, UPS, BESS & EV Charging Company in India', 58);
  } else if (/contact/i.test(slug)) {
    metaTitle = clip('Contact Us – Solar, UPS & Energy Enquiries', 58);
  } else if (/industries/i.test(slug)) {
    metaTitle = clip(`${base} — Power & Energy Solutions`, 58);
  }
  const proof = plain(row.meta_description) || plain(row.excerpt) || plain(row.summary);
  const cta = ' Talk to our engineers.';
  const meta_description = proof
    ? clip(proof, 160 - cta.length) + (/quote|enquire|talk|contact/i.test(proof) ? '' : cta)
    : clip(`${base} — Zigma Technologies, Bengaluru. Solar EPC, UPS, BESS and EV charging.`, 160 - cta.length) + cta;
  return { meta_title: clip(metaTitle, 58), meta_description: clip(meta_description, 160) };
}

loadEnv();
const brand = process.env.MERIDIAN_BRAND || 'Zigma Technologies';
const outArg = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'storage/meridian/zigma-prod/meta-polish.json';

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const drafts = [];

try {
  const [catalog] = await pool.query(
    `SELECT id, item_type, slug, title, summary, description, meta_title, meta_description
     FROM catalog_items
     WHERE enabled = 1 AND (status IS NULL OR status IN ('published','live'))
     ORDER BY item_type, sort_order, id LIMIT 200`
  );
  for (const row of catalog) {
    const issues = issuesOf(row.meta_title, row.meta_description, brand);
    if (!issues.length) continue;
    const fields = polishCatalog(row, brand);
    drafts.push({
      id: row.id,
      source: 'catalog_items',
      slug: row.slug,
      item_type: row.item_type,
      issues,
      reason: 'length/brand polish (Phase 3)',
      fields,
      before: { meta_title: row.meta_title, meta_description: row.meta_description },
    });
  }
} catch (e) {
  console.error('catalog:', e.message || e);
}

try {
  let pages = [];
  try {
    const [rows] = await pool.query(
      `SELECT id, slug, title, meta_title, meta_description FROM pages ORDER BY id LIMIT 80`
    );
    pages = rows;
  } catch {
    pages = [];
  }
  for (const row of pages) {
    const issues = issuesOf(row.meta_title, row.meta_description, brand);
    if (!issues.length) continue;
    const fields = polishPage(row, brand);
    drafts.push({
      id: row.id,
      source: 'pages',
      slug: row.slug,
      issues,
      reason: 'length/brand polish (Phase 3)',
      fields,
      before: { meta_title: row.meta_title, meta_description: row.meta_description },
    });
  }
} catch (e) {
  console.error('pages:', e.message || e);
}

await pool.end();

const payload = {
  generatedAt: new Date().toISOString(),
  mode: 'polish',
  brand,
  count: drafts.length,
  drafts,
};
const outPath = resolve(process.cwd(), outArg);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
writeFileSync(
  outPath.replace(/\.json$/, '.md'),
  [
    '# Meta polish drafts (Phase 3)',
    '',
    `Generated: ${payload.generatedAt} · ${drafts.length} row(s)`,
    '',
    'Apply with: `node scripts/meridian-meta-apply.mjs --apply --force --file ' + outArg + '`',
    '',
    '| Source | Slug | Issues | New title |',
    '| --- | --- | --- | --- |',
    ...drafts
      .slice(0, 40)
      .map((d) => `| ${d.source} | ${d.slug} | ${d.issues.join(', ')} | ${d.fields.meta_title} |`),
    '',
  ].join('\n'),
  'utf8'
);

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ ok: true, count: drafts.length, outPath }));
} else {
  console.log(`Wrote ${drafts.length} polish drafts → ${outPath}`);
}
