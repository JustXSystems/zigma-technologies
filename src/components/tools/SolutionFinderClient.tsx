'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import { trackEvent } from '@/lib/analytics';
import { useSiteCopy } from '@/lib/use-site-copy';
import type { ToolNeedOption } from '@/lib/site-copy';

type Need = ToolNeedOption['id'];
type Scale = 'small' | 'medium' | 'large';

function recommend(need: Need, scale: Scale) {
  if (need === 'backup') {
    return {
      title: 'UPS & power continuity',
      href: '/products?category=ups-systems',
      why: 'Start with UPS sizing, then AMC for lifecycle support.',
      secondary: { label: 'UPS AMC', href: '/services?category=ups-amc' },
      subject: 'UPS Solution',
    };
  }
  if (need === 'solar') {
    return {
      title: scale === 'large' ? 'Solar EPC projects' : 'Solar products & inverters',
      href: scale === 'large' ? '/projects?category=solar-epc' : '/products?category=solar-solutions',
      why: 'Match rooftop/plant capacity to daytime load, then plan O&M.',
      secondary: { label: 'Solar O&M', href: '/services?category=solar-om' },
      subject: 'Solar Solution',
    };
  }
  if (need === 'storage') {
    return {
      title: 'BESS & hybrid storage',
      href: '/products?category=bess',
      why: 'Peak shaving and solar firming with EMS-led dispatch.',
      secondary: { label: 'Hybrid Studer', href: '/products?category=studer-hybrid' },
      subject: 'BESS- Battery System',
    };
  }
  if (need === 'ev') {
    return {
      title: 'EV charging infrastructure',
      href: '/products?category=ev-charging',
      why: 'Right-size AC/DC chargers with load management.',
      secondary: { label: 'EV capability overview', href: '/#ev-charging' },
      subject: 'EV Charging Solution',
    };
  }
  if (need === 'service') {
    return {
      title: 'Field services & AMC',
      href: '/services',
      why: 'Commissioning, repair, rental, and O&M keep uptime predictable.',
      secondary: { label: 'UPS repair', href: '/services?category=ups-repair' },
      subject: 'AMC & Service Request',
    };
  }
  return {
    title: 'Talk to an engineer',
    href: '/contact?consult=1&consult_subject=Request%20a%20Quote',
    why: 'Share capacity and site constraints — we will map the shortest path.',
    secondary: { label: 'Browse industries', href: '/industries' },
    subject: 'Request a Quote',
  };
}

export default function SolutionFinderClient() {
  const copy = useSiteCopy();
  const t = copy.tools.solutionFinder;
  const [need, setNeed] = useState<Need | null>(null);
  const [scale, setScale] = useState<Scale>('medium');
  const result = useMemo(() => (need ? recommend(need, scale) : null), [need, scale]);

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        accent="cyan"
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        image={t.image}
        actions={
          <>
            <Link href={t.primaryCtaHref} className="btn btn-ghost">
              {t.primaryCtaLabel}
            </Link>
            <Link href={t.secondaryToolHref} className="btn btn-ghost">
              {t.secondaryToolLabel}
            </Link>
          </>
        }
      />

      <section className="hub-section hub-section--soft">
        <div className="container" style={{ maxWidth: 960 }}>
          <div className="finder-panel">
            <h2>{t.needStepTitle}</h2>
            <div className="consult-options">
              {t.needOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`consult-option${need === opt.id ? ' is-selected' : ''}`}
                  onClick={() => {
                    setNeed(opt.id);
                    trackEvent('configurator_step', { need: opt.id });
                  }}
                >
                  <div className="consult-option-title">{opt.title}</div>
                  <div className="consult-option-subtitle">{opt.blurb}</div>
                </button>
              ))}
            </div>

            {need ? (
              <>
                <h2 style={{ marginTop: '2rem' }}>{t.scaleStepTitle}</h2>
                <div className="service-chip-rail" style={{ marginTop: '0.85rem' }}>
                  {(
                    [
                      ['small', t.scaleSmall],
                      ['medium', t.scaleMedium],
                      ['large', t.scaleLarge],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`btn ${scale === id ? 'btn-primary' : 'btn-ghost-dark'}`}
                      onClick={() => setScale(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {result ? (
              <article className="thank-you-card" style={{ marginTop: '2rem' }}>
                <div className="eyebrow eyebrow-cyan">{t.recommendedEyebrow}</div>
                <h2>{result.title}</h2>
                <p>{result.why}</p>
                <div className="thank-you-actions" style={{ marginTop: '1rem' }}>
                  <Link
                    href={result.href}
                    className="btn btn-primary"
                    onClick={() => trackEvent('configurator_complete', { need: need || '', href: result.href })}
                  >
                    {t.browseRecommendation}
                  </Link>
                  <Link
                    href={`/contact?consult=1&consult_subject=${encodeURIComponent(result.subject)}`}
                    className="btn btn-ghost-dark"
                  >
                    {t.requestQuote}
                  </Link>
                  {copy.features.industriesEnabled || !result.secondary.href.startsWith('/industries') ? (
                    <Link href={result.secondary.href} className="action-link">
                      <span>{result.secondary.label}</span>
                      <span className="action-link-arrow" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  ) : null}
                </div>
              </article>
            ) : null}
          </div>
        </div>
      </section>

      <InnerCtaBand
        title={t.ctaBandTitle}
        lead={t.ctaBandLead}
        primaryHref={t.ctaBandPrimaryHref}
        primaryLabel={t.ctaBandPrimaryLabel}
        secondaryHref={t.ctaBandSecondaryHref}
        secondaryLabel={t.ctaBandSecondaryLabel}
      />
    </main>
  );
}
