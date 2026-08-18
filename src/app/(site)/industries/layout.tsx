import { redirect } from 'next/navigation';
import { getSiteCopy } from '@/lib/site-content';

export default async function IndustriesLayout({ children }: { children: React.ReactNode }) {
  const copy = await getSiteCopy();
  if (!copy.features.industriesEnabled) redirect('/');
  return children;
}
