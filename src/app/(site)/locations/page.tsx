import type { Metadata } from 'next';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import VisitTailorBar from '@/components/VisitTailorBar';
import { getThemeSettings } from '@/lib/cms';
import { getLocationDefsCms, getSiteCopy } from '@/lib/site-content';
import { mergeSiteSettings } from '@/lib/site-settings';

export async function generateMetadata(): Promise<Metadata> {
  const [copy, theme] = await Promise.all([getSiteCopy(), getThemeSettings().catch(() => ({}))]);
  const site = mergeSiteSettings((theme as { site?: unknown }).site);
  return {
    title: `${copy.hubs.locations.title} | ${site.companyName}`,
    description: copy.hubs.locations.lead,
  };
}

const LOCATION_IMAGE: Record<string, string> = {
  bengaluru: '/assets/images/kempegowda-international-airport-bengalu.png',
  chennai: '/assets/images/aerial-view-of-dense-commercial-rooftop-.jpg',
  hyderabad: '/assets/images/city-skyline-with-solar-panels-and-indus.jpg',
  mumbai: '/assets/images/blue-electric-vehicle-charging-at-a-mode.jpg',
  pune: '/assets/images/solar-farm-with-wind-turbines-at-sunset-.jpg',
  'delhi-ncr': '/assets/images/engineers-in-hard-hats-reviewing-a-digit.jpg',
};

export default async function LocationsIndexPage() {
  const [copy, locations] = await Promise.all([getSiteCopy(), getLocationDefsCms()]);
  const hub = copy.hubs.locations;

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        eyebrow={hub.eyebrow}
        title={hub.title}
        lead={hub.lead}
        image="/assets/images/aerial-view-of-dense-commercial-rooftop-.jpg"
        actions={
          <>
            <Link href={hub.ctaPrimaryHref} className="btn btn-primary">
              {hub.ctaPrimary}
            </Link>
            <Link href={hub.ctaSecondaryHref} className="btn btn-ghost">
              {hub.ctaSecondary}
            </Link>
          </>
        }
      >
        {hub.proofRail.length ? (
          <div className="proof-rail">
            {hub.proofRail.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
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
            {locations.map((loc) => (
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
        eyebrow={hub.ctaBandEyebrow}
        title={hub.ctaBandTitle}
        lead={hub.ctaBandLead}
        primaryHref={hub.ctaPrimaryHref}
        primaryLabel={hub.ctaPrimary}
        secondaryHref="/sla"
        secondaryLabel="Service levels"
      />
    </main>
  );
}
