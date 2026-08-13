import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import pool from '@/lib/db';

const schema = z.object({
  label: z.string().min(1).optional(),
  href: z.string().nullable().optional(),
  parent_id: z.number().nullable().optional(),
  sort_order: z.number().optional(),
  enabled: z.boolean().optional(),
  meta_json: z.record(z.string(), z.unknown()).optional(),
  location: z.enum(['header', 'footer']).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = schema.parse(await readJson(request));
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      label: body.label,
      href: body.href,
      parent_id: body.parent_id,
      sort_order: body.sort_order,
      enabled: body.enabled === undefined ? undefined : body.enabled ? 1 : 0,
      meta_json: body.meta_json !== undefined ? JSON.stringify(body.meta_json) : undefined,
      location: body.location,
    };
    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined) {
        fields.push(`${k} = ?`);
        params.push(v);
      }
    }
    if (fields.length) {
      params.push(Number(id));
      await pool.query(`UPDATE nav_items SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Update failed', 500);
  }
}

async function collectDescendantIds(rootId: number): Promise<number[]> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, parent_id FROM nav_items');
  const byParent = new Map<number, number[]>();
  for (const row of rows) {
    if (row.parent_id == null) continue;
    const list = byParent.get(Number(row.parent_id)) || [];
    list.push(Number(row.id));
    byParent.set(Number(row.parent_id), list);
  }
  const ordered: number[] = [];
  const walk = (id: number) => {
    for (const child of byParent.get(id) || []) walk(child);
    ordered.push(id);
  };
  walk(rootId);
  return ordered;
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const rootId = Number(id);
    const ids = await collectDescendantIds(rootId);
    if (ids.length) {
      await pool.query(`DELETE FROM nav_items WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    }
    return jsonOk({ ok: true, deleted: ids.length || 1 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Delete failed', 500);
  }
}
