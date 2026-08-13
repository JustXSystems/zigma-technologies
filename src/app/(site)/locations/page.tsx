import type { Metadata } from 'next';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import VisitTailorBar from '@/components/VisitTailorBar';
import { LOCATION_DEFS } from '@/lib/locations';

export const metadata: Metadata = {
  title: 'Service Locations | Zigma Technologies',
  description:
    'Zigma Technologies power and energy engineering across Bengaluru, Chennai, Hyderabad, Mumbai, Pune, and Delhi NCR.',
};

const LOCATION_IMAGE: Record<string, string> = {
  bengaluru: '/assets/images/kempegowda-international-airport-bengalu.png',
  chennai: '/assets/images/aerial-view-of-dense-commercial-rooftop-.jpg',
  hyderabad: '/assets/images/city-skyline-with-solar-panels-and-indus.jpg',
  mumbai: '/assets/images/blue-electric-vehicle-charging-at-a-mode.jpg',
  pune: '/assets/images/solar-farm-with-wind-turbines-at-sunset-.jpg',
  'delhi-ncr': '/assets/images/engineers-in-hard-hats-reviewing-a-digit.jpg',
};

export default function LocationsIndexPage() {
  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        eyebrow="Locations"
        title="Where we deliver across India"
        lead="City pages with local proof, response SLAs, and a direct path to consultation."
        image="/assets/images/aerial-view-of-dense-commercial-rooftop-.jpg"
        actions={
          <>
            <Link href="/contact?consult=1" className="btn btn-primary">
              Request city consultation →
            </Link>
            <Link href="/sla" className="btn btn-ghost">
              Service levels
            </Link>
          </>
        }
      >
        <div className="proof-rail">
          <span>Bengaluru HQ</span>
          <span>24×7 emergency desk</span>
          <span>Pan-India delivery</span>
        </div>
      </InnerPageHero>

      <section className="hub-section hub-section--soft">
        <div className="container">
          <VisitTailorBar context="locations" />
          <div className="section-head" style={{ marginTop: '2.25rem' }}>
            <div className="eyebrow eyebrow-cyan">Service cities</div>
            <h2>Choose your city desk</h2>
            <p>Local strengths, service matrix pages, and relevant catalog proof for each market.</p>
          </div>
          <div className="hub-grid">
            {LOCATION_DEFS.map((loc) => (
              <Link key={loc.key} href={`/locations/${loc.key}`} className="hub-card">
                <div className="hub-card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={LOCATION_IMAGE[loc.key] || '/assets/images/city-skyline-with-solar-panels-and-indus.jpg'}
                    alt=""
                  />
                </div>
                <div className="hub-card-body">
                  <div className="eyebrow">{loc.state}</div>
                  <h3>{loc.name}</h3>
                  <p>{loc.lead}</p>
                  <span className="hub-card-link">View city page →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <InnerCtaBand
        title="Planning a multi-site rollout?"
        lead="We coordinate UPS, solar, BESS, and AMC across metros with a single engineering owner."
        primaryHref="/contact?consult=1"
        primaryLabel="Start a consultation →"
        secondaryHref="/industries"
        secondaryLabel="Browse industries"
      />
    </main>
  );
}
