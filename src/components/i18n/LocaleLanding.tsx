import Link from 'next/link';
import type { LocaleCopy } from '@/lib/site-copy';

type Props = {
  locale: 'hi' | 'kn';
  copy: LocaleCopy;
  toolsEnabled: boolean;
};

export default function LocaleLanding({ locale, copy, toolsEnabled }: Props) {
  return (
    <main id="main-content">
      <section className="page-hero" style={{ minHeight: '70vh', padding: '10rem 0 4rem' }}>
        <div className="hero-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/images/solar-farm-with-wind-turbines-at-sunset-.jpg" alt="" />
          <div className="hero-overlay"></div>
          <div className="grid-overlay"></div>
        </div>
        <div className="container">
          <div className="eyebrow">{copy.langName}</div>
          <h1>{copy.title}</h1>
          <p className="lead">{copy.lead}</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
            <Link href="/products?category=ups-systems" className="btn btn-ghost-dark">
              {copy.ups}
            </Link>
            <Link href="/projects?category=solar-epc" className="btn btn-ghost-dark">
              {copy.solar}
            </Link>
            {toolsEnabled ? (
              <Link href="/tools/ups-calculator" className="btn btn-ghost-dark">
                {copy.calc}
              </Link>
            ) : null}
            <Link href="/contact?consult=1&consult_subject=Request%20a%20Quote" className="btn btn-primary">
              {copy.cta} →
            </Link>
          </div>
          <p style={{ marginTop: '1.5rem' }}>
            <Link href="/" className="link">
              {copy.englishSite}
            </Link>
            {' · '}
            <Link href="/locations" className="link">
              {copy.locations}
            </Link>
            {' · '}
            <Link href="/sla" className="link">
              {copy.sla}
            </Link>
            {' · '}
            <Link href={locale === 'hi' ? '/kn' : '/hi'} className="link">
              {copy.altLocaleLabel}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
