import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import SiteHeading from '@/components/SiteHeading';
import HeroBackgroundMedia from '@/components/HeroBackgroundMedia';
import JsonLd from '@/components/JsonLd';
import { breadcrumbJsonLd } from '@/lib/seo';
import { heroHeightClass, type HeroHeight } from '@/lib/hero-height';
import { heroPlacement, type HeroPlacement } from '@/lib/hero-placement';
import HeroSlot from '@/components/HeroSlot';

export type InnerBreadcrumb = { label: string; href?: string };

type Props = {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  image?: string;
  imageMobile?: string;
  breadcrumb?: InnerBreadcrumb[];
  actions?: ReactNode;
  children?: ReactNode;
  /** Soft cyan vs orange eyebrow accent */
  accent?: 'orange' | 'cyan';
  height?: HeroHeight;
  placement?: HeroPlacement;
  /** Extra hero classes (alignment, vertical position, entrance…) and CSS variables from the editor */
  className?: string;
  style?: CSSProperties;
  /** Fixed / absolutely positioned extras rendered inside the section, e.g. the scroll progress bar */
  overlay?: ReactNode;
};

const DEFAULT_IMAGE = '/assets/images/engineers-in-hard-hats-reviewing-a-digit.jpg';

/** Compact premium hero shared by Wave 2/3 public pages. */
export default function InnerPageHero({
  eyebrow,
  title,
  lead,
  image = DEFAULT_IMAGE,
  imageMobile,
  breadcrumb,
  actions,
  children,
  accent = 'orange',
  height,
  placement,
  className,
  style,
  overlay,
}: Props) {
  const place = heroPlacement(placement);
  return (
    <section
      className={`page-hero page-hero--inner ${heroHeightClass(height)} ${place.rootClass}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {overlay}
      <div className="hero-bg">
        <HeroBackgroundMedia src={image} mobileSrc={imageMobile} className="hero-bg-media" eager alt="" />
        <div className="hero-overlay" />
        <div className="hero-scrim" />
        <div className="grid-overlay" />
      </div>
      <div className="container page-hero-inner">
        {breadcrumb?.length ? (
          <JsonLd data={breadcrumbJsonLd(breadcrumb.map((c) => ({ name: c.label, path: c.href })))} />
        ) : null}
        <HeroSlot place={place} name="text">
        {breadcrumb?.length ? (
          <nav className="breadcrumb" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => {
              const last = i === breadcrumb.length - 1;
              return (
                <span key={`${crumb.label}-${i}`} className="breadcrumb-piece">
                  {i > 0 ? <span className="sep">/</span> : null}
                  {last || !crumb.href ? (
                    <span className="current">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href}>{crumb.label}</Link>
                  )}
                </span>
              );
            })}
          </nav>
        ) : null}
        <div className={`eyebrow${accent === 'cyan' ? ' eyebrow-cyan' : ' eyebrow-orange'}`}>{eyebrow}</div>
        <SiteHeading role="pageHero">{title}</SiteHeading>
        {lead ? <p className="lead">{lead}</p> : null}
        {actions ? <div className="page-hero-actions">{actions}</div> : null}
        {children}
        </HeroSlot>
      </div>
    </section>
  );
}
