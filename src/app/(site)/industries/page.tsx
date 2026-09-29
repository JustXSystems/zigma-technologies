import type { Metadata } from 'next';
import CmsPageShell from '@/components/CmsPageShell';
import { buildCmsMetadata } from '@/lib/cms-seo';
import { getPageBySlug } from '@/lib/cms';
import { buildPageMetadata } from '@/lib/seo';
import { pageSeo } from '@/lib/site-copy';
import { getSiteCopy } from '@/lib/site-content';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('industries', false).catch(() => null);
  if (page?.meta_title) {
    return buildCmsMetadata('industries');
  }
  const copy = await getSiteCopy();
  const seo = pageSeo(copy, '/industries', {
    title: copy.hubs.industries.title,
    description: copy.hubs.industries.lead,
  });
  return buildPageMetadata({
    title: seo.title,
    description: page?.meta_description || seo.description,
    path: '/industries',
  });
}

export default function IndustriesIndexPage() {
  return <CmsPageShell slug="industries" />;
}
