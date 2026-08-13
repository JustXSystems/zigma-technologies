import type { Metadata } from 'next';
import UpsCalculatorPageClient from '@/components/tools/UpsCalculatorPageClient';

export const metadata: Metadata = {
  title: 'UPS kVA Calculator',
  description: 'Estimate UPS capacity, modular frames, and battery energy for industrial and IT loads.',
};

export default function UpsCalculatorPage() {
  return <UpsCalculatorPageClient />;
}
