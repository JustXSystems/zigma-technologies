import CatalogPageClient from '../_components/CatalogPageClient';
import SocialProofStrip from '@/components/SocialProofStrip';

export const metadata = {
  title: 'Products | Zigma Technologies',
  description: 'UPS systems, batteries, solar modules and power products from Zigma Technologies.',
};

export default function ProductsPage() {
  return (
    <>
      <CatalogPageClient
        itemType="product"
        eyebrow="PRODUCT CATALOG"
        title="Products"
        lead="Explore UPS, battery, solar, and related products. Open any item for specifications, media, and enquiry."
      />
      <SocialProofStrip title="Authorized and aligned with leading OEMs" />
    </>
  );
}
