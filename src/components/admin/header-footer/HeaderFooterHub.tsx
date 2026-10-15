'use client';

import AdminHub from '@/components/admin/AdminHub';
import { HEADER_FOOTER_TABS } from '@/lib/admin-hub-tabs';
import SiteSettingsEditor from '@/components/admin/site-settings/SiteSettingsEditor';
import NavMenusEditor from './NavMenusEditor';
import ChromeLabelsEditor from './ChromeLabelsEditor';

export default function HeaderFooterHub({ initialTab }: { initialTab?: string }) {
  return (
    <AdminHub
      title="Header & Footer"
      intro="Everything in the site frame: menus, header and footer settings, and their text labels."
      tabs={HEADER_FOOTER_TABS}
      initialTab={initialTab}
    >
      {(active, { can, select }) =>
        active === 'menus' ? (
          <NavMenusEditor
            onOpenMenuFonts={can('header') ? () => select('header', '#site-settings-nav-menu-style') : undefined}
          />
        ) : active === 'labels' ? (
          <ChromeLabelsEditor />
        ) : (
          <SiteSettingsEditor key={active} group={active} />
        )
      }
    </AdminHub>
  );
}
