#!/usr/bin/env node
/**
 * Auto-draft meta titles/descriptions for CMS rows missing SEO fields.
 * Formulas follow SEO-GUIDE Appendix B (no brand in title; 50–60 / 120–160 chars).
 *
 * Usage:
 *   node scripts/meridian-meta-draft.mjs --json
 *   node scripts/meridian-meta-draft.mjs --out storage/meridian/zigma-prod/meta-drafts.json
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

function needsTitle(v) {
  return !v || plain(v).length < 15;
}
function needsDesc(v) {
  return !v || plain(v).length < 50;
}

/** Appendix B–style drafts from existing CMS fields (never invents fake specs). */
function draftCatalog(row) {
  const type = row.item_type;
  const titleBase = plain(row.title);
  const proof = plain(row.summary) || plain(row.description).slice(0, 200);
  let metaTitle = titleBase;
  if (type === 'project' && !/\bkWp\b|\bkW\b|\bMWh\b/i.test(metaTitle)) {
    metaTitle = clip(titleBase, 58);
  } else if (type === 'service') {
    metaTitle = clip(`${titleBase} in India – Reliable Support`, 58);
  } else if (type === 'product') {
    metaTitle = clip(titleBase, 58);
  } else {
    metaTitle = clip(titleBase, 58);
  }
  const cta = ' Enquire with Zigma.';
  let metaDescription = proof
    ? clip(proof, 155 - cta.length) + cta
    : clip(`${titleBase} from Zigma Technologies — Solar, UPS, BESS and industrial power solutions across India.`, 155) +
      ' Get a quote.';
  metaDescription = clip(metaDescription, 160);
  return { metaTitle: clip(metaTitle, 60), metaDescription };
}

function draftPage(row) {
  const titleBase = plain(row.title) || plain(row.slug).replace(/-/g, ' ');
  const slug = String(row.slug || '');
  let metaTitle = titleBase;
  if (/^industries/i.test(slug)) {
    metaTitle = clip(`${titleBase} — Power & Energy Solutions`, 58);
  } else if (slug === 'privacy') {
    metaTitle = 'Privacy Policy';
  } else if (slug === 'terms') {
    metaTitle = 'Terms of Use';
  } else if (slug === 'contact') {
    metaTitle = 'Contact Us – Solar, UPS & Energy Enquiries';
  } else {
    metaTitle = clip(titleBase, 58);
  }
  const metaDescription = clip(
    `${titleBase} at Zigma Technologies. Solar EPC, UPS, BESS and EV charging for industries across India. Contact us for a quote.`,
    160
  );
  return { metaTitle: clip(metaTitle, 60), metaDescription };
}

function draftPost(row) {
  const titleBase = plain(row.title);
  return {
    metaTitle: clip(titleBase, 60),
    metaDescription: clip(
      plain(row.excerpt) ||
        `${titleBase} — practical guidance from Zigma Technologies on power, solar and UPS. Read the full article.`,
      160
    ),
  };
}

loadEnv();

const outArg = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'storage/meridian/zigma-prod/meta-drafts.json';

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

/** @type {object[]} */
const drafts = [];

try {
  const TYPE_PATH = { project: 'projects', product: 'products', service: 'services' };
  const [rows] = await pool.query(
    `SELECT id, item_type, slug, title, summary, description, meta_title, meta_description
     FROM catalog_items
     WHERE enabled = 1 AND (status IS NULL OR status = 'published' OR status = 'live')
     LIMIT 500`
  );
  for (const row of rows) {
    const needT = needsTitle(row.meta_title);
    const needD = needsDesc(row.meta_description);
    if (!needT && !needD) continue;
    const d = draftCatalog(row);
    const seg = TYPE_PATH[row.item_type] || `${row.item_type}s`;
    drafts.push({
      source: 'catalog_items',
      id: row.id,
      item_type: row.item_type,
      slug: row.slug,
      path: `/${seg}/${row.slug}`,
      fields: {
        meta_title: needT ? d.metaTitle : undefined,
        meta_description: needD ? d.metaDescription : undefined,
      },
      before: { meta_title: row.meta_title, meta_description: row.meta_description },
    });
  }
} catch (e) {
  console.error('catalog draft error', e.message || e);
}

try {
  const [rows] = await pool.query(
    `SELECT id, slug, title, meta_title, meta_description FROM pages LIMIT 200`
  );
  for (const row of rows) {
    const needT = needsTitle(row.meta_title);
    const needD = needsDesc(row.meta_description);
    if (!needT && !needD) continue;
    const d = draftPage(row);
    drafts.push({
      source: 'pages',
      id: row.id,
      slug: row.slug,
      path: `/${row.slug}`,
      fields: {
        meta_title: needT ? d.metaTitle : undefined,
        meta_description: needD ? d.metaDescription : undefined,
      },
      before: { meta_title: row.meta_title, meta_description: row.meta_description },
    });
  }
} catch (e) {
  console.error('pages draft error', e.message || e);
}

try {
  const [rows] = await pool.query(
    `SELECT id, slug, title, excerpt, meta_title, meta_description FROM resource_posts LIMIT 200`
  );
  for (const row of rows) {
    const needT = needsTitle(row.meta_title);
    const needD = needsDesc(row.meta_description);
    if (!needT && !needD) continue;
    const d = draftPost(row);
    drafts.push({
      source: 'resource_posts',
      id: row.id,
      slug: row.slug,
      path: `/blog/${row.slug}`,
      fields: {
        meta_title: needT ? d.metaTitle : undefined,
        meta_description: needD ? d.metaDescription : undefined,
      },
      before: { meta_title: row.meta_title, meta_description: row.meta_description },
    });
  }
} catch {
  /* optional */
}

await pool.end();

const payload = {
  generatedAt: new Date().toISOString(),
  formula: 'SEO-GUIDE Appendix B (auto-draft from existing title/summary)',
  count: drafts.length,
  drafts,
};

const outPath = resolve(process.cwd(), outArg);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ ok: true, count: drafts.length, outPath, drafts: drafts.slice(0, 30) }));
} else {
  console.log(`Wrote ${drafts.length} drafts → ${outPath}`);
}
