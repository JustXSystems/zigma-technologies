#!/usr/bin/env node
/**
 * List top resource posts for quarterly guide refresh briefs.
 * Usage: node scripts/meridian-guide-refresh.mjs --json [--limit 5]
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

const json = process.argv.includes('--json');
const limIdx = process.argv.indexOf('--limit');
const limit = limIdx >= 0 ? Number(process.argv[limIdx + 1] || 5) : 5;

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  const [rows] = await pool.query(
    `SELECT slug, title, updated_at AS updatedAt, published_at AS publishedAt
     FROM resource_posts
     WHERE (status = 'published' OR status = 1 OR status IS NULL OR status = 'live')
     ORDER BY COALESCE(updated_at, published_at, created_at) ASC
     LIMIT ?`,
    [limit]
  );
  const guides = (rows || []).map((r) => ({
    slug: r.slug,
    title: r.title,
    path: `/resources/${r.slug}`,
    updatedAt: r.updatedAt || r.publishedAt || null,
    source: 'resource_posts',
  }));
  const out = { ok: true, count: guides.length, guides };
  if (json) console.log(JSON.stringify(out));
  else console.log(guides.map((g) => `${g.slug}\t${g.title}`).join('\n'));
} catch (e) {
  if (json) console.log(JSON.stringify({ ok: false, error: String(e.message || e), guides: [] }));
  else console.error(e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
