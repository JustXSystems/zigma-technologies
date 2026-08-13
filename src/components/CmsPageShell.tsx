import { notFound } from 'next/navigation';
import CmsPageClient from '@/components/CmsPageClient';
import { loadPublicCmsPage } from '@/lib/cms-public-page';

type Props = {
  slug: string;
  allowPreview?: boolean;
};

/** Server-rendered CMS page — eliminates client fetch waterfall on first paint. */
export default async function CmsPageShell({ slug, allowPreview = false }: Props) {
  const result = await loadPublicCmsPage(slug, allowPreview);
  if (!result) notFound();

  return (
    <CmsPageClient
      slug={slug}
      initialSections={result.page.sections || []}
      initialSource={result.source}
      initialPreview={result.preview}
    />
  );
}
