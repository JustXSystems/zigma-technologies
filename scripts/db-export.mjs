#!/usr/bin/env node
/**
 * Export MySQL CMS database (+ optional media) for UAT/prod transfer.
 *
 * Usage:
 *   node scripts/db-export.mjs
 *   node scripts/db-export.mjs --with-cms-media
 *   node scripts/db-export.mjs --no-uploads
 *   node scripts/db-export.mjs --out storage/exports/my-snapshot
 *
 * Output:
 *   <out>/database.sql
 *   <out>/meta.json
 *   <out>/uploads/          (public/assets/uploads) unless --no-uploads
 *   <out>/cms-media/…       if --with-cms-media (images, svg, video)
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
    withCmsMedia: false,
    outDir: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-uploads') out.withUploads = false;
    else if (a === '--with-uploads') out.withUploads = true;
    else if (a === '--with-cms-media') out.withCmsMedia = true;
    else if (a === '--out') out.outDir = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
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
  node scripts/db-export.mjs [--out DIR] [--no-uploads] [--with-cms-media]

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
    if (args.withCmsMedia) {
      for (const cat of ['images', 'svg', 'video']) {
        const r = copyDirIfExists(
          path.join(ROOT, 'public', 'assets', cat),
          path.join(outDir, 'cms-media', cat)
        );
        cmsMediaMeta[cat] = r.files;
        if (r.copied) console.log(`  ✓ cms-media/${cat} (${r.files} files)`);
      }
    }

    const meta = {
      app: 'zigma-technologies',
      formatVersion: 1,
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
    };
    fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));

    console.log(`\nExport complete → ${outDir}`);
    console.log(`  database.sql  (${(sqlBytes / 1024).toFixed(1)} KB)`);
    console.log(`\nImport on target:`);
    console.log(`  npm run db:import -- "${path.relative(ROOT, outDir)}" --force`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\nExport failed:', err.message || err);
  process.exit(1);
});
