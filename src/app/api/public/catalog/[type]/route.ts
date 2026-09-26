import { jsonError, jsonOk } from '@/lib/api';
import { loadCatalogListing, normalizeListingSort } from '@/lib/catalog-listing';
import type { CatalogItemType } from '@/lib/types';

type Ctx = { params: Promise<{ type: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    const { type } = await ctx.params;
    if (!['project', 'product', 'service'].includes(type)) {
      return jsonError('Invalid type', 404);
    }
    const itemType = type as CatalogItemType;
    const { searchParams } = new URL(request.url);

    const data = await loadCatalogListing(itemType, {
      q: searchParams.get('q') || undefined,
      category: searchParams.get('category') || undefined,
      tag: searchParams.get('tag') || undefined,
      featuredOnly: searchParams.get('featured') === '1',
      limit: Number(searchParams.get('limit') || 0) || undefined,
      sort: normalizeListingSort(searchParams.get('sort')),
    });

    return jsonOk(data);
  } catch (error) {
    console.error(error);
    return jsonError('Failed to load catalog', 500);
  }
}
