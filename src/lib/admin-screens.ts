/** Admin screen keys — single source of truth for nav + RBAC. */

export type AdminScreenKey =
  | 'dashboard'
  | 'guide'
  | 'pages'
  | 'inventory'
  | 'catalogSettings'
  | 'resources'
  | 'press'
  | 'testimonials'
  | 'enquiries'
  | 'forms'
  | 'newsletter'
  | 'nav'
  | 'siteSettings'
  | 'email'
  | 'siteCopy'
  | 'media'
  | 'theme'
  | 'redirects'
  | 'newClient'
  | 'partners'
  | 'ztools'
  | 'users'
  | 'roles'
  | 'account';

export type AdminScreenDef = {
  key: AdminScreenKey;
  label: string;
  href: string;
  exact?: boolean;
  group: string;
  /** Shown only to super-admins in the role editor (always granted to role=admin users). */
  superAdminOnly?: boolean;
  /** Hub screens: holders of these screens may open it too and see only their tabs. */
  openWith?: AdminScreenKey[];
  /** Role editor label when the permission covers only part of a hub. */
  accessLabel?: string;
};

export const ADMIN_SCREEN_DEFS: AdminScreenDef[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin', exact: true, group: 'Overview' },
  { key: 'guide', label: 'Guide', href: '/admin/guide', group: 'Overview' },
  { key: 'pages', label: 'Pages', href: '/admin/pages', group: 'Content' },
  { key: 'inventory', label: 'Inventory', href: '/admin/inventory', group: 'Content' },
  { key: 'catalogSettings', label: 'Catalog Settings', href: '/admin/catalog-settings', group: 'Content' },
  { key: 'resources', label: 'Resources', href: '/admin/resources', group: 'Content' },
  { key: 'press', label: 'Press', href: '/admin/press', group: 'Content' },
  { key: 'testimonials', label: 'Testimonials', href: '/admin/testimonials', group: 'Content' },
  { key: 'enquiries', label: 'Enquiries', href: '/admin/enquiries', group: 'Leads' },
  {
    key: 'forms',
    label: 'Forms & CRM',
    href: '/admin/forms',
    group: 'Leads',
    openWith: ['siteCopy', 'siteSettings'],
    accessLabel: 'Enquiry form fields',
  },
  { key: 'newsletter', label: 'Newsletter', href: '/admin/newsletter', group: 'Leads' },
  {
    key: 'nav',
    label: 'Header & Footer',
    href: '/admin/header-footer',
    group: 'Configuration',
    openWith: ['siteSettings', 'siteCopy'],
    accessLabel: 'Header & Footer menus',
  },
  { key: 'siteSettings', label: 'Site Settings', href: '/admin/site-settings', group: 'Configuration' },
  { key: 'email', label: 'Email', href: '/admin/email', group: 'Configuration', superAdminOnly: true },
  { key: 'siteCopy', label: 'Site Copy', href: '/admin/site-copy', group: 'Configuration' },
  { key: 'media', label: 'Media', href: '/admin/media', group: 'Configuration' },
  {
    key: 'theme',
    label: 'Theme Studio',
    href: '/admin/theme',
    group: 'Configuration',
    openWith: ['siteSettings'],
    accessLabel: 'Theme Studio colours, type scale & CSS',
  },
  {
    key: 'redirects',
    label: 'SEO',
    href: '/admin/seo',
    group: 'Configuration',
    openWith: ['siteSettings', 'siteCopy'],
    accessLabel: 'SEO redirects',
  },
  { key: 'newClient', label: 'New Client', href: '/admin/new-client', group: 'Platform', superAdminOnly: true },
  { key: 'partners', label: 'Partners', href: '/admin/partners', group: 'Platform' },
  { key: 'ztools', label: 'ZTools', href: '/admin/ztools', group: 'Platform' },
  { key: 'users', label: 'Users', href: '/admin/users', group: 'Platform', superAdminOnly: true },
  { key: 'roles', label: 'Roles', href: '/admin/roles', group: 'Platform', superAdminOnly: true },
  { key: 'account', label: 'Account', href: '/admin/account', group: 'Platform' },
];

export const ADMIN_SCREEN_KEYS = ADMIN_SCREEN_DEFS.map((s) => s.key);

/** Old admin URLs and where they live now (redirected by the proxy). */
export const MOVED_ADMIN_PATHS: Readonly<Record<string, string>> = {
  '/admin/nav': '/admin/header-footer?tab=menus',
  '/admin/redirects': '/admin/seo?tab=redirects',
};

const SCREEN_BY_HREF = ADMIN_SCREEN_DEFS.slice().sort((a, b) => b.href.length - a.href.length);

/** Default screens for the built-in "Editor" role (matches legacy editor access). */
export const DEFAULT_EDITOR_SCREENS: AdminScreenKey[] = ADMIN_SCREEN_DEFS.filter(
  (s) => !s.superAdminOnly && s.key !== 'newsletter' && s.key !== 'siteCopy' && s.key !== 'theme' && s.key !== 'redirects'
).map((s) => s.key);

export function isAdminScreenKey(value: string): value is AdminScreenKey {
  return (ADMIN_SCREEN_KEYS as string[]).includes(value);
}

export function screenKeyFromPath(pathname: string): AdminScreenKey | null {
  if (pathname === '/admin/login') return null;
  const hit = SCREEN_BY_HREF.find((s) =>
    s.exact ? pathname === s.href : pathname === s.href || pathname.startsWith(`${s.href}/`)
  );
  return hit?.key ?? null;
}

export function hasScreenAccess(
  screens: AdminScreenKey[] | '*',
  key: AdminScreenKey
): boolean {
  if (screens === '*') return true;
  return screens.includes(key);
}

/** Page-level access: the screen itself, or any screen listed in its `openWith`. */
export function canOpenScreen(screens: AdminScreenKey[] | '*', key: AdminScreenKey): boolean {
  if (hasScreenAccess(screens, key)) return true;
  const def = ADMIN_SCREEN_DEFS.find((s) => s.key === key);
  return !!def?.openWith?.some((k) => hasScreenAccess(screens, k));
}

export function navGroupsFromScreens(screens: AdminScreenKey[] | '*') {
  const groups = new Map<string, AdminScreenDef[]>();
  for (const def of ADMIN_SCREEN_DEFS) {
    if (!canOpenScreen(screens, def.key)) continue;
    const list = groups.get(def.group) || [];
    list.push(def);
    groups.set(def.group, list);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}
