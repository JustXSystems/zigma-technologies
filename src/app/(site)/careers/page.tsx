import type { Metadata } from 'next';
import CmsPageClient from '@/components/CmsPageClient';
import { buildCmsMetadata } from '@/lib/cms-seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsMetadata('careers');
}

export default function Careers() {
  return <CmsPageClient slug="careers" />;
}
