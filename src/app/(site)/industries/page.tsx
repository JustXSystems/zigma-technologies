import type { Metadata } from 'next';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import VisitTailorBar from '@/components/VisitTailorBar';
import { getIndustryDefsCms, getSiteCopy } from '@/lib/site-content';
import { mergeSiteSettings } from '@/lib/site-settings';
import { getThemeSettings } from '@/lib/cms';

export async function generateMetadata(): Promise<Metadata> {
  const [copy, theme] = await Promise.all([getSiteCopy(), getThemeSettings().catch(() => ({}))]);
  const site = mergeSiteSettings((theme as { site?: unknown }).site);
  return {
    title: `${copy.hubs.industries.title} | ${site.companyName}`,
    description: copy.hubs.industries.lead,
  };
}

const INDUSTRY_IMAGE: Record<string, string> = {
  healthcare: '/assets/images/zigma-technologies-engineers-monitoring-.jpg',
  'data-centres': '/assets/images/engineers-inspecting-switchgear-panels-i.jpg',
  manufacturing: '/assets/images/engineers-in-hard-hats-reviewing-a-digit.jpg',
  banking: '/assets/images/engineers-reviewing-electrical-design-dr.jpg',
  education: '/assets/images/bangalore-international-exhibition-centr.png',
  airports: '/assets/images/kempegowda-international-airport-bengalu.png',
};

export default async function IndustriesIndexPage() {
  const [copy, industries] = await Promise.all([getSiteCopy(), getIndustryDefsCms()]);
  const hub = copy.hubs.industries;

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        eyebrow={hub.eyebrow}
        title={hub.title}
        lead={hub.lead}
        image="/assets/images/city-skyline-with-solar-panels-and-indus.jpg"
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
          <VisitTailorBar context="industries" />
          <div className="section-head" style={{ marginTop: '2.25rem' }}>
            <div className="eyebrow eyebrow-cyan">Sector pathways</div>
            <h2>Pick your operating environment</h2>
            <p>Each landing maps catalog solutions, proof, and a direct consultation path.</p>
          </div>
          <div className="hub-grid">
            {industries.map((ind) => (
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
        eyebrow={hub.ctaBandEyebrow}
        title={hub.ctaBandTitle}
        lead={hub.ctaBandLead}
        primaryHref={hub.ctaPrimaryHref}
        primaryLabel={hub.ctaPrimary}
        secondaryHref={copy.features.toolsEnabled ? '/tools/solution-finder' : hub.ctaSecondaryHref}
        secondaryLabel={copy.features.toolsEnabled ? copy.talk.solutionFinder : hub.ctaSecondary}
      />
    </main>
  );
}
