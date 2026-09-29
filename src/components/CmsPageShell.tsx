import { notFound } from 'next/navigation';
import CmsPageClient from '@/components/CmsPageClient';
import { loadPublicCmsPage } from '@/lib/cms-public-page';
import { napValues, resolveNapDeep } from '@/lib/nap';
import { loadSiteShell } from '@/lib/site-shell';

type Props = {
  slug: string;
  allowPreview?: boolean;
};

/** Server-rendered CMS page — eliminates client fetch waterfall on first paint. */
export default async function CmsPageShell({ slug, allowPreview = false }: Props) {
  const [result, shell] = await Promise.all([loadPublicCmsPage(slug, allowPreview), loadSiteShell()]);
  if (!result) notFound();

  return (
    <CmsPageClient
      slug={slug}
      initialSections={resolveNapDeep(result.page.sections || [], napValues(shell.settings))}
      initialSource={result.source}
      initialPreview={result.preview}
    />
  );
}
