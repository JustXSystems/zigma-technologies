#!/usr/bin/env node
/**
 * Seed a minimal FAQ block into thin orphan catalog descriptions (idempotent).
 * Uses content-briefs.json when present.
 *
 *   node scripts/meridian-content-seed.mjs --apply
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
const MARKER = '<!-- meridian-content-seed -->';
const briefsPath = process.argv.includes('--file')
  ? process.argv[process.argv.indexOf('--file') + 1]
  : 'storage/meridian/zigma-prod/content-briefs.json';
const filePath = resolve(process.cwd(), briefsPath);

if (!existsSync(filePath)) {
  const out = { ok: true, updated: 0, message: 'No content-briefs.json yet' };
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(out));
  else console.log(out.message);
  process.exit(0);
}

const briefs = JSON.parse(readFileSync(filePath, 'utf8')).briefs || [];
const catalogBriefs = briefs.filter((b) => /^\/(projects|products|services)\//.test(b.pathname || ''));

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

for (const b of catalogBriefs) {
  const parts = String(b.pathname || '')
    .split('/')
    .filter(Boolean);
  if (parts.length < 2) {
    skipped++;
    continue;
  }
  const itemType = parts[0].replace(/s$/, '');
  const slug = parts[1];
  const title = b.brief?.workingTitle || slug;
  const faq = `${MARKER}
<section class="meridian-faq">
<h2>Frequently asked questions</h2>
<details><summary>Who is ${title} for?</summary><p>${b.brief?.audience || 'Industrial and commercial buyers evaluating power solutions in India.'}</p></details>
<details><summary>What does Zigma deliver?</summary><p>Scoped engineering, supply, installation and AMC support tailored to the site — see related projects and enquire for a survey.</p></details>
<details><summary>How do we start?</summary><p><a href="/contact">Contact Zigma Technologies</a> with your load profile and location for a quote.</p></details>
</section>`;

  const [rows] = await pool.query(
    `SELECT id, description FROM catalog_items WHERE item_type = ? AND slug = ? LIMIT 1`,
    [itemType, slug]
  );
  const row = rows[0];
  if (!row) {
    skipped++;
    continue;
  }
  const desc = String(row.description || '');
  if (desc.includes(MARKER)) {
    skipped++;
    results.push({ slug, skipped: true });
    continue;
  }
  // Only seed if thin-ish
  const words = desc.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  if (words > 450 && !b.codes?.includes('THIN_CONTENT')) {
    skipped++;
    continue;
  }
  if (!APPLY) {
    updated++;
    results.push({ slug, wouldUpdate: true, words });
    continue;
  }
  const next = (desc.trim() ? desc.trim() + '\n\n' : '') + faq;
  await pool.query(`UPDATE catalog_items SET description = ? WHERE id = ?`, [next, row.id]);
  updated++;
  results.push({ slug, ok: true, words });
}

await pool.end();

const out = {
  ok: true,
  dryRun: !APPLY,
  updated,
  skipped,
  total: catalogBriefs.length,
  message: APPLY ? `Seeded FAQ blocks on ${updated} thin catalog page(s)` : `Dry-run: would seed ${updated}`,
  results: results.slice(0, 40),
};
if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(out));
else console.log(JSON.stringify({ dryRun: out.dryRun, updated, skipped }, null, 2));
