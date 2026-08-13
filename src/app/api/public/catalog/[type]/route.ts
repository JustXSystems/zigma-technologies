import { jsonError, jsonOk } from '@/lib/api';
import { getPageSettings, listCatalogItems, listCatalogItemsByIds, listCategories } from '@/lib/catalog';
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
    const q = searchParams.get('q') || undefined;
    const category = searchParams.get('category') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const featuredOnly = searchParams.get('featured') === '1';
    const limit = Number(searchParams.get('limit') || 0) || undefined;
    const sortRaw = searchParams.get('sort') || 'featured';
    const sort = sortRaw === 'newest' || sortRaw === 'title' || sortRaw === 'featured' ? sortRaw : 'featured';

    const settings = await getPageSettings(itemType);
    // Always honor deep-link filters from the menu (?category=&tag=), even if filter UI toggles are off.
    const [items, categories, heroItems] = await Promise.all([
      listCatalogItems({
        itemType,
        q,
        category,
        tag,
        featuredOnly,
        limit,
        sort,
        searchFields: settings?.search_fields_json,
      }),
      listCategories(itemType),
      settings?.hero_item_ids_json?.length
        ? listCatalogItemsByIds(itemType, settings.hero_item_ids_json)
        : listCatalogItems({ itemType, featuredOnly: true, limit: 4 }),
    ]);

    const tags = Array.from(
      new Set(
        items
          .flatMap((item) => item.tags_json || [])
          .map((t) => String(t).trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return jsonOk({ items, categories, settings, tags, heroItems });
  } catch (error) {
    console.error(error);
    return jsonError('Failed to load catalog', 500);
  }
}
