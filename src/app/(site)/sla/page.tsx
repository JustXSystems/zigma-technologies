import type { Metadata } from 'next';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import { getThemeSettings } from '@/lib/cms';
import { mergeSiteSettings } from '@/lib/site-settings';

export const metadata: Metadata = {
  title: 'Service levels & response commitments',
  description: 'Published response SLAs for enquiries, emergency UPS support, AMC, and solar O&M.',
};

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
  const theme = await getThemeSettings();
  const settings = mergeSiteSettings(theme.site);
  const metrics = parseMetrics(settings.slaMetricsJson);

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        accent="cyan"
        eyebrow="Transparency"
        title="Service level dashboard"
        lead={
          <>
            How quickly we aim to respond — office hours {settings.officeHours}. Typical first reply:{' '}
            {settings.responseSla}.
          </>
        }
        image="/assets/images/zigma-technologies-help-desk-team-assist.jpg"
        actions={
          <>
            <Link href="/contact?consult=1" className="btn btn-primary">
              Talk to an engineer →
            </Link>
            <Link href="/contact" className="btn btn-ghost">
              Contact desk
            </Link>
          </>
        }
      >
        <div className="proof-rail">
          <span>Published commitments</span>
          <span>Emergency desk</span>
          <span>Engineering-owned response</span>
        </div>
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
        title="Need an emergency or AMC conversation now?"
        lead="Use Talk to us in the header, or open a consultation with urgency noted."
        primaryHref="/contact?consult=1"
        primaryLabel="Open consultation →"
        secondaryHref="/locations"
        secondaryLabel="Find your city"
      />
    </main>
  );
}
