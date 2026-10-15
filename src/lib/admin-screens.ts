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
  /** What is edited here, in the admin's words (dashboard cards and quick-find). */
  summary: string;
  /** Shown only to super-admins in the role editor (always granted to role=admin users). */
  superAdminOnly?: boolean;
  /** Hub screens: holders of these screens may open it too and see only their tabs. */
  openWith?: AdminScreenKey[];
  /** Role editor label when the permission covers only part of a hub. */
  accessLabel?: string;
  /** Every signed-in user may open it (not assignable in the role editor). */
  alwaysOpen?: boolean;
};

/** Sidebar order: what admins edit most comes first; the site frame and look next; platform last. */
export const ADMIN_SCREEN_DEFS: AdminScreenDef[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin', exact: true, group: 'Overview', summary: 'Counts, setup checklist and shortcuts' },
  { key: 'guide', label: 'Guide', href: '/admin/guide', group: 'Overview', summary: 'How-to articles for every admin screen' },
  {
    key: 'pages',
    label: 'Pages',
    href: '/admin/pages',
    group: 'Content',
    summary: 'Home, About, Contact and every other page: sections, text, images, order and SEO',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    href: '/admin/inventory',
    group: 'Content',
    summary: 'Products, projects and services: details, media, case studies and SEO',
  },
  {
    key: 'catalogSettings',
    label: 'Catalog Settings',
    href: '/admin/catalog-settings',
    group: 'Content',
    summary: 'Design of the product, project and service listing and detail pages',
  },
  { key: 'media', label: 'Media', href: '/admin/media', group: 'Content', summary: 'Upload and reuse images, videos and files' },
  { key: 'resources', label: 'Resources', href: '/admin/resources', group: 'Content', summary: 'Brochures, guides and articles in /resources' },
  { key: 'press', label: 'Press', href: '/admin/press', group: 'Content', summary: 'Press releases and coverage' },
  { key: 'testimonials', label: 'Testimonials', href: '/admin/testimonials', group: 'Content', summary: 'Client quotes shown across the site' },
  { key: 'enquiries', label: 'Enquiries', href: '/admin/enquiries', group: 'Leads', summary: 'Leads from the enquiry, contact and quote forms' },
  {
    key: 'forms',
    label: 'Forms & CRM',
    href: '/admin/forms',
    group: 'Leads',
    summary: 'Enquiry form fields, pop-up and thank-you text, CRM forwarding',
    openWith: ['siteCopy', 'siteSettings'],
    accessLabel: 'Enquiry form fields',
  },
  { key: 'newsletter', label: 'Newsletter', href: '/admin/newsletter', group: 'Leads', summary: 'Newsletter subscribers' },
  {
    key: 'siteSettings',
    label: 'Site Settings',
    href: '/admin/site-settings',
    group: 'Site setup',
    summary: 'Brand, contact details, social links, address, analytics and cookies',
  },
  {
    key: 'nav',
    label: 'Header & Footer',
    href: '/admin/header-footer',
    group: 'Site setup',
    summary: 'Menus, logo, header buttons, footer columns and their labels',
    openWith: ['siteSettings', 'siteCopy'],
    accessLabel: 'Header & Footer menus',
  },
  {
    key: 'theme',
    label: 'Theme Studio',
    href: '/admin/theme',
    group: 'Site setup',
    summary: 'Colours, spacing, typography and the site stylesheet',
    openWith: ['siteSettings'],
    accessLabel: 'Theme Studio colours, type scale & CSS',
  },
  {
    key: 'siteCopy',
    label: 'Site Copy',
    href: '/admin/site-copy',
    group: 'Site setup',
    summary: 'Text of built-in hubs, tools and language pages; feature switches',
  },
  {
    key: 'redirects',
    label: 'SEO',
    href: '/admin/seo',
    group: 'Site setup',
    summary: 'Default meta and share image, built-in page titles, redirects',
    openWith: ['siteSettings', 'siteCopy'],
    accessLabel: 'SEO redirects',
  },
  {
    key: 'email',
    label: 'Email',
    href: '/admin/email',
    group: 'Site setup',
    summary: 'Mail delivery, notification flows and auto-replies',
    superAdminOnly: true,
  },
  {
    key: 'newClient',
    label: 'New Client',
    href: '/admin/new-client',
    group: 'Platform',
    summary: 'Brand this deployment for another client',
    superAdminOnly: true,
  },
  { key: 'partners', label: 'Partners', href: '/admin/partners', group: 'Platform', summary: 'Partner portal users and documents' },
  { key: 'ztools', label: 'ZTools', href: '/admin/ztools', group: 'Platform', summary: 'ZTools inventory, registrations and users' },
  { key: 'users', label: 'Users', href: '/admin/users', group: 'Platform', summary: 'Admin users and their roles', superAdminOnly: true },
  { key: 'roles', label: 'Roles', href: '/admin/roles', group: 'Platform', summary: 'Which screens each role can open', superAdminOnly: true },
  { key: 'account', label: 'Account', href: '/admin/account', group: 'Platform', summary: 'Your name, email and password', alwaysOpen: true },
];

export const ADMIN_SCREEN_KEYS = ADMIN_SCREEN_DEFS.map((s) => s.key);

const ALWAYS_OPEN = new Set(ADMIN_SCREEN_DEFS.filter((s) => s.alwaysOpen).map((s) => s.key));

/** Screens a custom role may grant: full-admin-only and always-open screens are never assignable. */
export const ASSIGNABLE_SCREEN_DEFS = ADMIN_SCREEN_DEFS.filter((s) => !s.superAdminOnly && !s.alwaysOpen);
const ASSIGNABLE = new Set<string>(ASSIGNABLE_SCREEN_DEFS.map((s) => s.key));

/** Unique assignable screens in nav order — what a role stores. */
export function normalizeRoleScreens(keys: readonly string[]): AdminScreenKey[] {
  const wanted = new Set(keys);
  return ASSIGNABLE_SCREEN_DEFS.filter((s) => wanted.has(s.key)).map((s) => s.key);
}

export function isAssignableScreen(key: string): key is AdminScreenKey {
  return ASSIGNABLE.has(key);
}

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
  return ALWAYS_OPEN.has(key) || screens.includes(key);
}

/** Where a user lands: the dashboard, else the first screen they may open (Account at worst). */
export function adminHomeHref(screens: AdminScreenKey[] | '*'): string {
  const home = ADMIN_SCREEN_DEFS.find((s) => !s.alwaysOpen && canOpenScreen(screens, s.key));
  return home?.href ?? '/admin/account';
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
