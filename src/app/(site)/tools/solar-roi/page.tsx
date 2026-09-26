import type { Metadata } from 'next';
import SolarRoiPageClient from '@/components/tools/SolarRoiPageClient';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Solar ROI Calculator for Commercial Rooftops (India)',
  description:
    'Estimate commercial rooftop solar generation, annual savings and simple payback using Indian tariffs. Free calculator by Zigma Technologies.',
  path: '/tools/solar-roi',
});

export default function SolarRoiPage() {
  return <SolarRoiPageClient />;
}
