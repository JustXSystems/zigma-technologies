import JsonLd from '@/components/JsonLd';
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
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      {await renderCatalogCaseStudyPage('product', slug)}
    </>
  );
}
