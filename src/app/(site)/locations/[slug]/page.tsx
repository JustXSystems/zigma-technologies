import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LocationLandingView from '@/components/locations/LocationLandingView';
import { listCatalogItems } from '@/lib/catalog';
import { getThemeSettings } from '@/lib/cms';
import { getLocationByKeyFromList } from '@/lib/locations';
import { getLocationDefsCms } from '@/lib/site-content';
import { mergeSiteSettings } from '@/lib/site-settings';
import type { CatalogItem } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [defs, theme] = await Promise.all([getLocationDefsCms(), getThemeSettings().catch(() => ({}))]);
  const location = getLocationByKeyFromList(defs, slug);
  const site = mergeSiteSettings((theme as { site?: unknown }).site);
  if (!location) return { title: 'Location not found' };
  return {
    title: `${location.name} Power & Energy Solutions | ${site.companyName}`,
    description: location.lead,
    alternates: {
      languages: {
        en: `/locations/${location.key}`,
        hi: `/hi/locations/${location.key}`,
        kn: `/kn/locations/${location.key}`,
      },
    },
  };
}

export default async function LocationDetailPage({ params }: Props) {
  const { slug } = await params;
  const [defs] = await Promise.all([getLocationDefsCms()]);
  const location = getLocationByKeyFromList(defs, slug);
  if (!location) notFound();

  const collected: CatalogItem[] = [];
  const seen = new Set<number>();
  for (const tag of location.serviceTags) {
    for (const itemType of ['project', 'product', 'service'] as const) {
      const rows = await listCatalogItems({ itemType, tag, limit: 3 });
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        collected.push(row);
        if (collected.length >= 6) break;
      }
      if (collected.length >= 6) break;
    }
    if (collected.length >= 6) break;
  }

  return <LocationLandingView location={location} items={collected} />;
}
