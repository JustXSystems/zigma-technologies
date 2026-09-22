import { cache } from 'react';
import pool, { isDbUnavailableError } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import { parseJsonField } from '@/lib/types';
import { buildFooterColumns, buildNavTree, type FlatNavRow, type FooterColumn } from '@/lib/nav-tree';
import type { NavItem } from '@/lib/nav-types';

function rowEnabled(row: RowDataPacket): boolean {
  if (row.enabled == null) return true;
  return Number(row.enabled) === 1;
}

function mapNavRow(row: RowDataPacket): FlatNavRow {
  return {
    id: Number(row.id),
    label: row.label,
    href: row.href,
    parent_id: row.parent_id == null ? null : Number(row.parent_id),
    sort_order: Number(row.sort_order),
    enabled: rowEnabled(row),
    meta_json: parseJsonField<Record<string, unknown>>(row.meta_json, {}),
  };
}

/** All rows for a location (matches Admin → Navigation list). Used to build footer columns reliably. */
async function loadAllNavRowsForLocation(location: 'header' | 'footer'): Promise<FlatNavRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM nav_items WHERE location = ? ORDER BY sort_order ASC, id ASC`,
    [location]
  );
  return rows.map(mapNavRow);
}

/** Enabled rows plus ancestor chain so column headers stay linked when only children are enabled. */
async function loadNavRowsForLocation(location: 'header' | 'footer'): Promise<FlatNavRow[]> {
  const [enabledRows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM nav_items WHERE location = ? AND enabled = 1 ORDER BY sort_order ASC, id ASC`,
    [location]
  );
  if (!enabledRows.length) return [];

  const byId = new Map<number, FlatNavRow>();
  for (const row of enabledRows) {
    byId.set(Number(row.id), mapNavRow(row));
  }

  let pending = new Set<number>();
  for (const row of enabledRows) {
    let pid = row.parent_id == null ? null : Number(row.parent_id);
    while (pid != null && !byId.has(pid)) {
      pending.add(pid);
      pid = null;
    }
  }

  while (pending.size) {
    const ids = [...pending];
    pending.clear();
    const [parents] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM nav_items WHERE location = ? AND id IN (${ids.map(() => '?').join(',')})`,
      [location, ...ids]
    );
    for (const row of parents) {
      const id = Number(row.id);
      if (byId.has(id)) continue;
      byId.set(id, mapNavRow(row));
      const pp = row.parent_id == null ? null : Number(row.parent_id);
      if (pp != null && !byId.has(pp)) pending.add(pp);
    }
  }

  return [...byId.values()].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export const getPublicNavRows = cache(async (location: 'header' | 'footer'): Promise<FlatNavRow[]> => {
  try {
    return await loadNavRowsForLocation(location);
  } catch (err) {
    if (isDbUnavailableError(err)) return [];
    throw err;
  }
});

export async function resolvePublicFooterColumns(): Promise<FooterColumn[]> {
  try {
    const rows = await loadAllNavRowsForLocation('footer');
    if (!rows.length) return [];
    return buildFooterColumns(rows);
  } catch (err) {
    if (isDbUnavailableError(err)) return [];
    throw err;
  }
}

export async function resolvePublicHeaderNav(): Promise<NavItem[] | null> {
  const rows = await getPublicNavRows('header');
  if (!rows.length) return null;
  const tree = buildNavTree(rows);
  return tree.length ? tree : null;
}
