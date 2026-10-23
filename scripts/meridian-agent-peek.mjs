#!/usr/bin/env node
/** List pending Product Agent patches (no apply / no ack). */
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
const agent = createMeridianAgent({ baseUrl, apiKey });
const { patches = [], origin } = await agent.pending({ limit: 20 });
console.log(JSON.stringify({ origin, count: patches.length, patches: patches.map((p) => ({
  id: p.id,
  kind: p.kind,
  path: p.path,
  payloadKeys: Object.keys(p.payload || {}),
  payload: p.payload,
})) }, null, 2));
