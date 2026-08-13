import CatalogPageClient from '../_components/CatalogPageClient';
import SocialProofStrip from '@/components/SocialProofStrip';
import { getSiteCopy } from '@/lib/site-content';

export const metadata = {
  title: 'Products | Zigma Technologies',
  description: 'UPS systems, batteries, solar modules and power products from Zigma Technologies.',
};

export default async function ProductsPage() {
  const copy = await getSiteCopy();
  const chrome = copy.catalog.products;

  return (
    <>
      <CatalogPageClient itemType="product" eyebrow={chrome.eyebrow} title={chrome.title} lead={chrome.lead} />
      <SocialProofStrip title={chrome.socialProofTitle} />
    </>
  );
}
