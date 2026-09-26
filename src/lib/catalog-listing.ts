import { getCatalogFacets, getPageSettings, listCatalogItems, listCatalogItemsByIds, listCategories } from '@/lib/catalog';
import { catalogListingKey, normalizeListingSort, type CatalogListingData, type CatalogListingSort } from '@/lib/catalog-listing-key';
import type { CatalogItemType } from '@/lib/types';

export { catalogListingKey, normalizeListingSort, type CatalogListingData, type CatalogListingSort };

export type CatalogListingFilters = {
  q?: string;
  category?: string;
  tag?: string;
  sort?: CatalogListingSort;
  featuredOnly?: boolean;
  limit?: number;
};

export async function loadCatalogListing(
  itemType: CatalogItemType,
  filters: CatalogListingFilters = {}
): Promise<CatalogListingData> {
  const { q, category, tag, featuredOnly, limit } = filters;
  const sort = filters.sort || 'featured';
  const settings = await getPageSettings(itemType);
  // Always honor deep-link filters from the menu (?category=&tag=), even if filter UI toggles are off.
  const [items, categories, heroItems, facets] = await Promise.all([
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
    getCatalogFacets({
      itemType,
      q,
      category,
      tag,
      searchFields: settings?.search_fields_json,
    }),
  ]);

  return {
    items,
    categories,
    settings: settings ?? null,
    tags: facets.tags.map((t) => t.value),
    facets,
    heroItems,
  };
}

type ListingSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

/**
 * Server-side first page for Projects/Products/Services listings.
 * JSON round-trip keeps props identical to what the client gets from the public API.
 */
export async function loadInitialCatalogListing(itemType: CatalogItemType, sp: ListingSearchParams) {
  const filters = {
    q: firstParam(sp.q),
    category: firstParam(sp.category),
    tag: firstParam(sp.tag),
    sort: normalizeListingSort(firstParam(sp.sort)),
  };
  try {
    const data = await loadCatalogListing(itemType, filters);
    return {
      initialData: JSON.parse(JSON.stringify(data)) as CatalogListingData,
      initialKey: catalogListingKey(filters),
    };
  } catch (error) {
    console.error(error);
    return { initialData: null, initialKey: undefined };
  }
}
