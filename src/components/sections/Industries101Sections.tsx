'use client';

import { Fragment, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { appHref } from '@/lib/base-path';
import { heroHeightClass } from '@/lib/hero-height';
import { heroPlacement } from '@/lib/hero-placement';
import HeroSlot from '@/components/HeroSlot';
import { AzCtas, AzEyebrow, AzIcon, AzPills, AzText, AzVideo, hasText, vars } from '@/components/sections/AboutSections';
import { LzHeading, LzMedia, colVars, prefersReducedMotion, useStaggerReveal } from '@/components/sections/LifeSections';
import { LgShell, StatNumber, cardVars, useCountPhase, useInView, useOkMedia, useSlides } from '@/components/sections/LegacySections';
import { elementCss, mediaSrc, normalizeLinkItems, orbCss, sectionBoxCss, type SectionBox } from '@/lib/about-sections';
import { visibleMedia, type LifeMediaItem } from '@/lib/life-sections';
import type { LegacyBgMedia } from '@/lib/legacy-sections';
import {
  defaultInd101CollageCells,
  withIndustries101Defaults,
  type Ind101CategoryContent,
  type Ind101CategoryMedia,
  type Ind101CtaContent,
  type Ind101HeroContent,
  type Ind101StatsContent,
  type Ind101SubnavContent,
} from '@/lib/industries101-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

const pad2 = (n: number) => String(n).padStart(2, '0');

const PATTERN_CLASS: Record<string, string> = {
  grid: '',
  'grid-fade': ' az-pattern--fade',
  'grid-fade-top': ' az-pattern--fade-top',
};

/** Increasing counter (paused while the tab is hidden). */
function useTick(enabled: boolean, intervalMs: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled || !(intervalMs > 0)) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setTick((t) => t + 1);
    }, Math.max(400, intervalMs));
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
  return tick;
}

/* ------------------------------------------------------------------ */
/* Page hero (left-to-right sliding slideshow)                         */
/* ------------------------------------------------------------------ */

/** Section shell whose background layers sit outside the content container (full-bleed slideshow). */
function I101HeroShell({ box, className, id, layers, children }: { box?: SectionBox; className: string; id?: string | null; layers: ReactNode; children: ReactNode }) {
  const tone = box?.tone === 'light' ? 'light' : 'dark';
  const pattern = box?.pattern && box.pattern !== 'none' ? box.pattern : null;
  const video = mediaSrc(box?.bgVideo);
  return (
    <section id={id || undefined} className={`az-block az-tone-${tone} ${className}`} style={sectionBoxCss(box)}>
      {video ? (
        <div aria-hidden="true" className="az-bg-video">
          <AzVideo src={video} poster={mediaSrc(box?.bgImage)} />
          {box?.bgGradient?.trim() ? <span className="az-bg-video-overlay" style={{ background: box.bgGradient }} /> : null}
        </div>
      ) : null}
      {layers}
      {pattern ? (
        <div
          aria-hidden="true"
          className={`az-pattern${PATTERN_CLASS[pattern] ?? ''}`}
          style={vars({ '--az-pattern-color': box?.patternColor, '--az-pattern-size': box?.patternSize })}
        />
      ) : null}
      {(box?.orbs || []).map((orb, i) => (
        <div key={i} aria-hidden="true" className={`az-orb${orb.drift ? ' az-orb--drift' : ''}`} style={orbCss(orb)} />
      ))}
      <div className="container az-inner" style={box?.containerMaxWidth ? { maxWidth: box.containerMaxWidth } : undefined}>
        {children}
      </div>
    </section>
  );
}

type HeroBgProps = { bg: LegacyBgMedia; slider: Ind101HeroContent['slider']; dots: Ind101HeroContent['dots'] };

function I101HeroBg({ bg, slider, dots }: HeroBgProps) {
  if (!bg || bg.hidden) return null;
  if (!visibleMedia(bg.mobileItems).length) return <I101HeroLayer bg={bg} slider={slider} dots={dots} items={bg.items} />;
  return (
    <>
      <I101HeroLayer bg={bg} slider={slider} dots={dots} items={bg.items} scope="desk" />
      <I101HeroLayer bg={bg} slider={slider} dots={dots} items={bg.mobileItems} scope="mob" />
    </>
  );
}

function I101HeroLayer({ bg, slider, dots, items: raw, scope }: HeroBgProps & { items?: LifeMediaItem[]; scope?: 'desk' | 'mob' }) {
  const { items, markFailed } = useOkMedia(raw);
  const intervalMs = (Number(bg.intervalSeconds) || 5) * 1000;
  const { index, go } = useSlides(items.length, intervalMs);
  // Two-step change: park the incoming slide off-screen without a transition, then animate it in.
  const [view, setView] = useState({ cur: index, prev: -1, run: true });
  if (view.cur !== index) setView({ cur: index, prev: view.cur, run: false });
  useEffect(() => {
    if (view.run) return;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setView((v) => ({ ...v, run: true })));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [view.run]);
  if (!items.length) return null;
  const transition = slider?.transition === 'fade' ? 'fade' : 'slide';
  const motion = bg.motion && bg.motion !== 'none' ? bg.motion : 'none';
  const showUi = items.length > 1 && (bg.showDots || bg.showCount);
  const slideState = (i: number) => {
    if (i === view.cur) return view.run ? ' is-on' : ' is-prep';
    if (i === view.prev) return view.run ? ' is-out' : ' is-hold';
    return '';
  };
  return (
    <div className={`i101-hscope${scope ? ` i101-hscope--${scope}` : ''}`}>
      <div
        aria-hidden="true"
        className={`i101-hbg i101-hbg--${transition} i101-hbg--m-${motion}`}
        style={vars({
          '--i101-dir': slider?.direction === 'rtl' ? '-1' : '1',
          '--i101-dur': Number(slider?.durationMs) > 0 ? `${slider.durationMs}ms` : undefined,
          '--i101-motion': Number(bg.motionSeconds) > 0 ? `${bg.motionSeconds}s` : undefined,
          '--i101-pos': bg.position,
          '--i101-pos-m': bg.positionMobile,
        })}
      >
        {items.map((item, i) => (
          <div key={`${item.src}-${i}`} className={`i101-hslide${slideState(i)}`}>
            <LzMedia item={item} className="i101-hmedia" eager={i === 0} onFail={markFailed} />
          </div>
        ))}
        {bg.overlay?.trim() ? <span className="i101-hoverlay" style={{ background: bg.overlay }} /> : null}
      </div>
      {showUi ? (
        <div
          className={`i101-hdots-wrap i101-hdots-wrap--${dots?.position || 'right'}`}
          style={vars({
            '--i101-dot': dots?.color,
            '--i101-dot-on': bg.dotColor,
            '--i101-dot-w': dots?.width,
            '--i101-dot-w-on': dots?.activeWidth,
            '--i101-dot-h': dots?.height,
            '--i101-dots-b': dots?.bottom,
          })}
        >
          <div className="container i101-hdots-inner">
            {bg.showDots ? (
              <div className="i101-hdots" role="group" aria-label="Hero slides">
                {items.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    className={i === index ? 'on' : ''}
                    aria-label={`Slide ${i + 1}${item.title ? `: ${item.title}` : ''}`}
                    aria-pressed={i === index}
                    onClick={() => go(i)}
                  />
                ))}
              </div>
            ) : null}
            {bg.showCount ? (
              <span className="i101-hcount" aria-hidden="true">
                {pad2(index + 1)} / {pad2(items.length)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Ind101HeroSection({ content, sectionKey }: SectionProps) {
  const c = withIndustries101Defaults<Ind101HeroContent>('ind101_hero', content);
  const crumbs = normalizeLinkItems(c.breadcrumb?.items);
  const { color: crumbColor, ...crumbRest } = c.breadcrumb?.style || {};
  const layout = c.layout || {};
  const place = heroPlacement(c.placement);
  return (
    <I101HeroShell
      box={c.section}
      className={`az-hero i101-hero ${heroHeightClass(c.heroHeight)} ${place.rootClass} i101-hero--v-${
        layout.vAlign || 'bottom'
      } i101-hero--h-${layout.hAlign || 'left'}${c.entrance === false ? '' : ' lgy-enter'}`}
      id={sectionKey || 'top'}
      layers={<I101HeroBg bg={c.background} slider={c.slider} dots={c.dots} />}
    >
      <HeroSlot place={place} name="text">
      <div className="az-hero-copy i101-hero-copy" style={vars({ maxWidth: layout.maxWidth })}>
        {!c.breadcrumb?.hidden && crumbs.length ? (
          <nav
            aria-label="Breadcrumb"
            className="az-breadcrumb i101-crumbs"
            style={{
              ...elementCss(crumbRest),
              ...vars({
                '--az-crumb-color': crumbColor,
                '--az-crumb-hover': c.breadcrumb.hoverColor,
                '--i101-crumb-current': c.breadcrumb.currentColor,
              }),
            }}
          >
            {crumbs.map((item, i) => (
              <Fragment key={`${item.label}-${i}`}>
                {i > 0 ? <span className="az-breadcrumb-sep">{c.breadcrumb.separator || '/'}</span> : null}
                {item.href ? <a href={appHref(item.href)}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
              </Fragment>
            ))}
          </nav>
        ) : null}
        <AzEyebrow el={c.eyebrow} scale="lg" />
        <LzHeading el={c.title} role="pageHero" className="az-hero-title" highlight={c.highlight} />
        <AzText el={c.lead} defaultTag="p" className="az-hero-lead" />
        <AzPills pills={c.pills} />
        <AzCtas ctas={c.ctas} />
      </div>
      </HeroSlot>
    </I101HeroShell>
  );
}

/* ------------------------------------------------------------------ */
/* Sticky category sub-nav (scroll-spy)                                */
/* ------------------------------------------------------------------ */

const anchorId = (v?: string) => String(v || '').trim().replace(/^#/, '');

export function Ind101SubnavSection({ content, sectionKey }: SectionProps) {
  const c = withIndustries101Defaults<Ind101SubnavContent>('ind101_subnav', content);
  const items = (c.items || []).filter((it) => !it.hidden && String(it.label || '').trim());
  const navRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState('');
  const sticky = c.sticky !== false;
  const autoTop = sticky && !c.stickyTop?.trim();
  const targetsKey = items.map((it) => anchorId(it.target)).join('|');

  useEffect(() => {
    const nav = navRef.current;
    const header = document.getElementById('siteHeader');
    if (!autoTop || !nav || !header) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      nav.style.setProperty('--i101-top', `${Math.max(0, Math.round(header.getBoundingClientRect().bottom))}px`);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    header.addEventListener('transitionend', schedule);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    ro?.observe(header);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      header.removeEventListener('transitionend', schedule);
      ro?.disconnect();
      nav.style.removeProperty('--i101-top');
    };
  }, [autoTop]);

  useEffect(() => {
    if (!c.scrollSpy || typeof IntersectionObserver === 'undefined') return;
    const els = targetsKey
      .split('|')
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActive(e.target.id);
            return;
          }
          const mid = window.innerHeight / 2;
          if (e.target === first && e.boundingClientRect.top > mid) setActive((a) => (a === first.id ? '' : a));
          if (e.target === last && e.boundingClientRect.bottom < mid) setActive((a) => (a === last.id ? '' : a));
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [c.scrollSpy, targetsKey]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !active || track.scrollWidth <= track.clientWidth + 1) return;
    const pill = Array.from(track.querySelectorAll<HTMLElement>('[data-target]')).find((p) => p.dataset.target === active);
    if (!pill) return;
    const left = pill.offsetLeft - (track.clientWidth - pill.offsetWidth) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [active]);

  if (!items.length) return null;

  const onPill = (e: MouseEvent<HTMLAnchorElement>, id: string, external: boolean) => {
    if (external || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const target = id ? document.getElementById(id) : null;
    const nav = navRef.current;
    if (!target || !nav) return;
    e.preventDefault();
    const header = document.getElementById('siteHeader');
    const top = sticky ? parseFloat(getComputedStyle(nav).top) || 0 : Math.max(0, header?.getBoundingClientRect().bottom || 0);
    const offset = top + (sticky ? nav.offsetHeight : 0) + (Number(c.scrollOffset) || 0);
    const y = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    setActive(id);
  };

  const bar = c.bar || {};
  const { color, background, border, ...pillRest } = c.pillStyle || {};
  const pillCss = elementCss(pillRest);
  return (
    <nav
      ref={navRef}
      id={sectionKey || 'cat-subnav'}
      aria-label="Industry categories"
      className={`i101-subnav${sticky ? ' is-sticky' : ''}${c.fadeEdges === false ? '' : ' i101-subnav--fade'}`}
      style={vars({
        '--i101-top-fixed': c.stickyTop,
        '--i101-bar-bg': bar.background,
        '--i101-bar-blur': bar.blur,
        '--i101-bar-shadow': bar.shadow,
        borderTop: bar.borderTop,
        borderBottom: bar.borderBottom,
        '--az-pt': bar.paddingTop,
        '--az-pb': bar.paddingBottom,
        '--az-pt-m': bar.paddingTopMobile,
        '--az-pb-m': bar.paddingBottomMobile,
        '--i101-pill-color': color,
        '--i101-pill-bg': background,
        '--i101-pill-border': border,
        '--i101-pill-hover-color': c.hoverColor,
        '--i101-pill-hover-bg': c.hoverBackground,
        '--i101-pill-active-color': c.activeColor,
        '--i101-pill-active-bg': c.activeBackground,
        '--i101-dot-size': c.dotSize,
      })}
    >
      <div className="container i101-subnav-inner" style={vars({ maxWidth: bar.containerMaxWidth })}>
        <div ref={trackRef} className={`i101-subnav-track i101-subnav-track--${c.align || 'left'}`} style={vars({ gap: c.gap })}>
          {items.map((it, i) => {
            const id = anchorId(it.target);
            const href = it.href?.trim();
            const on = Boolean(id) && active === id;
            return (
              <a
                key={`${id}-${i}`}
                className={`i101-pill${on ? ' is-active' : ''}`}
                href={href ? appHref(href) : `#${id}`}
                data-target={id || undefined}
                aria-current={on ? 'location' : undefined}
                style={{ ...pillCss, ...vars({ '--i101-pill': it.color }) }}
                onClick={(e) => onPill(e, id, Boolean(href))}
              >
                {c.showDots === false ? null : <span className="i101-pill-dot" aria-hidden="true" />}
                {it.label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Quick stat strip                                                    */
/* ------------------------------------------------------------------ */

export function Ind101StatsSection({ content, sectionKey }: SectionProps) {
  const c = withIndustries101Defaults<Ind101StatsContent>('ind101_stats', content);
  const items = (c.items || []).filter((s) => !s.hidden && (String(s.value || '').trim() || String(s.label || '').trim()));
  const gridRef = useRef<HTMLDivElement>(null);
  const phase = useCountPhase(gridRef, c.animateCount === true);
  if (!items.length) return null;
  const is = c.iconStyle || {};
  const duration = Math.max(200, Number(c.countDurationMs) || 1600);
  return (
    <LgShell box={c.section} className="i101-stats" id={sectionKey}>
      <div
        ref={gridRef}
        className={`i101-stat-grid i101-stat-grid--${c.layout === 'stacked' ? 'stacked' : 'row'} i101-stat-grid--${c.justify || 'center'}${
          c.dividers === false ? '' : ' i101-stat-dividers'
        }${c.hoverLift ? ' i101-stat-lift' : ''}`}
        style={vars({
          ...colVars(c.columns, { desktop: 4, tablet: 2, mobile: 2 }),
          '--lz-gap': c.gap,
          '--lgy-suffix': c.suffixColor?.trim() || 'inherit',
          '--i101-divider': c.dividerColor,
          '--i101-divider-h': c.dividerHeight,
          '--i101-stat-default': c.defaultColor,
          '--i101-sicon-size': is.size,
          '--i101-sicon-op': is.opacity,
        })}
      >
        {items.map((s, i) => (
          <div className="i101-stat" key={i} style={vars({ '--i101-stat-color': s.color })}>
            {s.icon && !s.icon.hidden && (s.icon.svg || s.icon.src) ? (
              <AzIcon icon={{ strokeWidth: is.strokeWidth, ...s.icon }} className="i101-stat-icon" />
            ) : null}
            <div className="i101-stat-text">
              {String(s.value || '').trim() ? (
                <StatNumber
                  className="i101-stat-num"
                  value={String(s.value)}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  phase={phase}
                  duration={duration}
                  style={c.numberStyle}
                />
              ) : null}
              {s.label ? (
                <div className="i101-stat-label" style={elementCss(c.labelStyle)}>
                  {s.label}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Category block (heading + media panel + sector cards)               */
/* ------------------------------------------------------------------ */

function I101Collage({ m, items, markFailed }: { m: Ind101CategoryMedia; items: LifeMediaItem[]; markFailed: (src: string) => void }) {
  const visibleCells = (m.cells || []).filter((cell) => cell && !cell.hidden);
  const cells = visibleCells.length ? visibleCells : defaultInd101CollageCells();
  const n = cells.length;
  const lists = cells.map((_, j) => (items.length >= n ? items.filter((_, i) => i % n === j) : [items[j % items.length]]));
  const rotating = lists.some((l) => l.length > 1);
  const intervalMs = (Number(m.intervalSeconds) || 4.5) * 1000;
  // One shared clock; each cell advances on its own beat so the collage changes one picture at a time.
  const tick = useTick(rotating && !prefersReducedMotion(), intervalMs / n);
  return (
    <div className="i101-collage">
      {cells.map((cell, j) => {
        const list = lists[j];
        const idx = list.length > 1 ? Math.floor((tick + n - 1 - j) / n) % list.length : 0;
        return (
          <div
            key={j}
            className="i101-cell"
            style={vars({
              left: cell.left,
              top: cell.top,
              width: cell.width,
              height: cell.height,
              zIndex: cell.zIndex,
              borderRadius: cell.radius,
              '--i101-delay': cell.delay,
            })}
          >
            {list.map((item, k) => (
              <div key={`${item.src}-${k}`} className={`i101-cell-slide${k === idx ? ' is-on' : ''}`}>
                <LzMedia item={item} className="i101-cell-media" onFail={markFailed} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function I101Slideshow({ m, items, markFailed }: { m: Ind101CategoryMedia; items: LifeMediaItem[]; markFailed: (src: string) => void }) {
  const { index, go } = useSlides(items.length, (Number(m.intervalSeconds) || 4.5) * 1000);
  return (
    <>
      {items.map((item, i) => (
        <div key={`${item.src}-${i}`} className={`i101-show-slide${i === index ? ' is-on' : ''}`}>
          <LzMedia item={item} className="i101-show-media" onFail={markFailed} />
        </div>
      ))}
      {m.overlay?.trim() ? <span className="i101-media-overlay" style={{ background: m.overlay }} /> : null}
      {items.length > 1 ? (
        <div className="i101-show-dots" role="group" aria-label="Category pictures">
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
    </>
  );
}

function I101MediaPanel({ m }: { m: Ind101CategoryMedia }) {
  const { items, markFailed } = useOkMedia(m.items);
  if (m.hidden || !items.length) return null;
  const mode = m.mode === 'slideshow' || m.mode === 'grid' ? m.mode : 'collage';
  return (
    <div
      className={`i101-media i101-media--${mode}${m.float === false ? '' : ' i101-media--float'}${m.hoverZoom === false ? '' : ' i101-media--zoom'}`}
      style={vars({
        '--i101-ar': m.aspectRatio,
        '--i101-ar-m': m.aspectRatioMobile,
        '--i101-media-radius': m.radius,
        '--i101-media-shadow': m.shadow,
        '--i101-media-bg': m.background,
        '--i101-cell-radius': m.cellRadius,
        '--i101-cell-shadow': m.cellShadow,
        '--i101-float': Number(m.floatSeconds) > 0 ? `${m.floatSeconds}s` : undefined,
        '--i101-grid-cols': Number(m.gridColumns) > 0 ? String(Math.min(6, Math.round(Number(m.gridColumns)))) : undefined,
        '--i101-grid-gap': m.gridGap,
        '--i101-fit': m.fit,
        '--i101-media-pos': m.position,
      })}
    >
      {mode === 'collage' ? <I101Collage m={m} items={items} markFailed={markFailed} /> : null}
      {mode === 'slideshow' ? <I101Slideshow m={m} items={items} markFailed={markFailed} /> : null}
      {mode === 'grid' ? (
        <div className="i101-media-grid">
          {items.map((item, i) => (
            <div key={`${item.src}-${i}`} className="i101-grid-tile">
              <LzMedia item={item} className="i101-grid-media" onFail={markFailed} />
            </div>
          ))}
        </div>
      ) : null}
      <AzText el={m.tag} defaultTag="span" className={`i101-tag i101-tag--${m.tagPosition || 'top-left'}`} />
    </div>
  );
}

function I101CardMedia({ items: raw }: { items?: LifeMediaItem[] }) {
  const { items, markFailed } = useOkMedia(raw);
  const { index } = useSlides(items.length, 4000);
  if (!items.length) return null;
  return (
    <div className="i101-card-media">
      {items.map((item, i) => (
        <div key={`${item.src}-${i}`} className={`i101-card-slide${i === index ? ' is-on' : ''}`}>
          <LzMedia item={item} className="i101-card-media-el" onFail={markFailed} />
        </div>
      ))}
    </div>
  );
}

export function Ind101CategorySection({ content, sectionKey }: SectionProps) {
  const c = withIndustries101Defaults<Ind101CategoryContent>('ind101_category', content);
  const cards = (c.cards || []).filter((card) => card && !card.hidden && (hasText(card.title) || hasText(card.body)));
  const reveal = c.reveal !== false;
  const gridRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const seen = useInView(headRef, reveal);
  useStaggerReveal(gridRef, '.i101-card', reveal, cards.length);

  const layout = c.layout || { mediaSide: 'right' };
  const m = c.media;
  const showMedia = Boolean(m && !m.hidden && visibleMedia(m.items).length);
  const mediaLeft = layout.mediaSide === 'left';
  const bar = c.accentBar || {};
  const cs = c.cardStyle || {};
  const is = c.iconStyle || {};
  const { color: titleColor, ...titleRest } = c.titleStyle || {};

  const head = (
    <div ref={headRef} className={`i101-cat-head${reveal ? ' i101-rv' : ''}${seen ? ' is-in' : ''}`}>
      {!bar.hidden ? (
        <span aria-hidden="true" className="i101-cat-bar" style={vars({ width: bar.width, height: bar.height, background: bar.color })} />
      ) : null}
      <div className="i101-cat-copy">
        <AzEyebrow el={c.eyebrow} scale="base" />
        <LzHeading el={c.title} role="section" className="i101-cat-title" highlight={c.highlight} />
        <AzText el={c.subtitle} defaultTag="p" className="i101-cat-sub" />
        <AzCtas ctas={c.ctas} />
      </div>
      <AzText el={c.count} defaultTag="div" className="i101-cat-count" />
    </div>
  );
  const mediaPanel = showMedia ? <I101MediaPanel m={m} /> : null;

  return (
    <LgShell box={c.section} bg={c.background} className="i101-cat" id={sectionKey}>
      <div className="i101-cat-scope" style={vars({ '--i101-c': c.accentColor })}>
        <div
          className={`i101-cat-intro${mediaPanel ? '' : ' i101-cat-intro--single'}${layout.mobileMediaFirst ? ' i101-media-first' : ''}`}
          style={vars({
            '--i101-cols': mediaPanel ? layout.columns : undefined,
            gap: layout.gap,
            alignItems: layout.alignItems,
            marginBottom: layout.marginBottom,
          })}
        >
          {mediaLeft ? (
            <>
              {mediaPanel}
              {head}
            </>
          ) : (
            <>
              {head}
              {mediaPanel}
            </>
          )}
        </div>
        {cards.length ? (
          <div
            ref={gridRef}
            className={`i101-cards${cs.hoverLift === false ? ' i101-no-lift' : ''}${cs.topBar === false ? ' i101-no-bar' : ''}${
              is.animate === false ? ' i101-no-ico-anim' : ''
            }`}
            style={vars({
              ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }),
              '--lz-gap': c.gap,
              ...cardVars(cs),
              '--i101-bar-h': cs.barHeight,
              '--i101-card-hover-shadow': cs.hoverShadow,
              '--i101-card-hover-border': cs.hoverBorder,
              '--i101-card-media-h': cs.mediaHeight,
              '--i101-ico-box': is.boxSize,
              '--i101-ico-size': is.size,
              '--i101-ico-radius': is.radius,
              '--i101-ico-bg': is.background,
              '--i101-ico-hover-bg': is.hoverBackground,
              '--i101-ico-hover-color': is.hoverColor,
              '--i101-ico-stroke': is.strokeWidth,
              '--i101-title-color': titleColor,
              '--i101-title-hover': c.titleHoverColor,
            })}
          >
            {cards.map((card, i) => {
              const inner = (
                <>
                  {visibleMedia(card.media).length ? <I101CardMedia items={card.media} /> : null}
                  {card.icon && !card.icon.hidden && (card.icon.svg || card.icon.src) ? <AzIcon icon={card.icon} className="i101-card-ico" /> : null}
                  <AzText el={card.title} defaultTag="h3" className="i101-card-title" style={titleRest} />
                  <AzText el={card.body} defaultTag="p" className="i101-card-body" style={c.bodyStyle} />
                  {card.linkLabel?.trim() ? (
                    <span className="i101-card-link" style={elementCss(c.linkStyle)}>
                      {card.linkLabel}
                    </span>
                  ) : null}
                </>
              );
              const style = vars({ '--i101-c': card.color });
              return card.href?.trim() ? (
                <a
                  key={i}
                  className="i101-card"
                  href={appHref(card.href)}
                  style={style}
                  target={card.newTab ? '_blank' : undefined}
                  rel={card.newTab ? 'noopener noreferrer' : undefined}
                >
                  {inner}
                </a>
              ) : (
                <div key={i} className="i101-card" style={style}>
                  {inner}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

export function Ind101CtaSection({ content, sectionKey }: SectionProps) {
  const c = withIndustries101Defaults<Ind101CtaContent>('ind101_cta', content);
  const align = c.align || 'center';
  return (
    <LgShell box={c.section} bg={c.background} className={`lz-cta lz-cta--${align} lgy-cta i101-cta`} id={sectionKey || 'contact'}>
      <div className="lz-cta-inner" style={vars({ maxWidth: c.maxWidth })}>
        <AzEyebrow el={c.eyebrow} scale="base" />
        <LzHeading el={c.title} role="section" className="lz-cta-title" highlight={c.highlight} />
        <AzText el={c.body} defaultTag="p" className="lz-cta-body" />
        <AzCtas ctas={c.ctas} className="lz-cta-actions" />
      </div>
    </LgShell>
  );
}

export function renderIndustries101Section(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'ind101_hero':
      return <Ind101HeroSection key={key} {...rest} />;
    case 'ind101_subnav':
      return <Ind101SubnavSection key={key} {...rest} />;
    case 'ind101_stats':
      return <Ind101StatsSection key={key} {...rest} />;
    case 'ind101_category':
      return <Ind101CategorySection key={key} {...rest} />;
    case 'ind101_cta':
      return <Ind101CtaSection key={key} {...rest} />;
    default:
      return null;
  }
}
