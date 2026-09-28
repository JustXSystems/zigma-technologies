import type { Metadata } from 'next';
import SolarRoiPageClient from '@/components/tools/SolarRoiPageClient';
import { buildPageMetadata } from '@/lib/seo';
import { pageSeo } from '@/lib/site-copy';
import { getSiteCopy } from '@/lib/site-content';

export async function generateMetadata(): Promise<Metadata> {
  const seo = pageSeo(await getSiteCopy(), '/tools/solar-roi', {
    title: 'Solar ROI Calculator for Commercial Rooftops (India)',
    description:
      'Estimate commercial rooftop solar generation, annual savings and simple payback using Indian tariffs. Free calculator by Zigma Technologies.',
  });
  return buildPageMetadata({ ...seo, path: '/tools/solar-roi' });
}

export default function SolarRoiPage() {
  return <SolarRoiPageClient />;
}
