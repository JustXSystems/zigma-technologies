#!/usr/bin/env node
/**
 * Append a Meridian-managed related-hub footer to orphan catalog item descriptions
 * (only if not already present). Safe, idempotent.
 *
 *   node scripts/meridian-orphan-apply.mjs --apply --file storage/meridian/zigma-prod/orphan-prescriptions.json
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
const fileArg = process.argv.includes('--file')
  ? process.argv[process.argv.indexOf('--file') + 1]
  : 'storage/meridian/zigma-prod/orphan-prescriptions.json';
const filePath = resolve(process.cwd(), fileArg);
if (!existsSync(filePath)) {
  console.error('Missing prescriptions file');
  process.exit(1);
}

const payload = JSON.parse(readFileSync(filePath, 'utf8'));
const prescriptions = (payload.prescriptions || []).filter((p) => p.applyable);

const MARKER = '<!-- meridian-orphan-hub -->';

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

for (const p of prescriptions) {
  let pathname;
  try {
    pathname = new URL(p.orphan).pathname;
  } catch {
    skipped++;
    continue;
  }
  const parts = pathname.split('/').filter(Boolean);
  // /projects/slug
  if (parts.length < 2) {
    skipped++;
    continue;
  }
  const typeSeg = parts[0];
  const slug = parts[1];
  const itemType = typeSeg.replace(/s$/, ''); // projects → project
  if (!['project', 'product', 'service'].includes(itemType)) {
    skipped++;
    continue;
  }

  const hubPath = new URL(p.hub).pathname || '/';
  const footer = `${MARKER}\n<p class="meridian-related"><strong>Related:</strong> <a href="${hubPath}">${p.hubLabel}</a> at Zigma Technologies.</p>`;

  const [rows] = await pool.query(
    `SELECT id, description FROM catalog_items WHERE item_type = ? AND slug = ? LIMIT 1`,
    [itemType, slug]
  );
  const row = rows[0];
  if (!row) {
    results.push({ slug, ok: false, error: 'not found' });
    skipped++;
    continue;
  }
  const desc = String(row.description || '');
  if (desc.includes(MARKER) || desc.includes(`href="${hubPath}"`)) {
    skipped++;
    results.push({ slug, ok: true, skipped: true });
    continue;
  }
  if (!APPLY) {
    updated++;
    results.push({ slug, wouldUpdate: true });
    continue;
  }
  const next = (desc.trim() ? desc.trim() + '\n\n' : '') + footer;
  await pool.query(`UPDATE catalog_items SET description = ? WHERE id = ?`, [next, row.id]);
  updated++;
  results.push({ slug, ok: true });
}

await pool.end();

const out = {
  ok: true,
  dryRun: !APPLY,
  updated,
  skipped,
  total: prescriptions.length,
  message: APPLY ? `Appended hub footers to ${updated} catalog orphan(s)` : `Dry-run: would update ${updated}`,
  results: results.slice(0, 40),
};
if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(out));
else console.log(JSON.stringify(out, null, 2));
