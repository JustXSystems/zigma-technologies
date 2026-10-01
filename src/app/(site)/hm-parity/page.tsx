import CmsPageClient from '@/components/CmsPageClient';
import { loadPublicCmsPage } from '@/lib/cms-public-page';
import { napValues, resolveNapDeep } from '@/lib/nap';
import { loadSiteShell } from '@/lib/site-shell';
import { upgradeHomeSection } from '@/lib/home-sections';

export const dynamic = 'force-dynamic';

export default async function HmParity() {
  const [result, shell] = await Promise.all([loadPublicCmsPage('home'), loadSiteShell()]);
  const sections = (result?.page.sections || []).map((s) => {
    const up = upgradeHomeSection(s.type, s.content_json);
    return up ? { ...s, type: up.type, content_json: up.content } : s;
  });
  return <CmsPageClient slug="home" initialSections={resolveNapDeep(sections, napValues(shell.settings))} initialSource="parity" />;
}
