'use client';

import { useRef } from 'react';
import VisitTailorBar from '@/components/VisitTailorBar';
import { appHref } from '@/lib/base-path';
import { AzIcon, AzText, vars } from '@/components/sections/AboutSections';
import { LzMedia, colVars, useStaggerReveal } from '@/components/sections/LifeSections';
import { LegacyStatsSection, LgHeader, LgShell, cardVars, useOkMedia, useSlides } from '@/components/sections/LegacySections';
import { ContactActionLink, ContactHeroSection, ContactSlides, iconVars } from '@/components/sections/ContactSections';
import { CertsCtaSection } from '@/components/sections/CertificationsSections';
import { elementCss } from '@/lib/about-sections';
import { visibleMedia, type LifeMediaItem } from '@/lib/life-sections';
import {
  withIndustriesDefaults,
  type IndustriesCategoryCard,
  type IndustriesCategoryContent,
  type IndustriesHubCard,
  type IndustriesHubContent,
} from '@/lib/industries-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

const t = (v: unknown) => String(v ?? '').trim();

/* ------------------------------------------------------------------ */
/* Hero, stat bar, CTA band (shared renderers, industries defaults)    */
/* ------------------------------------------------------------------ */

export function IndustriesHeroSection({ content, sectionKey }: SectionProps) {
  return <ContactHeroSection content={withIndustriesDefaults('industries_hero', content)} sectionKey={sectionKey} defaultId="industries-hero" />;
}

export function IndustriesStatsSection({ content, sectionKey }: SectionProps) {
  return <LegacyStatsSection content={withIndustriesDefaults('industries_stats', content)} sectionKey={sectionKey || 'industries-stats'} />;
}

export function IndustriesCtaSection({ content, sectionKey }: SectionProps) {
  return (
    <CertsCtaSection content={withIndustriesDefaults('industries_cta', content)} sectionKey={sectionKey} defaultId="industries-cta" className="ind-cta" />
  );
}

/* ------------------------------------------------------------------ */
/* Sector cards (full-bleed picture cards linking to industry pages)   */
/* ------------------------------------------------------------------ */

/** Cross-fading card pictures without controls (the whole card is a link). */
function HubMedia({ items: raw, intervalSeconds }: { items: LifeMediaItem[]; intervalSeconds?: number }) {
  const { items, markFailed } = useOkMedia(raw);
  const { index } = useSlides(items.length, (Number(intervalSeconds) || 5) * 1000);
  return (
    <div className="ind-hub-media" aria-hidden="true">
      {items.map((item, i) => (
        <div key={`${item.src}-${i}`} className={`ind-hub-slide${i === index ? ' is-on' : ''}`}>
          <LzMedia item={item} className="ind-hub-img" onFail={markFailed} />
        </div>
      ))}
    </div>
  );
}

function HubCard({ card, c }: { card: IndustriesHubCard; c: IndustriesHubContent }) {
  const label = t(card.linkLabel) || t(c.linkLabel);
  const href = t(card.href) || '/industries';
  return (
    <a
      className="ind-hub-card"
      href={appHref(href)}
      target={card.newTab ? '_blank' : undefined}
      rel={card.newTab ? 'noopener noreferrer' : undefined}
    >
      {visibleMedia(card.media).length ? <HubMedia items={card.media} intervalSeconds={c.card?.mediaIntervalSeconds} /> : null}
      <span className="ind-hub-shade" aria-hidden="true" />
      <div className="ind-hub-body">
        <AzText el={card.eyebrow} defaultTag="span" className="ind-hub-eyebrow" style={c.eyebrowStyle} />
        <AzText el={card.title} defaultTag="h3" className="ind-hub-title" style={c.titleStyle} />
        <AzText el={card.body} defaultTag="p" className="ind-hub-text" style={c.bodyStyle} />
        {label ? (
          <span className="ind-hub-link" style={elementCss(c.linkStyle)}>
            {label}
          </span>
        ) : null}
      </div>
    </a>
  );
}

export function IndustriesHubSection({ content, sectionKey }: SectionProps) {
  const c = withIndustriesDefaults<IndustriesHubContent>('industries_hub', content);
  const cards = (c.cards || []).filter((card) => !card.hidden && (t(card.title.text) || visibleMedia(card.media).length));
  const gridRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(gridRef, '.ind-hub-card', c.reveal !== false, cards.length);
  const cs = c.card || {};
  const tailor = c.tailor || {};
  const tailorNode = tailor.hidden ? null : (
    <div className={`ind-tailor ind-tailor--${tailor.position === 'below' ? 'below' : 'above'}`} style={vars({ '--ind-tailor-gap': tailor.gap })}>
      <VisitTailorBar context="industries" />
    </div>
  );
  const lines = Number(cs.bodyLines);
  return (
    <LgShell box={c.section} bg={c.background} className="lgy-section ind-hub" id={sectionKey || 'sector-pathways'}>
      {tailor.position === 'below' ? null : tailorNode}
      <LgHeader header={c.header} />
      {tailor.position === 'below' ? tailorNode : null}
      {cards.length ? (
        <div
          ref={gridRef}
          className={`lgy-grid ind-hub-grid${cs.hoverLift === false ? ' ind-no-lift' : ''}${cs.zoomOnHover === false ? ' ind-no-zoom' : ''}`}
          style={vars({
            ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }),
            '--lz-gap': c.gap,
            ...cardVars(cs),
            '--ind-hub-minh': cs.minHeight,
            '--ind-hub-minh-m': cs.minHeightMobile,
            '--ind-hub-shade': cs.overlay,
            '--ind-hover-border': cs.hoverBorderColor,
            '--ind-hover-shadow': cs.hoverShadow,
            '--ind-hub-lines': cs.bodyLines === 0 ? 'none' : lines > 0 ? String(lines) : undefined,
            '--ind-link-hover': c.linkHoverColor,
          })}
        >
          {cards.map((card, i) => (
            <HubCard key={i} card={card} c={c} />
          ))}
        </div>
      ) : null}
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Category grid (icon cards with a category colour)                   */
/* ------------------------------------------------------------------ */

function CategoryCard({ card, c }: { card: IndustriesCategoryCard; c: IndustriesCategoryContent }) {
  const hasLink = Boolean(t(card.linkLabel) && (t(card.href) || t(card.subject) || t(card.role)));
  return (
    <article
      className={`ind-card${hasLink && c.card?.stretchLink !== false ? ' ind-card--stretch' : ''}`}
      style={vars({ '--ind-accent': card.accent })}
    >
      {visibleMedia(card.media).length ? (
        <ContactSlides items={card.media} intervalSeconds={c.card?.mediaIntervalSeconds} className="ind-card-media" />
      ) : null}
      <AzIcon icon={card.icon} className="ind-ico" />
      <AzText el={card.title} defaultTag="h5" className="ind-card-title" style={c.titleStyle} />
      <AzText el={card.body} defaultTag="p" className="ind-card-text" style={c.bodyStyle} />
      {hasLink ? (
        <ContactActionLink action={card} className="ind-card-link" style={c.linkStyle}>
          {card.linkLabel}
        </ContactActionLink>
      ) : null}
    </article>
  );
}

export function IndustriesCategorySection({ content, sectionKey }: SectionProps) {
  const c = withIndustriesDefaults<IndustriesCategoryContent>('industries_category', content);
  const cards = (c.cards || []).filter((card) => !card.hidden);
  const gridRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(gridRef, '.ind-card', c.reveal !== false, cards.length);
  const cs = c.card || {};
  const bar = c.accentBar || {};
  const is = c.iconStyle || {};
  return (
    <LgShell
      box={c.section}
      bg={c.background}
      className={`lgy-section ind-cat${bar.hidden ? '' : ' ind-cat--bar'}`}
      id={sectionKey || undefined}
    >
      <div
        className="ind-cat-inner"
        style={vars({
          '--ind-accent-s': c.accent,
          '--ind-bar-w': bar.width,
          '--ind-bar-h': bar.height,
          '--ind-bar-color': bar.color,
        })}
      >
        <LgHeader header={c.header} />
        {cards.length ? (
          <div
            ref={gridRef}
            className={`lgy-grid ind-grid${cs.hoverLift === false ? ' ind-no-lift' : ''}${cs.topLine === false ? ' ind-no-line' : ''}${
              is.animate === false ? ' ind-no-spin' : ''
            }`}
            style={vars({
              ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }),
              '--lz-gap': c.gap,
              ...cardVars(cs),
              '--ind-hover-border': cs.hoverBorderColor,
              '--ind-hover-shadow': cs.hoverShadow,
              '--ind-line-h': cs.topLineHeight,
              '--ind-media-h': cs.mediaHeight,
              ...iconVars(is),
              '--ind-ico-hover-bg': is.hoverBackground,
              '--ind-ico-hover-color': is.hoverColor,
              '--ind-title-hover': c.titleHoverColor,
            })}
          >
            {cards.map((card, i) => (
              <CategoryCard key={i} card={card} c={c} />
            ))}
          </div>
        ) : null}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function renderIndustriesSection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'industries_hero':
      return <IndustriesHeroSection key={key} {...rest} />;
    case 'industries_stats':
      return <IndustriesStatsSection key={key} {...rest} />;
    case 'industries_hub':
      return <IndustriesHubSection key={key} {...rest} />;
    case 'industries_category':
      return <IndustriesCategorySection key={key} {...rest} />;
    case 'industries_cta':
      return <IndustriesCtaSection key={key} {...rest} />;
    default:
      return null;
  }
}
