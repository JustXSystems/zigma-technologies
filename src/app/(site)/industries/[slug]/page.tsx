import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import IndustryLandingView from '@/components/industries/IndustryLandingView';
import { listCatalogItems } from '@/lib/catalog';
import { getPageBySlug } from '@/lib/cms';
import { getIndustryByKeyFromList, industryPageSlug } from '@/lib/industries';
import { buildPageMetadata } from '@/lib/seo';
import { getIndustryDefsCms } from '@/lib/site-content';
import type { CatalogItem } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [defs, cmsPage] = await Promise.all([
    getIndustryDefsCms(),
    getPageBySlug(industryPageSlug(slug), false).catch(() => null),
  ]);
  const industry = getIndustryByKeyFromList(defs, slug);
  if (!industry) notFound();
  return buildPageMetadata({
    title: cmsPage?.meta_title || `Power & Energy Solutions for ${industry.name}`,
    description: cmsPage?.meta_description || industry.lead,
    path: `/industries/${industry.key}`,
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
