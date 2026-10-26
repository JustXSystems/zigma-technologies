#!/usr/bin/env node
/**
 * Dogfood: collect CMS inventory → Meridian SaaS heartbeat → list pending heals.
 *
 *   node scripts/meridian-agent-heal-dogfood.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';

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

function clip(s, max) {
  const t = String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

loadEnv(resolve(process.cwd(), '.env'));
loadEnv(resolve(process.cwd(), '.env.local'));

const baseUrl = (process.env.MERIDIAN_SAAS_URL || '').replace(/\/$/, '');
const apiKey = (process.env.MERIDIAN_SITE_API_KEY || process.env.MERIDIAN_SAAS_API_KEY || '').trim();

if (!baseUrl || !apiKey.startsWith('jbt_')) {
  console.error('Missing MERIDIAN_SAAS_URL or MERIDIAN_SITE_API_KEY (jbt_…)');
  process.exit(1);
}

async function collectInventory() {
  const pages = [];
  const media = [];
  if (!process.env.DB_USER || !process.env.DB_NAME) {
    return { cursor: new Date().toISOString(), pages, media };
  }
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    let pageRows;
    try {
      [pageRows] = await pool.query(
        `SELECT slug, title, meta_title, meta_description, seo_meta_source
         FROM pages WHERE enabled = 1 ORDER BY updated_at DESC LIMIT 40`
      );
    } catch {
      [pageRows] = await pool.query(
        `SELECT slug, title, meta_title, meta_description
         FROM pages WHERE enabled = 1 ORDER BY updated_at DESC LIMIT 40`
      );
    }
    for (const r of pageRows) {
      const slug = String(r.slug || '').trim();
      if (!slug) continue;
      pages.push({
        path: slug === 'home' ? '/' : `/${slug}`,
        title: clip(r.title, 200) || null,
        metaTitle: clip(r.meta_title, 120) || null,
        metaDescription: clip(r.meta_description, 320) || null,
        h1: null,
        excerpt: null,
        manualSeo: String(r.seo_meta_source || '') === 'manual',
      });
    }
  } catch (e) {
    console.warn('pages inventory:', e.message);
  }
  try {
    let catRows;
    try {
      [catRows] = await pool.query(
        `SELECT item_type, slug, title, meta_title, meta_description, summary, seo_meta_source
         FROM catalog_items WHERE enabled = 1 ORDER BY updated_at DESC LIMIT 30`
      );
    } catch {
      [catRows] = await pool.query(
        `SELECT item_type, slug, title, meta_title, meta_description, summary
         FROM catalog_items WHERE enabled = 1 ORDER BY updated_at DESC LIMIT 30`
      );
    }
    for (const r of catRows) {
      const seg =
        r.item_type === 'product' ? 'products' : r.item_type === 'project' ? 'projects' : 'services';
      pages.push({
        path: `/${seg}/${r.slug}`,
        title: clip(r.title, 200) || null,
        metaTitle: clip(r.meta_title, 120) || null,
        metaDescription: clip(r.meta_description, 320) || null,
        h1: clip(r.title, 200) || null,
        excerpt: clip(r.summary, 400) || null,
        manualSeo: String(r.seo_meta_source || '') === 'manual',
      });
    }
  } catch (e) {
    console.warn('catalog inventory:', e.message);
  }
  try {
    const [mediaRows] = await pool.query(
      `SELECT m.id, m.url, m.alt, c.item_type, c.slug, c.title
       FROM catalog_media m
       JOIN catalog_items c ON c.id = m.item_id
       WHERE c.enabled = 1 AND (m.alt IS NULL OR TRIM(m.alt) = '')
       ORDER BY m.id DESC LIMIT 80`
    );
    for (const r of mediaRows) {
      const seg =
        r.item_type === 'product' ? 'products' : r.item_type === 'project' ? 'projects' : 'services';
      media.push({
        id: String(r.id),
        src: r.url || null,
        alt: null,
        filename: (r.url || '').split('/').pop() || null,
        contextTitle: clip(r.title, 200) || null,
        onPaths: [`/${seg}/${r.slug}`],
      });
    }
  } catch (e) {
    console.warn('media inventory:', e.message);
  }
  await pool.end();
  return { cursor: new Date().toISOString(), pages: pages.slice(0, 50), media: media.slice(0, 100) };
}

const { createMeridianAgent, DEFAULT_AGENT_CAPABILITIES } = await import('@justx/meridian-sdk');
const inventory = await collectInventory();
const agent = createMeridianAgent({ baseUrl, apiKey });

console.log('url', baseUrl);
console.log('keyPrefix', `${apiKey.slice(0, 12)}…`);
console.log('inventory', { pages: inventory.pages.length, media: inventory.media.length });

const hb = await agent.heartbeat({
  kind: 'next',
  version: 'zigma-0.2.0-dogfood',
  capabilities: { ...DEFAULT_AGENT_CAPABILITIES, cms: 'next', seoPlugins: [] },
  inventory,
});
console.log('heartbeat.inventory', hb.inventory || null);
console.log('heartbeat.flush', hb.flush || null);

const pending = await agent.pending({ limit: 10 });
console.log('pendingCount', (pending.patches || []).length);
for (const p of pending.patches || []) {
  console.log('-', p.kind, p.path, p.payload?.onlyIfEmpty ? '[onlyIfEmpty]' : '');
}
console.log('\nApply: GET /api/meridian-agent (or Admin cron). Verify lands in SaaS patch.verify after ack.');
