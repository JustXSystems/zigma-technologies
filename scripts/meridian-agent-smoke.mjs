#!/usr/bin/env node
/** Smoke: heartbeat + pending against Meridian SaaS Product Agent API. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

loadEnv(resolve(process.cwd(), '.env'));
loadEnv(resolve(process.cwd(), '.env.local'));

const { createMeridianAgent } = await import('@justx/meridian-sdk');
const baseUrl = (process.env.MERIDIAN_SAAS_URL || '').replace(/\/$/, '');
const apiKey = (process.env.MERIDIAN_SITE_API_KEY || process.env.MERIDIAN_SAAS_API_KEY || '').trim();

if (!baseUrl || !apiKey.startsWith('jbt_')) {
  console.error('Missing MERIDIAN_SAAS_URL or MERIDIAN_SITE_API_KEY (jbt_…)');
  process.exit(1);
}

console.log('url', baseUrl);
console.log('keyPrefix', `${apiKey.slice(0, 12)}…`);

const agent = createMeridianAgent({ baseUrl, apiKey });
const hb = await agent.heartbeat({ kind: 'next', version: 'zigma-0.1.0-smoke' });
console.log('heartbeat', hb);
const pending = await agent.pending({ limit: 5 });
console.log('pendingCount', (pending.patches || []).length);
if (pending.origin) console.log('origin', pending.origin);
