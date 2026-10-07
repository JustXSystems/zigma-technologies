'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { appHref } from '@/lib/base-path';
import { heroHeightClass, heroScrollBarOn } from '@/lib/hero-height';
import { heroPlacement } from '@/lib/hero-placement';
import type { BgVideoProps } from '@/components/BgVideo';
import HeroSlot from '@/components/HeroSlot';
import { LgScrollBar, LgShell } from '@/components/sections/LegacySections';
import { highlightText } from '@/components/sections/highlight-text';
import { useSiteShell } from '@/components/SiteProviders';
import { headingTagForRole } from '@/lib/site-settings';
import {
  AzCtas,
  AzEyebrow,
  AzIcon,
  AzImage,
  AzPills,
  AzShell,
  AzText,
  AzVideo,
  hasText,
  vars,
} from '@/components/sections/AboutSections';
import {
  elementCss,
  imageCss,
  mediaSrc,
  mergeStyle,
  normalizeLinkItems,
  type AboutHeadingRole,
  type ElementStyle,
  type TextEl,
} from '@/lib/about-sections';
import {
  lifeMediaKind,
  visibleMedia,
  withLifeDefaults,
  type LifeAlbum,
  type LifeCardsContent,
  type LifeColumns,
  type LifeCtaContent,
  type LifeEventGroup,
  type LifeEventsContent,
  type LifeGalleryContent,
  type LifeHeroContent,
  type LifeHighlight,
  type LifeMediaItem,
  type LifeRolesContent,
  type LifeSectionHeader,
  type LifeStatsContent,
} from '@/lib/life-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export function clampCols(n: unknown, fallback: number): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 1 ? Math.min(v, 8) : fallback;
}

export function colVars(cols: LifeColumns | undefined, fb: Required<LifeColumns>) {
  return {
    '--lz-cols': String(clampCols(cols?.desktop, fb.desktop)),
    '--lz-cols-t': String(clampCols(cols?.tablet, fb.tablet)),
    '--lz-cols-m': String(clampCols(cols?.mobile, fb.mobile)),
  };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/** Heading whose tag / size default to Theme Studio → Typography; element tag / style override. */
export function LzHeading({
  el,
  role,
  className,
  highlight,
}: {
  el?: TextEl;
  role: AboutHeadingRole;
  className: string;
  highlight?: LifeHighlight;
}) {
  const { settings } = useSiteShell();
  const level = headingTagForRole(settings, role);
  if (!hasText(el)) return null;
  const Tag = (el.tag || (role === 'pageHero' ? 'h1' : level)) as 'h2';
  return (
    <Tag className={className} style={elementCss(mergeStyle({ fontSize: `var(--text-${level})` }, el.style))}>
      {highlightText(String(el.text), highlight)}
    </Tag>
  );
}

function LzHeader({ header }: { header?: LifeSectionHeader }) {
  if (!header || header.hidden) return null;
  if (!hasText(header.eyebrow) && !hasText(header.title) && !hasText(header.subtitle)) return null;
  return (
    <div
      className={`az-head az-head--${header.align || 'left'}`}
      style={vars({ maxWidth: header.maxWidth, marginBottom: header.marginBottom })}
    >
      <AzEyebrow el={header.eyebrow} scale="lg" />
      <LzHeading el={header.title} role="section" className="az-head-title" highlight={header.highlight} />
      <AzText el={header.subtitle} defaultTag="p" className="az-head-sub" />
    </div>
  );
}

/* ---------- Media (image / svg / video) with load-failure fallback ---------- */

export type FailFn = (src: string) => void;

function LzImg({
  src,
  alt,
  className,
  eager,
  onFail,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  onFail?: FailFn;
}) {
  const fail = (el: HTMLImageElement) => {
    if (el.dataset.failed) return;
    el.dataset.failed = '1';
    onFail?.(src);
  };
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={(e) => fail(e.currentTarget)}
      ref={(el) => {
        /* Errors that fired before hydration never reach onError. SVGs may report 0×0 when loaded fine. */
        if (el && el.complete && el.naturalWidth === 0 && !/\.svg(\?|#|$)/i.test(src)) fail(el);
      }}
    />
  );
}

export function LzMedia({
  item,
  className = '',
  eager,
  onFail,
  active,
  warm,
  scope,
}: {
  item: LifeMediaItem;
  className?: string;
  eager?: boolean;
  onFail?: FailFn;
} & Pick<BgVideoProps, 'active' | 'warm' | 'scope'>) {
  const src = mediaSrc(item.src);
  if (!src) return null;
  const cls = `lz-media${className ? ` ${className}` : ''}`;
  if (lifeMediaKind(item) === 'video') {
    return <AzVideo className={cls} src={src} poster={mediaSrc(item.poster)} active={active} warm={warm} scope={scope} />;
  }
  return <LzImg className={cls} src={src} alt={item.title || ''} eager={eager} onFail={onFail} />;
}

/* ---------- Lightbox ---------- */

export type LbState = { list: LifeMediaItem[]; index: number } | null;

export function LzLightbox({ state, onChange }: { state: NonNullable<LbState>; onChange: (s: LbState) => void }) {
  const { list, index } = state;
  const item = list[index];
  const touchX = useRef<number | null>(null);
  const many = list.length > 1;
  const go = (d: number) => {
    if (many) onChange({ list, index: (index + d + list.length) % list.length });
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChange(null);
      else if (e.key === 'ArrowLeft' && list.length > 1) onChange({ list, index: (index - 1 + list.length) % list.length });
      else if (e.key === 'ArrowRight' && list.length > 1) onChange({ list, index: (index + 1) % list.length });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, list, onChange]);

  if (!item) return null;
  const src = mediaSrc(item.src);
  const caption = `${item.title || ''}${many ? `${item.title ? '  ·  ' : ''}${index + 1} / ${list.length}` : ''}`;

  return createPortal(
    <div
      className="lz-lb"
      role="dialog"
      aria-modal="true"
      aria-label={item.title || 'Media viewer'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onChange(null);
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <button type="button" className="lz-lb-x" aria-label="Close" autoFocus onClick={() => onChange(null)}>
        &times;
      </button>
      {many ? (
        <button type="button" className="lz-lb-nav lz-lb-prev" aria-label="Previous" onClick={() => go(-1)}>
          &#8249;
        </button>
      ) : null}
      {lifeMediaKind(item) === 'video' ? (
        <AzVideo key={src} className="lz-lb-media" src={src} poster={mediaSrc(item.poster)} controls />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} className="lz-lb-media" src={src} alt={item.title || ''} />
      )}
      {many ? (
        <button type="button" className="lz-lb-nav lz-lb-next" aria-label="Next" onClick={() => go(1)}>
          &#8250;
        </button>
      ) : null}
      {caption.trim() ? <p className="lz-lb-cap">{caption}</p> : null}
    </div>,
    document.body
  );
}

/** Per-section media state: failed sources (hidden from sliders / lightbox) and the lightbox itself. */
function useLifeMedia(lightbox: boolean) {
  const [failed, setFailed] = useState<Record<string, true>>({});
  const [lb, setLb] = useState<LbState>(null);
  const markFailed = useCallback<FailFn>((src) => {
    setFailed((f) => (f[src] ? f : { ...f, [src]: true }));
  }, []);
  const isOk = useCallback((m: LifeMediaItem) => !failed[mediaSrc(m.src)], [failed]);
  const open = useCallback(
    (items: LifeMediaItem[], i: number) => {
      const list = items.filter((m) => !failed[mediaSrc(m.src)]);
      const index = list.indexOf(items[i]);
      if (index >= 0) setLb({ list, index });
    },
    [failed]
  );
  return {
    isOk,
    markFailed,
    open: lightbox ? open : undefined,
    node: lb ? <LzLightbox state={lb} onChange={setLb} /> : null,
  };
}

/** Auto-advancing index (paused while the tab is hidden or `pausedRef` is set). */
export function useCycle(count: number, intervalMs: number) {
  const [tick, setTick] = useState(0);
  const pausedRef = useRef(false);
  useEffect(() => {
    if (count < 2 || !(intervalMs > 0)) return;
    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      setTick((t) => t + 1);
    }, Math.max(600, intervalMs));
    return () => window.clearInterval(id);
  }, [count, intervalMs]);
  return { index: count ? tick % count : 0, pausedRef };
}

function activate(fn?: () => void) {
  if (!fn) return {};
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: fn,
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn();
      }
    },
  };
}

function LzTile({
  item,
  className,
  onOpen,
  onFail,
  captionStyle,
  showCaption,
  tabbable = true,
  children,
}: {
  item: LifeMediaItem;
  className: string;
  onOpen?: () => void;
  onFail?: FailFn;
  captionStyle?: ElementStyle;
  showCaption?: boolean;
  tabbable?: boolean;
  children?: ReactNode;
}) {
  const act = activate(onOpen);
  return (
    <figure
      className={`lz-tile ${className}${onOpen ? ' lz-tile--open' : ''}`}
      style={vars({ '--c': item.color })}
      {...act}
      tabIndex={onOpen ? (tabbable ? 0 : -1) : undefined}
      aria-label={onOpen ? `Enlarge ${item.title || 'photo'}` : undefined}
    >
      <LzMedia item={item} onFail={onFail} />
      {children}
      {showCaption && (item.title || item.label) ? (
        <figcaption className="lz-tile-cap" style={elementCss(captionStyle)}>
          {item.label ? <small>{item.label}</small> : null}
          {item.title}
        </figcaption>
      ) : null}
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Page hero                                                           */
/* ------------------------------------------------------------------ */

function LzHeroMedia({ c }: { c: LifeHeroContent }) {
  const m = useLifeMedia(false);
  const items = visibleMedia(c.media?.items).filter(m.isOk);
  const interval = (Number(c.media?.intervalSeconds) || 4) * 1000;
  const { index } = useCycle(items.length, interval);
  if (!items.length) return null;
  const { wrap, img } = imageCss({ src: '', ...(c.media?.frame || {}) });
  return (
    <div className="az-hero-visual">
      <div className="az-hero-image lz-fade" style={{ ...wrap, ...vars({ '--lz-fit': img.objectFit as string, '--lz-pos': img.objectPosition as string }) }}>
        {items.map((item, i) => (
          <LzMedia
            key={`${item.src}-${i}`}
            item={item}
            eager={i === 0}
            onFail={m.markFailed}
            className={i === index ? 'is-on' : ''}
            active={i === index}
            warm={i === (index + 1) % items.length}
          />
        ))}
        {c.media?.frame?.overlay?.trim() ? (
          <span aria-hidden="true" className="az-img-overlay" style={{ background: c.media.frame.overlay }} />
        ) : null}
        {c.media?.showDots !== false && items.length > 1 ? (
          <div className="lz-dots" aria-hidden="true">
            {items.map((_, i) => (
              <i key={i} className={i === index ? 'on' : ''} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LifeHeroSection({ content, sectionKey }: SectionProps) {
  const c = withLifeDefaults<LifeHeroContent>('life_hero', content);
  const imageLeft = c.layout?.imageSide === 'left';
  const cols = c.layout?.columns?.trim() || (imageLeft ? '0.98fr 1.15fr' : '1.15fr 0.98fr');
  const crumbs = normalizeLinkItems(c.breadcrumb?.items);
  const { color: crumbColor, ...crumbRest } = c.breadcrumb?.style || {};
  const hasMedia = !c.media?.hidden && visibleMedia(c.media?.items).length > 0;
  const place = heroPlacement(c.placement);

  const copy = (
    <HeroSlot place={place} name="text">
    <div className="az-hero-copy">
      {!c.breadcrumb?.hidden && crumbs.length ? (
        <nav
          aria-label="Breadcrumb"
          className="az-breadcrumb"
          style={{
            ...elementCss(crumbRest),
            ...vars({ '--az-crumb-color': crumbColor, '--az-crumb-hover': c.breadcrumb.hoverColor }),
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
  );
  const visual = hasMedia ? (
    <HeroSlot place={place} name="media">
      <LzHeroMedia c={c} />
    </HeroSlot>
  ) : null;

  return (
    <LgShell
      box={c.section}
      bg={c.background}
      className={`az-hero lz-hero ${heroHeightClass(c.heroHeight)} ${place.rootClass}${c.entrance ? ' lgy-enter' : ''}`}
      id={sectionKey || 'top'}
    >
      {heroScrollBarOn(c.scrollBar) ? <LgScrollBar gradient={c.scrollBar?.gradient} /> : null}
      <div
        className={`az-hero-grid${visual ? '' : ' az-hero-grid--single'} ${
          c.layout?.mobileImageFirst ? 'az-mobile-img-first' : 'az-mobile-img-last'
        }`}
        style={vars({ '--az-cols': cols, gap: c.layout?.gap, alignItems: c.layout?.alignItems })}
      >
        {imageLeft ? (
          <>
            {visual}
            {copy}
          </>
        ) : (
          <>
            {copy}
            {visual}
          </>
        )}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Stat bar (count-up numbers)                                         */
/* ------------------------------------------------------------------ */

export type CountPhase = 'idle' | 'run' | 'done';

function parseStat(value: string) {
  const raw = String(value ?? '').trim();
  const m = raw.match(/^\d[\d,]*(\.\d+)?$/);
  if (!m) return null;
  return { num: parseFloat(raw.replace(/,/g, '')), decimals: m[1] ? m[1].length - 1 : 0, grouped: raw.includes(',') };
}

function formatStat(n: number, p: NonNullable<ReturnType<typeof parseStat>>): string {
  if (p.grouped) {
    return n.toLocaleString('en-IN', { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals });
  }
  return n.toFixed(p.decimals);
}

export function LzCount({ value, phase, duration }: { value: string; phase: CountPhase; duration: number }) {
  const p = parseStat(value);
  const num = p?.num;
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (phase !== 'run' || num === undefined) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min((now - t0) / duration, 1);
      setProgress(k);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, num, duration]);
  if (!p || phase === 'done') return <>{value}</>;
  const k = phase === 'idle' ? 0 : progress;
  if (k >= 1) return <>{value}</>;
  return <>{formatStat(p.decimals ? k * p.num : Math.floor(k * p.num), p)}</>;
}

export function LifeStatsSection({ content, sectionKey }: SectionProps) {
  const c = withLifeDefaults<LifeStatsContent>('life_stats', content);
  const items = (c.items || []).filter((s) => s && (String(s.value || '').trim() || String(s.label || '').trim()));
  const animate = c.animateCount !== false;
  const gridRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<CountPhase>('idle');

  useEffect(() => {
    if (!animate) return;
    const el = gridRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const t = window.setTimeout(() => setPhase('done'), 0);
      return () => window.clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setPhase(prefersReducedMotion() ? 'done' : 'run');
        io.disconnect();
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animate]);

  if (!items.length) return null;
  const is = c.iconStyle || {};
  const duration = Math.max(200, Number(c.countDurationMs) || 1400);

  return (
    <AzShell box={c.section} className="lz-stats" id={sectionKey}>
      <div
        ref={gridRef}
        className={`lz-stat-grid lz-stat-grid--${c.align || 'center'}${c.hoverLift === false ? ' lz-no-lift' : ''}`}
        style={vars({
          ...colVars(c.columns, { desktop: 4, tablet: 4, mobile: 2 }),
          '--lz-gap': c.gap,
          '--lz-sicon-box': is.boxSize,
          '--lz-sicon-pad': is.padding,
          '--lz-sicon-color': is.color,
          '--lz-sicon-bg': is.background,
          '--lz-sicon-border': is.border,
          '--lz-sicon-radius': is.radius,
          '--lz-sicon-stroke': is.strokeWidth,
          '--lz-sicon-hover-color': is.hoverColor,
          '--lz-sicon-hover-bg': is.hoverBackground,
          '--lz-sicon-hover-border': is.hoverBorderColor,
          '--lz-suffix-color': c.suffixColor,
        })}
      >
        {items.map((s, i) => {
          const final = `${s.prefix || ''}${s.value || ''}${s.suffix || ''}`;
          return (
            <div className="lz-stat" key={i}>
              {!is.hidden ? <AzIcon icon={s.icon} className="lz-stat-icon" /> : null}
              {String(s.value || '').trim() ? (
                <div className="lz-stat-num" style={elementCss(c.numberStyle)}>
                  <span aria-hidden="true">
                    {s.prefix ? <span className="lz-stat-affix">{s.prefix}</span> : null}
                    <LzCount value={String(s.value)} phase={animate ? phase : 'done'} duration={duration} />
                    {s.suffix ? <span className="lz-stat-affix">{s.suffix}</span> : null}
                  </span>
                  <span className="lz-sr">{final}</span>
                </div>
              ) : null}
              {s.label ? (
                <div className="lz-stat-label" style={elementCss(c.labelStyle)}>
                  {s.label}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </AzShell>
  );
}

/* ------------------------------------------------------------------ */
/* Culture cards (Why Zigma)                                           */
/* ------------------------------------------------------------------ */

export function LifeCardsSection({ content, sectionKey }: SectionProps) {
  const c = withLifeDefaults<LifeCardsContent>('life_cards', content);
  const cs = c.cardStyle || {};
  const bar = cs.accentBar || {};
  return (
    <AzShell box={c.section} className="az-section lz-cards" id={sectionKey || 'why-zigma'}>
      <LzHeader header={c.header} />
      <div
        className={`lz-grid lz-card-grid${cs.textAlign && cs.textAlign !== 'left' ? ` lz-card-grid--${cs.textAlign}` : ''}${
          cs.hoverLift === false ? ' lz-no-lift' : ''
        }${
          cs.hoverBorder === false ? ' lz-no-hover-border' : ''
        }${bar.hidden ? ' lz-no-bar' : ''}`}
        style={vars({
          ...colVars(c.columns, { desktop: 4, tablet: 2, mobile: 1 }),
          '--lz-gap': c.gap,
          '--lz-card-bg': cs.background,
          '--lz-card-border': cs.border,
          '--lz-card-radius': cs.radius,
          '--lz-card-pad': cs.padding,
          '--lz-card-shadow': cs.shadow,
          '--lz-bar-w': bar.width,
          '--lz-bar-h': bar.height,
          textAlign: cs.textAlign,
        })}
      >
        {(c.cards || []).map((card, i) => (
          <article
            key={i}
            className={`lz-card${c.reveal === false ? '' : ' reveal'}`}
            style={vars({ '--c': card.color, '--lz-card-bg-item': card.background })}
          >
            {card.image && !card.image.hidden && card.image.src ? <AzImage image={card.image} className="lz-card-img" /> : null}
            {card.icon && !card.icon.hidden && (card.icon.svg || card.icon.src) ? (
              <AzIcon icon={card.icon} className="lz-card-icon" />
            ) : null}
            {card.num ? (
              <div className="lz-card-num" style={elementCss(c.numStyle)}>
                {card.num}
              </div>
            ) : null}
            <AzText el={card.title} defaultTag="h3" className="lz-card-title" style={c.titleStyle} />
            <AzText el={card.body} defaultTag="p" className="lz-card-body" style={c.bodyStyle} />
          </article>
        ))}
      </div>
    </AzShell>
  );
}

/* ------------------------------------------------------------------ */
/* Roles (Where you can fit)                                           */
/* ------------------------------------------------------------------ */

/** Staggered entrance for cards below the fold (data-reveal keeps React-owned className untouched). */
export function useStaggerReveal(ref: RefObject<HTMLElement | null>, selector: string, enabled: boolean, dep: unknown) {
  useEffect(() => {
    const root = ref.current;
    if (!enabled || !root || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(selector));
    const timers: number[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          .forEach((e, k) => {
            const el = e.target as HTMLElement;
            io.unobserve(el);
            timers.push(window.setTimeout(() => (el.dataset.reveal = 'in'), k * 110));
          });
      },
      { threshold: 0.15 }
    );
    const vh = window.innerHeight;
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) return;
      el.dataset.reveal = 'pre';
      io.observe(el);
    });
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      els.forEach((el) => delete el.dataset.reveal);
    };
  }, [ref, selector, enabled, dep]);
}

export function LifeRolesSection({ content, sectionKey }: SectionProps) {
  const c = withLifeDefaults<LifeRolesContent>('life_roles', content);
  const roles = c.roles || [];
  const gridRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(gridRef, '.lz-role', c.staggerReveal !== false, roles.length);
  const cs = c.cardStyle || {};
  const is = c.iconStyle || {};
  return (
    <AzShell box={c.section} className="az-section lz-roles" id={sectionKey || 'where-you-fit'}>
      <LzHeader header={c.header} />
      <div
        ref={gridRef}
        className={`lz-grid lz-role-grid${c.animateIcons === false ? '' : ' lz-icons-anim'}${
          cs.hoverLift === false ? ' lz-no-lift' : ''
        }${cs.topBar === false ? ' lz-no-bar' : ''}${is.glow === false ? ' lz-no-glow' : ''}`}
        style={vars({
          ...colVars(c.columns, { desktop: 4, tablet: 2, mobile: 1 }),
          '--lz-gap': c.gap,
          '--lz-role-bg': cs.background,
          '--lz-role-border': cs.border,
          '--lz-role-radius': cs.radius,
          '--lz-role-pad': cs.padding,
          '--lz-role-shadow': cs.shadow,
          '--lz-role-hover-bg': cs.hoverBackground,
          '--lz-ric-box': is.boxSize,
          '--lz-ric-size': is.size,
          '--lz-ric-radius': is.radius,
          '--lz-ric-bg': is.background,
          '--lz-ric-border': is.border,
          '--lz-ric-stroke': is.strokeWidth,
        })}
      >
        {roles.map((role, i) => (
          <div key={i} className={`lz-role${role.wide ? ' lz-role--wide' : ''}`} style={vars({ '--c': role.color })}>
            <AzIcon icon={role.icon} className="lz-role-ic" />
            <AzText el={role.title} defaultTag="h3" className="lz-role-title" style={c.titleStyle} />
            <AzText el={role.body} defaultTag="p" className="lz-role-body" style={c.bodyStyle} />
          </div>
        ))}
      </div>
    </AzShell>
  );
}

/* ------------------------------------------------------------------ */
/* Events & moments (marquee / albums / grid groups)                   */
/* ------------------------------------------------------------------ */

type MediaApi = ReturnType<typeof useLifeMedia>;

function LzMarquee({
  group,
  media,
  captionStyle,
}: {
  group: LifeEventGroup;
  media: MediaApi;
  captionStyle?: ElementStyle;
}) {
  const items = visibleMedia(group.items);
  if (!items.length) return null;
  const m = group.marquee || {};
  const speed = Number(m.speedSeconds) > 0 ? Number(m.speedSeconds) : 45;
  return (
    <div
      className={`lz-oe-scroll lz-oe--${m.direction === 'rtl' ? 'rtl' : 'ltr'}${m.fadeEdges === false ? '' : ' lz-oe-fade'}${
        m.pauseOnHover === false ? '' : ' lz-oe-pause'
      }`}
      style={vars({
        '--lz-oe-duration': `${speed}s`,
        '--lz-oe-w': m.tileWidth,
        '--lz-oe-h': m.tileHeight,
        '--lz-oe-w-m': m.tileWidthMobile,
        '--lz-oe-h-m': m.tileHeightMobile,
        '--lz-oe-gap': m.gap,
      })}
    >
      <div className="lz-oe-track">
        {[0, 1].map((set) => (
          <div className="lz-oe-set" key={set} aria-hidden={set === 1 || undefined}>
            {items.map((item, i) => (
              <LzTile
                key={i}
                item={item}
                className="lz-oe"
                onFail={set === 0 ? media.markFailed : undefined}
                onOpen={media.open && media.isOk(item) ? () => media.open!(items, i) : undefined}
                tabbable={set === 0}
                showCaption
                captionStyle={captionStyle}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LzAlbum({
  album,
  index,
  intervalMs,
  showCount,
  media,
  captionStyle,
}: {
  album: LifeAlbum;
  index: number;
  intervalMs: number;
  showCount: boolean;
  media: MediaApi;
  captionStyle?: ElementStyle;
}) {
  const all = visibleMedia(album.items);
  const items = all.filter(media.isOk);
  const { index: cur } = useCycle(items.length, intervalMs + index * 350);
  const hasVideo = items.some((m) => lifeMediaKind(m) === 'video');
  const n = items.length;
  const countText = n ? `${n} ${hasVideo ? (n === 1 ? 'item' : 'items') : n === 1 ? 'photo' : 'photos'}` : '';
  const sub = [album.caption?.trim(), showCount ? countText : ''].filter(Boolean).join(' · ');
  const open = media.open && n ? () => media.open!(items, cur) : undefined;
  return (
    <figure
      className="lz-alb"
      style={vars({ '--c': album.color, '--d': `${index * 0.12}s` })}
      {...activate(open)}
      aria-label={open ? `Open album ${album.name || index + 1}` : undefined}
    >
      <div className="lz-alb-stack">
        <div className="lz-alb-face">
          <div className="lz-alb-pic">
            <span className="lz-alb-no" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            {all.map((item, i) => (
              <LzMedia
                key={`${item.src}-${i}`}
                item={item}
                onFail={media.markFailed}
                className={n && item === items[cur] ? 'is-on' : ''}
              />
            ))}
            {showCount && n ? <span className="lz-alb-count">{countText}</span> : null}
          </div>
          {album.name || sub ? (
            <figcaption className="lz-alb-cap" style={elementCss(captionStyle)}>
              {album.name ? <b>{album.name}</b> : null}
              {sub ? <small>{sub}</small> : null}
            </figcaption>
          ) : null}
        </div>
      </div>
    </figure>
  );
}

function LzAlbums({
  group,
  media,
  captionStyle,
}: {
  group: LifeEventGroup;
  media: MediaApi;
  captionStyle?: ElementStyle;
}) {
  const albums = (group.albums || []).filter((a) => a && !a.hidden);
  const opts = group.albumOptions || {};
  const gridRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(gridRef, '.lz-alb', opts.reveal !== false, albums.length);
  if (!albums.length) return null;
  const cols = clampCols(opts.columns?.desktop, 5);
  const n = Math.min(albums.length, cols);
  const points = Array.from({ length: n }, (_, i) => `${(((i + 0.5) / n) * 100).toFixed(2)},${i % 2 === 0 ? 40 : 60}`).join(' ');
  const intervalMs = (Number(opts.intervalSeconds) || 2.8) * 1000;
  return (
    <div className="lz-alb-wrap">
      {opts.showConnector !== false && n > 1 ? (
        <svg className="lz-alb-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={points} />
        </svg>
      ) : null}
      <div
        ref={gridRef}
        className={`lz-alb-grid${opts.tilt === false ? ' lz-alb-flat' : ''}`}
        style={vars(colVars(opts.columns, { desktop: 5, tablet: 2, mobile: 2 }))}
      >
        {albums.map((album, ai) => (
          <LzAlbum
            key={ai}
            album={album}
            index={ai}
            intervalMs={intervalMs}
            showCount={opts.showCount !== false}
            media={media}
            captionStyle={captionStyle}
          />
        ))}
      </div>
    </div>
  );
}

function LzEventGrid({
  group,
  media,
  captionStyle,
}: {
  group: LifeEventGroup;
  media: MediaApi;
  captionStyle?: ElementStyle;
}) {
  const items = visibleMedia(group.items);
  if (!items.length) return null;
  const g = group.grid || {};
  return (
    <div
      className="lz-ev-grid"
      style={vars({
        ...colVars(g.columns, { desktop: 4, tablet: 2, mobile: 2 }),
        '--lz-row-h': g.rowHeight,
        '--lz-row-h-m': g.rowHeightMobile,
      })}
    >
      {items.map((item, i) => (
        <LzTile
          key={i}
          item={item}
          className={`lz-ev${item.big ? ' lz-ev--big' : ''}`}
          onFail={media.markFailed}
          onOpen={media.open && media.isOk(item) ? () => media.open!(items, i) : undefined}
          showCaption
          captionStyle={captionStyle}
        />
      ))}
    </div>
  );
}

export function LifeEventsSection({ content, sectionKey }: SectionProps) {
  const c = withLifeDefaults<LifeEventsContent>('life_events', content);
  const media = useLifeMedia(c.lightbox !== false);
  const groups = (c.groups || []).filter((g) => g && !g.hidden);
  return (
    <AzShell box={c.section} className="az-section lz-events" id={sectionKey || 'events'}>
      <LzHeader header={c.header} />
      <div className="lz-evgs" style={vars({ '--lz-tile-radius': c.tileRadius })}>
        {groups.map((g, gi) => {
          const showTitle = hasText(g.title) || Boolean(g.num);
          const TitleTag = (g.title?.tag || 'h3') as 'h3';
          const tags = (g.tags || []).filter((t) => String(t || '').trim());
          return (
            <div className="lz-evg" key={gi}>
              {showTitle || tags.length ? (
                <div className="lz-evg-head">
                  {showTitle && !g.title?.style?.hidden ? (
                    <TitleTag className="lz-evg-title" style={elementCss(mergeStyle(c.groupTitleStyle, g.title?.style))}>
                      {g.num ? (
                        <span className="lz-evg-num" style={elementCss(c.groupNumStyle)}>
                          {g.num}
                        </span>
                      ) : null}
                      {g.title?.text}
                    </TitleTag>
                  ) : null}
                  {tags.length ? (
                    <div className="lz-evg-tags">
                      {tags.map((t, ti) => (
                        <i key={ti} style={elementCss(c.tagStyle)}>
                          {t}
                        </i>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {g.layout === 'albums' ? (
                <LzAlbums group={g} media={media} captionStyle={c.captionStyle} />
              ) : g.layout === 'grid' ? (
                <LzEventGrid group={g} media={media} captionStyle={c.captionStyle} />
              ) : (
                <LzMarquee group={g} media={media} captionStyle={c.captionStyle} />
              )}
            </div>
          );
        })}
      </div>
      <AzText el={c.note} defaultTag="p" className="lz-note" />
      {media.node}
    </AzShell>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery (mosaic with auto slider)                                   */
/* ------------------------------------------------------------------ */

function ZoomIcon() {
  return (
    <span className="lz-zoom-ic" aria-hidden="true">
      +
    </span>
  );
}

function LzSliderTile({
  items,
  className,
  intervalSeconds,
  pauseOnHover,
  showDots,
  zoomIcon,
  showCaption,
  captionStyle,
  onOpen,
  onFail,
}: {
  items: LifeMediaItem[];
  className: string;
  intervalSeconds?: number;
  pauseOnHover?: boolean;
  showDots?: boolean;
  zoomIcon: boolean;
  showCaption: boolean;
  captionStyle?: ElementStyle;
  onOpen?: (i: number) => void;
  onFail: FailFn;
}) {
  const n = items.length;
  const [pos, setPos] = useState(0);
  const [animate, setAnimate] = useState(true);
  const paused = useRef(false);

  useEffect(() => {
    if (n < 2) return;
    const ms = Math.max(800, (Number(intervalSeconds) || 2) * 1000);
    const id = window.setInterval(() => {
      if (paused.current || document.hidden) return;
      setAnimate(true);
      setPos((p) => p + 1);
    }, ms);
    return () => window.clearInterval(id);
  }, [n, intervalSeconds]);

  useEffect(() => {
    if (n < 1 || pos < n) return;
    const t = window.setTimeout(() => {
      setAnimate(false);
      setPos(0);
    }, 750);
    return () => window.clearTimeout(t);
  }, [pos, n]);

  if (!n) return <figure aria-hidden="true" className={`lz-tile lz-gtile lz-gtile--slider ${className}`} />;
  const active = pos % n;
  const current = items[active];
  const open = onOpen ? () => onOpen(active) : undefined;
  return (
    <figure
      className={`lz-tile lz-gtile lz-gtile--slider ${className}${open ? ' lz-tile--open' : ''}`}
      style={vars({ '--c': current?.color })}
      {...activate(open)}
      aria-label={open ? `Enlarge ${current?.title || 'photo'}` : undefined}
      onMouseEnter={() => {
        if (pauseOnHover !== false) paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
    >
      <div
        className="lz-slide-track"
        style={{
          transform: `translateX(-${pos * 100}%)`,
          transition: animate ? undefined : 'none',
        }}
      >
        {[...items, ...(n > 1 ? [items[0]] : [])].map((item, i) => (
          <div className="lz-slide" key={i} aria-hidden={i === n || undefined}>
            <LzMedia item={item} eager={i === 0} onFail={i < n ? onFail : undefined} />
          </div>
        ))}
      </div>
      {zoomIcon ? <ZoomIcon /> : null}
      {showCaption && current && (current.title || current.label) ? (
        <figcaption className="lz-tile-cap" style={elementCss(captionStyle)}>
          {current.label ? <small>{current.label}</small> : null}
          {current.title}
        </figcaption>
      ) : null}
      {showDots !== false && n > 1 ? (
        <div className="lz-dots" aria-hidden="true">
          {items.map((_, i) => (
            <i key={i} className={i === active ? 'on' : ''} />
          ))}
        </div>
      ) : null}
    </figure>
  );
}

export function LifeGallerySection({ content, sectionKey }: SectionProps) {
  const c = withLifeDefaults<LifeGalleryContent>('life_gallery', content);
  const media = useLifeMedia(c.lightbox !== false);
  const items = visibleMedia(c.items);
  const mosaic = c.layout !== 'grid';
  const hover = c.hover || {};
  const sliderOn = c.slider?.enabled !== false && items.length > 1;
  const sliderAt = sliderOn ? Math.max(0, items.findIndex((m) => m.big)) : -1;
  const sliderItems = sliderOn ? items.filter(media.isOk) : [];
  const rh = c.rowHeight || {};
  const open = media.open;

  return (
    <AzShell box={c.section} className="az-section lz-gallery" id={sectionKey || 'infrastructure'}>
      <LzHeader header={c.header} />
      <div
        className={`lz-gal lz-gal--${mosaic ? 'mosaic' : 'grid'}${hover.shine === false ? '' : ' lz-gal--shine'}${
          hover.lift === false ? '' : ' lz-gal--lift'
        }${hover.zoomIcon === false ? '' : ' lz-gal--zoom'}`}
        style={vars({
          ...colVars(c.columns, { desktop: 4, tablet: 2, mobile: 2 }),
          '--lz-gap': c.gap,
          '--lz-row-h': rh.desktop,
          '--lz-row-h-t': rh.tablet,
          '--lz-row-h-m': rh.mobile,
          '--lz-accent': hover.accent,
          '--lz-tile-radius': c.tileRadius,
          '--lz-tile-shadow': c.tileShadow,
        })}
      >
        {items.map((item, i) => {
          if (i === sliderAt) {
            return (
              <LzSliderTile
                key="slider"
                items={sliderItems}
                className={mosaic ? 'lz-gtile--big' : ''}
                intervalSeconds={c.slider?.intervalSeconds}
                pauseOnHover={c.slider?.pauseOnHover}
                showDots={c.slider?.showDots}
                zoomIcon={hover.zoomIcon !== false}
                showCaption={c.captions}
                captionStyle={c.captionStyle}
                onOpen={open ? (k) => open(sliderItems, k) : undefined}
                onFail={media.markFailed}
              />
            );
          }
          return (
            <LzTile
              key={`${item.src}-${i}`}
              item={item}
              className={`lz-gtile${mosaic && item.big && sliderAt < 0 ? ' lz-gtile--big' : ''}`}
              onFail={media.markFailed}
              onOpen={open && media.isOk(item) ? () => open(items, i) : undefined}
              showCaption={c.captions}
              captionStyle={c.captionStyle}
            >
              {hover.zoomIcon !== false ? <ZoomIcon /> : null}
            </LzTile>
          );
        })}
      </div>
      <AzText el={c.note} defaultTag="p" className="lz-note" />
      {media.node}
    </AzShell>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

export function LifeCtaSection({ content, sectionKey }: SectionProps) {
  const c = withLifeDefaults<LifeCtaContent>('life_cta', content);
  const align = c.align || 'center';
  return (
    <AzShell box={c.section} className={`lz-cta lz-cta--${align}`} id={sectionKey || 'contact'}>
      <div className="lz-cta-inner" style={vars({ maxWidth: c.maxWidth })}>
        <AzEyebrow el={c.eyebrow} scale="lg" />
        <LzHeading el={c.title} role="section" className="lz-cta-title" highlight={c.highlight} />
        <AzText el={c.body} defaultTag="p" className="lz-cta-body" />
        <AzCtas ctas={c.ctas} className="lz-cta-actions" />
      </div>
    </AzShell>
  );
}

export function renderLifeSection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'life_hero':
      return <LifeHeroSection key={key} {...rest} />;
    case 'life_stats':
      return <LifeStatsSection key={key} {...rest} />;
    case 'life_cards':
      return <LifeCardsSection key={key} {...rest} />;
    case 'life_roles':
      return <LifeRolesSection key={key} {...rest} />;
    case 'life_events':
      return <LifeEventsSection key={key} {...rest} />;
    case 'life_gallery':
      return <LifeGallerySection key={key} {...rest} />;
    case 'life_cta':
      return <LifeCtaSection key={key} {...rest} />;
    default:
      return null;
  }
}
