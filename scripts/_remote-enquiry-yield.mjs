#!/usr/bin/env node
/**
 * Phase 26 — enquiry yield from Production DB (28d + 7d + open pipeline).
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

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

const [rows28] = await c.query(
  `SELECT COUNT(*) AS n FROM enquiries WHERE created_at >= (UTC_TIMESTAMP() - INTERVAL 28 DAY)`
);
const [rows7] = await c.query(
  `SELECT COUNT(*) AS n FROM enquiries WHERE created_at >= (UTC_TIMESTAMP() - INTERVAL 7 DAY)`
);
const [open] = await c.query(
  `SELECT COUNT(*) AS n FROM enquiries WHERE status IN ('new','in_progress')`
);
const [byStatus] = await c.query(
  `SELECT status, COUNT(*) AS n FROM enquiries
   WHERE created_at >= (UTC_TIMESTAMP() - INTERVAL 28 DAY)
   GROUP BY status`
);
const [latest] = await c.query(
  `SELECT id, status, created_at FROM enquiries ORDER BY created_at DESC LIMIT 5`
);

await c.end();

const enquiries28 = Number(rows28[0]?.n || 0);
const enquiries7 = Number(rows7[0]?.n || 0);
const openPipeline = Number(open[0]?.n || 0);

console.log(
  JSON.stringify(
    {
      ok: true,
      db: process.env.DB_NAME,
      window: '28d',
      enquiries28,
      enquiries7,
      openPipeline,
      byStatus: (byStatus || []).map((r) => ({ status: r.status, n: Number(r.n) })),
      latest: (latest || []).map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
      })),
      message: `Enquiries 28d=${enquiries28} · 7d=${enquiries7} · open=${openPipeline}`,
    },
    null,
    2
  )
);
