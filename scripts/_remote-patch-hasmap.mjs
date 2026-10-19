#!/usr/bin/env node
/**
 * Phase 24 — seal Production hasMap without next build.
 * Prod already ships OrganizationJsonLd hasMap logic; stale Full Route Cache often hides it.
 * Steps: seed mapsUrl in DB → clear .next/cache → optional PM2 restart left to caller.
 */
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);

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
const beforeMaps = String(site.mapsUrl || '').trim();
const company = String(site.companyName || 'Zigma Technologies').trim();
const street = [site.addressLine1, site.addressLine2].filter(Boolean).join(', ');
const locality = String(site.addressLocality || 'Bengaluru').trim();
const region = String(site.addressRegion || 'Karnataka').trim();
const postal = String(site.addressPostal || '').trim();
const query = [company, street, locality, region, postal, 'India'].filter(Boolean).join(', ');
const mapsUrl =
  beforeMaps ||
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

let dbUpdated = false;
const patch = { ...site };
if (!beforeMaps) {
  patch.mapsUrl = mapsUrl;
  dbUpdated = true;
}
if (!String(patch.geoLat || '').trim()) {
  patch.geoLat = '12.9716';
  dbUpdated = true;
}
if (!String(patch.geoLng || '').trim()) {
  patch.geoLng = '77.5946';
  dbUpdated = true;
}
if (dbUpdated) {
  await c.query(
    `INSERT INTO theme_settings (setting_key, value_json) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)`,
    ['site', JSON.stringify(patch)]
  );
}
await c.end();

// Only clear fetch-cache — never wipe .next root (that removes BUILD_ID and takes Production down).
const fetchCache = join(process.cwd(), '.next/cache/fetch-cache');
let cacheCleared = false;
if (existsSync(fetchCache)) {
  try {
    rmSync(fetchCache, { recursive: true, force: true });
    cacheCleared = true;
  } catch {
    cacheCleared = false;
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      db: process.env.DB_NAME,
      beforeMaps: beforeMaps || '(empty)',
      mapsUrl,
      dbUpdated,
      cacheCleared,
      companyName: company || '(empty)',
    },
    null,
    2
  )
);
