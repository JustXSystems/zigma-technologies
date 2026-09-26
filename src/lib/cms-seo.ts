import type { Metadata } from 'next';
import { getPageBySlug, getThemeSettings } from '@/lib/cms';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from '@/lib/site-settings';
import { getSiteCopy } from '@/lib/site-content';
import { buildPageMetadata, localeAlternates, siteOgImage } from '@/lib/seo';

export async function buildCmsMetadata(slug: string): Promise<Metadata> {
  const isHome = slug === 'home';
  const [page, theme, copy] = await Promise.all([
    getPageBySlug(slug, false).catch(() => null),
    getThemeSettings().catch(() => ({}) as Awaited<ReturnType<typeof getThemeSettings>>),
    isHome ? getSiteCopy().catch(() => null) : Promise.resolve(null),
  ]);
  const site = mergeSiteSettings(theme?.site);
  const companyName = site.companyName || DEFAULT_SITE_SETTINGS.companyName;

  const rawTitle = page?.meta_title || page?.title || (isHome ? companyName : slug);
  // Home with no meta title, or a brand-only one, gets a descriptive default title.
  const homeMetaTitle = (page?.meta_title || '').trim();
  const homeNeedsDefault = !homeMetaTitle || homeMetaTitle.toLowerCase() === companyName.toLowerCase();
  const title =
    isHome && homeNeedsDefault ? `${companyName} | Solar EPC, UPS, BESS & EV Charging in India` : rawTitle;

  return buildPageMetadata({
    title,
    description:
      page?.meta_description || site.defaultMetaDescription || DEFAULT_SITE_SETTINGS.defaultMetaDescription,
    path: isHome ? '/' : `/${slug}`,
    image: siteOgImage(site.ogImage),
    ...(isHome && copy?.features.localesEnabled
      ? { languages: localeAlternates({ en: '/', hi: '/hi', kn: '/kn' }) }
      : {}),
  });
}
