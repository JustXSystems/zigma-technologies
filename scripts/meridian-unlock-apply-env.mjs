#!/usr/bin/env node
/**
 * Merge Meridian unlock secrets into a .env file (never prints secret values in logs).
 *
 *   node scripts/meridian-unlock-apply-env.mjs --env-file .env --from-json unlock-secrets.json
 *
 * JSON shape (only include keys you want to set):
 * {
 *   "MERIDIAN_GOOGLE_CLIENT_ID": "...",
 *   "MERIDIAN_GOOGLE_CLIENT_SECRET": "...",
 *   "MERIDIAN_GOOGLE_REFRESH_TOKEN": "...",
 *   "MERIDIAN_GA4_PROPERTY_ID": "123",
 *   "MERIDIAN_BING_API_KEY": "...",
 *   "MERIDIAN_PSI_API_KEY": "..."
 * }
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const KEYS = [
  'MERIDIAN_GOOGLE_CLIENT_ID',
  'MERIDIAN_GOOGLE_CLIENT_SECRET',
  'MERIDIAN_GOOGLE_REFRESH_TOKEN',
  'MERIDIAN_GA4_PROPERTY_ID',
  'MERIDIAN_BING_API_KEY',
  'MERIDIAN_PSI_API_KEY',
  'MERIDIAN_GBP_REVIEW_LINK',
];

const envFile = process.argv.includes('--env-file')
  ? process.argv[process.argv.indexOf('--env-file') + 1]
  : '.env';
const fromJson = process.argv.includes('--from-json')
  ? process.argv[process.argv.indexOf('--from-json') + 1]
  : null;

if (!fromJson) {
  console.error('Usage: node scripts/meridian-unlock-apply-env.mjs --env-file .env --from-json secrets.json');
  process.exit(2);
}

const secretsPath = resolve(process.cwd(), fromJson);
const envPath = resolve(process.cwd(), envFile);
if (!existsSync(secretsPath)) {
  console.error(`Secrets file not found: ${secretsPath}`);
  process.exit(1);
}

const incoming = JSON.parse(readFileSync(secretsPath, 'utf8'));
let text = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
const updated = [];

for (const key of KEYS) {
  const val = incoming[key];
  if (val == null || String(val).trim() === '') continue;
  const line = `${key}=${String(val).trim()}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(text)) text = text.replace(re, line);
  else text = text.replace(/\s*$/, '') + `\n${line}\n`;
  updated.push(key);
}

writeFileSync(envPath, text, 'utf8');
console.log(
  JSON.stringify({
    ok: true,
    envFile: envPath,
    updated,
    note: 'Secret values written. Restart PM2 with --update-env on Production.',
  })
);
