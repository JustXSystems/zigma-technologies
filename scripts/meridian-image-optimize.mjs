#!/usr/bin/env node
/**
 * Compress heavy images listed in image-weight.json (sharp).
 * Writes WebP beside original, updates catalog_media.url when path matches.
 *
 *   node scripts/meridian-image-optimize.mjs --apply
 *   node scripts/meridian-image-optimize.mjs --dry-run
 */
import { readFileSync, existsSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, extname, basename, join } from 'node:path';
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
  : 'storage/meridian/zigma-prod/image-weight.json';
const maxKb = Number(process.env.MERIDIAN_IMAGE_MAX_KB || 340);
const filePath = resolve(process.cwd(), fileArg);

if (!existsSync(filePath)) {
  console.error('Missing image-weight.json — run autopilot / meridian:act:images first');
  process.exit(1);
}

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  const out = { ok: false, message: 'sharp not available (install / Next.js dependency)' };
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(out));
  else console.error(out.message);
  process.exit(1);
}

const payload = JSON.parse(readFileSync(filePath, 'utf8'));
const heavy = (payload.heavy || []).filter((h) => (h.kb || 0) >= maxKb || (h.bytes || 0) >= maxKb * 1024);

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const results = [];
let optimized = 0;
let dbUpdated = 0;

for (const h of heavy) {
  let pathname;
  try {
    pathname = new URL(h.src).pathname;
  } catch {
    results.push({ src: h.src, ok: false, error: 'bad url' });
    continue;
  }
  if (!pathname.startsWith('/assets/')) {
    results.push({ src: h.src, ok: false, error: 'not under /assets/' });
    continue;
  }
  const local = resolve(process.cwd(), 'public', pathname.replace(/^\//, ''));
  if (!existsSync(local)) {
    results.push({ src: h.src, ok: false, error: `missing file ${local}` });
    continue;
  }

  const dir = dirname(local);
  const base = basename(local, extname(local));
  const webpPath = join(dir, `${base}.webp`);
  const webpUrl = pathname.replace(/\.[^.]+$/, '.webp');

  if (!APPLY) {
    results.push({ src: h.src, wouldWrite: webpUrl, kb: h.kb });
    optimized++;
    continue;
  }

  try {
    const backup = local + '.meridian-orig';
    if (!existsSync(backup)) copyFileSync(local, backup);
    await sharp(local)
      .rotate()
      .webp({ quality: 78, effort: 4 })
      .toFile(webpPath);
    const after = (await import('node:fs')).statSync(webpPath).size;
    // Also rewrite original to smaller png/jpeg if still needed? Prefer webp URL swap.
    const [r] = await pool.query(`UPDATE catalog_media SET url = ? WHERE url = ?`, [webpUrl, pathname]);
    dbUpdated += r.affectedRows || 0;
    // site-settings / pages may reference path — best-effort
    try {
      await pool.query(
        `UPDATE catalog_items SET og_image_url = ? WHERE og_image_url = ?`,
        [webpUrl, pathname]
      );
      await pool.query(
        `UPDATE catalog_items SET background_image_url = ? WHERE background_image_url = ?`,
        [webpUrl, pathname]
      );
    } catch {
      /* optional columns */
    }
    optimized++;
    results.push({
      src: h.src,
      ok: true,
      webpUrl,
      beforeKb: h.kb,
      afterKb: Math.round(after / 1024),
      dbRows: r.affectedRows || 0,
    });
  } catch (e) {
    results.push({ src: h.src, ok: false, error: String(e.message || e) });
  }
}

await pool.end();

const reportPath = resolve(process.cwd(), dirname(filePath), 'image-optimize-report.json');
mkdirSync(dirname(reportPath), { recursive: true });
const out = {
  ok: true,
  dryRun: !APPLY,
  optimized,
  dbUpdated,
  totalHeavy: heavy.length,
  message: APPLY
    ? `Optimized ${optimized} image(s); updated ${dbUpdated} media row(s)`
    : `Dry-run: would optimize ${optimized} of ${heavy.length}`,
  results,
};
writeFileSync(reportPath, JSON.stringify(out, null, 2), 'utf8');

if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(out));
else console.log(JSON.stringify({ dryRun: out.dryRun, optimized, dbUpdated, totalHeavy: heavy.length }, null, 2));
