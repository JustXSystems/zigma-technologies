'use client';

import AdminHub, { type AdminHubTab } from '@/components/admin/AdminHub';
import SiteSettingsEditor from '@/components/admin/site-settings/SiteSettingsEditor';
import NavMenusEditor from './NavMenusEditor';
import ChromeLabelsEditor from './ChromeLabelsEditor';

type Tab = 'menus' | 'header' | 'footer' | 'labels';

const TABS: readonly AdminHubTab<Tab>[] = [
  {
    id: 'menus',
    label: 'Menus',
    screen: 'nav',
    description: 'Header mega-menu and footer link columns. Each change saves immediately.',
  },
  {
    id: 'header',
    label: 'Header',
    screen: 'siteSettings',
    description: 'Logo size and type, menu style and fonts, the Request Consultation and Talk to us buttons, sticky and floating CTAs.',
  },
  {
    id: 'footer',
    label: 'Footer',
    screen: 'siteSettings',
    description: 'Footer brand column, office block, copyright, powered-by credit and policy links.',
  },
  {
    id: 'labels',
    label: 'Labels',
    screen: 'siteCopy',
    description: 'Footer, sticky bar, search box and icon button text.',
  },
];

export default function HeaderFooterHub({ initialTab }: { initialTab?: string }) {
  return (
    <AdminHub
      title="Header & Footer"
      intro="Everything in the site frame: menus, header and footer settings, and their text labels."
      tabs={TABS}
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
