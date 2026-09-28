import type { Metadata } from 'next';
import CatalogPageClient from '../_components/CatalogPageClient';
import SocialProofStrip from '@/components/SocialProofStrip';
import JsonLd from '@/components/JsonLd';
import { loadInitialCatalogListing } from '@/lib/catalog-listing';
import { breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import { pageSeo } from '@/lib/site-copy';
import { getSiteCopy } from '@/lib/site-content';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  const seo = pageSeo(await getSiteCopy(), '/products', {
    title: 'UPS, Battery, Solar & EV Charging Products',
    description:
      'Industrial and IT UPS systems, lithium and VRLA batteries, BESS, solar modules and EV chargers supplied, installed and supported by Zigma Technologies.',
  });
  return buildPageMetadata({ ...seo, path: '/products' });
}

export default async function ProductsPage({ searchParams }: Props) {
  const [copy, initial] = await Promise.all([getSiteCopy(), loadInitialCatalogListing('product', await searchParams)]);
  const chrome = copy.catalog.products;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Products', path: '/products' }])} />
      <CatalogPageClient
        itemType="product"
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
