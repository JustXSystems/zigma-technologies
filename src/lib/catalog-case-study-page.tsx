import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCatalogItemBySlug, listCatalogItems } from '@/lib/catalog';
import { catalogPublicPath, caseStudyLabel } from '@/lib/catalog-case-study';
import CatalogCaseStudyView from '@/components/catalog/CatalogCaseStudyView';
import type { CatalogItemType } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function buildCatalogCaseStudyMetadata(itemType: CatalogItemType, slug: string): Promise<Metadata> {
  const item = await getCatalogItemBySlug(itemType, slug);
  if (!item) return { title: 'Not found' };

  const label = caseStudyLabel(itemType);
  const description = item.summary || item.description || `${label} by Zigma Technologies`;
  const image = item.primary_image || undefined;

  return {
    title: `${item.title} | ${label} | Zigma Technologies`,
    description,
    openGraph: {
      title: item.title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export async function renderCatalogCaseStudyPage(itemType: CatalogItemType, slug: string) {
  const item = await getCatalogItemBySlug(itemType, slug);
  if (!item) notFound();

  const relatedItems = await listCatalogItems({
    itemType,
    category: item.category_slug || undefined,
    limit: 4,
  });
  const related = relatedItems.filter((rel) => rel.id !== item.id).slice(0, 3);
  if (!related.length) {
    const fallback = await listCatalogItems({ itemType, limit: 4 });
    return (
      <CatalogCaseStudyView
        item={item}
        itemType={itemType}
        related={fallback.filter((rel) => rel.id !== item.id).slice(0, 3)}
      />
    );
  }

  return <CatalogCaseStudyView item={item} itemType={itemType} related={related} />;
}

export function catalogCaseStudyJsonLd(itemType: CatalogItemType, item: NonNullable<Awaited<ReturnType<typeof getCatalogItemBySlug>>>) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zigma-technologies.com').replace(/\/$/, '');
  const path = catalogPublicPath(itemType, item.slug);
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${caseStudyLabel(itemType)}s`,
        item: `${origin}/${itemType === 'project' ? 'projects' : itemType === 'product' ? 'products' : 'services'}`,
      },
      { '@type': 'ListItem', position: 3, name: item.title, item: `${origin}${path}` },
    ],
  };

  if (itemType === 'product') {
    return [
      breadcrumb,
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: item.title,
        description: item.summary || item.description,
        image: item.primary_image || undefined,
        brand: item.tags_json?.[0]
          ? { '@type': 'Brand', name: item.tags_json[0] }
          : { '@type': 'Brand', name: 'Zigma Technologies' },
        offers: item.price_label
          ? { '@type': 'Offer', priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: `${origin}${path}` }
          : undefined,
      },
    ];
  }

  if (itemType === 'service') {
    return [
      breadcrumb,
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: item.title,
        description: item.summary || item.description,
        provider: { '@type': 'Organization', name: 'Zigma Technologies' },
        areaServed: 'IN',
        url: `${origin}${path}`,
      },
    ];
  }

  return [
    breadcrumb,
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: item.title,
      description: item.summary || item.description,
      image: item.primary_image || undefined,
      url: `${origin}${path}`,
      author: { '@type': 'Organization', name: 'Zigma Technologies' },
    },
  ];
}

export type { Props };
