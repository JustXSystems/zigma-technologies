/** Slugs owned by dedicated App Router pages or system paths — not CMS catch-all. */
export const RESERVED_SITE_SLUGS = new Set([
  'admin',
  'api',
  'assets',
  'careers',
  'certifications',
  'contact',
  'cookies',
  'hi',
  'home',
  'industries',
  'kn',
  'locations',
  'manifest.webmanifest',
  'partner',
  'press',
  'products',
  'projects',
  'resources',
  'search',
  'services',
  'sla',
  'sw.js',
  'thank-you',
  'tools',
  'uploads',
]);

/** Slugs that must never be used for a custom CMS page (catalog + system). Dedicated CMS pages may still use home/contact/careers/certifications. */
export const BLOCKED_CUSTOM_PAGE_SLUGS = new Set([
  'admin',
  'api',
  'assets',
  'cookies',
  'hi',
  'industries',
  'kn',
  'locations',
  'newsletter',
  'partner',
  'press',
  'products',
  'projects',
  'resources',
  'search',
  'services',
  'sla',
  'thank-you',
  'tools',
  'uploads',
]);

export function isReservedSiteSlug(slug: string) {
  return RESERVED_SITE_SLUGS.has(slug.toLowerCase());
}

export function isBlockedCustomPageSlug(slug: string) {
  return BLOCKED_CUSTOM_PAGE_SLUGS.has(slug.toLowerCase());
}
