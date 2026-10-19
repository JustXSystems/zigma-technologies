#!/usr/bin/env node
/**
 * Zigma host adapter for Meridian cms-gaps connector.
 * Scans catalog + CMS pages + blog posts for missing meta titles/descriptions.
 *
 * Usage: node scripts/meridian-cms-gaps.mjs --json
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
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

loadEnv();

const TYPE_PATH = {
  project: 'projects',
  product: 'products',
  service: 'services',
};

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

/** @type {object[]} */
const gaps = [];
const scanned = { catalog: 0, pages: 0, posts: 0 };
const errors = [];

try {
  const [catalog] = await pool.query(
    `SELECT id, item_type, slug, title, meta_title, meta_description, enabled, status
     FROM catalog_items
     WHERE enabled = 1 AND (status IS NULL OR status = 'published' OR status = 'live')
     ORDER BY item_type, sort_order, id
     LIMIT 500`
  );
  scanned.catalog = catalog.length;
  for (const row of catalog) {
    const seg = TYPE_PATH[row.item_type] || `${row.item_type}s`;
    const path = `/${seg}/${row.slug}`;
    if (!row.meta_title || String(row.meta_title).trim().length < 15) {
      gaps.push({
        code: 'CMS_META_TITLE',
        severity: 'medium',
        title: `Missing/short meta title: ${row.item_type} “${row.title}”`,
        detail: `path ${path}`,
        remediation: `Admin → Inventory → ${row.item_type} → SEO → Meta title (50–60 chars)`,
        path,
        slug: row.slug,
      });
    }
    if (!row.meta_description || String(row.meta_description).trim().length < 50) {
      gaps.push({
        code: 'CMS_META_DESC',
        severity: 'low',
        title: `Missing/short meta description: ${row.item_type} “${row.title}”`,
        detail: `path ${path}`,
        remediation: `Admin → Inventory → SEO → Meta description (120–160 chars)`,
        path,
        slug: row.slug,
      });
    }
  }
} catch (e) {
  errors.push(`catalog: ${e.message || e}`);
}

try {
  const [pages] = await pool.query(
    `SELECT id, slug, title, meta_title, meta_description, status
     FROM pages
     WHERE status IN ('published', 'live') OR status IS NULL
     ORDER BY id
     LIMIT 200`
  );
  scanned.pages = pages.length;
  for (const row of pages) {
    const path = `/${String(row.slug || '').replace(/^\//, '')}`;
    // Site appends " | Zigma Technologies" — accept page title as SEO title when meta_title empty/short
    const effectiveTitle = String(row.meta_title || row.title || '')
      .trim()
      .replace(/\s+/g, ' ');
    if (!effectiveTitle || effectiveTitle.length < 8) {
      gaps.push({
        code: 'CMS_PAGE_TITLE',
        severity: 'medium',
        title: `CMS page missing meta title: ${row.slug}`,
        detail: row.title || '',
        remediation: `Admin → Pages → ${row.slug} → SEO title`,
        path,
        slug: row.slug,
      });
    }
    if (!row.meta_description || String(row.meta_description).trim().length < 50) {
      gaps.push({
        code: 'CMS_PAGE_DESC',
        severity: 'low',
        title: `CMS page missing meta description: ${row.slug}`,
        detail: row.title || '',
        remediation: `Admin → Pages → ${row.slug} → SEO description`,
        path,
        slug: row.slug,
      });
    }
  }
} catch (e) {
  errors.push(`pages: ${e.message || e}`);
}

try {
  const [posts] = await pool.query(
    `SELECT id, slug, title, meta_title, meta_description, status, enabled
     FROM resource_posts
     WHERE (status = 'published' OR enabled = 1)
     ORDER BY id DESC
     LIMIT 200`
  );
  scanned.posts = posts.length;
  for (const row of posts) {
    const path = `/blog/${row.slug}`;
    if (!row.meta_title || String(row.meta_title).trim().length < 15) {
      gaps.push({
        code: 'CMS_BLOG_TITLE',
        severity: 'low',
        title: `Blog post missing meta title: ${row.slug}`,
        detail: row.title || '',
        remediation: `Admin → Resources → Article → SEO title`,
        path,
        slug: row.slug,
      });
    }
  }
} catch (e) {
  errors.push(`posts: ${e.message || e}`);
}

await pool.end();

const out = { ok: errors.length === 0, scanned, gapCount: gaps.length, gaps, errors };
if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(out));
} else {
  console.log(`Scanned catalog=${scanned.catalog} pages=${scanned.pages} posts=${scanned.posts}`);
  console.log(`Gaps: ${gaps.length}`);
  if (errors.length) console.log('Errors:', errors.join('; '));
  for (const g of gaps.slice(0, 20)) console.log(`- [${g.severity}] ${g.title}`);
}
