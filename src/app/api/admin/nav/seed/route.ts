import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import pool from '@/lib/db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { FOOTER_NAV_SEED, HEADER_NAV_SEED, type NavSeedNode } from '@/lib/nav-seed';
import { normalizeNavTreeSortOrders } from '@/lib/cms';
import { revalidatePublicShell } from '@/lib/revalidate-public-shell';

/** Monotonic sort_order across the whole tree — never restart at 0 per parent. */
async function insertNode(
  location: 'header' | 'footer',
  node: NavSeedNode,
  parentId: number | null,
  nextSort: { n: number }
) {
  const sortOrder = nextSort.n++;
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO nav_items (location, label, href, parent_id, sort_order, enabled, meta_json)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [
      location,
      node.label,
      node.href ?? null,
      parentId,
      sortOrder,
      JSON.stringify(node.meta_json || {}),
    ]
  );
  const id = result.insertId;
  if (node.children?.length) {
    for (const child of node.children) {
      await insertNode(location, child, id, nextSort);
    }
  }
  return id;
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = (await readJson(request).catch(() => ({}))) as { location?: string };
    const location = body.location === 'footer' ? 'footer' : 'header';
    const seed = location === 'footer' ? FOOTER_NAV_SEED : HEADER_NAV_SEED;

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS c FROM nav_items WHERE location = ?',
      [location]
    );
    if (Number(existing[0]?.c || 0) > 0) {
      return jsonOk({
        seeded: false,
        message: `${location} nav already has items. Delete them first to re-seed.`,
      });
    }

    const nextSort = { n: 0 };
    for (const node of seed) {
      await insertNode(location, node, null, nextSort);
    }
    await normalizeNavTreeSortOrders(location);
    revalidatePublicShell();

    return jsonOk({
      seeded: true,
      message: `Seeded ${location} navigation (${seed.length} top-level items).`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Seed failed', 500);
  }
}
