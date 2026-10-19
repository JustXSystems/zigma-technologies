#!/usr/bin/env node
/**
 * Apply LinkedIn sameAs into theme_settings.site on the machine where this runs.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const LINKEDIN =
  process.env.MERIDIAN_SAMEAS_LINKEDIN ||
  'https://www.linkedin.com/company/zigmatechnologiesind';

function loadEnv() {
  if (!existsSync('.env')) return;
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}
loadEnv();

const mysql = require('mysql2/promise');
const c = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const [rows] = await c.query('SELECT value_json FROM theme_settings WHERE setting_key = ? LIMIT 1', ['site']);
if (!rows.length) {
  console.log(JSON.stringify({ ok: false, error: 'no theme_settings.site row' }));
  await c.end();
  process.exit(1);
}

const site = typeof rows[0].value_json === 'string' ? JSON.parse(rows[0].value_json) : { ...rows[0].value_json };
const before = String(site.linkedinUrl || '').trim();
const url = LINKEDIN.replace(/\/$/, '');
let updated = false;
if (before !== url) {
  site.linkedinUrl = url;
  await c.query(
    `INSERT INTO theme_settings (setting_key, value_json) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)`,
    ['site', JSON.stringify(site)]
  );
  updated = true;
}

console.log(
  JSON.stringify(
    {
      ok: true,
      db: process.env.DB_NAME,
      before: before || '(empty)',
      after: url,
      updated,
    },
    null,
    2
  )
);
await c.end();
