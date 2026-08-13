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
  return buildCatalogCaseStudyMetadata('service', slug);
}

export default async function ServiceCaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const item = await getCatalogItemBySlug('service', slug);
  const jsonLd = item ? catalogCaseStudyJsonLd('service', item) : null;

  return (
    <>
      {jsonLd ? (
        <Script id="service-case-study-jsonld" type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </Script>
      ) : null}
      {await renderCatalogCaseStudyPage('service', slug)}
    </>
  );
}
