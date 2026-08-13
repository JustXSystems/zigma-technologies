'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import { trackEvent } from '@/lib/analytics';

type Need = 'backup' | 'solar' | 'storage' | 'ev' | 'service' | 'unsure';
type Scale = 'small' | 'medium' | 'large';

const NEED_OPTIONS: { id: Need; title: string; blurb: string }[] = [
  { id: 'backup', title: 'Power backup / UPS', blurb: 'Protect critical loads from outages' },
  { id: 'solar', title: 'Solar generation', blurb: 'Cut daytime energy cost' },
  { id: 'storage', title: 'Battery storage (BESS)', blurb: 'Peak shaving & firming' },
  { id: 'ev', title: 'EV charging', blurb: 'Campus or fleet charging' },
  { id: 'service', title: 'AMC / repair / rental', blurb: 'Keep assets healthy' },
  { id: 'unsure', title: 'Not sure yet', blurb: 'Help me choose' },
];

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

export default function SolutionFinderPage() {
  const [need, setNeed] = useState<Need | null>(null);
  const [scale, setScale] = useState<Scale>('medium');
  const result = useMemo(() => (need ? recommend(need, scale) : null), [need, scale]);

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        accent="cyan"
        eyebrow="Solution finder"
        title="Compare paths in under a minute"
        lead="Pick what you need and site scale — we point you to the best catalog path and quote intake."
        image="/assets/images/engineers-reviewing-electrical-design-dr.jpg"
        actions={
          <>
            <Link href="/tools/ups-calculator" className="btn btn-ghost">
              UPS calculator
            </Link>
            <Link href="/tools/solar-roi" className="btn btn-ghost">
              Solar ROI
            </Link>
          </>
        }
      />

      <section className="hub-section hub-section--soft">
        <div className="container" style={{ maxWidth: 960 }}>
          <div className="finder-panel">
            <h2>1. What do you need?</h2>
            <div className="consult-options">
              {NEED_OPTIONS.map((opt) => (
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
                <h2 style={{ marginTop: '2rem' }}>2. Approximate scale</h2>
                <div className="service-chip-rail" style={{ marginTop: '0.85rem' }}>
                  {(
                    [
                      ['small', 'Small (< 50 kW/kVA)'],
                      ['medium', 'Medium (50–500)'],
                      ['large', 'Large / utility'],
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
                <div className="eyebrow eyebrow-cyan">Recommended</div>
                <h2>{result.title}</h2>
                <p>{result.why}</p>
                <div className="thank-you-actions" style={{ marginTop: '1rem' }}>
                  <Link
                    href={result.href}
                    className="btn btn-primary"
                    onClick={() => trackEvent('configurator_complete', { need: need || '', href: result.href })}
                  >
                    Browse recommendation →
                  </Link>
                  <Link
                    href={`/contact?consult=1&consult_subject=${encodeURIComponent(result.subject)}`}
                    className="btn btn-ghost-dark"
                  >
                    Request a quote
                  </Link>
                  <Link href={result.secondary.href} className="link">
                    {result.secondary.label} →
                  </Link>
                </div>
              </article>
            ) : null}
          </div>
        </div>
      </section>

      <InnerCtaBand
        title="Want an engineer to validate the path?"
        lead="Share site constraints and load profile — we refine the recommendation into a feasibility plan."
        primaryHref="/contact?consult=1"
        primaryLabel="Request consultation →"
        secondaryHref="/resources"
        secondaryLabel="Browse guides"
      />
    </main>
  );
}
