import Link from 'next/link';
import type { ReactNode } from 'react';

export type InnerBreadcrumb = { label: string; href?: string };

type Props = {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  image?: string;
  breadcrumb?: InnerBreadcrumb[];
  actions?: ReactNode;
  children?: ReactNode;
  /** Soft cyan vs orange eyebrow accent */
  accent?: 'orange' | 'cyan';
};

const DEFAULT_IMAGE = '/assets/images/engineers-in-hard-hats-reviewing-a-digit.jpg';

/** Compact premium hero shared by Wave 2/3 public pages. */
export default function InnerPageHero({
  eyebrow,
  title,
  lead,
  image = DEFAULT_IMAGE,
  breadcrumb,
  actions,
  children,
  accent = 'orange',
}: Props) {
  return (
    <section className="page-hero page-hero--inner">
      <div className="hero-bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" />
        <div className="hero-overlay" />
        <div className="hero-scrim" />
        <div className="grid-overlay" />
      </div>
      <div className="container page-hero-inner">
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
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
        {actions ? <div className="page-hero-actions">{actions}</div> : null}
        {children}
      </div>
    </section>
  );
}
