#!/usr/bin/env node
/**
 * One-shot: push Meridian connector secrets → GitHub Actions repo secrets.
 * Needs: gh auth login (or GH_TOKEN) with secrets:write on the repo.
 *
 * Sources (first hit wins per key):
 *   1) process.env
 *   2) storage/meridian/zigma-prod/unlock-secrets.json
 *   3) storage/meridian/unlock-secrets.json
 *
 * Usage:
 *   npm run meridian:secrets:sync
 *   node scripts/meridian-sync-gh-secrets.mjs --dry-run
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const KEYS = [
  'MERIDIAN_GOOGLE_CLIENT_ID',
  'MERIDIAN_GOOGLE_CLIENT_SECRET',
  'MERIDIAN_GOOGLE_REFRESH_TOKEN',
  'MERIDIAN_GA4_PROPERTY_ID',
  'MERIDIAN_BING_API_KEY',
  'MERIDIAN_PSI_API_KEY',
  'MERIDIAN_WEBHOOK_URL',
  'MERIDIAN_GITHUB_TOKEN',
];

const dryRun = process.argv.includes('--dry-run');

function loadMap() {
  const map = {};
  for (const k of KEYS) {
    if ((process.env[k] || '').trim()) map[k] = process.env[k].trim();
  }
  for (const p of [
    resolve('storage/meridian/zigma-prod/unlock-secrets.json'),
    resolve('storage/meridian/unlock-secrets.json'),
  ]) {
    if (!existsSync(p)) continue;
    try {
      const j = JSON.parse(readFileSync(p, 'utf8'));
      for (const k of KEYS) {
        if (!map[k] && j[k]) map[k] = String(j[k]).trim();
      }
      console.log(`Hydrated from ${p}`);
      break;
    } catch (e) {
      console.warn(`Could not read ${p}:`, e.message || e);
    }
  }
  return map;
}

function runGh(args, input) {
  return new Promise((resolvePromise) => {
    const child = spawn('gh', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    if (input != null) {
      child.stdin.write(String(input));
      child.stdin.end();
    }
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }));
    child.on('error', (e) =>
      resolvePromise({ code: 1, stdout: '', stderr: String(e.message || e) })
    );
  });
}

const map = loadMap();
const present = KEYS.filter((k) => map[k]);
const missing = KEYS.filter((k) => !map[k]);

console.log(`Ready to sync ${present.length}/${KEYS.length} secret(s).`);
if (missing.length) console.log(`Missing locally (skip): ${missing.join(', ')}`);
if (!present.length) {
  console.error('Nothing to sync. Set MERIDIAN_* env or unlock-secrets.json, then re-run.');
  process.exit(1);
}

if (dryRun) {
  console.log('[dry-run] Would set:', present.join(', '));
  process.exit(0);
}

const auth = await runGh(['auth', 'status']);
if (auth.code !== 0) {
  console.error('gh is not authenticated. Run: gh auth login');
  console.error(auth.stderr || auth.stdout);
  process.exit(1);
}

const synced = [];
const failed = [];
for (const k of present) {
  const r = await runGh(['secret', 'set', k], map[k]);
  if (r.code === 0) {
    synced.push(k);
    console.log(`✓ ${k}`);
  } else {
    failed.push(k);
    console.error(`✗ ${k}: ${(r.stderr || r.stdout || 'failed').slice(0, 200)}`);
  }
}

console.log(`\nSynced ${synced.length}; failed ${failed.length}.`);
console.log('Next: GitHub → Actions → Meridian SEO report (or Admin → Generate report).');
process.exit(failed.length ? 1 : 0);
