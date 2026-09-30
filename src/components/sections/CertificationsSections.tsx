'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { appHref } from '@/lib/base-path';
import { AzCtas, AzEyebrow, AzIcon, AzText, vars } from '@/components/sections/AboutSections';
import { LzHeading, LzLightbox, LzMedia, colVars, useStaggerReveal, type LbState } from '@/components/sections/LifeSections';
import { LgHeader, LgShell, cardVars } from '@/components/sections/LegacySections';
import { ContactHeroSection } from '@/components/sections/ContactSections';
import { elementCss } from '@/lib/about-sections';
import { visibleMedia, type LifeMediaItem } from '@/lib/life-sections';
import { withCertsDefaults, type CertsCtaContent, type CertsGalleryContent, type CertsItem } from '@/lib/certifications-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

const t = (v: unknown) => String(v ?? '').trim();

/* ------------------------------------------------------------------ */
/* Hero (shared renderer, certifications defaults)                     */
/* ------------------------------------------------------------------ */

export function CertsHeroSection({ content, sectionKey }: SectionProps) {
  return <ContactHeroSection content={withCertsDefaults('certs_hero', content)} sectionKey={sectionKey} defaultId="cert-hero" />;
}

/* ------------------------------------------------------------------ */
/* Certificate gallery (marquee or grid + lightbox)                    */
/* ------------------------------------------------------------------ */

function CertCard({
  item,
  c,
  onOpen,
  duplicate,
  eager,
}: {
  item: CertsItem;
  c: CertsGalleryContent;
  onOpen?: () => void;
  duplicate?: boolean;
  eager?: boolean;
}) {
  const media = visibleMedia(item.media);
  const thumb = media[0];
  const href = t(item.href);
  const clickable = Boolean(href || onOpen);
  const body = (
    <>
      <div className="cer-img">
        {thumb ? (
          <LzMedia item={{ ...thumb, title: t(thumb.title) || item.name }} className="cer-img-media" eager={eager} />
        ) : (
          <span className="cer-img-ph">{item.name}</span>
        )}
        {c.showCount !== false && media.length > 1 ? <span className="cer-count">+{media.length - 1}</span> : null}
      </div>
      <AzIcon icon={c.badgeIcon} className="cer-badge" />
      {t(item.name) ? (
        <div className="cer-name" style={elementCss(c.nameStyle)}>
          {item.name}
        </div>
      ) : null}
      {t(item.meta) ? (
        <div className="cer-meta" style={elementCss(c.metaStyle)}>
          {item.meta}
        </div>
      ) : null}
      {clickable ? <AzText el={c.hint} defaultTag="div" className="cer-hint" /> : null}
    </>
  );
  const style = vars({ '--cer-own-bg': item.background });
  const hide = duplicate ? { 'aria-hidden': true, tabIndex: -1 } : {};
  if (href) {
    return (
      <a
        className="cer-card cer-card--link"
        href={appHref(href)}
        target={item.newTab ? '_blank' : undefined}
        rel={item.newTab ? 'noopener noreferrer' : undefined}
        style={style}
        {...hide}
      >
        {body}
      </a>
    );
  }
  if (onOpen) {
    const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen();
      }
    };
    return (
      <div
        className="cer-card cer-card--zoom"
        role="button"
        tabIndex={duplicate ? -1 : 0}
        aria-hidden={duplicate || undefined}
        aria-label={duplicate ? undefined : `Enlarge ${item.name}`}
        onClick={onOpen}
        onKeyDown={onKey}
        style={style}
      >
        {body}
      </div>
    );
  }
  return (
    <div className="cer-card" style={style} aria-hidden={duplicate || undefined}>
      {body}
    </div>
  );
}

type Fill = { copies: number; durationS: number; delayS: number; offsetPx: number; still: boolean };

function CertsMarquee({ items, c, open }: { items: CertsItem[]; c: CertsGalleryContent; open: (i: number) => (() => void) | undefined }) {
  const m = c.marquee || {};
  const toLeft = m.direction === 'left';
  const fromRight = m.startFrom === 'right';
  const speed = Math.max(4, Number(m.speedSeconds) || 28);
  const trackRef = useRef<HTMLDivElement>(null);
  const [fill, setFill] = useState<Fill | null>(null);
  const copies = fill?.copies || 1;
  const unit = Array.from({ length: copies }, () => items).flat();
  const loop = [...unit, ...unit];
  const count = items.length;

  useEffect(() => {
    const track = trackRef.current;
    const wrap = track?.parentElement;
    if (!track || !wrap || !count) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const measure = () => {
      const first = track.children[0] as HTMLElement | undefined;
      const nextSet = track.children[count] as HTMLElement | undefined;
      if (!first || !nextSet) return;
      const period = nextSet.offsetLeft - first.offsetLeft;
      const viewport = wrap.clientWidth;
      if (period <= 0 || viewport <= 0) return;
      // Half the track must be at least as wide as the viewport, or a gap shows.
      const nextCopies = Math.max(1, Math.ceil(viewport / period));
      const unitWidth = nextCopies * period;
      let offset = 0;
      if (fromRight) {
        offset = viewport - first.offsetWidth;
        offset -= Math.ceil(offset / period) * period;
      }
      const durationS = speed * nextCopies;
      // Share of the loop at which the track sits at `offset` (left: 0 → -50%, right: -50% → 0).
      const progress = toLeft ? -offset / unitWidth : (offset + unitWidth) / unitWidth;
      const delayS = -(progress % 1) * durationS;
      const still = reducedMotion.matches;
      setFill((prev) =>
        prev &&
        prev.copies === nextCopies &&
        prev.still === still &&
        prev.durationS === durationS &&
        Math.abs(prev.delayS - delayS) < 0.01
          ? prev
          : { copies: nextCopies, durationS, delayS, offsetPx: offset, still }
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    observer.observe(track);
    reducedMotion.addEventListener('change', measure);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener('change', measure);
    };
  }, [count, fromRight, toLeft, speed]);

  // Animation stays off until measured when it must start at a computed offset
  // (some mobile browsers ignore a delay changed on an already-running animation).
  const trackStyle: CSSProperties = !fill
    ? fromRight
      ? { visibility: 'hidden', animationName: 'none' }
      : { animationDuration: `${speed}s` }
    : fill.still
      ? { animationName: 'none', transform: `translateX(${fill.offsetPx}px)` }
      : { animationDuration: `${fill.durationS}s`, animationDelay: `${fill.delayS}s` };

  return (
    <div
      className={`cer-marquee${m.pauseOnHover === false ? '' : ' cer-pause'}${m.edgeFade === false ? '' : ' cer-fade'}${fill?.still ? ' cer-still' : ''}`}
      style={vars({ '--cer-fade': m.fadeWidth, '--cer-gap': m.gap })}
    >
      <div ref={trackRef} className={`cer-track${toLeft ? ' cer-track--left' : ''}`} style={trackStyle}>
        {loop.map((item, i) => (
          <CertCard key={`${item.name}-${i}`} item={item} c={c} onOpen={open(i % count)} duplicate={i >= count} eager />
        ))}
      </div>
    </div>
  );
}

export function CertsGallerySection({ content, sectionKey }: SectionProps) {
  const c = withCertsDefaults<CertsGalleryContent>('certs_gallery', content);
  const items = (c.items || []).filter((it) => !it.hidden && (t(it.name) || visibleMedia(it.media).length));
  const lightboxOn = c.lightbox?.enabled !== false;
  const captions = c.lightbox?.captions !== false;
  const [lb, setLb] = useState<LbState>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const grid = c.layout === 'grid';
  useStaggerReveal(gridRef, '.cer-card', grid && c.reveal !== false, items.length);

  /* Every certificate's images / videos in one lightbox list, so prev / next walks the whole gallery. */
  const list: LifeMediaItem[] = [];
  const starts: number[] = [];
  for (const it of items) {
    starts.push(list.length);
    for (const m of visibleMedia(it.media)) list.push({ ...m, title: captions ? t(m.title) || it.name : '' });
  }

  const open = (i: number) => {
    const it = items[i];
    if (!lightboxOn || !it || t(it.href) || !visibleMedia(it.media).length) return undefined;
    return () => setLb({ list, index: starts[i] });
  };

  if (!items.length) return null;
  const cs = c.card || {};
  const box = c.section || {};
  return (
    <LgShell box={box} bg={c.background} className={`cer-gallery cer-gallery--${grid ? 'grid' : 'marquee'}`} id={sectionKey || 'oem-marquee'} noContainer>
      <div
        className={`cer-stage${cs.hoverLift === false ? ' cer-no-lift' : ''}${cs.zoomOnHover === false ? ' cer-no-zoom' : ''}${
          c.reveal === false ? '' : ' cer-enter'
        }`}
        style={vars({
          '--cer-minh': c.minHeight,
          '--cer-minh-m': c.minHeightMobile,
          ...cardVars(cs),
          '--cer-card-w': cs.width,
          '--cer-card-w-m': cs.widthMobile,
          '--cer-img-h': cs.imageHeight,
          '--cer-img-h-m': cs.imageHeightMobile,
          '--cer-img-fit': cs.imageFit,
          '--cer-img-bg': cs.imageBackground,
          '--cer-img-border': cs.imageBorder,
          '--cer-img-pad': cs.imagePadding,
          '--cer-img-radius': cs.imageRadius,
          '--cer-hover-border': cs.hoverBorderColor,
          '--cer-hover-shadow': cs.hoverShadow,
        })}
      >
        {!c.header?.hidden ? (
          <div className="container" style={box.containerMaxWidth ? { maxWidth: box.containerMaxWidth } : undefined}>
            <LgHeader header={c.header} />
          </div>
        ) : null}
        {grid ? (
          <div className="container" style={box.containerMaxWidth ? { maxWidth: box.containerMaxWidth } : undefined}>
            <div ref={gridRef} className="cer-grid" style={vars({ ...colVars(c.columns, { desktop: 4, tablet: 3, mobile: 2 }), '--lz-gap': c.gap })}>
              {items.map((item, i) => (
                <CertCard key={`${item.name}-${i}`} item={item} c={c} onOpen={open(i)} />
              ))}
            </div>
          </div>
        ) : (
          <CertsMarquee items={items} c={c} open={open} />
        )}
      </div>
      {lb ? <LzLightbox state={lb} onChange={setLb} /> : null}
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

export function CertsCtaSection({
  content,
  sectionKey,
  defaultId = 'cert-cta',
  className = '',
}: SectionProps & { defaultId?: string; className?: string }) {
  const c = withCertsDefaults<CertsCtaContent>('certs_cta', content);
  const align = c.align || 'center';
  const split = c.layout === 'split';
  const copy = (
    <>
      <AzEyebrow el={c.eyebrow} scale="lg" />
      <LzHeading el={c.title} role="section" className="lz-cta-title" highlight={c.highlight} />
      <AzText el={c.body} defaultTag="p" className="lz-cta-body" />
    </>
  );
  const actions = (
    <>
      <AzCtas ctas={c.ctas} className="lz-cta-actions" />
      <AzText el={c.note} defaultTag="p" className="cer-cta-note" />
    </>
  );
  return (
    <LgShell
      box={c.section}
      bg={c.background}
      className={`lz-cta lz-cta--${split ? 'left' : align} cer-cta${split ? ' cer-cta--split' : ''}${className ? ` ${className}` : ''}`}
      id={sectionKey || defaultId}
    >
      <div className="lz-cta-inner" style={vars({ maxWidth: c.maxWidth })}>
        {split ? (
          <>
            <div className="cer-cta-copy">{copy}</div>
            <div className="cer-cta-side">{actions}</div>
          </>
        ) : (
          <>
            {copy}
            {actions}
          </>
        )}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function renderCertsSection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'certs_hero':
      return <CertsHeroSection key={key} {...rest} />;
    case 'certs_gallery':
      return <CertsGallerySection key={key} {...rest} />;
    case 'certs_cta':
      return <CertsCtaSection key={key} {...rest} />;
    default:
      return null;
  }
}
