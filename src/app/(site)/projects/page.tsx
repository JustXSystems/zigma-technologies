import CatalogPageClient from '../_components/CatalogPageClient';
import SocialProofStrip from '@/components/SocialProofStrip';
import { getSiteCopy } from '@/lib/site-content';

export const metadata = {
  title: 'Projects | Zigma Technologies',
  description: 'Featured solar, UPS, battery, and energy infrastructure projects delivered by Zigma Technologies.',
};

export default async function ProjectsPage() {
  const copy = await getSiteCopy();
  const chrome = copy.catalog.projects;

  return (
    <>
      <CatalogPageClient itemType="project" eyebrow={chrome.eyebrow} title={chrome.title} lead={chrome.lead} />
      <SocialProofStrip title={chrome.socialProofTitle} />
    </>
  );
}
