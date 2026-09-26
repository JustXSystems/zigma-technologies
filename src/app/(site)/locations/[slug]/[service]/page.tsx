import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LocationServiceLandingView from '@/components/locations/LocationServiceLandingView';
import { listCatalogItems } from '@/lib/catalog';
import { getLocationByKey } from '@/lib/locations';
import { getServiceSeo, isCityServiceIndexable } from '@/lib/location-services';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ slug: string; service: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, service: serviceKey } = await params;
  const location = getLocationByKey(slug);
  const service = getServiceSeo(serviceKey);
  if (!location || !service) notFound();
  return buildPageMetadata({
    title: `${service.name} in ${location.name}`,
    description: `${service.lead} Serving ${location.name}, ${location.state}.`,
    path: `/locations/${location.key}/${service.key}`,
    noindex: !isCityServiceIndexable(location.key, service.key),
  });
}

export default async function LocationServicePage({ params }: Props) {
  const { slug, service: serviceKey } = await params;
  const location = getLocationByKey(slug);
  const service = getServiceSeo(serviceKey);
  if (!location || !service) notFound();

  const items = await listCatalogItems({
    itemType: service.itemType,
    category: service.categoryHint,
    limit: 8,
  });

  const subject = `${service.subject} — ${location.name}`;
  const lead = `${service.lead} Serving ${location.name}, ${location.state}.`;

  return (
    <LocationServiceLandingView
      location={location}
      service={service}
      items={items}
      subject={subject}
      lead={lead}
    />
  );
}
