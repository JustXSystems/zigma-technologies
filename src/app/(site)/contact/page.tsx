import type { Metadata } from 'next';
import CmsPageShell from '@/components/CmsPageShell';
import { buildCmsMetadata } from '@/lib/cms-seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsMetadata('contact');
}

export default function Contact() {
  return <CmsPageShell slug="contact" />;
}
