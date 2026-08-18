'use client';

import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import SolarRoiClient from '@/components/tools/SolarRoiClient';
import { useSiteCopy } from '@/lib/use-site-copy';

export default function SolarRoiPageClient() {
  const copy = useSiteCopy();
  const t = copy.tools.solarRoi;
  const toolsBreadcrumbHref = copy.features.solutionFinderEnabled
    ? '/tools/solution-finder'
    : '/tools/solar-roi';

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        image={t.image}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: t.breadcrumbTools, href: toolsBreadcrumbHref },
          { label: t.breadcrumbSelf },
        ]}
        actions={
          <>
            <Link href={t.secondaryToolHref} className="btn btn-ghost">
              {t.secondaryToolLabel}
            </Link>
            <Link href={t.primaryCtaHref} className="btn btn-primary">
              {t.primaryCtaLabel}
            </Link>
          </>
        }
      />
      <section className="hub-section hub-section--soft">
        <div className="container">
          <div className="calc-shell">
            <SolarRoiClient />
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
