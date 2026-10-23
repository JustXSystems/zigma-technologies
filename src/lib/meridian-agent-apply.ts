/**
 * Persist Meridian Product Agent patches into Zigma CMS / head store.
 * Quality-gated kinds only (SDK rejects doorway / review spam / forceIndex).
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
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

const VERIFY_META_PATH = resolve(process.cwd(), 'storage/meridian/agent/verify-meta.json');
const HINTS_DIR = resolve(process.cwd(), 'storage/meridian/agent/hints');

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

async function writeJson(filePath: string, data: unknown) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/** Google site-verification token applied by Product Agent (or null). */
export async function readAgentGoogleVerification(): Promise<string | null> {
  try {
    const raw = await readFile(VERIFY_META_PATH, 'utf8');
    const data = JSON.parse(raw) as { googleSiteVerification?: string };
    const token = String(data.googleSiteVerification || '').trim();
    return token || null;
  } catch {
    return null;
  }
}

async function applyMeta(path: string, payload: Record<string, unknown>) {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const description = typeof payload.description === 'string' ? payload.description.trim() : '';
  if (!title && !description) throw new Error('meta patch needs title and/or description');

  const p = normalizePath(path);
  const segments = p === '/' ? [] : p.replace(/^\//, '').split('/');

  // Catalog detail: /products|projects|services/:slug
  if (segments.length >= 2 && (segments[0] === 'products' || segments[0] === 'projects' || segments[0] === 'services')) {
    const itemType = CATALOG_SEG_TO_TYPE[segments[0] as CatalogSeg];
    const slug = segments[1];
    const item = await getCatalogItemBySlug(itemType, slug, true);
    if (!item) throw new Error(`catalog item not found: ${p}`);

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
      // Columns optional on older DBs
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
  const file = resolve(HINTS_DIR, `${safe}.json`);
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
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
  if (kind === 'verify-meta') return applyVerifyMeta(payload);
  if (
    kind === 'canonical' ||
    kind === 'schema' ||
    kind === 'sitemap-hint' ||
    kind === 'alt' ||
    kind === 'robots-hint' ||
    kind === 'redirect-hint' ||
    kind === 'indexnow-key'
  ) {
    return storeHint(kind, path, payload);
  }

  throw new Error(`unsupported patch kind: ${kind}`);
}
