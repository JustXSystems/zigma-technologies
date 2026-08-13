import type { Metadata } from 'next';
import CmsPageClient from '@/components/CmsPageClient';
import { buildCmsMetadata } from '@/lib/cms-seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsMetadata('certifications');
}

export default function Certifications() {
  return <CmsPageClient slug="certifications" />;
}
