#!/usr/bin/env node
/**
 * Smoke-test ZTools mobile API connectivity.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 *
 * Note: http://10.0.2.2:3000 only works INSIDE the Android emulator.
 * When you run this script on your PC, 10.0.2.2 is tested via localhost instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvBaseUrl() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return null;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^EXPO_PUBLIC_ZTOOLS_API_URL=(.+)$/);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
  }
  return null;
}

const configuredBase = (process.argv[2] || process.env.EXPO_PUBLIC_ZTOOLS_API_URL || loadEnvBaseUrl() || 'http://localhost:3000').replace(/\/$/, '');

/** 10.0.2.2 is the emulator alias for the host PC — unreachable from Windows itself. */
function hostTestBase(url) {
  if (/^https?:\/\/10\.0\.2\.2(?::\d+)?$/i.test(url)) {
    const port = new URL(url).port || '3000';
    return `http://localhost:${port}`;
  }
  return url;
}

const base = hostTestBase(configuredBase);
const usingEmulatorAlias = base !== configuredBase;

async function check(apiPath, init) {
  const url = `${base}${apiPath}`;
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 200);
  }
  return { url, status: res.status, body };
}

async function main() {
  console.log(`ZTools API smoke test`);
  console.log(`  .env / configured: ${configuredBase}`);
  if (usingEmulatorAlias) {
    console.log(`  Testing on PC via:   ${base}`);
    console.log(`  (10.0.2.2 only works inside the emulator — this is expected)\n`);
  } else {
    console.log('');
  }

  const tools = await check('/api/ztools/tools');
  console.log(`GET /api/ztools/tools → ${tools.status}`);
  if (tools.status !== 200) {
    console.error('  FAIL', tools.body);
    process.exit(1);
  }
  const count = Array.isArray(tools.body?.tools) ? tools.body.tools.length : 0;
  console.log(`  OK (${count} tools in catalog)\n`);

  const auth = await check('/api/ztools/auth');
  console.log(`GET /api/ztools/auth (no token) → ${auth.status}`);
  if (auth.status !== 401) {
    console.error('  Expected 401 Unauthorized');
    process.exit(1);
  }
  console.log('  OK\n');

  console.log('All smoke checks passed.');
  if (usingEmulatorAlias) {
    console.log('\nEmulator .env is correct. Start the emulator, then: npm run android');
  }
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err.message);
  console.error('\nCommon fixes:');
  console.error('  1. Start the site: npm run dev (from repo root)');
  console.error('  2. Physical phone: npm run lan-ip → put Wi-Fi IP in .env');
  console.error('  3. Android emulator .env: EXPO_PUBLIC_ZTOOLS_API_URL=http://10.0.2.2:3000');
  console.error('     (test from PC still uses localhost — that is normal)');
  process.exit(1);
});
