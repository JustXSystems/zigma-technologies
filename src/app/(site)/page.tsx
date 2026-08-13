import type { Metadata } from 'next';
import CmsPageClient from '@/components/CmsPageClient';
import { buildCmsMetadata } from '@/lib/cms-seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildCmsMetadata('home');
}

export default function Home() {
  return <CmsPageClient slug="home" />;
}
