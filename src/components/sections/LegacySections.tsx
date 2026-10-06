'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { appHref } from '@/lib/base-path';
import { heroHeightClass } from '@/lib/hero-height';
import { heroPlacement } from '@/lib/hero-placement';
import HeroSlot from '@/components/HeroSlot';
import { AzCtas, AzEyebrow, AzIcon, AzImage, AzPills, AzText, AzVideo, hasText, vars } from '@/components/sections/AboutSections';
import {
  LzCount,
  LzHeading,
  LzMedia,
  clampCols,
  colVars,
  prefersReducedMotion,
  useCycle,
  useStaggerReveal,
  type CountPhase,
} from '@/components/sections/LifeSections';
import {
  elementCss,
  mediaSrc,
  normalizeLinkItems,
  orbCss,
  sectionBoxCss,
  type ElementStyle,
  type SectionBox,
} from '@/lib/about-sections';
import { visibleMedia, type LifeMediaItem } from '@/lib/life-sections';
import {
  withLegacyDefaults,
  type LegacyBgMedia,
  type LegacyCapsContent,
  type LegacyCollageFrame,
  type LegacyCtaContent,
  type LegacyHeroContent,
  type LegacyJourneyContent,
  type LegacyMarqueeContent,
  type LegacyMilestone,
  type LegacyNextContent,
  type LegacyRingBadge,
  type LegacySectionHeader,
  type LegacyStatsContent,
  type LegacyStoryContent,
  type LegacyValuesContent,
} from '@/lib/legacy-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

/* ------------------------------------------------------------------ */
/* Shared hooks & building blocks                                      */
/* ------------------------------------------------------------------ */

/** True once the element has scrolled into view (threshold 0 so tall blocks on phones still trigger). */
export function useInView(ref: RefObject<HTMLElement | null>, enabled = true) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || seen || !el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const t = window.setTimeout(() => setSeen(true), 0);
      return () => window.clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled, seen]);
  return seen || !enabled;
}

/** Count-up phase for numbers inside `ref` (starts when visible, skipped for reduced motion). */
export function useCountPhase(ref: RefObject<HTMLElement | null>, enabled: boolean): CountPhase {
  const [phase, setPhase] = useState<CountPhase>('idle');
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
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
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled]);
  return enabled ? phase : 'done';
}

/** Media list minus files that failed to load. */
export function useOkMedia(items?: LifeMediaItem[]) {
  const [failed, setFailed] = useState<Record<string, true>>({});
  const markFailed = useCallback((src: string) => {
    setFailed((f) => (f[src] ? f : { ...f, [src]: true }));
  }, []);
  return { items: visibleMedia(items).filter((m) => !failed[mediaSrc(m.src)]), markFailed };
}

/** Auto-advancing slide index that restarts its timer whenever the visitor picks a slide. */
export function useSlides(count: number, intervalMs: number) {
  const [state, setState] = useState({ index: 0, epoch: 0 });
  useEffect(() => {
    if (count < 2 || !(intervalMs > 0)) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setState((s) => ({ ...s, index: (s.index + 1) % count }));
    }, Math.max(1000, intervalMs));
    return () => window.clearInterval(id);
  }, [count, intervalMs, state.epoch]);
  const go = useCallback((index: number) => setState((s) => ({ index, epoch: s.epoch + 1 })), []);
  return { index: count ? state.index % count : 0, go };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const PATTERN_CLASS: Record<string, string> = {
  grid: '',
  'grid-fade': ' az-pattern--fade',
  'grid-fade-top': ' az-pattern--fade-top',
};

/** Background image / video layer: cross-fading slides with Ken Burns, zoom, pan or drift motion. */
export function LgBackground({ bg }: { bg?: LegacyBgMedia }) {
  if (!bg || bg.hidden) return null;
  if (!visibleMedia(bg.mobileItems).length) return <LgBgLayer bg={bg} items={bg.items} />;
  return (
    <>
      <LgBgLayer bg={bg} items={bg.items} scope="desk" />
      <LgBgLayer bg={bg} items={bg.mobileItems} scope="mob" />
    </>
  );
}

function LgBgLayer({ bg, items: raw, scope }: { bg: LegacyBgMedia; items?: LifeMediaItem[]; scope?: 'desk' | 'mob' }) {
  const { items, markFailed } = useOkMedia(raw);
  const intervalMs = (Number(bg.intervalSeconds) || 5.5) * 1000;
  const { index, go } = useSlides(items.length, intervalMs);
  if (!items.length) return null;
  const motion = bg.motion && bg.motion !== 'none' ? bg.motion : 'none';
  const showUi = items.length > 1 && (bg.showDots || bg.showCount);
  return (
    <div className={`lgy-bg-scope${scope ? ` lgy-bg-scope--${scope}` : ''}`}>
      <div
        aria-hidden="true"
        className={`lgy-bg lgy-bg--${motion}`}
        style={vars({
          '--lgy-motion': Number(bg.motionSeconds) > 0 ? `${bg.motionSeconds}s` : undefined,
          '--lgy-pos': bg.position,
          '--lgy-pos-m': bg.positionMobile,
        })}
      >
        {items.map((item, i) => (
          <div key={`${item.src}-${i}`} className={`lgy-bg-slide${i === index ? ' is-on' : ''}`}>
            <LzMedia
              item={item}
              className="lgy-bg-media"
              eager={i === 0}
              onFail={markFailed}
              active={i === index}
              warm={i === (index + 1) % items.length}
              scope={scope}
            />
          </div>
        ))}
        {bg.overlay?.trim() ? <span className="lgy-bg-overlay" style={{ background: bg.overlay }} /> : null}
      </div>
      {showUi ? (
        <div className="lgy-bg-ui" style={vars({ '--lgy-dot': bg.dotColor, '--lgy-interval': `${intervalMs}ms` })}>
          <div className="container lgy-bg-ui-inner">
            {bg.showDots ? (
              <div className="lgy-dots" role="group" aria-label="Background slides">
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
              <span className="lgy-count" aria-hidden="true">
                {pad2(index + 1)} / {pad2(items.length)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Section shell (same contract as the About shell) plus the animated background media layer. */
export function LgShell({
  box,
  bg,
  className,
  id,
  children,
  noContainer,
  layers,
}: {
  box?: SectionBox;
  bg?: LegacyBgMedia;
  className: string;
  id?: string | null;
  children: ReactNode;
  noContainer?: boolean;
  /** Extra absolutely-positioned layers anchored to the section (outside the content container) */
  layers?: ReactNode;
}) {
  const tone = box?.tone === 'dark' ? 'dark' : 'light';
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
      <LgBackground bg={bg} />
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
      {noContainer ? (
        <div className="az-inner">{children}</div>
      ) : (
        <div className="container az-inner" style={box?.containerMaxWidth ? { maxWidth: box.containerMaxWidth } : undefined}>
          {children}
        </div>
      )}
    </section>
  );
}

/** Section header with the design's animated accent bar under the heading. */
export function LgHeader({ header }: { header?: LegacySectionHeader }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref);
  if (!header || header.hidden) return null;
  if (!hasText(header.eyebrow) && !hasText(header.title) && !hasText(header.subtitle)) return null;
  const bar = header.bar || {};
  return (
    <div
      ref={ref}
      className={`az-head az-head--${header.align || 'left'} lgy-head${seen ? ' is-in' : ''}`}
      style={vars({ maxWidth: header.maxWidth, marginBottom: header.marginBottom })}
    >
      <AzEyebrow el={header.eyebrow} scale="lg" />
      <LzHeading el={header.title} role="section" className="az-head-title" highlight={header.highlight} />
      {!bar.hidden && hasText(header.title) ? (
        <span
          aria-hidden="true"
          className="lgy-head-bar"
          style={vars({ '--lgy-bar': bar.gradient, '--lgy-bar-w': bar.width, '--lgy-bar-h': bar.height })}
        />
      ) : null}
      <AzText el={header.subtitle} defaultTag="p" className="az-head-sub" />
    </div>
  );
}

export function cardVars(cs: { background?: string; hoverBackground?: string; border?: string; radius?: string; padding?: string; shadow?: string }) {
  return {
    '--lgy-card-bg': cs.background,
    '--lgy-card-hover-bg': cs.hoverBackground,
    '--lgy-card-border': cs.border,
    '--lgy-card-radius': cs.radius,
    '--lgy-card-pad': cs.padding,
    '--lgy-card-shadow': cs.shadow,
  };
}

export function StatNumber({
  value,
  prefix,
  suffix,
  phase,
  duration,
  className,
  style,
}: {
  value: string;
  prefix?: string;
  suffix?: string;
  phase: CountPhase;
  duration: number;
  className: string;
  style?: ElementStyle;
}) {
  return (
    <div className={className} style={elementCss(style)}>
      <span aria-hidden="true">
        {prefix ? <span className="lgy-affix">{prefix}</span> : null}
        <LzCount value={value} phase={phase} duration={duration} />
        {suffix ? <span className="lgy-affix">{suffix}</span> : null}
      </span>
      <span className="lz-sr">{`${prefix || ''}${value}${suffix || ''}`}</span>
    </div>
  );
}

/** Thin page-scroll progress bar pinned to the top of the viewport. */
export function LgScrollBar({ gradient }: { gradient?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      el.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0})`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);
  return <div ref={ref} aria-hidden="true" className="lgy-scrollbar" style={vars({ background: gradient })} />;
}

/* ------------------------------------------------------------------ */
/* Page hero (slideshow background + animated 20-years ring)           */
/* ------------------------------------------------------------------ */

function LgRing({ badge: b }: { badge: LegacyRingBadge }) {
  const ref = useRef<HTMLDivElement>(null);
  const gradId = `lgy-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const value = String(b.value || '').trim();
  const phase = useCountPhase(ref, b.countUp !== false && Boolean(value));
  return (
    <div
      ref={ref}
      className={`lgy-badge${b.blur === false ? ' lgy-no-blur' : ''}`}
      style={vars({
        background: b.background,
        border: b.border,
        borderRadius: b.radius,
        padding: b.padding,
        '--lgy-ring': b.size,
        '--lgy-ring-m': b.sizeMobile,
        '--lgy-suffix': b.suffixColor,
      })}
    >
      <div className="lgy-ring">
        <svg viewBox="0 0 220 220" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: b.ringFrom?.trim() || 'var(--yellow, #FFC93C)' }} />
              <stop offset="1" style={{ stopColor: b.ringTo?.trim() || 'var(--orange, #FF6B1A)' }} />
            </linearGradient>
          </defs>
          <circle className="lgy-ring-track" cx="110" cy="110" r="100" style={vars({ stroke: b.trackColor, strokeWidth: b.ringWidth })} />
          <circle
            className={`lgy-ring-bar${b.animateRing === false ? '' : ' lgy-ring-anim'}`}
            cx="110"
            cy="110"
            r="100"
            stroke={`url(#${gradId})`}
            style={vars({ strokeWidth: b.ringWidth })}
          />
        </svg>
        <div className="lgy-ring-center">
          {value ? (
            <StatNumber
              className="lgy-ring-num"
              value={value}
              prefix={b.prefix}
              suffix={b.suffix}
              phase={phase}
              duration={Math.max(200, Number(b.countDurationMs) || 1800)}
              style={b.numberStyle}
            />
          ) : null}
          <AzText el={b.label} defaultTag="div" className="lgy-ring-label" />
        </div>
      </div>
      <AzText el={b.span} defaultTag="div" className="lgy-badge-span" />
    </div>
  );
}

export function LegacyHeroSection({ content, sectionKey }: SectionProps) {
  const c = withLegacyDefaults<LegacyHeroContent>('legacy_hero', content);
  const b = c.badge;
  const showBadge = Boolean(b && !b.hidden && (String(b.value || '').trim() || hasText(b.label) || hasText(b.span)));
  const badgeLeft = c.layout?.badgeSide === 'left';
  const cols = c.layout?.columns?.trim() || (badgeLeft ? '0.65fr 1.35fr' : '1.35fr 0.65fr');
  const crumbs = normalizeLinkItems(c.breadcrumb?.items);
  const { color: crumbColor, ...crumbRest } = c.breadcrumb?.style || {};
  const scroll = c.scrollBar || {};
  const place = heroPlacement(c.placement);

  const copy = (
    <HeroSlot place={place} name="text">
    <div className="az-hero-copy lgy-hero-copy">
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
  const badge = showBadge ? (
    <HeroSlot place={place} name="media">
      <LgRing badge={b} />
    </HeroSlot>
  ) : null;

  return (
    <LgShell
      box={c.section}
      bg={c.background}
      className={`az-hero lgy-hero ${heroHeightClass(c.heroHeight)} ${place.rootClass}${c.entrance === false ? '' : ' lgy-enter'}`}
      id={sectionKey || 'top'}
    >
      {!scroll.hidden ? <LgScrollBar gradient={scroll.gradient} /> : null}
      <div
        className={`lgy-hero-grid${badge ? '' : ' lgy-hero-grid--single'}${c.layout?.mobileBadgeFirst ? ' lgy-badge-first' : ''}`}
        style={vars({ '--lgy-cols': badge ? cols : undefined, gap: c.layout?.gap, alignItems: c.layout?.alignItems })}
      >
        {badgeLeft ? (
          <>
            {badge}
            {copy}
          </>
        ) : (
          <>
            {copy}
            {badge}
          </>
        )}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Stat bar                                                            */
/* ------------------------------------------------------------------ */

export function LegacyStatsSection({ content, sectionKey }: SectionProps) {
  const c = withLegacyDefaults<LegacyStatsContent>('legacy_stats', content);
  const items = (c.items || []).filter((s) => s && (String(s.value || '').trim() || String(s.label || '').trim()));
  const animate = c.animateCount !== false;
  const gridRef = useRef<HTMLDivElement>(null);
  const phase = useCountPhase(gridRef, animate);
  if (!items.length) return null;
  const is = c.iconStyle || {};
  const duration = Math.max(200, Number(c.countDurationMs) || 1800);
  return (
    <LgShell box={c.section} className="lgy-stats" id={sectionKey}>
      <div
        ref={gridRef}
        className={`lgy-stat-grid lgy-stat-grid--${c.align || 'center'}${c.hoverLift === false ? ' lgy-no-lift' : ''}${
          c.dividers ? ' lgy-stat-dividers' : ''
        }`}
        style={vars({
          ...colVars(c.columns, { desktop: 4, tablet: 4, mobile: 2 }),
          '--lz-gap': c.gap,
          '--lgy-suffix': c.suffixColor,
          '--lgy-divider': c.dividerColor,
          '--lgy-sicon-size': is.size,
          '--lgy-sicon-color': is.color,
        })}
      >
        {items.map((s, i) => (
          <div className="lgy-stat" key={i}>
            {s.icon && !s.icon.hidden && (s.icon.svg || s.icon.src) ? <AzIcon icon={s.icon} className="lgy-stat-icon" /> : null}
            {String(s.value || '').trim() ? (
              <StatNumber
                className="lgy-stat-num"
                value={String(s.value)}
                prefix={s.prefix}
                suffix={s.suffix}
                phase={phase}
                duration={duration}
                style={c.numberStyle}
              />
            ) : null}
            {s.label ? (
              <div className="lgy-stat-label" style={elementCss(c.labelStyle)}>
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
/* Marquee                                                             */
/* ------------------------------------------------------------------ */

export function LegacyMarqueeSection({ content, sectionKey }: SectionProps) {
  const c = withLegacyDefaults<LegacyMarqueeContent>('legacy_marquee', content);
  const items = normalizeLinkItems(c.items);
  if (!items.length) return null;
  // Each half of the loop must be at least as wide as the screen, so short lists repeat.
  const repeat = Math.max(1, Math.ceil(10 / items.length));
  const half = Array.from({ length: repeat }, () => items).flat();
  const loop = [...half, ...half];
  const { color: itemColor, ...itemRest } = c.itemStyle || {};
  const itemStyle = elementCss(itemRest);
  const sep = c.separator || { type: 'symbol' };
  const speed = Number(c.speedSeconds) > 0 ? Number(c.speedSeconds) : 32;
  const separator =
    sep.type === 'none' ? null : sep.type === 'icon' ? (
      <AzIcon icon={{ color: sep.color, ...sep.icon }} className="lgy-mq-sep lgy-mq-sep--icon" />
    ) : sep.type === 'dot' ? (
      <span aria-hidden="true" className="lgy-mq-sep lgy-mq-sep--dot" />
    ) : (
      <span aria-hidden="true" className="lgy-mq-sep">
        {sep.symbol || '✦'}
      </span>
    );

  return (
    <LgShell
      box={c.section}
      id={sectionKey}
      noContainer
      className={`lgy-marquee lgy-marquee--${c.direction === 'ltr' ? 'ltr' : 'rtl'}${c.pauseOnHover ? ' lgy-marquee--pause' : ''}${
        c.fadeEdges ? ' lgy-marquee--fade' : ''
      }`}
    >
      <div
        className="lgy-marquee-track"
        style={vars({
          '--lgy-mq-duration': `${speed * repeat}s`,
          '--lgy-mq-gap': c.gap,
          '--lgy-mq-color': itemColor,
          '--lgy-mq-hover': c.hoverColor,
          '--lgy-sep-color': sep.color,
          '--lgy-sep-size': sep.size,
        })}
      >
        {loop.map((item, i) => {
          const clone = i >= items.length;
          const inner = (
            <>
              {item.label}
              {separator}
            </>
          );
          return item.href ? (
            <a
              key={i}
              href={appHref(item.href)}
              className="lgy-mq-item"
              style={itemStyle}
              aria-hidden={clone || undefined}
              tabIndex={clone ? -1 : undefined}
            >
              {inner}
            </a>
          ) : (
            <span key={i} className="lgy-mq-item" style={itemStyle} aria-hidden={clone || undefined}>
              {inner}
            </span>
          );
        })}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Story (collage + copy)                                              */
/* ------------------------------------------------------------------ */

function LgCollageFrame({ frame, index, zoom }: { frame: LegacyCollageFrame; index: number; zoom: boolean }) {
  const { items, markFailed } = useOkMedia(frame.items);
  const { index: cur } = useCycle(items.length, (Number(frame.intervalSeconds) || 4) * 1000 + index * 400);
  return (
    <figure
      className={`lgy-frame${zoom ? ' is-zoom' : ''}`}
      style={vars({
        top: frame.top,
        right: frame.right,
        bottom: frame.bottom,
        left: frame.left,
        width: frame.width,
        height: frame.height,
        borderRadius: frame.radius,
        border: frame.border,
        boxShadow: frame.shadow,
        '--lgy-fit': frame.fit,
        '--lgy-pos': frame.position,
      })}
    >
      {items.map((item, i) => (
        <LzMedia key={`${item.src}-${i}`} item={item} onFail={markFailed} className={i === cur ? 'is-on' : ''} />
      ))}
    </figure>
  );
}

export function LegacyStorySection({ content, sectionKey }: SectionProps) {
  const c = withLegacyDefaults<LegacyStoryContent>('legacy_story', content);
  const splitRef = useRef<HTMLDivElement>(null);
  const keepRef = useRef<HTMLDivElement>(null);
  const reveal = c.reveal !== false;
  const seen = useInView(splitRef);
  const keepItems = c.keep?.hidden ? [] : (c.keep?.items || []).filter((k) => k && (k.title || k.body));
  useStaggerReveal(keepRef, '.lgy-keep-item', reveal, keepItems.length);

  const frames = (c.collage?.frames || []).filter((f) => f && !f.hidden && visibleMedia(f.items).length);
  const since = c.since;
  const showSince = since && !since.hidden && (hasText(since.number) || hasText(since.label));
  const showCollage = !c.collage?.hidden && (frames.length > 0 || showSince);
  const collageLeft = c.layout?.imageSide !== 'right';
  const cols = c.layout?.columns?.trim() || (collageLeft ? '0.95fr 1.05fr' : '1.05fr 0.95fr');
  const k = c.keep || { items: [] };

  const collage = showCollage ? (
    <div
      className={`lgy-collage${reveal ? ' lgy-rv' : ''}`}
      style={vars({ '--lgy-collage-h': c.collage?.minHeight, '--lgy-collage-h-m': c.collage?.minHeightMobile })}
    >
      {frames.map((f, i) => (
        <LgCollageFrame key={i} frame={f} index={i} zoom={c.collage?.zoomOnReveal !== false && seen} />
      ))}
      {showSince ? (
        <div
          className={`lgy-since lgy-since--${since.position || 'bottom-left'}${since.float === false ? '' : ' lgy-since--float'}`}
          style={vars({ background: since.background, border: since.border, borderRadius: since.radius })}
        >
          <AzText el={since.number} defaultTag="span" className="lgy-since-num" />
          <AzText el={since.label} defaultTag="span" className="lgy-since-label" />
        </div>
      ) : null}
    </div>
  ) : null;

  const copy = (
    <div className={`lgy-story-copy${reveal ? ' lgy-rv lgy-rv-d1' : ''}`}>
      <AzEyebrow el={c.eyebrow} scale="lg" />
      <LzHeading el={c.title} role="section" className="lgy-story-title" highlight={c.highlight} />
      {(c.paragraphs || []).map((p, i) => (
        <AzText key={i} el={p} defaultTag="p" className="lgy-story-p" style={c.paragraphStyle} />
      ))}
      {keepItems.length ? (
        <div
          ref={keepRef}
          className="lgy-keep"
          style={vars({
            '--lgy-keep-dot': k.dotColor,
            '--lgy-keep-bg': k.background,
            '--lgy-keep-border': k.border,
            '--lgy-keep-radius': k.radius,
          })}
        >
          {keepItems.map((item, i) => (
            <div className="lgy-keep-item" key={i} style={vars({ '--c': item.color })}>
              <i aria-hidden="true" />
              <span>
                {item.title ? <b style={elementCss(k.titleStyle)}>{item.title}</b> : null}
                {item.body ? <span style={elementCss(k.bodyStyle)}>{item.body}</span> : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <AzCtas ctas={c.ctas} />
    </div>
  );

  return (
    <LgShell box={c.section} className="lgy-section lgy-story" id={sectionKey || 'story'}>
      <div
        ref={splitRef}
        className={`lgy-split${collage ? '' : ' lgy-split--single'}${seen ? ' is-in' : ''} ${
          c.layout?.mobileImageFirst === false ? 'lgy-media-last' : 'lgy-media-first'
        }`}
        style={vars({ '--lgy-cols': collage ? cols : undefined, gap: c.layout?.gap, alignItems: c.layout?.alignItems })}
      >
        {collageLeft ? (
          <>
            {collage}
            {copy}
          </>
        ) : (
          <>
            {copy}
            {collage}
          </>
        )}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Journey (animated horizontal timeline)                              */
/* ------------------------------------------------------------------ */

type JourneyPhase = 'move' | 'show' | 'leave';
type JourneyState = { step: number; phase: JourneyPhase; stagger: boolean; nonce: number };

const MOVE_MS = 1400;
const LEAVE_MS = 950;

function yearRange(from?: string, to?: string) {
  const f = String(from || '').trim();
  const t = String(to || '').trim();
  return !t || t === f ? f : `${f} – ${t}`;
}

function LgCardMedia({ items: raw, height }: { items?: LifeMediaItem[]; height?: string }) {
  const { items, markFailed } = useOkMedia(raw);
  const { index } = useCycle(items.length, 3200);
  if (!items.length) return null;
  return (
    <div className="lgy-jr-media" style={vars({ height })}>
      {items.map((item, i) => (
        <LzMedia key={`${item.src}-${i}`} item={item} onFail={markFailed} className={i === index ? 'is-on' : ''} />
      ))}
    </div>
  );
}

export function LegacyJourneySection({ content, sectionKey }: SectionProps) {
  const c = withLegacyDefaults<LegacyJourneyContent>('legacy_journey', content);
  const nodes = (c.milestones || []).filter((m) => m && !m.hidden && (String(m.from || '').trim() || m.title));
  const N = nodes.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef(0);
  const [w, setW] = useState(0);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hover, setHover] = useState(false);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [st, setSt] = useState<JourneyState>({ step: 0, phase: 'show', stagger: false, nonce: 0 });

  const desktopN = clampCols(c.perView?.desktop, 3);
  const mobileN = clampCols(c.perView?.mobile, 1);
  const gs = Math.max(1, Math.min(N || 1, w > 0 && w < 860 ? mobileN : desktopN));
  const steps = Math.max(1, Math.ceil(N / gs));
  const cur = Math.min(st.step, steps - 1);
  const dwell = Math.max(1500, (Number(c.dwellSeconds) || 5.6) * 1000 * (gs === 1 ? 0.82 : 1));
  const paused = (userPaused ?? (c.autoplay === false || reduced)) || hover || !visible;
  const pausedByUser = userPaused ?? (c.autoplay === false || reduced);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') {
      const onResize = () => setW(el.clientWidth);
      const raf = requestAnimationFrame(onResize);
      window.addEventListener('resize', onResize);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
      };
    }
    const ro = new ResizeObserver((entries) => setW(Math.round(entries[0]?.contentRect.width || el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const t = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        setVisible(Boolean(e?.isIntersecting));
        setReduced(prefersReducedMotion());
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    leftRef.current = st.phase === 'move' ? MOVE_MS : st.phase === 'show' ? dwell : LEAVE_MS;
  }, [st.step, st.phase, st.nonce, dwell]);

  useEffect(() => {
    if (paused || N < 1) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      leftRef.current -= 100;
      if (leftRef.current > 0) return;
      setSt((s) => {
        if (s.phase === 'move') return { ...s, phase: 'show', stagger: true };
        if (s.phase === 'show') return { ...s, phase: 'leave' };
        return { step: (Math.min(s.step, steps - 1) + 1) % steps, phase: 'move', stagger: false, nonce: s.nonce };
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [paused, N, steps]);

  const goTo = (step: number) =>
    setSt((s) => ({
      step: ((step % steps) + steps) % steps,
      phase: pausedByUser ? 'show' : 'move',
      stagger: false,
      nonce: s.nonce + 1,
    }));

  const first = cur * gs;
  const last = Math.min(N, first + gs) - 1;
  const S =
    gs === 1
      ? Math.min(240, Math.floor(w / 1.6))
      : Math.min(Number(c.stage?.maxSpacing) || 340, Math.floor((w * 0.84) / gs));
  const cw =
    gs === 1
      ? Math.min(Number(c.card?.maxWidth) || 340, w - 40)
      : Math.max(260, Math.min(Number(c.card?.maxWidth) || 480, 2 * S - 40, w - (gs - 1) * S - 60));
  const tx = w / 2 - (((first + last) / 2) * S + S / 2);
  const range = N ? yearRange(nodes[first]?.from, nodes[last]?.to || nodes[last]?.from) : '';
  const stage = c.stage || {};
  const dot = c.dot || {};
  const card = c.card || {};
  const ctrl = c.controls || {};

  return (
    <LgShell box={c.section} className="lgy-section lgy-journey" id={sectionKey || 'journey'}>
      <LgHeader header={c.header} />
      {N ? (
        <>
          <ol className="lz-sr">
            {nodes.map((m, i) => (
              <li key={i}>
                {yearRange(m.from, m.to)}: {m.title}. {m.body}
              </li>
            ))}
          </ol>
          <div
            ref={stageRef}
            aria-hidden="true"
            className="lgy-jr-stage"
            onMouseEnter={c.pauseOnHover === false ? undefined : () => setHover(true)}
            onMouseLeave={c.pauseOnHover === false ? undefined : () => setHover(false)}
            style={vars({
              '--lgy-jr-h': stage.height,
              '--lgy-jr-h-m': stage.heightMobile,
              background: stage.background,
              border: stage.border,
              borderRadius: stage.radius,
              boxShadow: stage.shadow,
              '--lgy-jr-line': stage.lineColor,
              '--lgy-jr-glow': stage.glowColor,
              '--lgy-dot-s': dot.size,
              '--lgy-dot-bg': dot.background,
              '--lgy-dot-border': dot.border,
              '--lgy-dot-color': dot.color,
              '--lgy-dot-active': dot.activeColor,
              '--lgy-dot-now': dot.nowColor,
              '--lgy-card-bg': card.background,
              '--lgy-card-border': card.border,
              '--lgy-card-radius': card.radius,
              '--lgy-card-pad': card.padding,
              '--lgy-card-shadow': card.shadow,
              '--lgy-card-now': card.nowBackground,
              '--lgy-stem': card.stemColor,
            })}
          >
            {stage.grid !== false ? <div className="lgy-jr-grid" /> : null}
            <div className={`lgy-jr-view${stage.fadeEdges === false ? '' : ' lgy-jr-fade'}`}>
              <div className="lgy-jr-line" />
              {w > 0 ? (
                <>
                  <div className="lgy-jr-glow" style={{ width: `${gs * S}px` }} />
                  <div
                    className="lgy-jr-rail"
                    style={
                      {
                        width: `${N * S}px`,
                        transform: `translateX(${tx}px)`,
                        transitionDuration: cur === 0 && st.phase === 'move' ? '1.9s' : undefined,
                        '--S': `${S}px`,
                        '--cw': `${cw}px`,
                      } as CSSProperties
                    }
                  >
                    {nodes.map((m, i) => {
                      const active = i >= first && i <= last;
                      const show = active && st.phase !== 'move';
                      const leave = active && st.phase === 'leave';
                      return (
                        <JourneyNode
                          key={i}
                          m={m}
                          left={i * S}
                          up={i % 2 === 0}
                          active={active}
                          show={show}
                          leave={leave}
                          delay={st.stagger && active ? (i - first) * 220 : 0}
                          c={c}
                        />
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          </div>
          {!ctrl.hidden ? (
            <div className="lgy-jr-ctrl" style={vars({ '--lgy-ctrl': ctrl.color, '--lgy-ctrl-on': ctrl.activeColor })}>
              <button type="button" className="lgy-jr-btn" aria-label="Previous milestones" onClick={() => goTo(cur - 1)}>
                &larr;
              </button>
              <button
                type="button"
                className="lgy-jr-btn"
                aria-label={pausedByUser ? 'Play timeline' : 'Pause timeline'}
                onClick={() => {
                  const nextPaused = !pausedByUser;
                  setUserPaused(nextPaused);
                  if (nextPaused && st.phase !== 'show') setSt((s) => ({ ...s, phase: 'show', stagger: false }));
                }}
              >
                {pausedByUser ? '▶' : '❚❚'}
              </button>
              <span className="lgy-jr-range" aria-live="polite" style={elementCss(ctrl.rangeStyle)}>
                {range}
              </span>
              {ctrl.pips !== false && steps > 1 ? (
                <div className="lgy-jr-pips">
                  {Array.from({ length: steps }, (_, k) => (
                    <button
                      key={k}
                      type="button"
                      className={k === cur ? 'on' : ''}
                      aria-label={`Go to set ${k + 1}`}
                      aria-pressed={k === cur}
                      onClick={() => goTo(k)}
                    />
                  ))}
                </div>
              ) : null}
              <button type="button" className="lgy-jr-btn" aria-label="Next milestones" onClick={() => goTo(cur + 1)}>
                &rarr;
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </LgShell>
  );
}

function JourneyNode({
  m,
  left,
  up,
  active,
  show,
  leave,
  delay,
  c,
}: {
  m: LegacyMilestone;
  left: number;
  up: boolean;
  active: boolean;
  show: boolean;
  leave: boolean;
  delay: number;
  c: LegacyJourneyContent;
}) {
  const to = String(m.to || '').trim();
  const tags = (m.tags || []).filter((t) => String(t || '').trim());
  return (
    <div
      className={`lgy-jr-node ${up ? 'up' : 'down'}${active ? ' active' : ''}${show ? ' show' : ''}${leave ? ' leave' : ''}${
        m.highlight ? ' now' : ''
      }`}
      style={vars({ left: `${left}px`, '--d': `${delay}ms`, '--c': m.color })}
    >
      <div className="lgy-jr-dot">
        <span className="y1">{m.from}</span>
        {to && to !== String(m.from || '').trim() ? <span className="y2">– {to}</span> : null}
      </div>
      <div className="lgy-jr-stem" />
      <div className="lgy-jr-card">
        {m.media?.length ? <LgCardMedia items={m.media} height={c.card?.mediaHeight} /> : null}
        <div className="lgy-jr-year" style={elementCss(c.yearStyle)}>
          {yearRange(m.from, m.to)}
        </div>
        {m.title ? (
          <h3 className="lgy-jr-title" style={elementCss(c.titleStyle)}>
            {m.title}
          </h3>
        ) : null}
        {m.body ? (
          <p className="lgy-jr-body" style={elementCss(c.bodyStyle)}>
            {m.body}
          </p>
        ) : null}
        {tags.length ? (
          <div className="lgy-jr-tags">
            {tags.map((t, i) => (
              <span key={i} style={elementCss(c.tagStyle)}>
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Values (glass cards over a panning image)                           */
/* ------------------------------------------------------------------ */

export function LegacyValuesSection({ content, sectionKey }: SectionProps) {
  const c = withLegacyDefaults<LegacyValuesContent>('legacy_values', content);
  const cards = c.cards || [];
  const gridRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(gridRef, '.lgy-val', c.reveal !== false, cards.length);
  const cs = c.cardStyle || {};
  const is = c.iconStyle || {};
  return (
    <LgShell box={c.section} bg={c.background} className="lgy-section lgy-values" id={sectionKey || 'values'}>
      <LgHeader header={c.header} />
      <div
        ref={gridRef}
        className={`lgy-grid lgy-val-grid${cs.glass === false ? '' : ' lgy-glass'}${cs.hoverLift === false ? ' lgy-no-lift' : ''}`}
        style={vars({
          ...colVars(c.columns, { desktop: 4, tablet: 2, mobile: 1 }),
          '--lz-gap': c.gap,
          ...cardVars(cs),
          '--lgy-top-w': cs.topBorderWidth,
          '--lgy-ico-box': is.boxSize,
          '--lgy-ico-size': is.size,
          '--lgy-ico-radius': is.radius,
          '--lgy-ico-bg': is.background,
          '--lgy-ico-stroke': is.strokeWidth,
        })}
      >
        {cards.map((card, i) => (
          <article key={i} className="lgy-val" style={vars({ '--c': card.color })}>
            {card.image && !card.image.hidden && card.image.src ? <AzImage image={card.image} className="lgy-card-img" /> : null}
            <AzIcon icon={card.icon} className="lgy-val-ico" />
            <AzText el={card.title} defaultTag="h4" className="lgy-val-title" style={c.titleStyle} />
            <AzText el={card.body} defaultTag="p" className="lgy-val-body" style={c.bodyStyle} />
            {card.link?.label?.trim() ? (
              <a className="lgy-val-link" href={appHref(card.link.href || '#')} style={elementCss(c.linkStyle)}>
                {card.link.label}
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Capabilities (What we do today)                                     */
/* ------------------------------------------------------------------ */

export function LegacyCapsSection({ content, sectionKey }: SectionProps) {
  const c = withLegacyDefaults<LegacyCapsContent>('legacy_caps', content);
  const cards = c.cards || [];
  const gridRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(gridRef, '.lgy-cap', c.reveal !== false, cards.length);
  const cs = c.cardStyle || {};
  return (
    <LgShell box={c.section} className="lgy-section lgy-caps" id={sectionKey || 'today'}>
      <LgHeader header={c.header} />
      <div
        ref={gridRef}
        className={`lgy-grid lgy-cap-grid${cs.hoverLift === false ? ' lgy-no-lift' : ''}${cs.topBar === false ? ' lgy-no-bar' : ''}`}
        style={vars({
          ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }),
          '--lz-gap': c.gap,
          ...cardVars(cs),
          '--lgy-bar-h': cs.barHeight,
        })}
      >
        {cards.map((card, i) => {
          const inner = (
            <>
              {card.image && !card.image.hidden && card.image.src ? <AzImage image={card.image} className="lgy-card-img" /> : null}
              {card.icon && !card.icon.hidden && (card.icon.svg || card.icon.src) ? <AzIcon icon={card.icon} className="lgy-cap-ico" /> : null}
              {card.num ? (
                <span className="lgy-cap-num" style={elementCss(c.numStyle)}>
                  {card.num}
                </span>
              ) : null}
              <AzText el={card.title} defaultTag="h4" className="lgy-cap-title" style={c.titleStyle} />
              <AzText el={card.body} defaultTag="p" className="lgy-cap-body" style={c.bodyStyle} />
              {card.linkLabel?.trim() ? (
                <span className="lgy-cap-go" style={elementCss(c.linkStyle)}>
                  {card.linkLabel}
                </span>
              ) : null}
            </>
          );
          const style = vars({ '--c': card.color });
          return card.href?.trim() ? (
            <a
              key={i}
              className="lgy-cap"
              href={appHref(card.href)}
              style={style}
              target={card.newTab ? '_blank' : undefined}
              rel={card.newTab ? 'noopener noreferrer' : undefined}
            >
              {inner}
            </a>
          ) : (
            <div key={i} className="lgy-cap" style={style}>
              {inner}
            </div>
          );
        })}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* The next twenty years                                               */
/* ------------------------------------------------------------------ */

export function LegacyNextSection({ content, sectionKey }: SectionProps) {
  const c = withLegacyDefaults<LegacyNextContent>('legacy_next', content);
  const items = (c.items || []).filter((it) => it && (it.title || it.body));
  const listRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const reveal = c.reveal !== false;
  const seen = useInView(copyRef, reveal);
  useStaggerReveal(listRef, '.lgy-next-item', reveal, items.length);
  const listLeft = c.layout?.listSide === 'left';
  const is = c.itemStyle || {};
  const ks = c.keyStyle || {};

  const copy = (
    <div ref={copyRef} className={`lgy-next-copy${reveal ? ' lgy-rv' : ''}${seen ? ' is-in' : ''}`}>
      <AzEyebrow el={c.eyebrow} scale="lg" />
      <LzHeading el={c.title} role="section" className="lgy-next-title" highlight={c.highlight} />
      {(c.paragraphs || []).map((p, i) => (
        <AzText key={i} el={p} defaultTag="p" className="lgy-next-p" style={c.paragraphStyle} />
      ))}
      <AzCtas ctas={c.ctas} />
    </div>
  );
  const list = items.length ? (
    <div
      ref={listRef}
      className={`lgy-next-list${is.hoverSlide === false ? ' lgy-no-slide' : ''}${ks.glow === false ? '' : ' lgy-key-glow'}`}
      style={vars({
        ...cardVars(is),
        '--lgy-key-s': ks.size,
        '--lgy-key-bg': ks.background,
        '--lgy-key-border': ks.border,
        '--lgy-key-color': ks.color,
        '--lgy-key-radius': ks.radius,
      })}
    >
      {items.map((it, i) => (
        <div className="lgy-next-item" key={i} style={vars({ '--lgy-key-bg': it.color })}>
          <span className="lgy-next-key" aria-hidden={it.icon?.svg || it.icon?.src ? true : undefined}>
            {it.icon && !it.icon.hidden && (it.icon.svg || it.icon.src) ? <AzIcon icon={it.icon} className="lgy-next-key-ico" /> : it.key}
          </span>
          <span>
            {it.title ? <b style={elementCss(c.titleStyle)}>{it.title}</b> : null}
            {it.body ? (
              <span className="lgy-next-body" style={elementCss(c.bodyStyle)}>
                {it.body}
              </span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <LgShell box={c.section} bg={c.background} className="lgy-section lgy-next" id={sectionKey || 'next'}>
      <div
        className={`lgy-next-grid${list ? '' : ' lgy-next-grid--single'}`}
        style={vars({
          '--lgy-cols': list ? c.layout?.columns : undefined,
          gap: c.layout?.gap,
          alignItems: c.layout?.alignItems,
        })}
      >
        {listLeft ? (
          <>
            {list}
            {copy}
          </>
        ) : (
          <>
            {copy}
            {list}
          </>
        )}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

export function LegacyCtaSection({ content, sectionKey }: SectionProps) {
  const c = withLegacyDefaults<LegacyCtaContent>('legacy_cta', content);
  const align = c.align || 'center';
  return (
    <LgShell box={c.section} className={`lz-cta lz-cta--${align} lgy-cta`} id={sectionKey || 'contact'}>
      <div className="lz-cta-inner" style={vars({ maxWidth: c.maxWidth })}>
        <AzEyebrow el={c.eyebrow} scale="lg" />
        <LzHeading el={c.title} role="section" className="lz-cta-title" highlight={c.highlight} />
        <AzText el={c.body} defaultTag="p" className="lz-cta-body" />
        <AzCtas ctas={c.ctas} className="lz-cta-actions" />
      </div>
    </LgShell>
  );
}

export function renderLegacySection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'legacy_hero':
      return <LegacyHeroSection key={key} {...rest} />;
    case 'legacy_stats':
      return <LegacyStatsSection key={key} {...rest} />;
    case 'legacy_marquee':
      return <LegacyMarqueeSection key={key} {...rest} />;
    case 'legacy_story':
      return <LegacyStorySection key={key} {...rest} />;
    case 'legacy_journey':
      return <LegacyJourneySection key={key} {...rest} />;
    case 'legacy_values':
      return <LegacyValuesSection key={key} {...rest} />;
    case 'legacy_caps':
      return <LegacyCapsSection key={key} {...rest} />;
    case 'legacy_next':
      return <LegacyNextSection key={key} {...rest} />;
    case 'legacy_cta':
      return <LegacyCtaSection key={key} {...rest} />;
    default:
      return null;
  }
}
