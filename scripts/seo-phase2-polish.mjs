#!/usr/bin/env node
/**
 * Phase 2 Site Settings polish (SEO-GUIDE):
 * - Replace long keyword-list defaultMetaDescription with a 120–160 char sentence
 * - Clear legacy square-logo ogImage so /og.png is used
 *
 * Usage (on VPS or locally with DB_* in .env):
 *   node scripts/seo-phase2-polish.mjs
 *   node scripts/seo-phase2-polish.mjs --dry-run
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';

const DRY = process.argv.includes('--dry-run');
const GOOD_DESC =
  'Solar EPC, UPS, BESS and EV charging for industries, hospitals and campuses across India. 20+ years, 24×7 support.';
const LEGACY_LOGO = '/assets/images/zigma-technologies-logo.png';

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

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const [rows] = await pool.query('SELECT value_json FROM theme_settings WHERE setting_key = ? LIMIT 1', ['site']);
if (!rows.length) {
  console.error('No theme_settings.site row found');
  await pool.end();
  process.exit(1);
}

const site = typeof rows[0].value_json === 'string' ? JSON.parse(rows[0].value_json) : rows[0].value_json;
const before = {
  defaultMetaDescription: site.defaultMetaDescription,
  ogImage: site.ogImage,
};

site.defaultMetaDescription = GOOD_DESC;
if (!site.ogImage || site.ogImage === LEGACY_LOGO || /logo\.png/i.test(String(site.ogImage))) {
  site.ogImage = '/og.png';
}

console.log('Before:', before);
console.log('After:', {
  defaultMetaDescription: site.defaultMetaDescription,
  ogImage: site.ogImage,
  descLen: String(site.defaultMetaDescription).length,
});

if (DRY) {
  console.log('Dry run — no write');
} else {
  await pool.query(
    `INSERT INTO theme_settings (setting_key, value_json) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)`,
    ['site', JSON.stringify(site)]
  );
  console.log('Updated theme_settings.site');
}

await pool.end();
