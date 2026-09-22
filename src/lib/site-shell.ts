import { cache } from 'react';
import { getThemeSettings } from '@/lib/cms';
import { isDbUnavailableError } from '@/lib/db';
import { resolvePublicFooterColumns, resolvePublicHeaderNav } from '@/lib/nav-data';
import type { FooterColumn } from '@/lib/nav-tree';
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
  try {
    const [theme, headerNav, footerColumns] = await Promise.all([
      getThemeSettings(),
      resolvePublicHeaderNav(),
      resolvePublicFooterColumns(),
    ]);

    const settings = mergeSiteSettings(theme.site);
    const copy = mergeSiteCopy(theme.site_copy);

    return { settings, copy, headerNav, footerColumns };
  } catch (err) {
    if (isDbUnavailableError(err)) {
      return {
        settings: mergeSiteSettings(undefined),
        copy: mergeSiteCopy(undefined),
        headerNav: null,
        footerColumns: null,
      };
    }
    throw err;
  }
});
