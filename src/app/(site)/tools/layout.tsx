import { redirect } from 'next/navigation';
import { getSiteCopy } from '@/lib/site-content';

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  const copy = await getSiteCopy();
  if (!copy.features.toolsEnabled) redirect('/');
  return children;
}
