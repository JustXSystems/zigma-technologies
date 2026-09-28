import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import IndustryLandingView from '@/components/industries/IndustryLandingView';
import { listCatalogItems } from '@/lib/catalog';
import { getPageBySlug } from '@/lib/cms';
import { getIndustryByKeyFromList, industryPageSlug } from '@/lib/industries';
import { buildPageMetadata } from '@/lib/seo';
import { pageSeo } from '@/lib/site-copy';
import { getIndustryDefsCms, getSiteCopy } from '@/lib/site-content';
import type { CatalogItem } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [defs, cmsPage, copy] = await Promise.all([
    getIndustryDefsCms(),
    getPageBySlug(industryPageSlug(slug), false).catch(() => null),
    getSiteCopy(),
  ]);
  const industry = getIndustryByKeyFromList(defs, slug);
  if (!industry) notFound();
  const path = `/industries/${industry.key}`;
  const seo = pageSeo(copy, path, {
    title: `Power & Energy Solutions for ${industry.name}`,
    description: industry.lead,
  });
  return buildPageMetadata({
    title: cmsPage?.meta_title || seo.title,
    description: cmsPage?.meta_description || seo.description,
    path,
  });
}

export default async function IndustryDetailPage({ params }: Props) {
  const { slug } = await params;
  const defs = await getIndustryDefsCms();
  const industry = getIndustryByKeyFromList(defs, slug);
  if (!industry) notFound();

  const collected: CatalogItem[] = [];
  const seen = new Set<string>();
  for (const hint of industry.catalogHints) {
    const rows = await listCatalogItems({
      itemType: hint.type,
      category: hint.category,
      tag: hint.tag,
      limit: 4,
    });
    for (const row of rows) {
      const key = `${row.item_type}-${row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(row);
      if (collected.length >= 9) break;
    }
    if (collected.length >= 9) break;
  }

  return <IndustryLandingView industry={industry} items={collected} />;
}
