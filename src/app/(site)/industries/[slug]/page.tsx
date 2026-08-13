import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import IndustryLandingView from '@/components/industries/IndustryLandingView';
import { listCatalogItems } from '@/lib/catalog';
import { getIndustryByKey } from '@/lib/industries';
import type { CatalogItem } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const industry = getIndustryByKey(slug);
  if (!industry) return { title: 'Industry not found' };
  return {
    title: `${industry.name} | Zigma Technologies`,
    description: industry.lead,
  };
}

export default async function IndustryDetailPage({ params }: Props) {
  const { slug } = await params;
  const industry = getIndustryByKey(slug);
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
