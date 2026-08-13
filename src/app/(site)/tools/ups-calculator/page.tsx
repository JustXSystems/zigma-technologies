import type { Metadata } from 'next';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import UpsCalculatorClient from '@/components/tools/UpsCalculatorClient';

export const metadata: Metadata = {
  title: 'UPS kVA Calculator',
  description: 'Estimate UPS capacity, modular frames, and battery energy for industrial and IT loads.',
};

export default function UpsCalculatorPage() {
  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        accent="cyan"
        eyebrow="Sizing tool"
        title="UPS kVA calculator"
        lead="Convert critical load to indicative UPS capacity, redundancy, and battery energy."
        image="/assets/images/engineers-inspecting-switchgear-panels-i.jpg"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Tools', href: '/tools/solution-finder' },
          { label: 'UPS calculator' },
        ]}
        actions={
          <>
            <Link href="/tools/solar-roi" className="btn btn-ghost">
              Solar ROI →
            </Link>
            <Link href="/contact?consult=1&consult_subject=UPS%20Solution" className="btn btn-primary">
              Request UPS quote
            </Link>
          </>
        }
      />
      <section className="hub-section hub-section--soft">
        <div className="container">
          <div className="calc-shell">
            <UpsCalculatorClient />
          </div>
        </div>
      </section>
      <InnerCtaBand
        title="Need a site-specific UPS design?"
        lead="Share load list, redundancy target, and runtime — we refine this estimate into a bill of materials."
        primaryHref="/contact?consult=1&consult_subject=UPS%20Solution"
        primaryLabel="Talk to an engineer →"
        secondaryHref="/products?category=ups-systems"
        secondaryLabel="Browse UPS"
      />
    </main>
  );
}
