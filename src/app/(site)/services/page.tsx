import type { Metadata } from 'next';
import CatalogPageClient from '../_components/CatalogPageClient';
import SocialProofStrip from '@/components/SocialProofStrip';
import JsonLd from '@/components/JsonLd';
import { loadInitialCatalogListing } from '@/lib/catalog-listing';
import { HUB_SEO } from '@/lib/hub-seo';
import { breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import { pageSeo } from '@/lib/site-copy';
import { getSiteCopy } from '@/lib/site-content';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  const seo = pageSeo(await getSiteCopy(), '/services', HUB_SEO.services);
  return buildPageMetadata({ ...seo, path: '/services' });
}

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
        partnersStrip={<SocialProofStrip title={chrome.socialProofTitle} />}
      />
    </>
  );
}
