'use client';

import Link from 'next/link';
import { useSiteShell } from '@/components/SiteProviders';
import { logoAltText } from '@/lib/site-settings';

type ZtoolsPortalBrandProps = {
  layout?: 'header' | 'centered';
  homeHref?: string;
};

export default function ZtoolsPortalBrand({ layout = 'header', homeHref = '/' }: ZtoolsPortalBrandProps) {
  const { settings } = useSiteShell();
  const logoSrc = settings.logoUrl || '/assets/images/zigma-technologies-logo.png';

  if (layout === 'centered') {
    return (
      <div className="ztools-portal-brand-centered">
        <Link href={homeHref} className="ztools-portal-logo-link" aria-label={logoAltText(settings)}>
          <span className="ztools-portal-logo-chip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="" />
          </span>
        </Link>
        <div className="ztools-portal-brand-copy">
          <span className="ztools-portal-company">{settings.companyName}</span>
          <span className="ztools-portal-product-name">ZTools</span>
          <span className="ztools-portal-product-tag">Engineering workspace</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ztools-portal-brand">
      <Link href={homeHref} className="ztools-portal-logo-link" aria-label={logoAltText(settings)}>
        <span className="ztools-portal-logo-chip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" />
        </span>
        <span className="ztools-portal-logo-word">
          <strong>{settings.companyName}</strong>
          <small>{settings.tagline}</small>
        </span>
      </Link>
      <span className="ztools-portal-brand-divider" aria-hidden />
      <Link href="/ztools/dashboard" className="ztools-portal-product">
        <span className="ztools-portal-product-name">ZTools</span>
        <span className="ztools-portal-product-tag">Engineering workspace</span>
      </Link>
    </div>
  );
}
