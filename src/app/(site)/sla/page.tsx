import type { Metadata } from 'next';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import { getThemeSettings } from '@/lib/cms';
import { getSiteCopy } from '@/lib/site-content';
import { mergeSiteSettings } from '@/lib/site-settings';

export async function generateMetadata(): Promise<Metadata> {
  const [copy, theme] = await Promise.all([getSiteCopy(), getThemeSettings().catch(() => ({}))]);
  const site = mergeSiteSettings((theme as { site?: unknown }).site);
  return {
    title: `${copy.hubs.sla.title} | ${site.companyName}`,
    description: copy.hubs.sla.lead,
  };
}

type Metric = { label: string; value: string };

function parseMetrics(raw: string): Metric[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m): m is Metric => Boolean(m && typeof m === 'object' && 'label' in m && 'value' in m))
      .map((m) => ({ label: String(m.label), value: String(m.value) }));
  } catch {
    return [];
  }
}

export default async function SlaPage() {
  const [theme, copy] = await Promise.all([getThemeSettings(), getSiteCopy()]);
  const settings = mergeSiteSettings(theme.site);
  const metrics = parseMetrics(settings.slaMetricsJson);
  const hub = copy.hubs.sla;

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        accent="cyan"
        eyebrow={hub.eyebrow}
        title={hub.title}
        lead={
          <>
            {hub.lead} Office hours {settings.officeHours}. Typical first reply: {settings.responseSla}.
          </>
        }
        image="/assets/images/zigma-technologies-help-desk-team-assist.jpg"
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
          <div className="section-head">
            <div className="eyebrow eyebrow-orange">Commitments</div>
            <h2>What we publish — and manage to</h2>
            <p>Clear targets for enquiry handling, emergency UPS support, AMC, and solar O&amp;M.</p>
          </div>
          {metrics.length ? (
            <div className="sla-grid">
              {metrics.map((m) => (
                <article key={m.label} className="sla-card">
                  <h3>{m.label}</h3>
                  <p>{m.value}</p>
                </article>
              ))}
            </div>
          ) : (
            <p>SLA metrics will appear here once configured in Site Settings.</p>
          )}
        </div>
      </section>

      <InnerCtaBand
        eyebrow={hub.ctaBandEyebrow}
        title={hub.ctaBandTitle}
        lead={hub.ctaBandLead}
        primaryHref={hub.ctaPrimaryHref}
        primaryLabel={hub.ctaPrimary}
        secondaryHref="/locations"
        secondaryLabel="Find your city"
      />
    </main>
  );
}
