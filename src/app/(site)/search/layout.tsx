import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteCopy } from '@/lib/site-content';

export const metadata = buildPageMetadata({
  title: 'Search',
  description: 'Search Zigma Technologies projects, products, services and guides.',
  path: '/search',
  noindex: true,
});

export default async function SearchLayout({ children }: { children: React.ReactNode }) {
  const copy = await getSiteCopy();
  if (!copy.features.searchEnabled) redirect('/');
  return children;
}
