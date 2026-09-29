import type { Metadata } from 'next';
import UpsCalculatorPageClient from '@/components/tools/UpsCalculatorPageClient';
import { buildPageMetadata } from '@/lib/seo';
import { pageSeo } from '@/lib/site-copy';
import { getSiteCopy } from '@/lib/site-content';

export async function generateMetadata(): Promise<Metadata> {
  const seo = pageSeo(await getSiteCopy(), '/tools/ups-calculator', {
    title: 'UPS kVA Calculator — Size Your UPS & Battery Backup',
    description:
      'Estimate UPS capacity (kVA), modular frames and battery energy for industrial and IT loads. Free sizing calculator by Zigma Technologies.',
  });
  return buildPageMetadata({ ...seo, path: '/tools/ups-calculator' });
}

export default function UpsCalculatorPage() {
  return <UpsCalculatorPageClient />;
}
