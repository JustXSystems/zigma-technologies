import type { Metadata } from 'next';
import { getPageBySlug, getThemeSettings } from '@/lib/cms';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from '@/lib/site-settings';

function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zigma-technologies.com').replace(/\/$/, '');
}

export async function buildCmsMetadata(slug: string): Promise<Metadata> {
  const [page, theme] = await Promise.all([
    getPageBySlug(slug, false).catch(() => null),
    getThemeSettings().catch(() => ({}) as Awaited<ReturnType<typeof getThemeSettings>>),
  ]);
  const site = mergeSiteSettings(theme?.site);
  const titleBase = page?.meta_title || page?.title || (slug === 'home' ? site.companyName : slug);
  const title =
    slug === 'home' || titleBase.includes(site.companyName)
      ? titleBase
      : `${titleBase} | ${site.companyName || DEFAULT_SITE_SETTINGS.companyName}`;
  const description =
    page?.meta_description || site.defaultMetaDescription || DEFAULT_SITE_SETTINGS.defaultMetaDescription;
  const image = site.ogImage || DEFAULT_SITE_SETTINGS.ogImage;
  const path = slug === 'home' ? '/' : `/${slug}`;
  const url = `${siteOrigin()}${path}`;

  const imageAbsolute = image
    ? image.startsWith('http')
      ? image
      : `${siteOrigin()}${image}`
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: site.companyName,
      locale: 'en_IN',
      images: imageAbsolute
        ? [{ url: imageAbsolute, width: 1200, height: 630, alt: `${title} — ${site.companyName}` }]
        : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageAbsolute ? [imageAbsolute] : undefined,
    },
    alternates: { canonical: url },
    robots: { index: true, follow: true },
  };
}
