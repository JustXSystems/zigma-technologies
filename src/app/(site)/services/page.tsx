import CatalogPageClient from '../_components/CatalogPageClient';
import SocialProofStrip from '@/components/SocialProofStrip';

export const metadata = {
  title: 'Services | Zigma Technologies',
  description: 'AMC, engineering design, installation and power services from Zigma Technologies.',
};

export default function ServicesPage() {
  return (
    <>
      <CatalogPageClient
        itemType="service"
        eyebrow="ENGINEERING SERVICES"
        title="Services"
        lead="AMC, installation, engineering design and technical services — review details and send an enquiry in one click."
      />
      <SocialProofStrip title="Trusted service partner for critical facilities" />
    </>
  );
}
