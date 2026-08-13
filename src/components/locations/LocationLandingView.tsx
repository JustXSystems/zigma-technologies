import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import type { LocationDef } from '@/lib/locations';
import type { CatalogItem } from '@/lib/types';

type Props = {
  location: LocationDef;
  items: CatalogItem[];
};

const SERVICE_LINKS: [string, string][] = [
  ['ups-amc', 'UPS AMC'],
  ['solar-epc', 'Solar EPC'],
  ['ups-systems', 'UPS Systems'],
  ['bess', 'BESS'],
  ['ev-charging', 'EV Charging'],
  ['field-services', 'Field Services'],
];

export default function LocationLandingView({ location, items }: Props) {
  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        eyebrow={location.eyebrow}
        title={<>Power &amp; energy engineering in {location.name}</>}
        lead={location.lead}
        image="/assets/images/aerial-view-of-dense-commercial-rooftop-.jpg"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Locations', href: '/locations' },
          { label: location.name },
        ]}
        actions={
          <>
            <Link
              href={`/contact?consult=1&consult_subject=${encodeURIComponent(location.subject)}`}
              className="btn btn-primary"
            >
              Request {location.name} consultation →
            </Link>
            <Link href="/sla" className="btn btn-ghost">
              See response SLAs
            </Link>
          </>
        }
      >
        <div className="proof-rail">
          <span>{location.state}, India</span>
          <span>1-day feasibility target</span>
          <span>24×7 emergency desk</span>
        </div>
      </InnerPageHero>

      <section className="hub-section hub-section--soft">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow eyebrow-cyan">Local strengths</div>
            <h2>Why teams in {location.name} work with Zigma</h2>
          </div>
          <ul className="highlight-grid">
            {location.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <p className="contact-sla" style={{ marginTop: '1.5rem' }}>
            Typical response: feasibility call within 1 business day · Emergency desk available 24×7
          </p>
        </div>
      </section>

      {items.length ? (
        <section className="hub-section">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow eyebrow-orange">Relevant work</div>
              <h2>Projects &amp; products near your use-case</h2>
            </div>
            <div className="hub-grid">
              {items.map((item) => {
                const base =
                  item.item_type === 'project' ? 'projects' : item.item_type === 'product' ? 'products' : 'services';
                return (
                  <Link key={`${item.item_type}-${item.id}`} href={`/${base}/${item.slug}`} className="hub-card">
                    <div className="hub-card-media">
                      {item.primary_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.primary_image} alt={item.title} loading="lazy" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src="/assets/images/engineers-inspecting-switchgear-panels-i.jpg" alt="" />
                      )}
                    </div>
                    <div className="hub-card-body">
                      <div className="eyebrow">{item.category_name || item.item_type}</div>
                      <h3>{item.title}</h3>
                      <p>{item.summary}</p>
                      <span className="hub-card-link">View details →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="hub-section hub-section--soft">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow eyebrow-cyan">Service matrix</div>
            <h2>Services in {location.name}</h2>
            <p>City × service landings for SEO and faster routing to the right engineering desk.</p>
          </div>
          <div className="service-chip-rail">
            {SERVICE_LINKS.map(([key, label]) => (
              <Link key={key} href={`/locations/${location.key}/${key}`} className="chip">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <InnerCtaBand
        title={`Ready for a ${location.name} site review?`}
        lead="Tell us capacity, timeline, and urgency — we return a clear next step with local ownership."
        primaryHref={`/contact?consult=1&consult_subject=${encodeURIComponent(location.subject)}`}
        primaryLabel="Request consultation →"
        secondaryHref="/tools/solution-finder"
        secondaryLabel="Solution finder"
      />
    </main>
  );
}
