import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { deleteCatalogItem, getCatalogItemById, updateCatalogItem } from '@/lib/catalog';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  category_id: z.number().nullable().optional(),
  tags_json: z.array(z.string()).optional(),
  specs_json: z.record(z.string(), z.string()).optional(),
  price_label: z.string().nullable().optional(),
  availability_label: z.string().nullable().optional(),
  lead_time_label: z.string().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
  featured: z.boolean().optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().optional(),
  cta_config_json: z.record(z.string(), z.unknown()).nullable().optional(),
  case_study_json: z.record(z.string(), z.unknown()).nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const item = await getCatalogItemById(Number(id));
    if (!item) return jsonError('Not found', 404);
    return jsonOk({ item });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Failed to load item', 500);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = updateSchema.parse(await readJson(request));
    const item = await updateCatalogItem(Number(id), body);
    if (!item) return jsonError('Not found', 404);
    return jsonOk({ item });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400, { details: error.issues });
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Update failed', 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    await deleteCatalogItem(Number(id));
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Delete failed', 500);
  }
}
