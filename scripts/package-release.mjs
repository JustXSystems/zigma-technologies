#!/usr/bin/env node
/**
 * Cross-platform release packager (Windows-safe). Mirrors scripts/package-release.sh.
 *
 *   node scripts/package-release.mjs --env prod --out dist/zigma-prod.tgz
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  readdirSync,
  statSync,
  copyFileSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback = '') {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const ENV_NAME = arg('--env');
const OUT = resolve(ROOT, arg('--out', `dist/zigma-${ENV_NAME}.tgz`));

if (!['preprod', 'prod'].includes(ENV_NAME)) {
  console.error('Usage: node scripts/package-release.mjs --env preprod|prod [--out path.tgz]');
  process.exit(1);
}
if (!existsSync(join(ROOT, '.next/BUILD_ID'))) {
  console.error('ERROR: .next missing — run npm run build first');
  process.exit(1);
}
if (!existsSync(join(ROOT, '.next/standalone'))) {
  console.error('ERROR: .next/standalone missing');
  process.exit(1);
}

const STAGE = mkdtempSync(join(tmpdir(), 'zigma-release-'));
console.log(`==> Staging release (${ENV_NAME}) → ${STAGE}`);

function copyTree(src, dest) {
  cpSync(src, dest, { recursive: true, force: true });
}

copyTree(join(ROOT, '.next/standalone'), STAGE);

// Strip secrets
for (const name of ['.env', '.env.local']) {
  try {
    rmSync(join(STAGE, name), { force: true });
  } catch {
    /* ignore */
  }
}

function findServerJs(dir, depth = 0) {
  if (depth > 4) return null;
  const direct = join(dir, 'server.js');
  if (existsSync(direct)) return direct;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    try {
      if (statSync(p).isDirectory()) {
        const hit = findServerJs(p, depth + 1);
        if (hit) return hit;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

if (!existsSync(join(STAGE, 'server.js'))) {
  const nested = findServerJs(STAGE);
  if (!nested) {
    console.error('standalone server.js not found');
    process.exit(1);
  }
  const nestDir = dirname(nested);
  console.log(`==> Flattening nested standalone from ${nestDir}`);
  for (const name of readdirSync(nestDir)) {
    cpSync(join(nestDir, name), join(STAGE, name), { recursive: true, force: true });
  }
}

for (const drop of ['apps', 'src', 'storage', '.git', '.github', '.cursor', 'coverage', 'docs', 'tests', '__tests__']) {
  rmSync(join(STAGE, drop), { recursive: true, force: true });
}

mkdirSync(join(STAGE, '.next'), { recursive: true });
copyTree(join(ROOT, '.next/static'), join(STAGE, '.next/static'));

if (existsSync(join(ROOT, 'public'))) {
  mkdirSync(join(STAGE, 'public'), { recursive: true });
  copyTree(join(ROOT, 'public'), join(STAGE, 'public'));
  // Drop private upload bodies if copied
  for (const sub of ['assets/uploads/resumes', 'assets/uploads/documents']) {
    const d = join(STAGE, 'public', sub);
    if (existsSync(d)) {
      for (const f of readdirSync(d)) {
        if (f === '.gitkeep') continue;
        rmSync(join(d, f), { recursive: true, force: true });
      }
    }
  }
}

rmSync(join(STAGE, 'scripts'), { recursive: true, force: true });
mkdirSync(join(STAGE, 'scripts'), { recursive: true });
for (const f of readdirSync(join(ROOT, 'scripts'))) {
  if (/\.(sh|mjs|sql)$/.test(f)) {
    copyFileSync(join(ROOT, 'scripts', f), join(STAGE, 'scripts', f));
  }
}

copyFileSync(join(ROOT, 'package.json'), join(STAGE, 'package.json'));
copyFileSync(join(ROOT, 'package-lock.json'), join(STAGE, 'package-lock.json'));
if (existsSync(join(ROOT, 'next.config.ts'))) copyFileSync(join(ROOT, 'next.config.ts'), join(STAGE, 'next.config.ts'));
if (existsSync(join(ROOT, '.env.example'))) copyFileSync(join(ROOT, '.env.example'), join(STAGE, '.env.example'));

if (existsSync(join(ROOT, 'packages/meridian'))) {
  mkdirSync(join(STAGE, 'packages'), { recursive: true });
  copyTree(join(ROOT, 'packages/meridian'), join(STAGE, 'packages/meridian'));
  rmSync(join(STAGE, 'packages/meridian/node_modules'), { recursive: true, force: true });
  mkdirSync(join(STAGE, 'storage/meridian'), { recursive: true });
}

const mysql2Ver = require(join(ROOT, 'node_modules/mysql2/package.json')).version;
console.log(`==> Ensuring mysql2@${mysql2Ver} in stage`);
const npmInstall = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['install', `mysql2@${mysql2Ver}`, '--omit=dev', '--no-audit', '--no-fund', '--no-save', '--no-package-lock', '--prefer-offline'],
  { cwd: STAGE, encoding: 'utf8', shell: true }
);
if (npmInstall.status !== 0) {
  console.error(npmInstall.stderr || npmInstall.stdout);
  process.exit(1);
}

const sha = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout?.trim() || 'nogit';
const fullSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout?.trim() || 'unknown';
let basePath = '';
try {
  basePath = JSON.parse(readFileSync(join(ROOT, '.next/routes-manifest.json'), 'utf8')).basePath || '';
} catch {
  basePath = '';
}

if (ENV_NAME === 'prod' && basePath) {
  console.error(`ERROR: Prod release must have empty basePath (got '${basePath}')`);
  process.exit(1);
}
if (ENV_NAME === 'preprod' && basePath !== '/zigma-technologies') {
  console.error(`ERROR: PreProd basePath must be /zigma-technologies (got '${basePath}')`);
  process.exit(1);
}

writeFileSync(
  join(STAGE, 'release-manifest.json'),
  JSON.stringify(
    {
      app: 'zigma-technologies',
      env: ENV_NAME,
      gitSha: fullSha,
      gitShort: sha,
      builtAt: new Date().toISOString(),
      basePath,
      standalone: true,
      node: process.version,
      packager: 'package-release.mjs',
    },
    null,
    2
  )
);

mkdirSync(dirname(OUT), { recursive: true });
if (existsSync(OUT)) rmSync(OUT, { force: true });

// Prefer tar.exe (Windows 10+) or Git tar
const tarCandidates = ['tar', 'C:\\Windows\\System32\\tar.exe', 'C:\\Program Files\\Git\\usr\\bin\\tar.exe'];
let tarBin = null;
for (const c of tarCandidates) {
  const probe = spawnSync(c, ['--version'], { encoding: 'utf8' });
  if (probe.status === 0 || (probe.stdout || probe.stderr || '').toLowerCase().includes('tar')) {
    tarBin = c;
    break;
  }
}
if (!tarBin) {
  console.error('tar not found');
  process.exit(1);
}

const pack = spawnSync(tarBin, ['-czf', OUT, '-C', STAGE, '.'], { encoding: 'utf8' });
if (pack.status !== 0) {
  console.error(pack.stderr || pack.stdout || 'tar failed');
  process.exit(1);
}

rmSync(STAGE, { recursive: true, force: true });

const list = spawnSync(tarBin, ['-tzf', OUT], { encoding: 'utf8' });
const entries = (list.stdout || '').split(/\r?\n/);
const need = ['scripts/apply-release.sh', 'server.js'];
for (const n of need) {
  if (!entries.some((e) => e === n || e === `./${n}` || e.endsWith(`/${n}`))) {
    console.error(`ERROR: tarball missing ${n}`);
    process.exit(1);
  }
}

const bytes = statSync(OUT).size;
console.log(`==> Wrote ${OUT} (${bytes} bytes)`);
console.log(`==> basePath='${basePath || '<empty>'}' env=${ENV_NAME} sha=${sha}`);
