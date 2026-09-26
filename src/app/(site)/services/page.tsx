import CatalogPageClient from '../_components/CatalogPageClient';
import SocialProofStrip from '@/components/SocialProofStrip';
import JsonLd from '@/components/JsonLd';
import { loadInitialCatalogListing } from '@/lib/catalog-listing';
import { breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import { getSiteCopy } from '@/lib/site-content';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata = buildPageMetadata({
  title: 'UPS AMC, Solar O&M, Installation & Power Services',
  description:
    'Annual maintenance contracts, engineering design, installation, commissioning and 24×7 support for UPS, solar, BESS and EV charging assets across India.',
  path: '/services',
});

export default async function ServicesPage({ searchParams }: Props) {
  const [copy, initial] = await Promise.all([getSiteCopy(), loadInitialCatalogListing('service', await searchParams)]);
  const chrome = copy.catalog.services;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }])} />
      <CatalogPageClient
        itemType="service"
        eyebrow={chrome.eyebrow}
        title={chrome.title}
        lead={chrome.lead}
        initialData={initial.initialData}
        initialKey={initial.initialKey}
      />
      <SocialProofStrip title={chrome.socialProofTitle} />
    </>
  );
}
