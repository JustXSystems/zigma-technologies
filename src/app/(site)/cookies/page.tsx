import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cookie Policy | Zigma Technologies',
  description: 'How Zigma Technologies uses necessary, analytics, and marketing cookies on this website.',
};

export default function CookiesPage() {
  return (
    <main id="main-content">
      <section className="page-hero" style={{ minHeight: 'auto', padding: '10rem 0 3rem' }}>
        <div className="hero-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/images/engineers-reviewing-electrical-design-dr.jpg" alt="" />
          <div className="hero-overlay"></div>
          <div className="grid-overlay"></div>
        </div>
        <div className="container">
          <div className="eyebrow">Legal</div>
          <h1>Cookie Policy</h1>
          <p className="lead">Categories we use and how you can control them.</p>
        </div>
      </section>
      <section className="section section-light">
        <div className="container" style={{ maxWidth: 820 }}>
          <h2>Necessary</h2>
          <p>Required for security, session, and basic site operation (including admin login cookies when you sign in).</p>
          <h2>Analytics</h2>
          <p>
            Optional. When enabled via the consent banner, we may load Google Analytics 4 and/or Plausible to understand
            traffic and conversion events (enquiry, brochure, CTA clicks).
          </p>
          <h2>Marketing</h2>
          <p>Optional. Reserved for future advertising pixels; not loaded unless you opt in.</p>
          <p>
            Manage choices anytime by clearing site cookies for this domain, or see our{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
