import type { MetadataRoute } from 'next';
import { listPages } from '@/lib/cms';
import { listCatalogItems, listItemMedia } from '@/lib/catalog';
import { catalogPublicPath } from '@/lib/catalog-case-study';
import { isReservedSiteSlug } from '@/lib/reserved-slugs';
import { listResourcePosts } from '@/lib/resources';
import { INDUSTRY_DEFS } from '@/lib/industries';
import { translatedCityKeys } from '@/lib/locale-locations';
import { LOCATION_DEFS } from '@/lib/locations';
import { hydrateCityIndexAllowlist } from '@/lib/city-index-allowlist';
import { allCityServicePairs, isCityServiceIndexable } from '@/lib/location-services';
import { listPressPosts } from '@/lib/press';
import { absoluteUrl, isIndexable, siteOrigin, toIsoDate } from '@/lib/seo';
import { getSiteCopy } from '@/lib/site-content';
import { publicMediaUrl } from '@/lib/media-url';

// CI builds have no database, so a build-time sitemap would be frozen with static routes only.
export const dynamic = 'force-dynamic';

function lastModified(...values: (string | null | undefined)[]) {
  for (const v of values) {
    const iso = toIsoDate(v);
    if (iso) return { lastModified: iso };
  }
  return {};
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexable()) return [];

  await hydrateCityIndexAllowlist();
  const origin = siteOrigin();
  const copy = await getSiteCopy();
  const locales = copy.features.localesEnabled;
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: 'weekly', priority: 1 },
    ...(locales
      ? [
          { url: `${origin}/hi`, changeFrequency: 'monthly' as const, priority: 0.6 },
          { url: `${origin}/kn`, changeFrequency: 'monthly' as const, priority: 0.6 },
        ]
      : []),
    { url: `${origin}/projects`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${origin}/products`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${origin}/services`, changeFrequency: 'weekly', priority: 0.8 },
    ...(copy.features.industriesEnabled
      ? [{ url: `${origin}/industries`, changeFrequency: 'monthly' as const, priority: 0.8 }]
      : []),
    { url: `${origin}/locations`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/blog`, changeFrequency: 'weekly', priority: 0.75 },
    { url: `${origin}/press`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${origin}/sla`, changeFrequency: 'monthly', priority: 0.55 },
    ...(copy.features.solutionFinderEnabled
      ? [{ url: `${origin}/tools/solution-finder`, changeFrequency: 'monthly' as const, priority: 0.7 }]
      : []),
    ...(copy.features.toolsEnabled
      ? [
          { url: `${origin}/tools/ups-calculator`, changeFrequency: 'monthly' as const, priority: 0.65 },
          { url: `${origin}/tools/solar-roi`, changeFrequency: 'monthly' as const, priority: 0.65 },
        ]
      : []),
    { url: `${origin}/contact`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/cookies`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${origin}/careers`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${origin}/certifications`, changeFrequency: 'monthly', priority: 0.7 },
  ];

  try {
    const pages = await listPages(false);
    const cmsPages: MetadataRoute.Sitemap = pages
      .filter((p) => !isReservedSiteSlug(p.slug) && !p.slug.startsWith('industries-'))
      .map((p) => ({
        url: `${origin}/${p.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        ...lastModified(p.updated_at),
      }));

    const industryEntries: MetadataRoute.Sitemap = copy.features.industriesEnabled
      ? INDUSTRY_DEFS.map((ind) => ({
          url: `${origin}/industries/${ind.key}`,
          changeFrequency: 'monthly' as const,
          priority: 0.75,
        }))
      : [];

    const locationEntries: MetadataRoute.Sitemap = [
      ...LOCATION_DEFS.map((loc) => ({
        url: `${origin}/locations/${loc.key}`,
        changeFrequency: 'monthly' as const,
        priority: 0.75,
      })),
      ...(locales
        ? (['hi', 'kn'] as const).flatMap((locale) =>
            translatedCityKeys(locale).map((city) => ({
              url: `${origin}/${locale}/locations/${city}`,
              changeFrequency: 'monthly' as const,
              priority: 0.55,
            }))
          )
        : []),
    ];

    const locationServiceEntries: MetadataRoute.Sitemap = allCityServicePairs()
      .filter((pair) => isCityServiceIndexable(pair.city, pair.service))
      .map((pair) => ({
        url: `${origin}/locations/${pair.city}/${pair.service}`,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));

    const resourceEntries: MetadataRoute.Sitemap = (await listResourcePosts()).map((post) => {
      const cover = post.cover_url ? absoluteUrl(publicMediaUrl(post.cover_url) || post.cover_url) : null;
      return {
        url: `${origin}/blog/${post.slug}`,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
        ...(cover ? { images: [cover] } : {}),
        ...lastModified(post.updated_at, post.published_at),
      };
    });

    const pressEntries: MetadataRoute.Sitemap = (await listPressPosts()).map((post) => {
      const cover = post.cover_url ? absoluteUrl(publicMediaUrl(post.cover_url) || post.cover_url) : null;
      return {
        url: `${origin}/press/${post.slug}`,
        changeFrequency: 'monthly' as const,
        priority: 0.65,
        ...(cover ? { images: [cover] } : {}),
        ...lastModified(post.published_at),
      };
    });

    const catalogEntries: MetadataRoute.Sitemap = [];
    for (const itemType of ['project', 'product', 'service'] as const) {
      const items = await listCatalogItems({ itemType });
      for (const item of items) {
        if (item.seo_noindex) continue;
        const media = await listItemMedia(item.id);
        const images = media
          .filter((m) => m.kind !== 'video')
          .slice(0, 8)
          .map((m) => absoluteUrl(publicMediaUrl(m.url) || m.url))
          .filter(Boolean);
        if (item.og_image_url) {
          const og = absoluteUrl(publicMediaUrl(item.og_image_url) || item.og_image_url);
          if (og && !images.includes(og)) images.unshift(og);
        } else if (item.primary_image) {
          const pri = absoluteUrl(publicMediaUrl(item.primary_image) || item.primary_image);
          if (pri && !images.includes(pri)) images.unshift(pri);
        }
        catalogEntries.push({
          url: `${origin}${catalogPublicPath(itemType, item.slug)}`,
          changeFrequency: 'monthly',
          priority: itemType === 'project' ? 0.85 : 0.75,
          ...(images.length ? { images: images.slice(0, 10) } : {}),
          ...lastModified(item.updated_at),
        });
      }
    }

    const byUrl = new Map<string, MetadataRoute.Sitemap[number]>();
    for (const entry of [
      ...staticRoutes,
      ...cmsPages,
      ...industryEntries,
      ...locationEntries,
      ...locationServiceEntries,
      ...resourceEntries,
      ...pressEntries,
      ...catalogEntries,
    ]) {
      byUrl.set(entry.url, entry);
    }
    return Array.from(byUrl.values());
  } catch {
    return staticRoutes;
  }
}
