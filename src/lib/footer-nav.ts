import type { FooterColumn } from '@/lib/nav-tree';

/** Admin → Navigation (footer) only — no built-in default columns. */
export function footerColumnsForSite(cmsColumns: FooterColumn[] | null | undefined): FooterColumn[] {
  return cmsColumns ?? [];
}
