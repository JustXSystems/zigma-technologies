import { cache } from 'react';
import { getThemeSettings } from '@/lib/cms';
import { getPublicNavRows } from '@/lib/nav-data';
import { buildFooterColumns, buildNavTree, type FooterColumn } from '@/lib/nav-tree';
import type { NavItem } from '@/lib/nav-types';
import { mergeSiteCopy, type SiteCopy } from '@/lib/site-copy';
import { mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';

export type SiteShellData = {
  settings: SiteSettings;
  copy: SiteCopy;
  headerNav: NavItem[] | null;
  footerColumns: FooterColumn[] | null;
};

/** Single cached fetch for layout chrome — avoids duplicate DB/API round-trips per request. */
export const loadSiteShell = cache(async (): Promise<SiteShellData> => {
  const [theme, headerRows, footerRows] = await Promise.all([
    getThemeSettings(),
    getPublicNavRows('header'),
    getPublicNavRows('footer'),
  ]);

  const settings = mergeSiteSettings(theme.site);
  const copy = mergeSiteCopy(theme.site_copy);
  const headerNav = headerRows.length ? buildNavTree(headerRows) : null;
  const footerColumns = footerRows.length ? buildFooterColumns(footerRows) : null;

  return { settings, copy, headerNav, footerColumns };
});
