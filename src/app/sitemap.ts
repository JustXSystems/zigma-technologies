import type { MetadataRoute } from 'next';
import { listPages } from '@/lib/cms';
import { listCatalogItems } from '@/lib/catalog';
import { catalogPublicPath } from '@/lib/catalog-case-study';
import { isReservedSiteSlug } from '@/lib/reserved-slugs';
import { listResourcePosts } from '@/lib/resources';
import { INDUSTRY_DEFS } from '@/lib/industries';
import { LOCATION_DEFS } from '@/lib/locations';
import { allCityServicePairs } from '@/lib/location-services';
import { listPressPosts } from '@/lib/press';

function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zigma-technologies.com').replace(/\/$/, '');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${origin}/hi`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${origin}/kn`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${origin}/projects`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${origin}/products`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${origin}/services`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${origin}/industries`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/locations`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/resources`, changeFrequency: 'weekly', priority: 0.75 },
    { url: `${origin}/press`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${origin}/sla`, changeFrequency: 'monthly', priority: 0.55 },
    { url: `${origin}/tools/solution-finder`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${origin}/tools/ups-calculator`, changeFrequency: 'monthly', priority: 0.65 },
    { url: `${origin}/tools/solar-roi`, changeFrequency: 'monthly', priority: 0.65 },
    { url: `${origin}/partner/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${origin}/search`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${origin}/contact`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/thank-you`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${origin}/cookies`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${origin}/careers`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${origin}/certifications`, changeFrequency: 'monthly', priority: 0.7 },
  ];

  try {
    const pages = await listPages(false);
    const cmsPages = pages
      .filter((p) => !isReservedSiteSlug(p.slug) && !p.slug.startsWith('industries-'))
      .map((p) => ({
        url: `${origin}/${p.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

    const industryEntries: MetadataRoute.Sitemap = INDUSTRY_DEFS.map((ind) => ({
      url: `${origin}/industries/${ind.key}`,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    }));

    const locationEntries: MetadataRoute.Sitemap = LOCATION_DEFS.flatMap((loc) => [
      { url: `${origin}/locations/${loc.key}`, changeFrequency: 'monthly' as const, priority: 0.75 },
      { url: `${origin}/hi/locations/${loc.key}`, changeFrequency: 'monthly' as const, priority: 0.55 },
      { url: `${origin}/kn/locations/${loc.key}`, changeFrequency: 'monthly' as const, priority: 0.55 },
    ]);

    const resourceEntries: MetadataRoute.Sitemap = (await listResourcePosts()).map((post) => ({
      url: `${origin}/resources/${post.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

    const locationServiceEntries: MetadataRoute.Sitemap = allCityServicePairs().map((pair) => ({
      url: `${origin}/locations/${pair.city}/${pair.service}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

    const pressEntries: MetadataRoute.Sitemap = (await listPressPosts()).map((post) => ({
      url: `${origin}/press/${post.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    }));

    const catalogEntries: MetadataRoute.Sitemap = [];
    for (const itemType of ['project', 'product', 'service'] as const) {
      const items = await listCatalogItems({ itemType });
      for (const item of items) {
        catalogEntries.push({
          url: `${origin}${catalogPublicPath(itemType, item.slug)}`,
          changeFrequency: 'monthly',
          priority: itemType === 'project' ? 0.85 : 0.75,
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
