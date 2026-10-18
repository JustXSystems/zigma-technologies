#!/usr/bin/env node
/**
 * Apply Meridian meta drafts to the CMS database.
 *
 * Usage:
 *   node scripts/meridian-meta-apply.mjs --dry-run
 *   node scripts/meridian-meta-apply.mjs --apply
 *   node scripts/meridian-meta-apply.mjs --apply --file storage/meridian/zigma-prod/meta-drafts.json
 *
 * Safety: only fills EMPTY/short fields; never overwrites a good existing meta_title/description
 * unless --force is passed.
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
  : 'storage/meridian/zigma-prod/meta-drafts.json';

const filePath = resolve(process.cwd(), fileArg);
if (!existsSync(filePath)) {
  console.error(`Draft file not found: ${filePath}\nRun: node scripts/meridian-meta-draft.mjs first`);
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
  const fields = d.fields || {};
  if (!fields.meta_title && !fields.meta_description) {
    skipped++;
    continue;
  }

  if (DRY) {
    results.push({ id: d.id, source: d.source, slug: d.slug, wouldUpdate: fields });
    updated++;
    continue;
  }

  try {
    if (d.source === 'catalog_items') {
      const sets = [];
      const params = [];
      if (fields.meta_title) {
        sets.push(FORCE ? 'meta_title = ?' : 'meta_title = IF(meta_title IS NULL OR CHAR_LENGTH(TRIM(meta_title)) < 15, ?, meta_title)');
        params.push(fields.meta_title);
      }
      if (fields.meta_description) {
        sets.push(
          FORCE
            ? 'meta_description = ?'
            : 'meta_description = IF(meta_description IS NULL OR CHAR_LENGTH(TRIM(meta_description)) < 50, ?, meta_description)'
        );
        params.push(fields.meta_description);
      }
      params.push(d.id);
      const [r] = await pool.query(`UPDATE catalog_items SET ${sets.join(', ')} WHERE id = ?`, params);
      updated += r.affectedRows || 0;
      results.push({ id: d.id, source: d.source, ok: true });
    } else if (d.source === 'pages') {
      const sets = [];
      const params = [];
      if (fields.meta_title) {
        sets.push(FORCE ? 'meta_title = ?' : 'meta_title = IF(meta_title IS NULL OR CHAR_LENGTH(TRIM(meta_title)) < 15, ?, meta_title)');
        params.push(fields.meta_title);
      }
      if (fields.meta_description) {
        sets.push(
          FORCE
            ? 'meta_description = ?'
            : 'meta_description = IF(meta_description IS NULL OR CHAR_LENGTH(TRIM(meta_description)) < 50, ?, meta_description)'
        );
        params.push(fields.meta_description);
      }
      params.push(d.id);
      const [r] = await pool.query(`UPDATE pages SET ${sets.join(', ')} WHERE id = ?`, params);
      updated += r.affectedRows || 0;
      results.push({ id: d.id, source: d.source, ok: true });
    } else if (d.source === 'resource_posts') {
      const sets = [];
      const params = [];
      if (fields.meta_title) {
        sets.push(FORCE ? 'meta_title = ?' : 'meta_title = IF(meta_title IS NULL OR CHAR_LENGTH(TRIM(meta_title)) < 15, ?, meta_title)');
        params.push(fields.meta_title);
      }
      if (fields.meta_description) {
        sets.push(
          FORCE
            ? 'meta_description = ?'
            : 'meta_description = IF(meta_description IS NULL OR CHAR_LENGTH(TRIM(meta_description)) < 50, ?, meta_description)'
        );
        params.push(fields.meta_description);
      }
      params.push(d.id);
      const [r] = await pool.query(`UPDATE resource_posts SET ${sets.join(', ')} WHERE id = ?`, params);
      updated += r.affectedRows || 0;
      results.push({ id: d.id, source: d.source, ok: true });
    } else {
      skipped++;
    }
  } catch (e) {
    results.push({ id: d.id, source: d.source, ok: false, error: String(e.message || e) });
  }
}

await pool.end();

const out = { ok: true, dryRun: DRY, updated, skipped, totalDrafts: drafts.length, results: results.slice(0, 40) };
if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(out));
} else {
  console.log(DRY ? `Dry-run: would touch ${updated} of ${drafts.length} drafts` : `Applied updates affecting ~${updated} rows`);
  console.log(JSON.stringify({ dryRun: DRY, updated, skipped, totalDrafts: drafts.length }, null, 2));
}
