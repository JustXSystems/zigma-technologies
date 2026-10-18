#!/usr/bin/env node
/**
 * Auto-draft alt text for catalog_media rows missing alt (Phase 3.6).
 * Uses item title + kind — never invents fake scene details.
 *
 * Usage:
 *   node scripts/meridian-alt-draft.mjs --json
 *   node scripts/meridian-alt-draft.mjs --out storage/meridian/zigma-prod/alt-drafts.json
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
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(s, max) {
  const t = plain(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.55 ? cut.slice(0, sp) : cut).trim() + '…';
}

function draftAlt(row) {
  const title = plain(row.item_title) || 'Zigma Technologies';
  const type = row.item_type || 'item';
  if (row.kind === 'video') {
    return clip(`Video showing ${title}`, 120);
  }
  if (type === 'project') {
    return clip(`${title} — completed project by Zigma Technologies`, 120);
  }
  if (type === 'product') {
    return clip(`${title} product photo`, 120);
  }
  if (type === 'service') {
    return clip(`${title} — Zigma Technologies service`, 120);
  }
  return clip(`${title}`, 120);
}

loadEnv();

const outArg = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'storage/meridian/zigma-prod/alt-drafts.json';

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const drafts = [];
try {
  const [rows] = await pool.query(
    `SELECT m.id, m.item_id, m.url, m.kind, m.alt, m.is_primary,
            c.item_type, c.slug, c.title AS item_title
     FROM catalog_media m
     JOIN catalog_items c ON c.id = m.item_id
     WHERE c.enabled = 1
       AND (m.alt IS NULL OR CHAR_LENGTH(TRIM(m.alt)) < 8)
     ORDER BY m.item_id, m.is_primary DESC, m.sort_order, m.id
     LIMIT 400`
  );
  for (const row of rows) {
    drafts.push({
      source: 'catalog_media',
      id: row.id,
      item_id: row.item_id,
      item_type: row.item_type,
      slug: row.slug,
      url: row.url,
      fields: { alt: draftAlt(row) },
      before: { alt: row.alt },
    });
  }
} catch (e) {
  console.error('alt draft error', e.message || e);
}

await pool.end();

const payload = {
  generatedAt: new Date().toISOString(),
  formula: 'Phase 3.6 — title-based alt drafts (safe placeholders; polish later)',
  count: drafts.length,
  drafts,
};

const outPath = resolve(process.cwd(), outArg);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ ok: true, count: drafts.length, outPath, drafts: drafts.slice(0, 20) }));
} else {
  console.log(`Wrote ${drafts.length} alt drafts → ${outPath}`);
}
