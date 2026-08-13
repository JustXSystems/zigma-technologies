import type { Metadata } from 'next';
import SolutionFinderClient from '@/components/tools/SolutionFinderClient';

export const metadata: Metadata = {
  title: 'Solution Finder',
  description: 'Compare UPS, solar, BESS, and service paths in under a minute.',
};

export default function SolutionFinderPage() {
  return <SolutionFinderClient />;
}
