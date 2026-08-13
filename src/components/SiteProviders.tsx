'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { FooterColumn } from '@/lib/nav-tree';
import type { NavItem } from '@/lib/nav-types';
import { DEFAULT_SITE_COPY, type SiteCopy } from '@/lib/site-copy';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@/lib/site-settings';

type SiteShellContextValue = {
  settings: SiteSettings;
  copy: SiteCopy;
  headerNav: NavItem[] | null;
  footerColumns: FooterColumn[] | null;
};

const SiteShellContext = createContext<SiteShellContextValue>({
  settings: DEFAULT_SITE_SETTINGS,
  copy: DEFAULT_SITE_COPY,
  headerNav: null,
  footerColumns: null,
});

export function useSiteShell() {
  return useContext(SiteShellContext);
}

type Props = {
  children: ReactNode;
  settings: SiteSettings;
  copy: SiteCopy;
  headerNav: NavItem[] | null;
  footerColumns: FooterColumn[] | null;
};

export default function SiteProviders({ children, settings, copy, headerNav, footerColumns }: Props) {
  return (
    <SiteShellContext.Provider value={{ settings, copy, headerNav, footerColumns }}>
      {children}
    </SiteShellContext.Provider>
  );
}
