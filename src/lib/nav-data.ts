import { cache } from 'react';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import { parseJsonField } from '@/lib/types';
import type { FlatNavRow } from '@/lib/nav-tree';

export const getPublicNavRows = cache(async (location: 'header' | 'footer'): Promise<FlatNavRow[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM nav_items WHERE location = ? AND enabled = 1 ORDER BY sort_order ASC, id ASC`,
    [location]
  );
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    href: row.href,
    parent_id: row.parent_id,
    sort_order: row.sort_order,
    meta_json: parseJsonField<Record<string, unknown>>(row.meta_json, {}),
  }));
});
