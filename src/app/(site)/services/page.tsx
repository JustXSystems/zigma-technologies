import CatalogPageClient from '../_components/CatalogPageClient';
import SocialProofStrip from '@/components/SocialProofStrip';
import { getSiteCopy } from '@/lib/site-content';

export const metadata = {
  title: 'Services | Zigma Technologies',
  description: 'AMC, engineering design, installation and power services from Zigma Technologies.',
};

export default async function ServicesPage() {
  const copy = await getSiteCopy();
  const chrome = copy.catalog.services;

  return (
    <>
      <CatalogPageClient itemType="service" eyebrow={chrome.eyebrow} title={chrome.title} lead={chrome.lead} />
      <SocialProofStrip title={chrome.socialProofTitle} />
    </>
  );
}
