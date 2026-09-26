import type { Metadata } from 'next';
import UpsCalculatorPageClient from '@/components/tools/UpsCalculatorPageClient';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'UPS kVA Calculator — Size Your UPS & Battery Backup',
  description:
    'Estimate UPS capacity (kVA), modular frames and battery energy for industrial and IT loads. Free sizing calculator by Zigma Technologies.',
  path: '/tools/ups-calculator',
});

export default function UpsCalculatorPage() {
  return <UpsCalculatorPageClient />;
}
