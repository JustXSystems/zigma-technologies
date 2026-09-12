#!/usr/bin/env node
/**
 * Export MySQL CMS database (+ media) for UAT/prod transfer.
 *
 * Usage:
 *   node scripts/db-export.mjs
 *   node scripts/db-export.mjs --no-cms-media
 *   node scripts/db-export.mjs --no-uploads
 *   node scripts/db-export.mjs --out storage/exports/my-snapshot
 *
 * Output:
 *   <out>/database.sql
 *   <out>/meta.json
 *   <out>/uploads/          (public/assets/uploads) unless --no-uploads
 *   <out>/cms-media/…       images, svg, video (default ON; use --no-cms-media to skip)
 */

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const text = fs.readFileSync(filePath, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Load .env then .env.local (local wins). Existing process.env wins over both. */
function loadProjectEnv() {
  const merged = {
    ...parseEnvFile(path.join(ROOT, '.env')),
    ...parseEnvFile(path.join(ROOT, '.env.local')),
  };
  for (const [key, val] of Object.entries(merged)) {
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const out = {
    withUploads: true,
    withCmsMedia: true, // CMS library (images/svg/video) — required for backgrounds / MediaPicker
    outDir: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-uploads') out.withUploads = false;
    else if (a === '--with-uploads') out.withUploads = true;
    else if (a === '--with-cms-media') out.withCmsMedia = true;
    else if (a === '--no-cms-media') out.withCmsMedia = false;
    else if (a === '--out') out.outDir = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d, prefix = '') => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) walk(full, rel);
      else out.push(rel.replace(/\\/g, '/'));
    }
  };
  walk(dir);
  return out;
}

/** Collect root-relative /assets/images|svg|video paths referenced in dump rows. */
function collectCmsAssetRefs(connEscapeUnused, tablesData) {
  void connEscapeUnused;
  const refs = new Set();
  const re = /\/(?:zigma-technologies\/)?assets\/(images|svg|video)\/[A-Za-z0-9._-]+/g;
  for (const rows of tablesData) {
    for (const row of rows) {
      for (const v of Object.values(row)) {
        if (typeof v !== 'string') continue;
        let m;
        re.lastIndex = 0;
        while ((m = re.exec(v))) {
          const cleaned = m[0].replace(/^\/zigma-technologies/, '');
          refs.add(cleaned);
        }
      }
    }
  }
  return [...refs].sort();
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function copyDirIfExists(src, dest) {
  if (!fs.existsSync(src)) return { copied: false, files: 0 };
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
  let files = 0;
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else files += 1;
    }
  };
  walk(dest);
  return { copied: true, files };
}

async function main() {
  loadProjectEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Export Zigma CMS database for UAT/prod.

Usage:
  node scripts/db-export.mjs [--out DIR] [--no-uploads] [--no-cms-media]

Defaults: includes public/assets/uploads AND cms-media (images/svg/video).
Use --no-cms-media only for SQL-only dumps (background images will break on import).

Reads DB_* from environment / .env / .env.local
`);
    process.exit(0);
  }

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zigma_technologies',
  };

  const outDir =
    args.outDir ||
    path.join(ROOT, 'storage', 'exports', `zigma-${stamp()}`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Connecting to ${config.user}@${config.host}:${config.port}/${config.database} …`);
  const conn = await mysql.createConnection({
    ...config,
    multipleStatements: false,
    dateStrings: true,
  });

  try {
    const [tableRows] = await conn.query(
      `SELECT TABLE_NAME AS name
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [config.database]
    );
    const tables = tableRows.map((r) => r.name);
    if (!tables.length) {
      throw new Error(`No tables found in database "${config.database}". Apply scripts/schema.sql first.`);
    }

    const lines = [];
    lines.push(`-- Zigma Technologies CMS dump`);
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push(`-- Database: ${config.database}`);
    lines.push(`-- Tables: ${tables.length}`);
    lines.push(`SET NAMES utf8mb4;`);
    lines.push(`SET FOREIGN_KEY_CHECKS=0;`);
    lines.push(`SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';`);
    lines.push('');

    const rowCounts = {};
    /** @type {Record<string, object[]>} */
    const tableRowsCache = {};

    for (const table of tables) {
      const [createRows] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
      const createSql = createRows[0]['Create Table'];
      lines.push(`-- ----------------------------`);
      lines.push(`-- Table \`${table}\``);
      lines.push(`-- ----------------------------`);
      lines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
      lines.push(`${createSql};`);
      lines.push('');

      const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
      rowCounts[table] = rows.length;
      tableRowsCache[table] = rows;
      if (!rows.length) {
        lines.push(`-- (empty)`);
        lines.push('');
        continue;
      }

      const cols = Object.keys(rows[0]);
      const colList = cols.map((c) => `\`${c}\``).join(', ');
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const values = chunk
          .map((row) => {
            const parts = cols.map((c) => {
              const v = row[c];
              if (v === null || v === undefined) return 'NULL';
              if (Buffer.isBuffer(v)) return conn.escape(v);
              if (typeof v === 'object') return conn.escape(JSON.stringify(v));
              return conn.escape(v);
            });
            return `(${parts.join(', ')})`;
          })
          .join(',\n');
        lines.push(`INSERT INTO \`${table}\` (${colList}) VALUES\n${values};`);
      }
      lines.push('');
      console.log(`  ✓ ${table} (${rows.length} rows)`);
    }

    lines.push(`SET FOREIGN_KEY_CHECKS=1;`);
    lines.push('');

    const sqlPath = path.join(outDir, 'database.sql');
    fs.writeFileSync(sqlPath, lines.join('\n'), 'utf8');
    const sqlBytes = fs.statSync(sqlPath).size;

    let uploadsMeta = { copied: false, files: 0 };
    if (args.withUploads) {
      uploadsMeta = copyDirIfExists(
        path.join(ROOT, 'public', 'assets', 'uploads'),
        path.join(outDir, 'uploads')
      );
      console.log(
        uploadsMeta.copied
          ? `  ✓ uploads (${uploadsMeta.files} files)`
          : '  · uploads folder empty/missing (skipped)'
      );
    }

    let cmsMediaMeta = { images: 0, svg: 0, video: 0 };
    const cmsMediaFiles = [];
    if (args.withCmsMedia) {
      for (const cat of ['images', 'svg', 'video']) {
        const r = copyDirIfExists(
          path.join(ROOT, 'public', 'assets', cat),
          path.join(outDir, 'cms-media', cat)
        );
        cmsMediaMeta[cat] = r.files;
        if (r.copied) {
          console.log(`  ✓ cms-media/${cat} (${r.files} files)`);
          for (const rel of listFilesRecursive(path.join(outDir, 'cms-media', cat))) {
            cmsMediaFiles.push(`/assets/${cat}/${rel}`);
          }
        }
      }
    } else {
      console.log('  · cms-media skipped (--no-cms-media) — catalog backgrounds may break on import');
    }

    const referenced = collectCmsAssetRefs(null, Object.values(tableRowsCache));
    const missingOnDisk = [];
    const missingInExport = [];
    for (const ref of referenced) {
      const disk = path.join(ROOT, 'public', ref.replace(/^\//, ''));
      if (!fs.existsSync(disk)) missingOnDisk.push(ref);
      else if (args.withCmsMedia && !cmsMediaFiles.includes(ref)) missingInExport.push(ref);
    }
    if (missingOnDisk.length) {
      console.warn(`\nWARNING: ${missingOnDisk.length} asset path(s) in DB but missing on disk:`);
      missingOnDisk.slice(0, 20).forEach((p) => console.warn(`  - ${p}`));
    }
    if (args.withCmsMedia && missingInExport.length) {
      console.warn(`\nWARNING: ${missingInExport.length} referenced asset(s) not copied into export (unexpected):`);
      missingInExport.slice(0, 20).forEach((p) => console.warn(`  - ${p}`));
    }

    const catalogItems = tableRowsCache.catalog_items || [];
    const hasBgColumn =
      catalogItems.length === 0
        ? tables.includes('catalog_items')
        : Object.prototype.hasOwnProperty.call(catalogItems[0] || {}, 'background_image_url');
    let backgroundImageCount = 0;
    const backgroundSamples = [];
    for (const row of catalogItems) {
      const v = row?.background_image_url;
      if (v != null && String(v).trim()) {
        backgroundImageCount += 1;
        if (backgroundSamples.length < 5) {
          backgroundSamples.push({ id: row.id, slug: row.slug, background_image_url: String(v) });
        }
      }
    }
    if (!hasBgColumn) {
      console.warn(
        '\nWARNING: catalog_items has no background_image_url column in THIS database. Run scripts/migrate-catalog-background.sql locally before export.'
      );
    } else if (backgroundImageCount === 0) {
      console.warn(
        '\nWARNING: All catalog_items.background_image_url values are NULL in this export.\n' +
          '  PreProd/Prod gallery backgrounds will stay blank after db:push until you set them in admin (or export from a DB that has values).'
      );
    } else {
      console.log(`  ✓ gallery backgrounds in dump: ${backgroundImageCount} item(s)`);
    }

    const meta = {
      app: 'zigma-technologies',
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      database: config.database,
      host: config.host,
      tables,
      rowCounts,
      sqlFile: 'database.sql',
      sqlBytes,
      includesUploads: Boolean(args.withUploads && uploadsMeta.copied),
      uploadFiles: uploadsMeta.files,
      includesCmsMedia: Boolean(args.withCmsMedia),
      cmsMedia: cmsMediaMeta,
      cmsMediaFiles,
      referencedCmsAssets: referenced,
      missingOnDisk,
      hasBackgroundImageColumn: hasBgColumn,
      backgroundImageCount,
      backgroundSamples,
    };
    fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));

    console.log(`\nExport complete → ${outDir}`);
    console.log(`  database.sql  (${(sqlBytes / 1024).toFixed(1)} KB)`);
    console.log(`  tables: ${tables.length} | catalog_items: ${rowCounts.catalog_items ?? 0}`);
    console.log(`  cms-media files: ${cmsMediaFiles.length} | backgrounds set: ${backgroundImageCount}`);
    console.log(`  meta.json`);
    if (args.withUploads) console.log(`  uploads/ (${uploadsMeta.files} files)`);
    if (args.withCmsMedia) console.log(`  cms-media/ (images/svg/video)`);
    console.log(`  cms-media     ${args.withCmsMedia ? `${cmsMediaFiles.length} files` : 'skipped'}`);
    console.log(`  DB refs       ${referenced.length} /assets/{images,svg,video}/… paths`);
    console.log(`\nCopy the whole export folder to the target VPS (storage/exports/ is gitignored), then:`);
    console.log(`  npm run db:import -- "${path.relative(ROOT, outDir).replace(/\\/g, '/')}" --force`);
    console.log(`  pm2 restart <zigma|zigma-preprod> --update-env`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\nExport failed:', err.message || err);
  process.exit(1);
});
