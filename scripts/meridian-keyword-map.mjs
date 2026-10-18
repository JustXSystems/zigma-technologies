#!/usr/bin/env node
/**
 * Seed Phase 7 keyword map from published catalog + pages.
 *   node scripts/meridian-keyword-map.mjs --json --out storage/meridian/zigma-prod/keyword-map.json
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

loadEnv();

const outArg = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'storage/meridian/zigma-prod/keyword-map.json';

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const rows = [];

try {
  const [catalog] = await pool.query(
    `SELECT item_type, slug, title, meta_title, summary
     FROM catalog_items
     WHERE enabled = 1 AND (status IS NULL OR status IN ('published','live'))
     LIMIT 300`
  );
  for (const c of catalog) {
    const path = `/${c.item_type}s/${c.slug}`;
    const seed = plain(c.meta_title || c.title);
    rows.push({
      intent: seed,
      type: c.item_type,
      path,
      priority: c.item_type === 'service' ? 'high' : c.item_type === 'project' ? 'medium' : 'medium',
      cluster: c.item_type,
      notes: plain(c.summary).slice(0, 120),
    });
  }
} catch (e) {
  console.error(e.message || e);
}

try {
  const [pages] = await pool.query(`SELECT slug, title, meta_title FROM pages LIMIT 100`);
  for (const p of pages) {
    if (!p.slug || p.slug === 'home') continue;
    rows.push({
      intent: plain(p.meta_title || p.title || p.slug),
      type: 'page',
      path: `/${p.slug}`,
      priority: /contact|about|industries/i.test(p.slug) ? 'high' : 'low',
      cluster: 'page',
      notes: '',
    });
  }
} catch {
  /* optional */
}

await pool.end();

// Deduplicate by path
const seen = new Set();
const unique = [];
for (const r of rows) {
  if (seen.has(r.path)) continue;
  seen.add(r.path);
  unique.push(r);
}

const payload = {
  generatedAt: new Date().toISOString(),
  count: unique.length,
  source: 'CMS catalog_items + pages',
  rows: unique,
};

const outPath = resolve(process.cwd(), outArg);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

const mdPath = outPath.replace(/\.json$/, '.md');
writeFileSync(
  mdPath,
  [
    '# Keyword map (auto-seeded)',
    '',
    `Generated: ${payload.generatedAt} · ${unique.length} rows`,
    '',
    '| Priority | Intent | Path | Cluster |',
    '| --- | --- | --- | --- |',
    ...unique
      .slice()
      .sort((a, b) => (a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0))
      .map((r) => `| ${r.priority} | ${r.intent.replace(/\|/g, '/')} | ${r.path} | ${r.cluster} |`),
    '',
  ].join('\n'),
  'utf8'
);

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ ok: true, count: unique.length, outPath, mdPath }));
} else {
  console.log(`Wrote ${unique.length} → ${outPath}`);
}
