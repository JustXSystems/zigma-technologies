#!/usr/bin/env node
/**
 * One-shot: fix home page meta that fails live-verify (double brand / experiment desc).
 *
 *   node scripts/fix-home-seo-meta.mjs
 *   node scripts/fix-home-seo-meta.mjs --apply
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

loadEnv(resolve(process.cwd(), '.env'));
loadEnv(resolve(process.cwd(), '.env.local'));

const APPLY = process.argv.includes('--apply');
const TITLE = 'Solar EPC, UPS, BESS & EV Charging in Bangalore';
const DESC =
  'Solar EPC, UPS, BESS and EV charging for industries across India. 20+ years, 24×7 support from Bengaluru.';

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const [rows] = await pool.query(
  `SELECT id, slug, title, meta_title, meta_description FROM pages WHERE slug = 'home' LIMIT 1`
);
const row = rows[0];
if (!row) {
  console.error('No home page row');
  process.exit(1);
}
console.log('before', {
  meta_title: row.meta_title,
  meta_description: row.meta_description,
});
console.log(APPLY ? 'APPLYING' : 'DRY-RUN (pass --apply to write)');

if (APPLY) {
  try {
    await pool.query(
      `UPDATE pages SET meta_title = ?, meta_description = ?,
        seo_meta_source = IF(seo_meta_source = 'manual', 'manual', 'fix'),
        seo_dirty = 0
       WHERE slug = 'home'`,
      [TITLE, DESC]
    );
  } catch {
    await pool.query(`UPDATE pages SET meta_title = ?, meta_description = ? WHERE slug = 'home'`, [
      TITLE,
      DESC,
    ]);
  }
  console.log('after', { meta_title: TITLE, meta_description: DESC });
}

await pool.end();
