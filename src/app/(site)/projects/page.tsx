import CatalogPageClient from '../_components/CatalogPageClient';
import SocialProofStrip from '@/components/SocialProofStrip';

export const metadata = {
  title: 'Projects | Zigma Technologies',
  description: 'Featured solar, UPS, battery, and energy infrastructure projects delivered by Zigma Technologies.',
};

export default function ProjectsPage() {
  return (
    <>
      <CatalogPageClient
        itemType="project"
        eyebrow="PROOF, NOT PROMISES"
        title="Projects"
        lead="Browse delivered projects across solar EPC, power continuity, and energy management — tap any card for full details and enquiry."
      />
      <SocialProofStrip title="OEM partners on projects we deliver" />
    </>
  );
}
