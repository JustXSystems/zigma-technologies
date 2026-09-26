import type { Metadata } from 'next';
import CmsPageShell from '@/components/CmsPageShell';
import { buildCmsMetadata } from '@/lib/cms-seo';
import { getPageBySlug } from '@/lib/cms';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteCopy } from '@/lib/site-content';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('industries', false).catch(() => null);
  if (page?.meta_title || page?.meta_description || page?.title) {
    return buildCmsMetadata('industries');
  }
  const copy = await getSiteCopy();
  return buildPageMetadata({
    title: copy.hubs.industries.title,
    description: copy.hubs.industries.lead,
    path: '/industries',
  });
}

export default function IndustriesIndexPage() {
  return <CmsPageShell slug="industries" />;
}
