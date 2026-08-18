import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSiteCopy } from '@/lib/site-content';
import SolutionFinderClient from '@/components/tools/SolutionFinderClient';

export const metadata: Metadata = {
  title: 'Solution Finder',
  description: 'Compare UPS, solar, BESS, and service paths in under a minute.',
};

export default async function SolutionFinderPage() {
  const copy = await getSiteCopy();
  if (!copy.features.solutionFinderEnabled) redirect('/');
  return <SolutionFinderClient />;
}

