import type { Metadata } from 'next';

export const SITE_NAME = 'Zigma Technologies';
export const DEFAULT_LOCALE = 'en_IN';
/** Generated 1200×630 share card (`src/app/og.png/route.tsx`). */
export const DEFAULT_OG_IMAGE = '/og.png';
const LEGACY_LOGO_OG_IMAGE = '/assets/images/zigma-technologies-logo.png';

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://zigma-technologies.com').replace(/\/$/, '');
}

/** Only builds made with NEXT_PUBLIC_SEO_INDEXABLE=true (production) may be indexed. */
export function isIndexable(): boolean {
  return process.env.NEXT_PUBLIC_SEO_INDEXABLE === 'true';
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteOrigin()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/** Site Settings OG image, ignoring the square logo that used to be the default. */
export function siteOgImage(settingsOgImage: string | null | undefined): string {
  const value = (settingsOgImage || '').trim();
  return value && value !== LEGACY_LOGO_OG_IMAGE ? value : DEFAULT_OG_IMAGE;
}

export function plainText(html: string | null | undefined): string {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clampDescription(text: string | null | undefined, max = 160): string {
  const clean = plainText(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 80 ? cut.slice(0, lastSpace) : cut}…`;
}

/** Titles that already contain the brand bypass the root "%s | Zigma Technologies" template. */
export function pageTitle(raw: string): NonNullable<Metadata['title']> {
  const t = raw.trim();
  return t.toLowerCase().includes(SITE_NAME.toLowerCase()) ? { absolute: t } : t;
}

export type PageSeoInput = {
  title: string;
  description: string | null | undefined;
  /** Path relative to the site root, e.g. `/projects/abc`. Becomes the canonical URL. */
  path: string;
  image?: string | null;
  imageAlt?: string;
  type?: 'website' | 'article';
  publishedTime?: string | null;
  modifiedTime?: string | null;
  noindex?: boolean;
  locale?: string;
  /** hreflang map — build with `localeAlternates()`. */
  languages?: Record<string, string>;
};

export function buildPageMetadata(input: PageSeoInput): Metadata {
  const description = clampDescription(input.description);
  const image = input.image || DEFAULT_OG_IMAGE;
  const socialTitle = input.title.trim();
  const indexable = isIndexable() && !input.noindex;

  return {
    title: pageTitle(input.title),
    description,
    alternates: {
      canonical: input.path,
      ...(input.languages ? { languages: input.languages } : {}),
    },
    openGraph: {
      type: input.type || 'website',
      url: input.path,
      siteName: SITE_NAME,
      locale: input.locale || DEFAULT_LOCALE,
      title: socialTitle,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: input.imageAlt || socialTitle }],
      ...(input.type === 'article'
        ? {
            ...(input.publishedTime ? { publishedTime: toIsoDate(input.publishedTime) } : {}),
            ...(input.modifiedTime ? { modifiedTime: toIsoDate(input.modifiedTime) } : {}),
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [image],
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-snippet': -1,
            'max-image-preview': 'large',
            'max-video-preview': -1,
          },
        }
      : { index: false, follow: true },
  };
}

/** Reciprocal hreflang map. Only pass paths for language versions that are indexable. */
export function localeAlternates(paths: { en: string; hi?: string | null; kn?: string | null }) {
  return {
    'en-IN': paths.en,
    ...(paths.hi ? { 'hi-IN': paths.hi } : {}),
    ...(paths.kn ? { 'kn-IN': paths.kn } : {}),
    'x-default': paths.en,
  };
}

export function toIsoDate(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** `path` may be omitted only on the last crumb (the current page). */
export function breadcrumbJsonLd(items: { name: string; path?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export function organizationId() {
  return `${siteOrigin()}/#organization`;
}

export function websiteId() {
  return `${siteOrigin()}/#website`;
}
