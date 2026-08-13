import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import IndustryLandingView from '@/components/industries/IndustryLandingView';
import { listCatalogItems } from '@/lib/catalog';
import { getThemeSettings } from '@/lib/cms';
import { getIndustryByKeyFromList } from '@/lib/industries';
import { getIndustryDefsCms } from '@/lib/site-content';
import { mergeSiteSettings } from '@/lib/site-settings';
import type { CatalogItem } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [defs, theme] = await Promise.all([getIndustryDefsCms(), getThemeSettings().catch(() => ({}))]);
  const industry = getIndustryByKeyFromList(defs, slug);
  const site = mergeSiteSettings((theme as { site?: unknown }).site);
  if (!industry) return { title: 'Industry not found' };
  return {
    title: `${industry.name} | ${site.companyName}`,
    description: industry.lead,
  };
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
