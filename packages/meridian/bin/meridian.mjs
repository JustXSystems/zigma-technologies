#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { runCli } from '../src/cli.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

/** Load repo-root .env if present (does not override existing process.env). */
function loadDotEnv() {
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

/** Optional — partial deploys must not crash Admin autopilot if lib file is missing. */
async function maybeHydrateSecrets() {
  const hydratePath = resolve(__dirname, '../src/lib/hydrate-secrets.mjs');
  if (!existsSync(hydratePath)) return;
  try {
    const mod = await import(pathToFileURL(hydratePath).href);
    mod.hydrateMeridianSecrets?.(ROOT);
  } catch (e) {
    console.warn('[meridian] hydrate-secrets skipped:', String(e?.message || e).slice(0, 160));
  }
}

loadDotEnv();
await maybeHydrateSecrets();

runCli(process.argv.slice(2)).catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
