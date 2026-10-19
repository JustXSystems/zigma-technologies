import type { Metadata } from 'next';
import CmsPageShell from '@/components/CmsPageShell';
import JsonLd from '@/components/JsonLd';
import { buildCmsMetadata } from '@/lib/cms-seo';
import { breadcrumbJsonLd } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsMetadata('contact');
}

export default function Contact() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }])} />
      <CmsPageShell slug="contact" />
    </>
  );
}
