import type { Metadata } from 'next';
import CmsPageShell from '@/components/CmsPageShell';
import { buildCmsMetadata } from '@/lib/cms-seo';
import { getPageBySlug } from '@/lib/cms';
import { getSiteCopy } from '@/lib/site-content';
import { mergeSiteSettings } from '@/lib/site-settings';
import { getThemeSettings } from '@/lib/cms';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('industries', false).catch(() => null);
  if (page?.meta_title || page?.meta_description || page?.title) {
    return buildCmsMetadata('industries');
  }
  const [copy, theme] = await Promise.all([getSiteCopy(), getThemeSettings().catch(() => ({}))]);
  const site = mergeSiteSettings((theme as { site?: unknown }).site);
  return {
    title: `${copy.hubs.industries.title} | ${site.companyName}`,
    description: copy.hubs.industries.lead,
  };
}

export default function IndustriesIndexPage() {
  return <CmsPageShell slug="industries" />;
}
