import { DEFAULT_FOOTER_COLUMNS } from '@/lib/footer-default-columns';
import { filterFooterColumnsForFeatures } from '@/lib/nav-features';
import type { FooterColumn } from '@/lib/nav-tree';
import type { SiteCopy } from '@/lib/site-copy';

/** CMS footer columns when present; otherwise feature-aware defaults (same idea as Header + DEFAULT_NAV). */
export function footerColumnsForSite(
  cmsColumns: FooterColumn[] | null | undefined,
  features: SiteCopy['features']
): FooterColumn[] {
  if (cmsColumns?.length) return cmsColumns;
  return filterFooterColumnsForFeatures(DEFAULT_FOOTER_COLUMNS, features);
}
