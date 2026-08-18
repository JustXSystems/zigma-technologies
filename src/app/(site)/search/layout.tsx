import { redirect } from 'next/navigation';
import { getSiteCopy } from '@/lib/site-content';

export default async function SearchLayout({ children }: { children: React.ReactNode }) {
  const copy = await getSiteCopy();
  if (!copy.features.searchEnabled) redirect('/');
  return children;
}
