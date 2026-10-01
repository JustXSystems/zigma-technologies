'use client';

import { Fragment, useRef, useState } from 'react';
import { appHref } from '@/lib/base-path';
import { heroHeightClass } from '@/lib/hero-height';
import { heroPlacement } from '@/lib/hero-placement';
import HeroSlot from '@/components/HeroSlot';
import { AzCtas, AzEyebrow, AzIcon, AzPills, AzText, hasText, vars } from '@/components/sections/AboutSections';
import { LzHeading, LzLightbox, LzMedia, colVars, useStaggerReveal, type LbState } from '@/components/sections/LifeSections';
import { LgHeader, LgScrollBar, LgShell, StatNumber, cardVars, useCountPhase, useInView, useOkMedia, useSlides } from '@/components/sections/LegacySections';
import { elementCss, normalizeLinkItems, type IconEl } from '@/lib/about-sections';
import { lifeMediaKind, visibleMedia, type LifeMediaItem } from '@/lib/life-sections';
import {
  withQsDefaults,
  type QsCertsContent,
  type QsCommitContent,
  type QsCtaContent,
  type QsGallery,
  type QsHeroContent,
  type QsMediaPanel,
  type QsQualityContent,
  type QsSafetyContent,
  type QsStatsContent,
} from '@/lib/qualitysafety-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };
type OpenFn = (list: LifeMediaItem[], index: number) => void;

const iconReady = (icon?: IconEl): icon is IconEl => Boolean(icon && !icon.hidden && (icon.svg?.trim() || icon.src?.trim()));

/** Section-local lightbox (images and videos; arrow keys / swipe between items). */
function useLightbox(enabled: boolean) {
  const [lb, setLb] = useState<LbState>(null);
  const open: OpenFn = (list, index) => {
    if (list.length) setLb({ list, index: Math.max(0, Math.min(index, list.length - 1)) });
  };
  return { open: enabled ? open : undefined, node: lb ? <LzLightbox state={lb} onChange={setLb} /> : null };
}

/** Small cross-fading media strip at the top of a card. */
function QsCardMedia({ items: raw, onOpen }: { items?: LifeMediaItem[]; onOpen?: OpenFn }) {
  const { items, markFailed } = useOkMedia(raw);
  const { index } = useSlides(items.length, 4000);
  if (!items.length) return null;
  return (
    <div className="qs-card-media">
      {items.map((item, i) => (
        <div key={`${item.src}-${i}`} className={`qs-fade${i === index ? ' is-on' : ''}`}>
          <LzMedia item={item} className="qs-fill" onFail={markFailed} />
        </div>
      ))}
      {onOpen ? (
        <button type="button" className="qs-hit" aria-label={`Open ${items[index]?.title || 'media'}`} onClick={() => onOpen(items, index)} />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page hero (Ken Burns slideshow + progress dots + photo credit)      */
/* ------------------------------------------------------------------ */

export function QsHeroSection({ content, sectionKey }: SectionProps) {
  const c = withQsDefaults<QsHeroContent>('qs_hero', content);
  const crumbs = normalizeLinkItems(c.breadcrumb?.items);
  const { color: crumbColor, ...crumbRest } = c.breadcrumb?.style || {};
  const layout = c.layout || {};
  const scroll = c.scrollBar || {};
  const credit = hasText(c.credit) ? <AzText el={c.credit} defaultTag="span" className="qs-credit" /> : null;
  const place = heroPlacement(c.placement);
  return (
    <LgShell
      box={c.section}
      bg={c.background}
      className={`az-hero qs-hero ${heroHeightClass(c.heroHeight, 'auto')} ${place.rootClass} qs-hero--h-${layout.hAlign || 'left'}${
        c.entrance === false ? '' : ' lgy-enter'
      }`}
      id={sectionKey || 'top'}
      layers={credit}
    >
      {!scroll.hidden ? <LgScrollBar gradient={scroll.gradient} /> : null}
      <HeroSlot place={place} name="text">
      <div className="az-hero-copy qs-hero-copy" style={vars({ maxWidth: layout.maxWidth })}>
        {!c.breadcrumb?.hidden && crumbs.length ? (
          <nav
            aria-label="Breadcrumb"
            className="az-breadcrumb qs-crumbs"
            style={{
              ...elementCss(crumbRest),
              ...vars({
                '--az-crumb-color': crumbColor,
                '--az-crumb-hover': c.breadcrumb.hoverColor,
                '--qs-crumb-current': c.breadcrumb.currentColor,
              }),
            }}
          >
            {crumbs.map((item, i) => (
              <Fragment key={`${item.label}-${i}`}>
                {i > 0 ? <span className="az-breadcrumb-sep"> {c.breadcrumb.separator || '/'} </span> : null}
                {item.href ? <a href={appHref(item.href)}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
              </Fragment>
            ))}
          </nav>
        ) : null}
        <AzEyebrow el={c.eyebrow} scale="md" />
        <LzHeading el={c.title} role="pageHero" className="az-hero-title" highlight={c.highlight} />
        <AzText el={c.lead} defaultTag="p" className="az-hero-lead" />
        <AzPills pills={c.pills} />
        <AzCtas ctas={c.ctas} />
      </div>
      </HeroSlot>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Stat bar                                                            */
/* ------------------------------------------------------------------ */

export function QsStatsSection({ content, sectionKey }: SectionProps) {
  const c = withQsDefaults<QsStatsContent>('qs_stats', content);
  const items = (c.items || []).filter((s) => !s.hidden && (String(s.value || '').trim() || String(s.label || '').trim()));
  const gridRef = useRef<HTMLDivElement>(null);
  const phase = useCountPhase(gridRef, c.animateCount !== false);
  if (!items.length) return null;
  const is = c.iconStyle || {};
  const duration = Math.max(200, Number(c.countDurationMs) || 1400);
  return (
    <LgShell box={c.section} className="qs-stats" id={sectionKey}>
      <div
        ref={gridRef}
        className={`qs-stat-grid qs-stat-grid--${c.align || 'center'}${c.dividers ? ' qs-stat-dividers' : ''}${c.hoverLift === false ? '' : ' qs-stat-lift'}`}
        style={vars({
          ...colVars(c.columns, { desktop: 4, tablet: 4, mobile: 2 }),
          '--lz-gap': c.gap,
          '--lgy-suffix': c.suffixColor?.trim() || 'inherit',
          '--qs-divider': c.dividerColor,
          '--qs-sicon-size': is.size,
          '--qs-sicon-color': is.color,
        })}
      >
        {items.map((s, i) => (
          <div className="qs-stat" key={i} style={vars({ '--qs-stat-color': s.color })}>
            {iconReady(s.icon) ? <AzIcon icon={{ strokeWidth: is.strokeWidth, ...s.icon }} className="qs-stat-icon" /> : null}
            {String(s.value || '').trim() ? (
              <StatNumber
                className="qs-stat-num"
                value={String(s.value)}
                prefix={s.prefix}
                suffix={s.suffix}
                phase={phase}
                duration={duration}
                style={c.numberStyle}
              />
            ) : null}
            {s.label ? (
              <div className="qs-stat-label" style={elementCss(c.labelStyle)}>
                {s.label}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Quality approach (photo / video panel + process steps)              */
/* ------------------------------------------------------------------ */

function QsPhotoPanel({ m, onOpen }: { m: QsMediaPanel; onOpen?: OpenFn }) {
  const { items, markFailed } = useOkMedia(m.items);
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref);
  const { index, go } = useSlides(items.length, (Number(m.intervalSeconds) || 4.5) * 1000);
  if (!items.length) return null;
  const cap = m.caption || { title: { text: '' }, body: { text: '' } };
  const cur = items[index];
  const capTitle = cap.fromItems ? { text: cur?.title || '', style: cap.title?.style } : cap.title;
  const capBody = cap.fromItems ? { text: cur?.label || '', style: cap.body?.style } : cap.body;
  const showCap = !cap.hidden && (hasText(capTitle) || hasText(capBody));
  return (
    <figure
      ref={ref}
      className={`qs-photo${m.zoomIn === false ? '' : ' qs-photo--zoom'}${seen ? ' is-in' : ''}`}
      style={vars({
        '--qs-photo-h': m.minHeight,
        '--qs-photo-h-m': m.minHeightMobile,
        '--qs-photo-radius': m.radius,
        '--qs-photo-shadow': m.shadow,
        '--qs-photo-bg': m.background,
        '--qs-fit': m.fit,
        '--qs-pos': m.position,
      })}
    >
      {items.map((item, i) => (
        <div key={`${item.src}-${i}`} className={`qs-fade${i === index ? ' is-on' : ''}`}>
          <LzMedia item={item} className="qs-fill qs-photo-media" onFail={markFailed} />
        </div>
      ))}
      {m.overlay?.trim() ? <span aria-hidden="true" className="qs-overlay" style={{ background: m.overlay }} /> : null}
      {onOpen ? <button type="button" className="qs-hit" aria-label={`Open ${cur?.title || 'photo'}`} onClick={() => onOpen(items, index)} /> : null}
      {items.length > 1 && m.showDots !== false ? (
        <div className={`qs-photo-dots${showCap && cap.position !== 'top' ? ' qs-photo-dots--top' : ''}`} role="group" aria-label="Pictures">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              className={i === index ? 'on' : ''}
              aria-label={`Picture ${i + 1}${item.title ? `: ${item.title}` : ''}`}
              aria-pressed={i === index}
              onClick={() => go(i)}
            />
          ))}
        </div>
      ) : null}
      {showCap ? (
        <figcaption
          className={`qs-photo-cap qs-photo-cap--${cap.position === 'top' ? 'top' : 'bottom'}${cap.blur === false ? '' : ' qs-photo-cap--blur'}`}
          style={vars({ background: cap.background, borderRadius: cap.radius })}
        >
          <AzText el={capTitle} defaultTag="span" className="qs-photo-cap-title" />
          <AzText el={capBody} defaultTag="span" className="qs-photo-cap-body" />
        </figcaption>
      ) : null}
    </figure>
  );
}

export function QsQualitySection({ content, sectionKey }: SectionProps) {
  const c = withQsDefaults<QsQualityContent>('qs_quality', content);
  const steps = (c.steps || []).filter((s) => !s.hidden && (String(s.num || '').trim() || hasText(s.title) || hasText(s.body)));
  const reveal = c.reveal !== false;
  const stepsRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(stepsRef, '.qs-step', reveal, steps.length);
  const lb = useLightbox(c.media?.lightbox !== false);
  const cardLb = useLightbox(true);

  const layout = c.layout || { mediaSide: 'left' };
  const m = c.media;
  const showPanel = Boolean(m && !m.hidden && visibleMedia(m.items).length);
  const mediaLeft = layout.mediaSide !== 'right';
  const cols = layout.columns?.trim() || (mediaLeft ? '0.9fr 1.3fr' : '1.3fr 0.9fr');
  const cs = c.cardStyle || {};
  const is = c.iconStyle || {};

  return (
    <LgShell box={c.section} bg={c.background} className="az-section qs-quality" id={sectionKey || 'quality'}>
      <div className="qs-scope" style={vars({ '--qs-accent': c.accentColor })}>
        <LgHeader header={c.header} />
        <div
          className={`qs-split${showPanel ? '' : ' qs-split--single'}${mediaLeft ? '' : ' qs-split--media-right'}${
            layout.mobileMediaFirst === false ? ' qs-split--media-last' : ''
          }`}
          style={vars({ '--qs-split-cols': showPanel ? cols : undefined, gap: layout.gap, alignItems: layout.alignItems })}
        >
          {showPanel ? <QsPhotoPanel m={m} onOpen={lb.open} /> : null}
          {steps.length ? (
            <div
              ref={stepsRef}
              className={`qs-steps${cs.hoverLift === false ? ' qs-no-lift' : ''}`}
              style={vars({
                ...colVars(c.columns, { desktop: 2, tablet: 2, mobile: 1 }),
                '--lz-gap': c.gap,
                ...cardVars(cs),
                '--qs-card-hover-shadow': cs.hoverShadow,
                '--qs-card-media-h': cs.mediaHeight,
                '--qs-ico-box': is.boxSize,
                '--qs-ico-size': is.size,
                '--qs-ico-radius': is.radius,
                '--qs-ico-bg': is.background,
                '--qs-ico-stroke': is.strokeWidth,
              })}
            >
              {steps.map((s, i) => (
                <article key={i} className="qs-step" style={vars({ '--qs-c': s.color })}>
                  {visibleMedia(s.media).length ? <QsCardMedia items={s.media} onOpen={cardLb.open} /> : null}
                  <div className="qs-step-top">
                    {iconReady(s.icon) ? <AzIcon icon={s.icon} className="qs-step-ic" /> : null}
                    {String(s.num || '').trim() ? (
                      <span className="qs-step-num" style={elementCss(c.numStyle)}>
                        {s.num}
                      </span>
                    ) : null}
                  </div>
                  <AzText el={s.title} defaultTag="h3" className="qs-step-title" style={c.titleStyle} />
                  <AzText el={s.body} defaultTag="p" className="qs-step-body" style={c.bodyStyle} />
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {lb.node}
      {cardLb.node}
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Safety first (photo gallery + habit cards)                          */
/* ------------------------------------------------------------------ */

function QsGalleryGrid({ g, onOpen, reveal }: { g: QsGallery; onOpen?: OpenFn; reveal: boolean }) {
  const { items, markFailed } = useOkMedia(g.items);
  const ref = useRef<HTMLDivElement>(null);
  useStaggerReveal(ref, '.qs-gfig', reveal, items.length);
  if (!items.length) return null;
  return (
    <div
      ref={ref}
      className={`qs-gallery${g.hoverZoom === false ? '' : ' qs-gallery--zoom'}`}
      style={vars({
        ...colVars(g.columns, { desktop: 3, tablet: 3, mobile: 1 }),
        '--lz-gap': g.gap,
        '--qs-g-ar': g.aspectRatio,
        '--qs-g-radius': g.radius,
        '--qs-fit': g.fit,
        '--qs-pos': g.position,
        marginBottom: g.marginBottom,
      })}
    >
      {items.map((item, i) => {
        const title = String(item.title || '').trim();
        const sub = String(item.label || '').trim();
        const cap = g.captions !== false && (title || sub);
        return (
          <figure key={`${item.src}-${i}`} className="qs-gfig" style={vars({ '--c': item.color })}>
            <LzMedia item={item} className="qs-fill qs-gmedia" onFail={markFailed} />
            {g.overlay?.trim() ? <span aria-hidden="true" className="qs-overlay" style={{ background: g.overlay }} /> : null}
            {cap ? (
              <figcaption className="qs-gcap" style={elementCss(g.captionStyle)}>
                {title}
                {sub ? <small style={elementCss(g.subCaptionStyle)}>{sub}</small> : null}
              </figcaption>
            ) : null}
            {onOpen ? <button type="button" className="qs-hit" aria-label={`Open ${title || 'photo'}`} onClick={() => onOpen(items, i)} /> : null}
          </figure>
        );
      })}
    </div>
  );
}

export function QsSafetySection({ content, sectionKey }: SectionProps) {
  const c = withQsDefaults<QsSafetyContent>('qs_safety', content);
  const cards = (c.cards || []).filter((card) => !card.hidden && (hasText(card.title) || hasText(card.body)));
  const reveal = c.reveal !== false;
  const gridRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(gridRef, '.qs-card', reveal, cards.length);
  const g = c.gallery;
  const lb = useLightbox(g?.lightbox !== false);
  const cardLb = useLightbox(true);
  const cs = c.cardStyle || {};
  const is = c.iconStyle || {};
  return (
    <LgShell box={c.section} bg={c.background} className="az-section qs-safety" id={sectionKey || 'safety'}>
      <LgHeader header={c.header} />
      {g && !g.hidden ? <QsGalleryGrid g={g} onOpen={lb.open} reveal={reveal} /> : null}
      {cards.length ? (
        <div
          ref={gridRef}
          className={`qs-cards${cs.hoverLift === false ? ' qs-no-lift' : ''}${cs.hoverBorder === false ? ' qs-no-hborder' : ''}${
            cs.hoverGlow === false ? ' qs-no-glow' : ''
          }${is.hoverFill ? ' qs-ico-fill' : ''}`}
          style={vars({
            ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }),
            '--lz-gap': c.gap,
            ...cardVars(cs),
            '--qs-card-media-h': cs.mediaHeight,
            '--qs-ico-box': is.boxSize,
            '--qs-ico-size': is.size,
            '--qs-ico-radius': is.radius,
            '--qs-ico-bg': is.background,
            '--qs-ico-border': is.border,
            '--qs-ico-stroke': is.strokeWidth,
          })}
        >
          {cards.map((card, i) => (
            <article key={i} className="qs-card" style={vars({ '--c': card.color })}>
              {visibleMedia(card.media).length ? <QsCardMedia items={card.media} onOpen={cardLb.open} /> : null}
              {iconReady(card.icon) ? <AzIcon icon={card.icon} className="qs-ic" /> : null}
              <AzText el={card.title} defaultTag="h3" className="qs-card-title" style={c.titleStyle} />
              <AzText el={card.body} defaultTag="p" className="qs-card-body" style={c.bodyStyle} />
            </article>
          ))}
        </div>
      ) : null}
      {lb.node}
      {cardLb.node}
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Certificates & approvals                                            */
/* ------------------------------------------------------------------ */

export function QsCertsSection({ content, sectionKey }: SectionProps) {
  const c = withQsDefaults<QsCertsContent>('qs_certs', content);
  const certs = (c.certs || []).filter((cert) => !cert.hidden && (hasText(cert.title) || hasText(cert.scope)));
  const reveal = c.reveal !== false;
  const gridRef = useRef<HTMLDivElement>(null);
  const verifyRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(gridRef, '.qs-cert', reveal, certs.length);
  const v = c.verify;
  const filled = (list?: string[]) => (list || []).filter((s) => String(s || '').trim());
  const boxes = (v?.boxes || [])
    .filter((b) => !b.hidden)
    .map((b) => ({ ...b, list: filled(b.list), chips: filled(b.chips) }))
    .filter((b) => hasText(b.title) || b.list.length || b.chips.length || hasText(b.note));
  useStaggerReveal(verifyRef, '.qs-vbox', reveal, boxes.length);
  const lb = useLightbox(c.lightbox !== false);
  const cs = c.cardStyle || {};
  const seal = c.seal || {};
  const bs = v?.boxStyle || {};
  const cta = c.cta;
  const showCta = Boolean(cta && !cta.hidden && (hasText(cta.title) || hasText(cta.body) || cta.ctas?.length));
  const viewLabel = c.viewLabel?.trim() || 'View certificate';

  return (
    <LgShell box={c.section} bg={c.background} className="az-section qs-certs" id={sectionKey || 'certifications'}>
      <LgHeader header={c.header} />
      {certs.length ? (
        <div
          ref={gridRef}
          className={`qs-cert-grid${cs.hoverLift === false ? ' qs-no-lift' : ''}`}
          style={vars({
            ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }),
            '--lz-gap': c.gap,
            ...cardVars(cs),
            '--qs-card-hover-shadow': cs.hoverShadow,
            '--qs-seal': seal.size,
            '--qs-seal-ic': seal.iconSize,
            '--qs-seal-inner': seal.innerColor,
            '--qs-seal-spin': Number(seal.spinSeconds) > 0 ? `${seal.spinSeconds}s` : undefined,
            '--qs-pending': c.pendingColor,
          })}
        >
          {certs.map((cert, i) => {
            const media = visibleMedia(cert.media);
            const thumb = seal.useImage ? media.find((x) => lifeMediaKind(x) !== 'video') : undefined;
            const meta = (cert.meta || []).filter((row) => String(row.label || '').trim() || String(row.value || '').trim());
            const href = cert.href?.trim();
            return (
              <article key={i} className="qs-cert" style={vars({ '--c': cert.color })}>
                {seal.hidden ? null : thumb ? (
                  <div className="qs-cert-thumb">
                    <LzMedia item={thumb} className="qs-fill" />
                  </div>
                ) : (
                  <div className={`qs-seal${seal.spin === false ? '' : ' qs-seal--spin'}`}>
                    {iconReady(cert.icon) ? <AzIcon icon={cert.icon} className="qs-seal-ic" /> : null}
                  </div>
                )}
                <AzText el={cert.title} defaultTag="h3" className="qs-cert-title" style={c.titleStyle} />
                <AzText el={cert.scope} defaultTag="p" className="qs-cert-scope" style={c.scopeStyle} />
                {meta.length ? (
                  <div className="qs-cert-meta">
                    {meta.map((row, k) => (
                      <span key={k}>
                        <em style={elementCss(c.metaLabelStyle)}>{row.label}</em>
                        <b className={row.pending ? 'is-pending' : undefined} style={elementCss(c.metaValueStyle)}>
                          {row.value}
                        </b>
                      </span>
                    ))}
                  </div>
                ) : null}
                {(media.length && lb.open) || href ? (
                  <div className="qs-cert-actions">
                    {media.length && lb.open ? (
                      <button type="button" className="qs-cert-link" style={elementCss(c.linkStyle)} onClick={() => lb.open?.(media, 0)}>
                        {viewLabel}
                      </button>
                    ) : null}
                    {href ? (
                      <a
                        className="qs-cert-link"
                        href={appHref(href)}
                        style={elementCss(c.linkStyle)}
                        target={cert.newTab ? '_blank' : undefined}
                        rel={cert.newTab ? 'noopener noreferrer' : undefined}
                      >
                        {cert.linkLabel?.trim() || 'Download'}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
      {v && !v.hidden && boxes.length ? (
        <div
          ref={verifyRef}
          className="qs-verify"
          style={vars({
            ...colVars(v.columns, { desktop: 2, tablet: 1, mobile: 1 }),
            '--lz-gap': v.gap,
            marginTop: v.marginTop,
            '--qs-vbox-bg': bs.background,
            '--qs-vbox-border': bs.border,
            '--qs-vbox-radius': bs.radius,
            '--qs-vbox-pad': bs.padding,
            '--qs-vbox-shadow': bs.shadow,
            '--qs-check': v.checkColor,
          })}
        >
          {boxes.map((b, i) => (
            <div key={i} className="qs-vbox">
              <AzText el={b.title} defaultTag="h3" className="qs-vbox-title" style={v.titleStyle} />
              {b.list.length ? (
                <ul className="qs-check">
                  {b.list.map((li, k) => (
                    <li key={k} style={elementCss(v.itemStyle)}>
                      {li}
                    </li>
                  ))}
                </ul>
              ) : null}
              {b.chips.length ? (
                <div className="qs-chips">
                  {b.chips.map((chip, k) => (
                    <span key={k} style={elementCss(v.chipStyle)}>
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
              <AzText el={b.note} defaultTag="p" className="qs-vbox-note" style={v.noteStyle} />
            </div>
          ))}
        </div>
      ) : null}
      {showCta ? (
        <div
          className="qs-cert-cta"
          style={vars({ background: cta.background, border: cta.border, borderRadius: cta.radius, padding: cta.padding, marginTop: cta.marginTop })}
        >
          <div className="qs-cert-cta-copy">
            <AzText el={cta.title} defaultTag="div" className="qs-cert-cta-title" />
            <AzText el={cta.body} defaultTag="p" className="qs-cert-cta-body" />
          </div>
          <AzCtas ctas={cta.ctas} className="qs-cert-cta-actions" />
        </div>
      ) : null}
      {lb.node}
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Our commitment (photo background + checklist)                       */
/* ------------------------------------------------------------------ */

export function QsCommitSection({ content, sectionKey }: SectionProps) {
  const c = withQsDefaults<QsCommitContent>('qs_commit', content);
  const items = (c.items || []).filter((it) => !it.hidden && (hasText(it.title) || hasText(it.body)));
  const reveal = c.reveal !== false;
  const listRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const seen = useInView(copyRef, reveal);
  useStaggerReveal(listRef, '.qs-li', reveal, items.length);
  const layout = c.layout || { listSide: 'right' };
  const listLeft = layout.listSide === 'left';
  const cols = layout.columns?.trim() || (listLeft ? '1.1fr 1fr' : '1fr 1.1fr');
  const st = c.itemStyle || {};
  const is = c.iconStyle || {};
  return (
    <LgShell box={c.section} bg={c.background} className="az-section qs-commit-sec" id={sectionKey || 'commitment'}>
      <div
        className={`qs-commit${items.length ? '' : ' qs-commit--single'}${listLeft ? ' qs-commit--list-left' : ''}`}
        style={vars({ '--qs-commit-cols': items.length ? cols : undefined, gap: layout.gap, alignItems: layout.alignItems })}
      >
        <div ref={copyRef} className={`qs-commit-copy${reveal ? ' qs-rv' : ''}${seen ? ' is-in' : ''}`}>
          <AzEyebrow el={c.eyebrow} scale="lg" />
          <LzHeading el={c.title} role="section" className="qs-commit-title" highlight={c.highlight} />
          <AzText el={c.body} defaultTag="p" className="qs-commit-body" />
          <AzCtas ctas={c.ctas} />
        </div>
        {items.length ? (
          <div
            ref={listRef}
            className="qs-list"
            style={vars({
              gap: st.gap,
              '--qs-li-bg': st.background,
              '--qs-li-hover-bg': st.hoverBackground,
              '--qs-li-border': st.border,
              '--qs-li-radius': st.radius,
              '--qs-li-pad': st.padding,
              '--qs-li-shadow': st.shadow,
              '--qs-li-ic': is.size,
              '--qs-li-color': is.color,
              '--qs-li-stroke': is.strokeWidth,
            })}
          >
            {items.map((it, i) => (
              <div key={i} className={`qs-li${st.hoverLift ? ' qs-li--lift' : ''}`} style={vars({ '--qs-c': it.color })}>
                {iconReady(it.icon) ? <AzIcon icon={it.icon} className="qs-li-ic" /> : null}
                <span className="qs-li-text">
                  <AzText el={it.title} defaultTag="span" className="qs-li-title" style={c.itemTitleStyle} />
                  <AzText el={it.body} defaultTag="span" className="qs-li-body" style={c.itemBodyStyle} />
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

export function QsCtaSection({ content, sectionKey }: SectionProps) {
  const c = withQsDefaults<QsCtaContent>('qs_cta', content);
  const align = c.align || 'center';
  return (
    <LgShell box={c.section} bg={c.background} className={`lz-cta lz-cta--${align} lgy-cta qs-cta`} id={sectionKey || 'contact'}>
      <div className="lz-cta-inner" style={vars({ maxWidth: c.maxWidth })}>
        <AzEyebrow el={c.eyebrow} scale="base" />
        <LzHeading el={c.title} role="section" className="lz-cta-title" highlight={c.highlight} />
        <AzText el={c.body} defaultTag="p" className="lz-cta-body" />
        <AzCtas ctas={c.ctas} className="lz-cta-actions" />
      </div>
    </LgShell>
  );
}

export function renderQualitySafetySection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'qs_hero':
      return <QsHeroSection key={key} {...rest} />;
    case 'qs_stats':
      return <QsStatsSection key={key} {...rest} />;
    case 'qs_quality':
      return <QsQualitySection key={key} {...rest} />;
    case 'qs_safety':
      return <QsSafetySection key={key} {...rest} />;
    case 'qs_certs':
      return <QsCertsSection key={key} {...rest} />;
    case 'qs_commit':
      return <QsCommitSection key={key} {...rest} />;
    case 'qs_cta':
      return <QsCtaSection key={key} {...rest} />;
    default:
      return null;
  }
}
