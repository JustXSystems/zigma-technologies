import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSiteCopy } from '@/lib/site-content';
import SolutionFinderClient from '@/components/tools/SolutionFinderClient';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Power Solution Finder — UPS, Solar, BESS or AMC?',
  description:
    'Answer a few questions about your site and loads to compare UPS, rooftop solar, battery storage and maintenance options in under a minute.',
  path: '/tools/solution-finder',
});

export default async function SolutionFinderPage() {
  const copy = await getSiteCopy();
  if (!copy.features.solutionFinderEnabled) redirect('/');
  return <SolutionFinderClient />;
}

