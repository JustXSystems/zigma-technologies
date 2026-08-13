import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import type { CatalogItem } from '@/lib/types';
import type { IndustryDef } from '@/lib/industries';

type Props = {
  industry: IndustryDef;
  items: CatalogItem[];
};

export default function IndustryLandingView({ industry, items }: Props) {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: industry.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <main id="main-content" className="hub-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <InnerPageHero
        eyebrow={industry.eyebrow}
        title={industry.name}
        lead={industry.lead}
        image="/assets/images/city-skyline-with-solar-panels-and-indus.jpg"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Industries', href: '/industries' },
          { label: industry.name },
        ]}
        actions={
          <>
            <Link
              href={`/contact?consult=1&consult_subject=${encodeURIComponent(industry.subject)}`}
              className="btn btn-primary"
            >
              Request industry consultation →
            </Link>
            <Link href="/projects" className="btn btn-ghost">
              Browse projects
            </Link>
          </>
        }
      />

      {items.length ? (
        <section className="hub-section hub-section--soft">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow eyebrow-cyan">Relevant solutions</div>
              <h2>Products, projects &amp; services for {industry.name}</h2>
              <p>Curated from the live catalog for this sector’s typical load and uptime profile.</p>
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

      <section className="hub-section">
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="section-head">
            <div className="eyebrow eyebrow-orange">FAQ</div>
            <h2>Common questions for {industry.name}</h2>
          </div>
          <div className="industry-faq">
            {industry.faqs.map((f) => (
              <details key={f.q} className="industry-faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <InnerCtaBand
        title={`Design power for ${industry.name}`}
        lead="Share capacity, redundancy targets, and site constraints — we return a clear feasibility path."
        primaryHref={`/contact?consult=1&consult_subject=${encodeURIComponent(industry.subject)}`}
        primaryLabel="Request consultation →"
        secondaryHref="/locations"
        secondaryLabel="Pick a city"
      />
    </main>
  );
}
