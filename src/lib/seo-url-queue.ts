/**
 * SEO URL event queue — unpublished / deleted / slug-moved public paths.
 * Meridian Catalog Continuum inspects pending rows and redirects to hubs when needed.
 */
import type { RowDataPacket } from 'mysql2';
import pool, { isDbUnavailableError } from '@/lib/db';
import { redirectMovedPath } from '@/lib/redirects';

let tableReady: Promise<void> | null = null;

export type SeoUrlEvent = 'unpublish' | 'delete' | 'slug_change';

export async function ensureSeoUrlQueueTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS seo_url_queue (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            path VARCHAR(500) NOT NULL,
            event VARCHAR(32) NOT NULL,
            hub_path VARCHAR(500) NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            note VARCHAR(500) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP NULL,
            INDEX idx_seo_queue_status (status, created_at),
            INDEX idx_seo_queue_path (path(191))
          ) ENGINE=InnoDB
        `);
      } catch (err) {
        if (isDbUnavailableError(err)) throw err;
        console.error('[schema] seo_url_queue', err);
        tableReady = null;
      }
    })();
  }
  return tableReady;
}

/** Queue a path that left the indexable set (unpublish / delete). Optionally 301 → hub. */
export async function enqueueSeoUrlRemoval(opts: {
  path: string;
  event: SeoUrlEvent;
  hubPath?: string | null;
  redirectToHub?: boolean;
}): Promise<void> {
  const path = normalizePublicPath(opts.path);
  if (!path || path === '/') return;
  try {
    await ensureSeoUrlQueueTable();
    if (opts.redirectToHub && opts.hubPath) {
      await redirectMovedPath(path, opts.hubPath);
    }
    await pool.query(
      `INSERT INTO seo_url_queue (path, event, hub_path, status)
       VALUES (?, ?, ?, 'pending')`,
      [path, opts.event, opts.hubPath ? normalizePublicPath(opts.hubPath) : null]
    );
  } catch (e) {
    console.warn('[seo-url-queue]', path, e instanceof Error ? e.message : e);
  }
}

export async function listPendingSeoUrlRemovals(limit = 40): Promise<
  Array<{ id: number; path: string; event: string; hub_path: string | null }>
> {
  await ensureSeoUrlQueueTable();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, path, event, hub_path FROM seo_url_queue
     WHERE status = 'pending' ORDER BY id ASC LIMIT ?`,
    [Math.min(limit, 100)]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    path: String(r.path),
    event: String(r.event),
    hub_path: r.hub_path ? String(r.hub_path) : null,
  }));
}

export async function markSeoUrlQueueProcessed(
  ids: number[],
  status: 'inspected' | 'done' | 'skipped' = 'inspected'
): Promise<void> {
  if (!ids.length) return;
  await ensureSeoUrlQueueTable();
  await pool.query(
    `UPDATE seo_url_queue SET status = ?, processed_at = CURRENT_TIMESTAMP
     WHERE id IN (${ids.map(() => '?').join(',')})`,
    [status, ...ids]
  );
}

function normalizePublicPath(p: string) {
  let s = String(p || '').trim();
  if (!s) return '';
  try {
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname;
  } catch {
    /* keep */
  }
  if (!s.startsWith('/')) s = `/${s}`;
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

export async function enqueueSeoUrlRemovalSafe(opts: Parameters<typeof enqueueSeoUrlRemoval>[0]) {
  try {
    await enqueueSeoUrlRemoval(opts);
  } catch {
    /* never block Admin */
  }
}

/** Detect publish → draft / disabled transitions for catalog-like records. */
export function leftIndexableSet(
  before: { status?: string; enabled?: boolean | number; seo_noindex?: boolean } | null,
  after: { status?: string; enabled?: boolean | number; seo_noindex?: boolean } | null
): boolean {
  if (!before) return false;
  const wasLive =
    before.status === 'published' &&
    !!Number(before.enabled) &&
    !before.seo_noindex;
  if (!wasLive) return false;
  if (!after) return true;
  const nowLive =
    after.status === 'published' && !!Number(after.enabled) && !after.seo_noindex;
  return !nowLive;
}
