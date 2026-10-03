import type { SiteCopy } from '@/lib/site-copy';
import type { CatalogItemType } from '@/lib/types';

export type CatalogCopyKey = keyof SiteCopy['catalog'];

export const catalogCopyKey = (type: CatalogItemType) => `${type}s` as CatalogCopyKey;

/**
 * Site Copy owned by the catalog pages: listing hero defaults (`catalog.<kind>`) and the partner strip.
 * Catalog settings edits them; Site Copy saves leave them untouched.
 */
export const CATALOG_COPY_PATHS = ['catalog', 'socialProof'] as const;

/** The partner strip text Catalog settings edits (stored in Site Copy). */
export const PARTNER_STRIP_PATHS = [
  'socialProof.title',
  'socialProof.subtitle',
  'catalog.products.socialProofTitle',
  'catalog.services.socialProofTitle',
  'catalog.projects.socialProofTitle',
] as const;
