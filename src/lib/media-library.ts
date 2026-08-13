import { readdir, stat } from 'fs/promises';
import path from 'path';
import type { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import {
  adminCategoryFromMime,
  adminMediaDiskDir,
  adminMediaPublicPath,
  isManagedMediaPath,
  mediaBaseUrl,
  type AdminMediaCategory,
} from '@/lib/media-paths';

export type MediaLibraryItem = {
  id: number | null;
  path: string;
  mime: string | null;
  alt: string | null;
  tags_json: string[] | null;
  width: number | null;
  height: number | null;
  created_at: string | null;
  category: AdminMediaCategory | 'legacy';
  source: 'database' | 'filesystem' | 'legacy';
};

const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function mimeFromFilename(filename: string): string | null {
  return EXT_MIME[path.extname(filename).toLowerCase()] || null;
}

function categoryFromPath(publicPath: string): MediaLibraryItem['category'] {
  const base = mediaBaseUrl();
  if (publicPath.startsWith(`${base}/svg/`)) return 'svg';
  if (publicPath.startsWith(`${base}/video/`)) return 'video';
  if (publicPath.startsWith(`${base}/images/`)) return 'images';
  return 'legacy';
}

async function scanCategory(category: AdminMediaCategory): Promise<Array<{ path: string; mime: string | null }>> {
  const dir = adminMediaDiskDir(category);
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }

  const items: Array<{ path: string; mime: string | null }> = [];
  for (const name of names) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const info = await stat(full);
    if (!info.isFile()) continue;
    items.push({
      path: adminMediaPublicPath(category, name),
      mime: mimeFromFilename(name),
    });
  }
  return items;
}

function parseTags(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function rowToItem(row: RowDataPacket): MediaLibraryItem {
  const assetPath = String(row.path || '');
  return {
    id: Number(row.id),
    path: assetPath,
    mime: row.mime ? String(row.mime) : mimeFromFilename(assetPath),
    alt: row.alt ? String(row.alt) : null,
    tags_json: parseTags(row.tags_json),
    width: row.width != null ? Number(row.width) : null,
    height: row.height != null ? Number(row.height) : null,
    created_at: row.created_at ? String(row.created_at) : null,
    category: categoryFromPath(assetPath),
    source: assetPath.startsWith(`${mediaBaseUrl()}/`) ? 'database' : 'legacy',
  };
}

export async function listMediaLibrary(query = ''): Promise<MediaLibraryItem[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, path, mime, alt, tags_json, width, height, created_at FROM media_assets ORDER BY id DESC LIMIT 1000'
  );

  const dbByPath = new Map<string, MediaLibraryItem>();
  const legacyDb: MediaLibraryItem[] = [];
  for (const row of rows) {
    const item = rowToItem(row);
    if (item.path.startsWith(`${mediaBaseUrl()}/images/`) || item.path.startsWith(`${mediaBaseUrl()}/svg/`) || item.path.startsWith(`${mediaBaseUrl()}/video/`)) {
      dbByPath.set(item.path, { ...item, source: 'database' });
    } else {
      legacyDb.push({ ...item, source: 'legacy' });
    }
  }

  const scanned = [
    ...(await scanCategory('images')),
    ...(await scanCategory('svg')),
    ...(await scanCategory('video')),
  ];

  const merged: MediaLibraryItem[] = [];

  for (const file of scanned) {
    const db = dbByPath.get(file.path);
    if (db) {
      merged.push({
        ...db,
        mime: db.mime || file.mime,
        source: 'database',
      });
      dbByPath.delete(file.path);
    } else {
      merged.push({
        id: null,
        path: file.path,
        mime: file.mime,
        alt: null,
        tags_json: null,
        width: null,
        height: null,
        created_at: null,
        category: categoryFromPath(file.path) as AdminMediaCategory,
        source: 'filesystem',
      });
    }
  }

  // DB rows without a matching file on disk (e.g. legacy /uploads or deleted files)
  for (const item of dbByPath.values()) merged.push(item);
  merged.push(...legacyDb);

  merged.sort((a, b) => {
    const aTime = a.created_at ? Date.parse(a.created_at) : 0;
    const bTime = b.created_at ? Date.parse(b.created_at) : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.path.localeCompare(b.path);
  });

  const q = query.trim().toLowerCase();
  if (!q) return merged;

  return merged.filter((item) => {
    const tags = (item.tags_json || []).join(' ').toLowerCase();
    return (
      item.path.toLowerCase().includes(q) ||
      String(item.alt || '').toLowerCase().includes(q) ||
      tags.includes(q) ||
      item.category.includes(q)
    );
  });
}

export async function upsertMediaMetadata(input: {
  path: string;
  alt?: string | null;
  tags?: string[];
  mime?: string | null;
}) {
  const assetPath = input.path.trim();
  if (!assetPath) throw new Error('path required');

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM media_assets WHERE path = ? LIMIT 1',
    [assetPath]
  );

  if (rows[0]) {
    const id = Number(rows[0].id);
    if (input.alt !== undefined) {
      await pool.query('UPDATE media_assets SET alt = ? WHERE id = ?', [input.alt, id]);
    }
    if (input.tags !== undefined) {
      await pool.query('UPDATE media_assets SET tags_json = ? WHERE id = ?', [JSON.stringify(input.tags), id]);
    }
    return id;
  }

  const mime = input.mime || mimeFromFilename(assetPath);
  const [result] = await pool.query(
    'INSERT INTO media_assets (path, mime, alt, tags_json) VALUES (?, ?, ?, ?)',
    [assetPath, mime, input.alt ?? null, input.tags ? JSON.stringify(input.tags) : null]
  );
  return (result as { insertId: number }).insertId;
}

export async function findMediaById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, path, mime, alt, tags_json, width, height, created_at FROM media_assets WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] ? rowToItem(rows[0]) : null;
}

export function isDeletableMediaPath(publicPath: string) {
  return isManagedMediaPath(publicPath);
}

export function mediaKindFromMime(mime: string) {
  if (mime.startsWith('video/')) return 'video' as const;
  if (mime === 'image/svg+xml') return 'svg' as const;
  return 'image' as const;
}

export { adminCategoryFromMime };
