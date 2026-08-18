import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import type { LocationDef } from '@/lib/locations';
import type { ServiceSeoDef } from '@/lib/location-services';
import type { CatalogItem } from '@/lib/types';
import { SERVICE_SEO_DEFS } from '@/lib/location-services';
import { getSiteCopy } from '@/lib/site-content';

type Props = {
  location: LocationDef;
  service: ServiceSeoDef;
  items: CatalogItem[];
  subject: string;
  lead: string;
};

export default async function LocationServiceLandingView({ location, service, items, subject, lead }: Props) {
  const copy = await getSiteCopy();

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        eyebrow={location.name}
        title={
          <>
            {service.name} in {location.name}
          </>
        }
        lead={lead}
        image="/assets/images/engineers-inspecting-switchgear-panels-i.jpg"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Locations', href: '/locations' },
          { label: location.name, href: `/locations/${location.key}` },
          { label: service.name },
        ]}
        actions={
          <>
            <Link
              href={`/contact?consult=1&consult_subject=${encodeURIComponent(subject)}`}
              className="btn btn-primary"
            >
              Request quote →
            </Link>
            {copy.features.solutionFinderEnabled ? (
              <Link href="/tools/solution-finder" className="btn btn-ghost">
                Solution finder
              </Link>
            ) : (
              <Link href="/sla" className="btn btn-ghost">
                See response SLAs
              </Link>
            )}
          </>
        }
      />

      <section className="hub-section hub-section--soft">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow eyebrow-cyan">Also available in {location.name}</div>
            <h2>Related services</h2>
          </div>
          <div className="service-chip-rail">
            {SERVICE_SEO_DEFS.map((s) => (
              <Link
                key={s.key}
                href={`/locations/${location.key}/${s.key}`}
                className={s.key === service.key ? 'chip chip-active' : 'chip'}
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {items.length ? (
        <section className="hub-section">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow eyebrow-orange">Catalogue</div>
              <h2>{service.name} options</h2>
            </div>
            <div className="hub-grid">
              {items.map((item) => {
                const base =
                  item.item_type === 'project' ? 'projects' : item.item_type === 'product' ? 'products' : 'services';
                return (
                  <Link key={item.id} href={`/${base}/${item.slug}`} className="hub-card">
                    <div className="hub-card-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.primary_image || '/assets/images/engineers-inspecting-switchgear-panels-i.jpg'}
                        alt={item.title}
                        loading="lazy"
                      />
                    </div>
                    <div className="hub-card-body">
                      <div className="eyebrow">{item.availability_label || item.category_name || item.item_type}</div>
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

      <InnerCtaBand
        title={`${service.name} for ${location.name}`}
        lead="Share capacity, site constraints, and timeline — we respond with a clear feasibility path."
        primaryHref={`/contact?consult=1&consult_subject=${encodeURIComponent(subject)}`}
        primaryLabel="Request consultation →"
        secondaryHref={`/locations/${location.key}`}
        secondaryLabel={`Back to ${location.name}`}
      />
    </main>
  );
}
