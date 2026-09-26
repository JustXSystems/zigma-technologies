import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LocationLandingView from '@/components/locations/LocationLandingView';
import { listCatalogItems } from '@/lib/catalog';
import { cityLocalePaths } from '@/lib/locale-locations';
import { getLocationByKeyFromList } from '@/lib/locations';
import { buildPageMetadata, localeAlternates } from '@/lib/seo';
import { getLocationDefsCms, getSiteCopy } from '@/lib/site-content';
import type { CatalogItem } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [defs, copy] = await Promise.all([getLocationDefsCms(), getSiteCopy()]);
  const location = getLocationByKeyFromList(defs, slug);
  if (!location) notFound();
  const paths = cityLocalePaths(location.key, copy.features.localesEnabled);
  return buildPageMetadata({
    title: `Power & Energy Solutions in ${location.name}`,
    description: location.lead,
    path: `/locations/${location.key}`,
    ...(paths.hi || paths.kn
      ? { languages: localeAlternates({ en: paths.en, hi: paths.hi || undefined, kn: paths.kn || undefined }) }
      : {}),
  });
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
