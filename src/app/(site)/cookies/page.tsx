import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeading from '@/components/SiteHeading';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteCopy } from '@/lib/site-content';

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  return buildPageMetadata({
    title: copy.cookies.pageTitle,
    description: copy.cookies.pageLead,
    path: '/cookies',
  });
}

export default async function CookiesPage() {
  const copy = await getSiteCopy();
  const c = copy.cookies;

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
          <div className="eyebrow">{c.pageEyebrow}</div>
          <SiteHeading role="pageHero">{c.pageTitle}</SiteHeading>
          <p className="lead">{c.pageLead}</p>
        </div>
      </section>
      <section className="section section-light">
        <div className="container" style={{ maxWidth: 820 }}>
          <h3>{c.necessaryHeading}</h3>
          <p>{c.necessaryBody}</p>
          <h3>{c.analyticsHeading}</h3>
          <p>{c.analyticsBody}</p>
          <h3>{c.marketingHeading}</h3>
          <p>{c.marketingBody}</p>
          <p>
            {c.manageHint}{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
