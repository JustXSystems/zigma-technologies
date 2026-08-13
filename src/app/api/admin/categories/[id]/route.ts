import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import pool from '@/lib/db';
import { slugify } from '@/lib/types';

const schema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  sort_order: z.number().optional(),
  enabled: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = schema.parse(await readJson(request));
    const fields: string[] = [];
    const params: unknown[] = [];
    if (body.name !== undefined) {
      fields.push('name = ?');
      params.push(body.name);
    }
    if (body.slug !== undefined) {
      fields.push('slug = ?');
      params.push(slugify(body.slug));
    }
    if (body.sort_order !== undefined) {
      fields.push('sort_order = ?');
      params.push(body.sort_order);
    }
    if (body.enabled !== undefined) {
      fields.push('enabled = ?');
      params.push(body.enabled ? 1 : 0);
    }
    if (fields.length) {
      params.push(Number(id));
      await pool.query(`UPDATE catalog_categories SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Update failed', 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    await pool.query('DELETE FROM catalog_categories WHERE id = ?', [Number(id)]);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Delete failed', 500);
  }
}
