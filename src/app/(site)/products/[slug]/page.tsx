import Script from 'next/script';
import {
  buildCatalogCaseStudyMetadata,
  catalogCaseStudyJsonLd,
  renderCatalogCaseStudyPage,
  type Props,
} from '@/lib/catalog-case-study-page';
import { getCatalogItemBySlug } from '@/lib/catalog';

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return buildCatalogCaseStudyMetadata('product', slug);
}

export default async function ProductCaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const item = await getCatalogItemBySlug('product', slug);
  const jsonLd = item ? catalogCaseStudyJsonLd('product', item) : null;

  return (
    <>
      {jsonLd ? (
        <Script id="product-case-study-jsonld" type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </Script>
      ) : null}
      {await renderCatalogCaseStudyPage('product', slug)}
    </>
  );
}
