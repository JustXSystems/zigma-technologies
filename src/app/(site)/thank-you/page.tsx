'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import InnerPageHero from '@/components/InnerPageHero';
import { trackEvent } from '@/lib/analytics';
import { DEFAULT_SITE_SETTINGS, telHref, type SiteSettings } from '@/lib/site-settings';
import { useSiteCopy } from '@/lib/use-site-copy';
import { whatsappHref } from '@/lib/whatsapp';

function ThankYouInner() {
  const params = useSearchParams();
  const intent = params.get('intent') || 'enquiry';
  const city = params.get('city') || '';
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const copy = useSiteCopy();

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
      ? copy.thankYou.titleCallback
      : intent === 'brochure'
        ? copy.thankYou.titleBrochure
        : intent === 'careers'
          ? copy.thankYou.titleCareers
          : copy.thankYou.titleEnquiry;

  const leadStart = city
    ? copy.thankYou.leadCityPrefix.replace('{city}', city)
    : copy.thankYou.leadPrefix;

  return (
    <main id="main-content" className="thank-you-page hub-page">
      <InnerPageHero
        accent="cyan"
        eyebrow={copy.thankYou.eyebrow}
        title={title}
        lead={
          <>
            {leadStart}
            {copy.thankYou.leadSuffix}
            {site.responseSla ? ` — typically ${site.responseSla}` : ' — typically within 1 business day'}.
          </>
        }
        image="/assets/images/zigma-technologies-engineers-collaborati.jpg"
      >
        {copy.thankYou.proofRail.length ? (
          <div className="proof-rail">
            {copy.thankYou.proofRail.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
      </InnerPageHero>

      <section className="hub-section hub-section--soft">
        <div className="container thank-you-grid">
          <article className="thank-you-card">
            <h2>{copy.thankYou.nextTitle}</h2>
            <ol>
              {copy.thankYou.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
          <article className="thank-you-card">
            <h2>{copy.thankYou.talkTitle}</h2>
            <div className="thank-you-actions">
              <a
                href={telHref(site.phone)}
                className="btn btn-primary"
                onClick={() => trackEvent('cta_click', { channel: 'call', placement: 'thank_you' })}
              >
                Call {site.phone}
              </a>
              <a
                href={whatsappHref(site.whatsapp, copy.thankYou.whatsappPrefill)}
                className="btn btn-ghost-dark"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('cta_click', { channel: 'whatsapp', placement: 'thank_you' })}
              >
                WhatsApp
              </a>
              {booking ? (
                <a href={booking} className="btn btn-ghost-dark" target="_blank" rel="noopener noreferrer">
                  Book a slot
                </a>
              ) : null}
            </div>
            <p className="thank-you-meta">
              {site.officeHours ? <>Hours: {site.officeHours}. </> : null}
              <Link href="/">Back to home</Link>
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<main id="main-content" className="hub-page" />}>
      <ThankYouInner />
    </Suspense>
  );
}
