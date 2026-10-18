#!/usr/bin/env node
/**
 * Apply Meridian alt drafts to catalog_media (empty/short only unless --force).
 *
 *   node scripts/meridian-alt-apply.mjs --dry-run
 *   node scripts/meridian-alt-apply.mjs --apply
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

const APPLY = process.argv.includes('--apply');
const DRY = process.argv.includes('--dry-run') || !APPLY;
const FORCE = process.argv.includes('--force');
const fileArg = process.argv.includes('--file')
  ? process.argv[process.argv.indexOf('--file') + 1]
  : 'storage/meridian/zigma-prod/alt-drafts.json';

const filePath = resolve(process.cwd(), fileArg);
if (!existsSync(filePath)) {
  console.error(`Draft file not found: ${filePath}\nRun: node scripts/meridian-alt-draft.mjs first`);
  process.exit(1);
}

const payload = JSON.parse(readFileSync(filePath, 'utf8'));
const drafts = Array.isArray(payload.drafts) ? payload.drafts : [];

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

let updated = 0;
let skipped = 0;
const results = [];

for (const d of drafts) {
  const alt = d.fields?.alt;
  if (!alt) {
    skipped++;
    continue;
  }
  if (DRY) {
    results.push({ id: d.id, wouldUpdate: alt });
    updated++;
    continue;
  }
  try {
    const sql = FORCE
      ? 'UPDATE catalog_media SET alt = ? WHERE id = ?'
      : 'UPDATE catalog_media SET alt = ? WHERE id = ? AND (alt IS NULL OR CHAR_LENGTH(TRIM(alt)) < 8)';
    const [r] = await pool.query(sql, [alt.slice(0, 255), d.id]);
    updated += r.affectedRows || 0;
    results.push({ id: d.id, ok: true });
  } catch (e) {
    results.push({ id: d.id, ok: false, error: String(e.message || e) });
  }
}

await pool.end();

const out = { ok: true, dryRun: DRY, updated, skipped, totalDrafts: drafts.length, results: results.slice(0, 40) };
if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(out));
} else {
  console.log(DRY ? `Dry-run: would touch ${updated} of ${drafts.length}` : `Applied alt to ~${updated} media rows`);
  console.log(JSON.stringify({ dryRun: DRY, updated, skipped, totalDrafts: drafts.length }, null, 2));
}
