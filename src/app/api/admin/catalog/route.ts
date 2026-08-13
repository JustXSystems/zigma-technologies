import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createCatalogItem, deleteCatalogItemsByType, listCatalogItems, getPageSettings } from '@/lib/catalog';
import type { CatalogItemType } from '@/lib/types';

const createSchema = z.object({
  item_type: z.enum(['project', 'product', 'service']),
  title: z.string().min(1),
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
  case_study_json: z.record(z.string(), z.unknown()).nullable().optional(),
  cta_config_json: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get('type') as 'project' | 'product' | 'service' | null;
    if (!itemType || !['project', 'product', 'service'].includes(itemType)) {
      return jsonError('type query required: project|product|service');
    }
    const q = searchParams.get('q') || undefined;
    const category = searchParams.get('category') || undefined;
    const [items, settings] = await Promise.all([
      listCatalogItems({ itemType, q, category, admin: true }),
      getPageSettings(itemType),
    ]);
    return jsonOk({ items, settings });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    return jsonError('Failed to list catalog', 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = createSchema.parse(await readJson(request));
    const item = await createCatalogItem(body);
    return jsonOk({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400, { details: error.issues });
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}

/** Delete all inventory items of a type (?type=project|product|service). Media cascades via FK. */
export async function DELETE(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get('type') as CatalogItemType | null;
    if (!itemType || !['project', 'product', 'service'].includes(itemType)) {
      return jsonError('type query required: project|product|service');
    }
    const deleted = await deleteCatalogItemsByType(itemType);
    return jsonOk({
      ok: true,
      deleted,
      message: deleted
        ? `Deleted all ${deleted} ${itemType}${deleted === 1 ? '' : 's'}.`
        : `No ${itemType}s to delete.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Delete all failed', 500);
  }
}
