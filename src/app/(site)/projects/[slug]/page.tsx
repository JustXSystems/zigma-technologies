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
  return buildCatalogCaseStudyMetadata('project', slug);
}

export default async function ProjectCaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const item = await getCatalogItemBySlug('project', slug);
  const jsonLd = item ? catalogCaseStudyJsonLd('project', item) : null;

  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      {await renderCatalogCaseStudyPage('project', slug)}
    </>
  );
}
