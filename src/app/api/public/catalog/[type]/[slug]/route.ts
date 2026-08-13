import { jsonError, jsonOk } from '@/lib/api';
import { getCatalogItemBySlug } from '@/lib/catalog';
import type { CatalogItemType } from '@/lib/types';

type Ctx = { params: Promise<{ type: string; slug: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { type, slug } = await ctx.params;
    if (!['project', 'product', 'service'].includes(type)) {
      return jsonError('Invalid type', 404);
    }
    const item = await getCatalogItemBySlug(type as CatalogItemType, slug);
    if (!item) return jsonError('Not found', 404);
    return jsonOk({ item });
  } catch (error) {
    console.error(error);
    return jsonError('Failed to load item', 500);
  }
}
