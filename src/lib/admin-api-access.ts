/**
 * Which admin screens may call which admin API — enforced once in `src/proxy.ts`.
 *
 * Reads are granted to every screen that needs the data (e.g. image pickers on many screens read
 * Media); writes stay with the screen that owns it. Unlisted APIs are full-admin only.
 */
import { hasScreenAccess, type AdminScreenKey } from '@/lib/admin-screens';

type Access = readonly AdminScreenKey[] | 'anySession';
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiRule = {
  /** Path prefix under `/api/admin`, matched on whole segments. */
  prefix: string;
  read: Access;
  /** Defaults to `read`. */
  write?: Access;
  /** Per-method override, wins over read/write. */
  methods?: Partial<Record<Method, Access>>;
};

/** Screens that embed the media picker / uploader. */
const MEDIA_CONSUMERS: readonly AdminScreenKey[] = [
  'media',
  'pages',
  'inventory',
  'catalogSettings',
  'resources',
  'press',
  'testimonials',
  'siteSettings',
  'siteCopy',
  'theme',
  'partners',
];

const CATALOG_SCREENS: readonly AdminScreenKey[] = ['inventory', 'catalogSettings'];

export const ADMIN_API_RULES: readonly ApiRule[] = [
  { prefix: '/auth', read: 'anySession' },
  { prefix: '/dashboard', read: ['dashboard'] },
  { prefix: '/setup', read: ['dashboard'] },

  { prefix: '/pages', read: ['pages'] },
  { prefix: '/sections', read: ['pages'] },
  { prefix: '/site-settings', read: ['siteSettings', 'pages'], write: ['siteSettings'] },
  { prefix: '/nap-link', read: ['siteSettings'] },
  { prefix: '/site-copy', read: ['siteCopy'] },
  { prefix: '/nav', read: ['nav'] },
  { prefix: '/theme', read: ['theme'] },
  { prefix: '/redirects', read: ['redirects'] },

  {
    prefix: '/media',
    read: MEDIA_CONSUMERS,
    methods: { POST: MEDIA_CONSUMERS, PATCH: ['media'], DELETE: ['media'] },
  },

  { prefix: '/catalog', read: CATALOG_SCREENS, write: ['inventory'] },
  { prefix: '/catalog-settings', read: CATALOG_SCREENS, write: ['catalogSettings'] },
  { prefix: '/categories', read: CATALOG_SCREENS, write: ['catalogSettings'] },
  { prefix: '/catalog-transfer', read: ['inventory'] },

  { prefix: '/resources', read: ['resources'] },
  { prefix: '/press', read: ['press'] },
  { prefix: '/testimonials', read: ['testimonials'] },

  { prefix: '/enquiries', read: ['enquiries'] },
  { prefix: '/forms', read: ['forms'] },
  { prefix: '/newsletter', read: ['newsletter'] },
  { prefix: '/email', read: ['email'] },

  { prefix: '/new-client', read: ['newClient'] },
  { prefix: '/partners', read: ['partners'] },
  { prefix: '/ztools', read: ['ztools'] },
  { prefix: '/users', read: ['users'] },
  { prefix: '/roles', read: ['roles'] },
];

const API_BASE = '/api/admin';

function ruleFor(subPath: string): ApiRule | undefined {
  let best: ApiRule | undefined;
  for (const rule of ADMIN_API_RULES) {
    const hit = subPath === rule.prefix || subPath.startsWith(`${rule.prefix}/`);
    if (hit && (!best || rule.prefix.length > best.prefix.length)) best = rule;
  }
  return best;
}

function accessFor(rule: ApiRule, method: string): Access {
  const override = rule.methods?.[method.toUpperCase() as Method];
  if (override) return override;
  const isRead = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  return isRead ? rule.read : (rule.write ?? rule.read);
}

/** Whether a signed-in user with `screens` may call `method pathname` (an `/api/admin/...` path). */
export function canCallAdminApi(
  screens: AdminScreenKey[] | '*',
  pathname: string,
  method: string
): boolean {
  if (screens === '*') return true;
  if (!pathname.startsWith(API_BASE)) return false;
  const rule = ruleFor(pathname.slice(API_BASE.length) || '/');
  if (!rule) return false;
  const access = accessFor(rule, method);
  if (access === 'anySession') return true;
  return access.some((key) => hasScreenAccess(screens, key));
}

/** True when an `/api/admin/...` path is covered by a rule (used by the coverage check). */
export function hasAdminApiRule(pathname: string): boolean {
  return pathname.startsWith(API_BASE) && !!ruleFor(pathname.slice(API_BASE.length) || '/');
}
