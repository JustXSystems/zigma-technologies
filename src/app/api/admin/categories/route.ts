import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { listCategories } from '@/lib/catalog';
import pool from '@/lib/db';
import type { ResultSetHeader } from 'mysql2';
import type { CatalogItemType } from '@/lib/types';
import { slugify } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requireSession();
    const type = new URL(request.url).searchParams.get('type') as CatalogItemType | null;
    const categories = await listCategories(type || undefined, true);
    return jsonOk({ categories });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Failed to load categories', 500);
  }
}

const createSchema = z.object({
  item_type: z.enum(['project', 'product', 'service']),
  name: z.string().min(1),
  slug: z.string().optional(),
  sort_order: z.number().optional(),
  enabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = createSchema.parse(await readJson(request));
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO catalog_categories (item_type, name, slug, sort_order, enabled)
       VALUES (?, ?, ?, ?, ?)`,
      [
        body.item_type,
        body.name,
        slugify(body.slug || body.name),
        body.sort_order ?? 0,
        body.enabled === false ? 0 : 1,
      ]
    );
    return jsonOk({ id: result.insertId }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
