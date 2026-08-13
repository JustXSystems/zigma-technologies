import { jsonError, jsonOk } from '@/lib/api';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import { parseJsonField } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const location = new URL(request.url).searchParams.get('location') || 'header';
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM nav_items WHERE location = ? AND enabled = 1 ORDER BY sort_order ASC, id ASC`,
      [location]
    );
    return jsonOk({
      items: rows.map((row) => ({
        id: row.id,
        label: row.label,
        href: row.href,
        parent_id: row.parent_id,
        sort_order: row.sort_order,
        meta_json: parseJsonField(row.meta_json, {}),
      })),
    });
  } catch (error) {
    console.error(error);
    return jsonError('Failed to load nav', 500);
  }
}
