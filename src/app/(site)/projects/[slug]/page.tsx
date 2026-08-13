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
  return buildCatalogCaseStudyMetadata('project', slug);
}

export default async function ProjectCaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const item = await getCatalogItemBySlug('project', slug);
  const jsonLd = item ? catalogCaseStudyJsonLd('project', item) : null;

  return (
    <>
      {jsonLd ? (
        <Script id="project-case-study-jsonld" type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </Script>
      ) : null}
      {await renderCatalogCaseStudyPage('project', slug)}
    </>
  );
}
