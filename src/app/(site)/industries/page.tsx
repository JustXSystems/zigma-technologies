import type { Metadata } from 'next';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import VisitTailorBar from '@/components/VisitTailorBar';
import { INDUSTRY_DEFS } from '@/lib/industries';

export const metadata: Metadata = {
  title: 'Industries We Serve | Zigma Technologies',
  description:
    'Power and energy engineering for healthcare, data centres, manufacturing, banking, education, and airports across India.',
};

const INDUSTRY_IMAGE: Record<string, string> = {
  healthcare: '/assets/images/zigma-technologies-engineers-monitoring-.jpg',
  'data-centres': '/assets/images/engineers-inspecting-switchgear-panels-i.jpg',
  manufacturing: '/assets/images/engineers-in-hard-hats-reviewing-a-digit.jpg',
  banking: '/assets/images/engineers-reviewing-electrical-design-dr.jpg',
  education: '/assets/images/bangalore-international-exhibition-centr.png',
  airports: '/assets/images/kempegowda-international-airport-bengalu.png',
};

export default function IndustriesIndexPage() {
  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        eyebrow="Industries"
        title="Engineering that understands your sector"
        lead="Explore tailored UPS, solar, BESS, and service pathways for the environments you operate in."
        image="/assets/images/city-skyline-with-solar-panels-and-indus.jpg"
        actions={
          <>
            <Link href="/contact?consult=1" className="btn btn-primary">
              Request consultation →
            </Link>
            <Link href="/projects" className="btn btn-ghost">
              View case studies
            </Link>
          </>
        }
      >
        <div className="proof-rail">
          <span>Healthcare</span>
          <span>Data centres</span>
          <span>Manufacturing</span>
          <span>Banking</span>
          <span>Education</span>
          <span>Airports</span>
        </div>
      </InnerPageHero>

      <section className="hub-section hub-section--soft">
        <div className="container">
          <VisitTailorBar context="industries" />
          <div className="section-head" style={{ marginTop: '2.25rem' }}>
            <div className="eyebrow eyebrow-cyan">Sector pathways</div>
            <h2>Pick your operating environment</h2>
            <p>Each landing maps catalog solutions, proof, and a direct consultation path.</p>
          </div>
          <div className="hub-grid">
            {INDUSTRY_DEFS.map((ind) => (
              <Link key={ind.key} href={`/industries/${ind.key}`} className="hub-card">
                <div className="hub-card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={INDUSTRY_IMAGE[ind.key] || '/assets/images/city-skyline-with-solar-panels-and-indus.jpg'}
                    alt=""
                  />
                </div>
                <div className="hub-card-body">
                  <div className="eyebrow">{ind.eyebrow}</div>
                  <h3>{ind.name}</h3>
                  <p>{ind.lead}</p>
                  <span className="hub-card-link">View industry page →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <InnerCtaBand
        title="Need a sector-specific feasibility call?"
        lead="Share load profile, uptime targets, and site constraints — we map UPS, solar, BESS, or AMC options."
        primaryHref="/contact?consult=1"
        primaryLabel="Talk to an engineer →"
        secondaryHref="/tools/solution-finder"
        secondaryLabel="Solution finder"
      />
    </main>
  );
}
