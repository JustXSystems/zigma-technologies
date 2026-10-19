#!/usr/bin/env node
/**
 * Phase 2 — apply verified social profile URLs into Site Settings (JSON-LD sameAs).
 *
 * Only writes URLs explicitly listed (never invents). Empty fields are filled;
 * existing non-empty values are kept unless --force.
 *
 * Usage:
 *   node scripts/seo-phase2-sameas.mjs
 *   node scripts/seo-phase2-sameas.mjs --dry-run
 *   node scripts/seo-phase2-sameas.mjs --force
 *   node scripts/seo-phase2-sameas.mjs --json
 *
 * Optional env / args:
 *   MERIDIAN_SAMEAS_LINKEDIN=https://www.linkedin.com/company/…
 *   --linkedin=… --facebook=… --instagram=… --youtube=… --x=…
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const AS_JSON = process.argv.includes('--json');

const FIELD_FLAGS = {
  linkedinUrl: ['--linkedin=', 'MERIDIAN_SAMEAS_LINKEDIN'],
  facebookUrl: ['--facebook=', 'MERIDIAN_SAMEAS_FACEBOOK'],
  instagramUrl: ['--instagram=', 'MERIDIAN_SAMEAS_INSTAGRAM'],
  youtubeUrl: ['--youtube=', 'MERIDIAN_SAMEAS_YOUTUBE'],
  xUrl: ['--x=', 'MERIDIAN_SAMEAS_X'],
};

/** Curated, human-verified public profiles for Zigma Technologies (Bengaluru). */
const DEFAULT_VERIFIED = {
  linkedinUrl: 'https://www.linkedin.com/company/zigmatechnologiesind',
};

function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

function argValue(prefix) {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : '';
}

function isHttpUrl(v) {
  try {
    const u = new URL(String(v || '').trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function loadProfileCandidates() {
  const profilePath = resolve(ROOT, 'packages/meridian/profiles/zigma.prod.json');
  if (!existsSync(profilePath)) return {};
  try {
    const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
    const c = profile.autopilot?.sameAsVerified || profile.sameAsVerified || {};
    const out = {};
    for (const key of Object.keys(FIELD_FLAGS)) {
      if (isHttpUrl(c[key])) out[key] = String(c[key]).trim().replace(/\/$/, '');
    }
    return out;
  } catch {
    return {};
  }
}

function resolveTargets() {
  const fromProfile = loadProfileCandidates();
  const targets = { ...DEFAULT_VERIFIED, ...fromProfile };
  for (const [key, [flag, envName]] of Object.entries(FIELD_FLAGS)) {
    const fromArg = argValue(flag);
    const fromEnv = (process.env[envName] || '').trim();
    const v = fromArg || fromEnv;
    if (isHttpUrl(v)) targets[key] = v.replace(/\/$/, '');
    else if (v === '-' || v.toLowerCase() === 'clear') delete targets[key];
  }
  return targets;
}

loadEnv();
const targets = resolveTargets();

if (!Object.keys(targets).length) {
  const msg = 'No verified sameAs URLs to apply';
  if (AS_JSON) console.log(JSON.stringify({ ok: false, updated: 0, message: msg }));
  else console.error(msg);
  process.exit(1);
}

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const [rows] = await pool.query('SELECT value_json FROM theme_settings WHERE setting_key = ? LIMIT 1', ['site']);
if (!rows.length) {
  console.error('No theme_settings.site row found');
  await pool.end();
  process.exit(1);
}

const site = typeof rows[0].value_json === 'string' ? JSON.parse(rows[0].value_json) : { ...rows[0].value_json };
const before = {};
const after = {};
const changed = [];

for (const [key, url] of Object.entries(targets)) {
  const prev = String(site[key] || '').trim();
  before[key] = prev || '(empty)';
  if (prev && !FORCE && prev !== url) {
    after[key] = prev;
    continue;
  }
  if (prev === url) {
    after[key] = prev;
    continue;
  }
  site[key] = url;
  after[key] = url;
  changed.push(key);
}

const payload = {
  ok: true,
  dryRun: DRY,
  force: FORCE,
  updated: changed.length,
  changed,
  before,
  after,
  targets,
};

if (!DRY && changed.length) {
  await pool.query(
    `INSERT INTO theme_settings (setting_key, value_json) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)`,
    ['site', JSON.stringify(site)]
  );
}

await pool.end();

const outDir = resolve(ROOT, 'storage/meridian/zigma-prod');
try {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'phase2-sameas-apply.json'), JSON.stringify(payload, null, 2), 'utf8');
} catch {
  /* optional artefact */
}

if (AS_JSON) {
  console.log(JSON.stringify(payload));
} else {
  console.log(DRY ? 'Dry run — no write' : changed.length ? `Updated theme_settings.site: ${changed.join(', ')}` : 'No changes (already set)');
  console.log(JSON.stringify({ before, after, changed }, null, 2));
}
