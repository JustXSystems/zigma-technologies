import { redirect } from 'next/navigation';
import { getSiteCopy } from '@/lib/site-content';

export default async function ResourcesLayout({ children }: { children: React.ReactNode }) {
  const copy = await getSiteCopy();
  if (!copy.features.resourcesEnabled) redirect('/');
  return children;
}
