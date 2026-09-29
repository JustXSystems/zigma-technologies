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
  const seo = pageSeo(await getSiteCopy(), '/projects', {
    title: 'Solar, UPS & Battery Energy Projects',
    description:
      'Case studies of solar EPC, industrial UPS, BESS and EV charging projects delivered by Zigma Technologies across India — scope, capacity and outcomes.',
  });
  return buildPageMetadata({ ...seo, path: '/projects' });
}

export default async function ProjectsPage({ searchParams }: Props) {
  const [copy, initial] = await Promise.all([getSiteCopy(), loadInitialCatalogListing('project', await searchParams)]);
  const chrome = copy.catalog.projects;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Projects', path: '/projects' }])} />
      <CatalogPageClient
        itemType="project"
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
