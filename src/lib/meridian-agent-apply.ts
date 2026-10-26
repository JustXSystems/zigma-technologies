/**
 * Persist Meridian Product Agent patches into Zigma CMS / head store.
 * Quality-gated kinds only (SDK rejects doorway / review spam / forceIndex).
 * Empty-field auto-heal: honor payload.onlyIfEmpty.
 * Bing / IndexNow proof files land in public/ for meridian-seo-file rewrites.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import pool from '@/lib/db';
import { getPageBySlug } from '@/lib/cms';
import { getCatalogItemBySlug } from '@/lib/catalog';
import type { CatalogItemType } from '@/lib/types';
import { getResourcePostBySlug } from '@/lib/resources';

export type MeridianAgentPatch = {
  id?: string;
  kind: string;
  path?: string;
  payload?: Record<string, unknown>;
};

export { readAgentGoogleVerification } from '@/lib/meridian-agent-verify';

const VERIFY_META_PATH = join(process.cwd(), 'storage', 'meridian', 'agent', 'verify-meta.json');
const HINTS_DIR = join(process.cwd(), 'storage', 'meridian', 'agent', 'hints');
const SCHEMA_PATH = join(process.cwd(), 'storage', 'meridian', 'agent', 'org-schema.json');

type CatalogSeg = 'products' | 'projects' | 'services';
const CATALOG_SEG_TO_TYPE: Record<CatalogSeg, CatalogItemType> = {
  products: 'product',
  projects: 'project',
  services: 'service',
};

function normalizePath(raw: string | undefined) {
  let p = String(raw || '/').trim() || '/';
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function pathSlug(path: string) {
  const p = normalizePath(path);
  if (p === '/' || p === '/home') return 'home';
  return p.replace(/^\//, '').split('/')[0] || 'home';
}

function onlyIfEmpty(payload: Record<string, unknown>) {
  return payload.onlyIfEmpty === true;
}

function filled(v: unknown) {
  return typeof v === 'string' && v.trim().length > 0;
}

async function writeJson(filePath: string, data: unknown) {
  await mkdir(/*turbopackIgnore: true*/ dirname(filePath), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function applyMeta(path: string, payload: Record<string, unknown>) {
  let title = typeof payload.title === 'string' ? payload.title.trim() : '';
  let description = typeof payload.description === 'string' ? payload.description.trim() : '';
  if (!title && !description) throw new Error('meta patch needs title and/or description');

  const p = normalizePath(path);
  const segments = p === '/' ? [] : p.replace(/^\//, '').split('/');
  const emptyOnly = onlyIfEmpty(payload);

  // Catalog detail: /products|projects|services/:slug
  if (segments.length >= 2 && (segments[0] === 'products' || segments[0] === 'projects' || segments[0] === 'services')) {
    const itemType = CATALOG_SEG_TO_TYPE[segments[0] as CatalogSeg];
    const slug = segments[1];
    const item = await getCatalogItemBySlug(itemType, slug, true);
    if (!item) throw new Error(`catalog item not found: ${p}`);

    if (emptyOnly) {
      if (title && filled(item.meta_title)) title = '';
      if (description && filled(item.meta_description)) description = '';
      if (!title && !description) {
        throw new Error('onlyIfEmpty: catalog meta already set');
      }
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    if (title) {
      sets.push('meta_title = ?');
      params.push(title);
    }
    if (description) {
      sets.push('meta_description = ?');
      params.push(description);
    }
    sets.push(`seo_meta_source = IF(seo_meta_source = 'manual', 'manual', 'meridian')`);
    sets.push('seo_dirty = 0');
    params.push(item.id);
    try {
      await pool.query(`UPDATE catalog_items SET ${sets.join(', ')} WHERE id = ?`, params);
    } catch {
      const fallback: string[] = [];
      const fp: unknown[] = [];
      if (title) {
        fallback.push('meta_title = ?');
        fp.push(title);
      }
      if (description) {
        fallback.push('meta_description = ?');
        fp.push(description);
      }
      fp.push(item.id);
      await pool.query(`UPDATE catalog_items SET ${fallback.join(', ')} WHERE id = ?`, fp);
    }
    return { target: 'catalog', id: item.id, path: p };
  }

  // Blog: /blog/:slug
  if (segments.length >= 2 && segments[0] === 'blog') {
    const post = await getResourcePostBySlug(segments[1], { admin: true });
    if (!post) throw new Error(`blog post not found: ${p}`);
    if (emptyOnly) {
      if (title && filled(post.meta_title)) title = '';
      if (description && filled(post.meta_description)) description = '';
      if (!title && !description) throw new Error('onlyIfEmpty: blog meta already set');
    }
    const sets: string[] = [];
    const params: unknown[] = [];
    if (title) {
      sets.push('meta_title = ?');
      params.push(title);
    }
    if (description) {
      sets.push('meta_description = ?');
      params.push(description);
    }
    params.push(post.id);
    await pool.query(`UPDATE resource_posts SET ${sets.join(', ')} WHERE id = ?`, params);
    return { target: 'blog', id: post.id, path: p };
  }

  // CMS page: / or /:slug
  const slug = pathSlug(p);
  const page = await getPageBySlug(slug, true);
  if (!page) throw new Error(`page not found for path: ${p}`);

  if (emptyOnly) {
    if (title && filled(page.meta_title)) title = '';
    if (description && filled(page.meta_description)) description = '';
    if (!title && !description) throw new Error('onlyIfEmpty: page meta already set');
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  if (title) {
    sets.push('meta_title = ?');
    params.push(title);
  }
  if (description) {
    sets.push('meta_description = ?');
    params.push(description);
  }
  params.push(page.id);
  try {
    const withSource = [
      ...sets,
      `seo_meta_source = IF(seo_meta_source = 'manual', 'manual', 'meridian')`,
      'seo_dirty = 0',
    ];
    await pool.query(`UPDATE pages SET ${withSource.join(', ')} WHERE id = ?`, params);
  } catch {
    await pool.query(`UPDATE pages SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return { target: 'page', id: page.id, path: p };
}

function writePublicSeoFile(name: string, body: string) {
  const publicDir = resolve(process.cwd(), 'public');
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(resolve(publicDir, name), body, 'utf8');
  return `/${name}`;
}

async function applyAlt(path: string, payload: Record<string, unknown>) {
  const alt = typeof payload.alt === 'string' ? payload.alt.trim() : '';
  if (!alt) throw new Error('alt patch needs alt text');
  const imageSrc = typeof payload.imageSrc === 'string' ? payload.imageSrc.trim() : '';
  const imageIdRaw = payload.imageId != null ? String(payload.imageId).trim() : '';
  // Inventory may tag catalog rows as catalog:123
  const imageId = imageIdRaw.replace(/^catalog:/i, '');
  if (!imageSrc && !imageId) throw new Error('alt patch needs imageSrc or imageId');

  const emptyOnly = onlyIfEmpty(payload);
  const isCatalogId = /^catalog:/i.test(imageIdRaw);

  if (imageId && /^\d+$/.test(imageId) && !isCatalogId) {
    try {
      const [rows] = await pool.query(`SELECT id, alt, path FROM media_assets WHERE id = ? LIMIT 1`, [
        Number(imageId),
      ]);
      const row = Array.isArray(rows)
        ? (rows as { id: number; alt: string | null; path: string }[])[0]
        : null;
      if (row) {
        if (emptyOnly && filled(row.alt)) throw new Error('onlyIfEmpty: alt already set');
        await pool.query(`UPDATE media_assets SET alt = ? WHERE id = ?`, [alt.slice(0, 255), row.id]);
        return { target: 'media_assets', id: row.id, path: normalizePath(path) };
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('onlyIfEmpty')) throw e;
    }
  }

  if (imageId && /^\d+$/.test(imageId)) {
    const [rows] = await pool.query(`SELECT id, alt, url FROM catalog_media WHERE id = ? LIMIT 1`, [
      Number(imageId),
    ]);
    const row = Array.isArray(rows) ? (rows as { id: number; alt: string | null; url: string }[])[0] : null;
    if (!row) throw new Error(`media id not found: ${imageIdRaw}`);
    if (emptyOnly && filled(row.alt)) throw new Error('onlyIfEmpty: alt already set');
    await pool.query(`UPDATE catalog_media SET alt = ? WHERE id = ?`, [alt.slice(0, 255), row.id]);
    return { target: 'catalog_media', id: row.id, path: normalizePath(path) };
  }

  if (imageSrc) {
    const base = imageSrc.split('?')[0];
    const srcPath = base.startsWith('/') ? base : `/${base}`;
    try {
      const [rows] = await pool.query(
        `SELECT id, alt, path FROM media_assets
         WHERE path = ? OR path = ? OR path LIKE ? OR original_name = ?
         ORDER BY id DESC LIMIT 1`,
        [imageSrc, srcPath, `%${base.split('/').pop() || '___never___'}%`, base.split('/').pop() || '']
      );
      const row = Array.isArray(rows)
        ? (rows as { id: number; alt: string | null; path: string }[])[0]
        : null;
      if (row) {
        if (emptyOnly && filled(row.alt)) throw new Error('onlyIfEmpty: alt already set');
        await pool.query(`UPDATE media_assets SET alt = ? WHERE id = ?`, [alt.slice(0, 255), row.id]);
        return { target: 'media_assets', id: row.id, path: normalizePath(path), url: row.path };
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('onlyIfEmpty')) throw e;
    }

    const [rows] = await pool.query(
      `SELECT id, alt, url FROM catalog_media
       WHERE url = ? OR url = ? OR url LIKE ?
       ORDER BY id DESC LIMIT 1`,
      [imageSrc, base, `%${base.split('/').pop() || '___never___'}%`]
    );
    const row = Array.isArray(rows) ? (rows as { id: number; alt: string | null; url: string }[])[0] : null;
    if (row) {
      if (emptyOnly && filled(row.alt)) throw new Error('onlyIfEmpty: alt already set');
      await pool.query(`UPDATE catalog_media SET alt = ? WHERE id = ?`, [alt.slice(0, 255), row.id]);
      return { target: 'catalog_media', id: row.id, path: normalizePath(path), url: row.url };
    }
  }

  // Fallback: persist hint so theme/head can still consume
  await storeHint('alt', path, { ...payload, alt });
  return { target: 'hint', kind: 'alt', path: normalizePath(path), note: 'no media_assets/catalog_media row matched' };
}

async function applyBingVerify(payload: Record<string, unknown>) {
  const code = String(
    payload.msvalidate || payload.authenticationCode || payload.content || ''
  ).trim();
  if (!code) throw new Error('bing-verify missing code');
  const file = writePublicSeoFile(
    'BingSiteAuth.xml',
    `<?xml version="1.0"?>\n<users>\n\t<user>${code}</user>\n</users>\n`
  );
  await storeHint('bing-verify', '/', { ...payload, msvalidate: code, file });
  return { target: 'public', file, code };
}

async function applyIndexNowKey(payload: Record<string, unknown>) {
  const hex = String(payload.key || '').trim();
  if (!/^[a-f0-9]{8,64}$/i.test(hex)) throw new Error('invalid indexnow key');
  const file = writePublicSeoFile(`${hex}.txt`, hex);
  await storeHint('indexnow-key', '/', { ...payload, key: hex, file });
  return { target: 'public', file };
}

async function applySchema(path: string, payload: Record<string, unknown>) {
  const schema = payload.schemaJsonLd;
  if (!schema || typeof schema !== 'object') throw new Error('schema patch needs schemaJsonLd');
  const emptyOnly = onlyIfEmpty(payload);
  if (emptyOnly) {
    try {
      const existing = JSON.parse(await readFile(/*turbopackIgnore: true*/ SCHEMA_PATH, 'utf8')) as {
        schemaJsonLd?: unknown;
      };
      if (existing?.schemaJsonLd) throw new Error('onlyIfEmpty: org schema already set');
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('onlyIfEmpty')) throw e;
    }
  }
  await writeJson(SCHEMA_PATH, {
    path: normalizePath(path),
    schemaJsonLd: schema,
    updatedAt: new Date().toISOString(),
    source: 'meridian-agent',
  });
  await storeHint('schema', path, payload);
  return { target: 'schema', path: normalizePath(path) };
}

async function applyVerifyMeta(payload: Record<string, unknown>) {
  const token = String(payload.googleSiteVerification || '').trim();
  if (!token) throw new Error('verify-meta needs googleSiteVerification');
  await writeJson(VERIFY_META_PATH, {
    googleSiteVerification: token,
    updatedAt: new Date().toISOString(),
    note: 'Also set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in Production .env for cold starts / PM2',
  });
  return { target: 'verify-meta', tokenPrefix: token.slice(0, 8) };
}

async function storeHint(kind: string, path: string, payload: Record<string, unknown>) {
  const safe = kind.replace(/[^a-z0-9-]/gi, '_');
  const file = join(HINTS_DIR, `${safe}.json`);
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(await readFile(/*turbopackIgnore: true*/ file, 'utf8')) as Record<string, unknown>;
  } catch {
    /* new */
  }
  const byPath = (existing.byPath as Record<string, unknown>) || {};
  byPath[normalizePath(path)] = { ...payload, updatedAt: new Date().toISOString() };
  await writeJson(file, { kind, byPath, updatedAt: new Date().toISOString() });
  return { target: 'hint', kind, path: normalizePath(path) };
}

/**
 * Apply one gated patch. Throws on failure (SDK acks rejected).
 */
export async function applyMeridianAgentPatch(patch: MeridianAgentPatch) {
  const kind = String(patch.kind || '').toLowerCase();
  const path = normalizePath(patch.path);
  const payload = patch.payload && typeof patch.payload === 'object' ? patch.payload : {};

  if (kind === 'meta') return applyMeta(path, payload);
  if (kind === 'alt') return applyAlt(path, payload);
  if (kind === 'schema') return applySchema(path, payload);
  if (kind === 'verify-meta') return applyVerifyMeta(payload);
  if (kind === 'bing-verify') return applyBingVerify(payload);
  if (kind === 'indexnow-key') return applyIndexNowKey(payload);
  if (
    kind === 'canonical' ||
    kind === 'sitemap-hint' ||
    kind === 'robots-hint' ||
    kind === 'redirect-hint'
  ) {
    return storeHint(kind, path, payload);
  }

  throw new Error(`unsupported patch kind: ${kind}`);
}

/** Alias used by ops dogfood scripts */
export const applyZigmaAgentPatch = applyMeridianAgentPatch;
