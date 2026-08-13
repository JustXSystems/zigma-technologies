import type { Metadata } from 'next';
import CmsPageClient from '@/components/CmsPageClient';
import SocialProofStrip from '@/components/SocialProofStrip';
import TestimonialsStrip from '@/components/TestimonialsStrip';
import { buildCmsMetadata } from '@/lib/cms-seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsMetadata('contact');
}

export default function Contact() {
  return (
    <>
      <CmsPageClient slug="contact" />
      <TestimonialsStrip title="Trusted by facility and energy leaders" />
      <SocialProofStrip title="Trusted by enterprises across India" />
    </>
  );
}
