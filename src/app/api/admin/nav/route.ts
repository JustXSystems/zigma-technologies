import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import pool from '@/lib/db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { parseJsonField } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requireSession();
    const location = new URL(request.url).searchParams.get('location') || undefined;
    const where = location ? 'WHERE location = ?' : '';
    const params = location ? [location] : [];
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM nav_items ${where} ORDER BY sort_order ASC, id ASC`,
      params
    );
    return jsonOk({
      items: rows.map((row) => ({
        ...row,
        meta_json: parseJsonField(row.meta_json, {}),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to load nav', 500);
  }
}

const createSchema = z.object({
  location: z.enum(['header', 'footer']).default('header'),
  label: z.string().min(1),
  href: z.string().nullable().optional(),
  parent_id: z.number().nullable().optional(),
  sort_order: z.number().optional(),
  enabled: z.boolean().optional(),
  meta_json: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = createSchema.parse(await readJson(request));
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO nav_items (location, label, href, parent_id, sort_order, enabled, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.location,
        body.label,
        body.href ?? null,
        body.parent_id ?? null,
        body.sort_order ?? 0,
        body.enabled === false ? 0 : 1,
        JSON.stringify(body.meta_json || {}),
      ]
    );
    return jsonOk({ id: result.insertId }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
