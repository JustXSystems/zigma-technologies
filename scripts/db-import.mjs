#!/usr/bin/env node
/**
 * Import a snapshot created by scripts/db-export.mjs into the configured DB.
 *
 * Usage:
 *   node scripts/db-import.mjs storage/exports/zigma-YYYYMMDD-HHMMSS --force
 *   node scripts/db-import.mjs path/to/database.sql --force
 *   node scripts/db-import.mjs storage/exports/... --force --skip-media
 *
 * WARNING: replaces tables in the target database (DROP + CREATE from dump).
 */

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import readline from 'readline';

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
    target: null,
    force: false,
    skipMedia: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') out.force = true;
    else if (a === '--skip-media') out.skipMedia = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (!a.startsWith('-') && !out.target) out.target = a;
  }
  return out;
}

function resolveSnapshot(target) {
  const abs = path.isAbsolute(target) ? target : path.join(ROOT, target);
  if (!fs.existsSync(abs)) {
    throw new Error(`Path not found: ${abs}`);
  }
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    if (!abs.endsWith('.sql')) throw new Error('File import expects a .sql dump');
    return { dir: path.dirname(abs), sqlPath: abs, meta: null };
  }
  const sqlPath = path.join(abs, 'database.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`No database.sql in ${abs}`);
  }
  const metaPath = path.join(abs, 'meta.json');
  const meta = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    : null;
  return { dir: abs, sqlPath, meta };
}

function askYesNo(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(String(answer).trim()));
    });
  });
}

function copyDirIfExists(src, dest) {
  if (!fs.existsSync(src)) return 0;
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
  walk(src);
  return files;
}

async function main() {
  loadProjectEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.target) {
    console.log(`Import Zigma CMS snapshot into the configured database.

Usage:
  node scripts/db-import.mjs <export-dir|database.sql> --force [--skip-media]

Requires --force (or interactive yes) because existing tables are replaced.
Target DB comes from DB_* in .env / .env.local / environment.
`);
    process.exit(args.help ? 0 : 1);
  }

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zigma_technologies',
  };

  const snap = resolveSnapshot(args.target);
  const sqlBytes = fs.statSync(snap.sqlPath).size;

  console.log(`Target: ${config.user}@${config.host}:${config.port}/${config.database}`);
  console.log(`Source: ${snap.sqlPath} (${(sqlBytes / 1024).toFixed(1)} KB)`);
  if (snap.meta?.exportedAt) console.log(`Exported: ${snap.meta.exportedAt}`);

  if (!args.force) {
    const ok = await askYesNo(
      `\nThis REPLACES data in "${config.database}". Type yes to continue: `
    );
    if (!ok) {
      console.log('Aborted.');
      process.exit(1);
    }
  }

  console.log('Connecting…');
  const bootstrap = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
  });

  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await bootstrap.end();
  }

  const conn = await mysql.createConnection({
    ...config,
    multipleStatements: true,
    dateStrings: true,
    // Large CMS dumps with JSON / MEDIUMTEXT
    maxAllowedPacket: 64 * 1024 * 1024,
  });

  try {
    const sql = fs.readFileSync(snap.sqlPath, 'utf8');
    console.log('Importing SQL…');
    await conn.query(sql);
    console.log('  ✓ database restored');
  } finally {
    await conn.end();
  }

  if (!args.skipMedia) {
    const uploadsSrc = path.join(snap.dir, 'uploads');
    if (fs.existsSync(uploadsSrc)) {
      const n = copyDirIfExists(uploadsSrc, path.join(ROOT, 'public', 'assets', 'uploads'));
      console.log(`  ✓ uploads restored (${n} files)`);
    } else {
      console.log('  · no uploads/ in snapshot');
    }

    const cmsRoot = path.join(snap.dir, 'cms-media');
    let cmsTotal = 0;
    if (fs.existsSync(cmsRoot)) {
      for (const cat of ['images', 'svg', 'video']) {
        const src = path.join(cmsRoot, cat);
        if (!fs.existsSync(src)) continue;
        const n = copyDirIfExists(src, path.join(ROOT, 'public', 'assets', cat));
        cmsTotal += n;
        console.log(`  ✓ cms-media/${cat} restored (${n} files)`);
      }
    } else {
      console.warn(
        '  ! no cms-media/ in snapshot — catalog backgrounds / Media library images will 404 until you re-export with cms-media (default) and re-import'
      );
    }

    const expected = Array.isArray(snap.meta?.cmsMediaFiles) ? snap.meta.cmsMediaFiles : [];
    const missing = [];
    for (const rel of expected) {
      const disk = path.join(ROOT, 'public', String(rel).replace(/^\//, ''));
      if (!fs.existsSync(disk)) missing.push(rel);
    }
    if (expected.length) {
      console.log(`  ✓ verified ${expected.length - missing.length}/${expected.length} cms media files on disk`);
    }
    if (missing.length) {
      console.warn(`  ! missing after import (${missing.length}):`);
      missing.slice(0, 15).forEach((p) => console.warn(`    - ${p}`));
    }
    if (!cmsTotal && !expected.length && snap.meta && snap.meta.includesCmsMedia === false) {
      console.warn('  ! Export was created with --no-cms-media (or old exporter). Re-export without that flag.');
    }
  } else {
    console.log('  · media copy skipped (--skip-media)');
  }

  // Ensure empty CMS dirs exist for future uploads
  for (const cat of ['images', 'svg', 'video']) {
    fs.mkdirSync(path.join(ROOT, 'public', 'assets', cat), { recursive: true });
  }
  fs.mkdirSync(path.join(ROOT, 'public', 'assets', 'uploads', 'resumes'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'public', 'assets', 'uploads', 'documents'), { recursive: true });

  console.log('\nImport complete.');
  console.log('Next: npm run build && pm2 restart <zigma|zigma-preprod> --update-env');
  console.log('Admin MediaPicker previews need the disk-backed /assets rewrite (deploy latest master).');
}

main().catch((err) => {
  console.error('\nImport failed:', err.message || err);
  process.exit(1);
});
