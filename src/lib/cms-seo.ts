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
  // Home with no meta title, brand-only, or doubled brand ("…zigma… | Zigma Technologies") → default.
  const homeMetaTitle = (page?.meta_title || '').trim();
  const brandLc = companyName.toLowerCase();
  const titleBrandHits = homeMetaTitle ? (homeMetaTitle.toLowerCase().match(new RegExp(brandLc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length : 0;
  const homeNeedsDefault =
    !homeMetaTitle || homeMetaTitle.toLowerCase() === brandLc || titleBrandHits > 1;
  const title =
    isHome && homeNeedsDefault
      ? `Solar EPC, UPS, BESS & EV Charging in Bangalore`
      : rawTitle;

  const rawDesc = (page?.meta_description || '').trim();
  const descLooksLikeExperiment =
    /defend winner|freshness\s*\+|variant\s*[ab]|ab[\s_-]?test/i.test(rawDesc);
  const description =
    (isHome && (!rawDesc || descLooksLikeExperiment)
      ? site.defaultMetaDescription || DEFAULT_SITE_SETTINGS.defaultMetaDescription
      : page?.meta_description || site.defaultMetaDescription || DEFAULT_SITE_SETTINGS.defaultMetaDescription);

  return buildPageMetadata({
    title,
    description,
    path: isHome ? '/' : `/${slug}`,
    image: siteOgImage(site.ogImage),
    ...(isHome && copy?.features.localesEnabled
      ? { languages: localeAlternates({ en: '/', hi: '/hi', kn: '/kn' }) }
      : {}),
  });
}
