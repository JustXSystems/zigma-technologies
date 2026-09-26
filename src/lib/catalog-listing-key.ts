import type { CatalogCategory, CatalogFacets, CatalogItem, CatalogPageSettings } from '@/lib/types';

export type CatalogListingSort = 'featured' | 'newest' | 'title';

export type CatalogListingData = {
  items: CatalogItem[];
  categories: CatalogCategory[];
  settings: CatalogPageSettings | null;
  tags: string[];
  facets: CatalogFacets;
  heroItems: CatalogItem[];
};

export function normalizeListingSort(raw: string | null | undefined): CatalogListingSort {
  return raw === 'newest' || raw === 'title' || raw === 'featured' ? raw : 'featured';
}

/** Key the client uses to know whether server-provided data matches the current URL filters. */
export function catalogListingKey(filters: { q?: string; category?: string; tag?: string; sort?: string }): string {
  return [filters.q || '', filters.category || '', filters.tag || '', filters.sort || 'featured'].join('|');
}
