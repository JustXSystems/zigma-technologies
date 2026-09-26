import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCatalogItemBySlug, getPageSettings, listCatalogItems } from '@/lib/catalog';
import { CATALOG_TYPE_LABEL, catalogListingPath, catalogPublicPath, caseStudyLabel } from '@/lib/catalog-case-study';
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, organizationId, plainText, toIsoDate } from '@/lib/seo';
import CatalogCaseStudyView from '@/components/catalog/CatalogCaseStudyView';
import type { CatalogItemType } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function buildCatalogCaseStudyMetadata(itemType: CatalogItemType, slug: string): Promise<Metadata> {
  const item = await getCatalogItemBySlug(itemType, slug);
  if (!item) notFound();

  const label = caseStudyLabel(itemType);
  return buildPageMetadata({
    title: item.meta_title || `${item.title} — ${label}`,
    description: item.meta_description || item.summary || item.description || `${label} by Zigma Technologies`,
    path: catalogPublicPath(itemType, item.slug),
    image: item.og_image_url || item.primary_image,
    imageAlt: item.title,
    type: itemType === 'project' ? 'article' : 'website',
    publishedTime: item.created_at,
    modifiedTime: item.updated_at,
    noindex: Boolean(item.seo_noindex),
  });
}

export async function renderCatalogCaseStudyPage(itemType: CatalogItemType, slug: string) {
  const item = await getCatalogItemBySlug(itemType, slug);
  if (!item) notFound();

  const [relatedItems, settings] = await Promise.all([
    listCatalogItems({
      itemType,
      category: item.category_slug || undefined,
      limit: 4,
    }),
    getPageSettings(itemType),
  ]);
  const mediaBgColor = settings?.card_media_bg_color || '#ffffff';
  const related = relatedItems.filter((rel) => rel.id !== item.id).slice(0, 3);
  if (!related.length) {
    const fallback = await listCatalogItems({ itemType, limit: 4 });
    return (
      <CatalogCaseStudyView
        item={item}
        itemType={itemType}
        related={fallback.filter((rel) => rel.id !== item.id).slice(0, 3)}
        mediaBgColor={mediaBgColor}
      />
    );
  }

  return (
    <CatalogCaseStudyView item={item} itemType={itemType} related={related} mediaBgColor={mediaBgColor} />
  );
}

/** Numeric INR price from labels like "₹1,25,000" or "INR 45000 + GST"; null for "On request". */
function parsePriceInr(label: string | null | undefined): number | null {
  const match = (label || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function catalogCaseStudyJsonLd(itemType: CatalogItemType, item: NonNullable<Awaited<ReturnType<typeof getCatalogItemBySlug>>>) {
  const path = catalogPublicPath(itemType, item.slug);
  const url = absoluteUrl(path);
  const description = plainText(item.summary || item.description) || undefined;
  const image = item.primary_image ? absoluteUrl(item.primary_image) : undefined;
  const organization = { '@id': organizationId() };
  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: `${CATALOG_TYPE_LABEL[itemType]}s`, path: catalogListingPath(itemType) },
    { name: item.title, path },
  ]);

  if (itemType === 'product') {
    const price = parsePriceInr(item.price_label);
    return [
      breadcrumb,
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: item.title,
        description,
        image,
        url,
        brand: { '@type': 'Brand', name: item.tags_json?.[0] || 'Zigma Technologies' },
        ...(item.category_name ? { category: item.category_name } : {}),
        ...(price
          ? {
              offers: {
                '@type': 'Offer',
                price,
                priceCurrency: 'INR',
                availability: 'https://schema.org/InStock',
                url,
                seller: organization,
              },
            }
          : {}),
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
        description,
        image,
        url,
        ...(item.category_name ? { serviceType: item.category_name } : {}),
        provider: organization,
        areaServed: { '@type': 'Country', name: 'India' },
      },
    ];
  }

  return [
    breadcrumb,
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: item.title,
      description,
      image,
      url,
      mainEntityOfPage: url,
      ...(item.created_at ? { datePublished: toIsoDate(item.created_at) } : {}),
      ...(item.updated_at ? { dateModified: toIsoDate(item.updated_at) } : {}),
      author: organization,
      publisher: organization,
    },
  ];
}

export type { Props };
