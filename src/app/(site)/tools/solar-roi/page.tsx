import type { Metadata } from 'next';
import SolarRoiPageClient from '@/components/tools/SolarRoiPageClient';

export const metadata: Metadata = {
  title: 'Solar ROI Calculator',
  description: 'Estimate commercial rooftop solar generation, savings, and simple payback for Indian tariffs.',
};

export default function SolarRoiPage() {
  return <SolarRoiPageClient />;
}
