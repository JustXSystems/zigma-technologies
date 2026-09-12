#!/usr/bin/env node
/**
 * Push a local db:export snapshot to a remote VPS, then import + restart PM2.
 *
 * db:export / db:import only touch the *local* filesystem. Getting the folder
 * from your laptop to the VPS requires transport — this script wraps scp + ssh.
 * (storage/exports/ is gitignored on purpose — never rely on git push for dumps.)
 *
 * Usage (PowerShell / bash):
 *   node scripts/db-push-remote.mjs --target preprod --export
 *   node scripts/db-push-remote.mjs --target preprod --dir storage/exports/zigma-YYYYMMDD-HHMMSS
 *   node scripts/db-push-remote.mjs --target prod --export --key %USERPROFILE%\Downloads\gha_zigma_prod
 *
 * Env overrides: DB_PUSH_SSH_KEY, DB_PUSH_HOST, DB_PUSH_USER
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TARGETS = {
  preprod: {
    host: '193.203.161.219',
    user: 'deploy',
    appDir: '/var/www/zigma-technologies',
    pm2: 'zigma-preprod',
    defaultKey: path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'gha_zigma_preprod'),
  },
  prod: {
    host: '200.234.45.106',
    user: 'deploy',
    appDir: '/var/www/zigma-technologies',
    pm2: 'zigma',
    defaultKey: path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'gha_zigma_prod'),
  },
};

function parseArgs(argv) {
  const out = {
    target: null,
    dir: null,
    doExport: false,
    key: process.env.DB_PUSH_SSH_KEY || null,
    help: false,
    skipImport: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--target') out.target = argv[++i];
    else if (a === '--dir') out.dir = argv[++i];
    else if (a === '--export') out.doExport = true;
    else if (a === '--key') out.key = argv[++i];
    else if (a === '--skip-import') out.skipImport = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function run(cmd, args, opts = {}) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  if (r.status !== 0) {
    throw new Error(`Command failed (${r.status}): ${cmd}`);
  }
}

function latestExportDir() {
  const root = path.join(ROOT, 'storage', 'exports');
  if (!fs.existsSync(root)) return null;
  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('zigma-'))
    .map((d) => ({
      name: d.name,
      mtime: fs.statSync(path.join(root, d.name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
  return dirs[0] ? path.join(root, dirs[0].name) : null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.target) {
    console.log(`Push CMS DB+media snapshot to a VPS.

Usage:
  npm run db:push -- --target preprod --export
  npm run db:push -- --target preprod --dir storage/exports/zigma-...
  npm run db:push -- --target prod --export --key path\\to\\gha_zigma_prod

Targets: preprod (JustXSystems 193.203.161.219) | prod (Zigma 200.234.45.106)
`);
    process.exit(args.help ? 0 : 1);
  }

  const preset = TARGETS[args.target];
  if (!preset) throw new Error(`Unknown --target ${args.target} (use preprod|prod)`);

  const host = process.env.DB_PUSH_HOST || preset.host;
  const user = process.env.DB_PUSH_USER || preset.user;
  const key = args.key || preset.defaultKey;
  if (!key || !fs.existsSync(key)) {
    throw new Error(`SSH key not found: ${key || '(empty)'}. Pass --key path\\to\\private_key`);
  }

  if (args.doExport) {
    run(process.execPath, [path.join(ROOT, 'scripts', 'db-export.mjs')], { cwd: ROOT });
  }

  let dir = args.dir;
  if (!dir) {
    dir = latestExportDir();
    if (!dir) throw new Error('No export dir found. Pass --dir or --export');
  }
  const abs = path.isAbsolute(dir) ? dir : path.join(ROOT, dir);
  if (!fs.existsSync(path.join(abs, 'database.sql'))) {
    throw new Error(`Missing database.sql in ${abs}`);
  }
  const metaPath = path.join(abs, 'meta.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (meta.includesCmsMedia === false) {
      console.warn('WARNING: snapshot has includesCmsMedia=false — backgrounds may break. Prefer a fresh npm run db:export');
    } else {
      console.log(`Snapshot OK: cms media files ≈ ${meta.cmsMediaFiles?.length ?? meta.cmsMedia?.images ?? '?'}`);
    }
  }

  const remoteExports = `${preset.appDir}/storage/exports`;
  const baseName = path.basename(abs);
  const sshBase = ['-i', key, '-o', 'StrictHostKeyChecking=accept-new', `${user}@${host}`];

  run('ssh', [...sshBase, `mkdir -p ${remoteExports}`]);

  // scp -r localDir user@host:remoteParent/  → remoteParent/localDirName
  run('scp', ['-i', key, '-o', 'StrictHostKeyChecking=accept-new', '-r', abs, `${user}@${host}:${remoteExports}/`]);

  if (args.skipImport) {
    console.log(`\nCopied to ${remoteExports}/${baseName} (import skipped).`);
    return;
  }

  const remoteCmd = [
    `cd ${preset.appDir}`,
    // Standalone releases may lack a root-resolvable mysql2 for scripts/*.mjs
    `node --input-type=module -e "import('mysql2/promise')" 2>/dev/null || npm install mysql2 --omit=dev --no-audit --no-fund --no-save`,
    `node scripts/db-import.mjs storage/exports/${baseName} --force`,
    `pm2 restart ${preset.pm2} --update-env`,
  ].join(' && ');

  run('ssh', [...sshBase, remoteCmd]);
  console.log(`\nDone. Imported on ${args.target} (${user}@${host}) and restarted ${preset.pm2}.`);
  console.log('Hard-refresh admin inventory to see MediaPicker previews.');
}

try {
  main();
} catch (err) {
  console.error('\ndb:push failed:', err.message || err);
  process.exit(1);
}
