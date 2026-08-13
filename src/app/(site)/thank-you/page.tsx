'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import InnerPageHero from '@/components/InnerPageHero';
import { trackEvent } from '@/lib/analytics';
import { DEFAULT_SITE_SETTINGS, telHref, type SiteSettings } from '@/lib/site-settings';
import { whatsappHref } from '@/lib/whatsapp';

function ThankYouInner() {
  const params = useSearchParams();
  const intent = params.get('intent') || 'enquiry';
  const city = params.get('city') || '';
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    trackEvent('thank_you_view', { intent, city });
    fetch('/api/public/site-settings')
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) setSite(data.settings);
      })
      .catch(() => undefined);
  }, [intent, city]);

  const booking = site.bookingUrl?.trim();
  const title =
    intent === 'callback'
      ? 'Callback requested'
      : intent === 'brochure'
        ? 'Brochure unlocked'
        : intent === 'careers'
          ? 'Application received'
          : 'Thank you — we have your enquiry';

  return (
    <main id="main-content" className="thank-you-page hub-page">
      <InnerPageHero
        accent="cyan"
        eyebrow="Next steps"
        title={title}
        lead={
          <>
            {city ? `Our ${city} desk ` : 'Our engineering team '}
            will review your note and respond with a clear feasibility path
            {site.responseSla ? ` — typically ${site.responseSla}` : ' — typically within 1 business day'}.
          </>
        }
        image="/assets/images/zigma-technologies-engineers-collaborati.jpg"
      >
        <div className="proof-rail">
          <span>Engineer-owned follow-up</span>
          <span>Clear options, not a sales script</span>
        </div>
      </InnerPageHero>

      <section className="hub-section hub-section--soft">
        <div className="container thank-you-grid">
          <article className="thank-you-card">
            <h2>What happens next</h2>
            <ol>
              <li>We confirm scope, site constraints, and urgency.</li>
              <li>An engineer proposes options (product / EPC / AMC) with rough timelines.</li>
              <li>You choose a site visit, quote package, or remote review.</li>
            </ol>
          </article>
          <article className="thank-you-card">
            <h2>Talk sooner</h2>
            <div className="thank-you-actions">
              <a
                href={telHref(site.phone)}
                className="btn btn-primary"
                onClick={() => trackEvent('cta_click', { channel: 'call', placement: 'thank_you' })}
              >
                Call {site.phone}
              </a>
              <a
                href={whatsappHref(site.whatsapp, 'Hi Zigma — following up on my enquiry.')}
                className="btn btn-ghost-dark"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('cta_click', { channel: 'whatsapp', placement: 'thank_you' })}
              >
                WhatsApp an engineer
              </a>
              {booking ? (
                <a
                  href={booking}
                  className="btn btn-ghost-dark"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('cta_click', { channel: 'booking', placement: 'thank_you' })}
                >
                  Book a consultation slot →
                </a>
              ) : null}
            </div>
            {site.officeHours ? <p className="contact-sla">Office hours: {site.officeHours}</p> : null}
          </article>
        </div>
        <div className="container" style={{ marginTop: '1.75rem' }}>
          <Link href="/tools/solution-finder" className="link">
            Not sure what you need? Try the solution finder →
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content">
          <div className="container" style={{ padding: '6rem 0' }}>
            Loading…
          </div>
        </main>
      }
    >
      <ThankYouInner />
    </Suspense>
  );
}
