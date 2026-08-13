import type { Metadata } from 'next';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import SolarRoiClient from '@/components/tools/SolarRoiClient';

export const metadata: Metadata = {
  title: 'Solar ROI Calculator',
  description: 'Estimate commercial rooftop solar generation, savings, and simple payback for Indian tariffs.',
};

export default function SolarRoiPage() {
  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        eyebrow="Sizing tool"
        title="Solar ROI calculator"
        lead="Model generation, tariff savings, and simple payback for C&I rooftop plants."
        image="/assets/images/solar-farm-with-wind-turbines-at-sunset-.jpg"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Tools', href: '/tools/solution-finder' },
          { label: 'Solar ROI' },
        ]}
        actions={
          <>
            <Link href="/tools/ups-calculator" className="btn btn-ghost">
              UPS calculator →
            </Link>
            <Link href="/contact?consult=1&consult_subject=Solar%20Solution" className="btn btn-primary">
              Request solar quote
            </Link>
          </>
        }
      />
      <section className="hub-section hub-section--soft">
        <div className="container">
          <div className="calc-shell">
            <SolarRoiClient />
          </div>
        </div>
      </section>
      <InnerCtaBand
        title="Ready for a rooftop feasibility?"
        lead="Share tariff, roof area, and daytime load — we turn this model into an EPC proposal."
        primaryHref="/contact?consult=1&consult_subject=Solar%20Solution"
        primaryLabel="Talk to an engineer →"
        secondaryHref="/projects?category=solar-epc"
        secondaryLabel="Solar EPC projects"
      />
    </main>
  );
}
