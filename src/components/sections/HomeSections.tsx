'use client';

import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode, type TouchEvent } from 'react';
import { appHref } from '@/lib/base-path';
import { fitHeroViewportUnits } from '@/lib/hero-height';
import { useSiteShell } from '@/components/SiteProviders';
import { useSiteCopy } from '@/lib/use-site-copy';
import { headingTagForRole, logoAltText } from '@/lib/site-settings';
import { AzImage, AzText, AzVideo, hasText, vars, withLines } from '@/components/sections/AboutSections';
import { LzMedia, clampCols } from '@/components/sections/LifeSections';
import { LgBackground, StatNumber, useCountPhase, useOkMedia, useSlides } from '@/components/sections/LegacySections';
import {
  EYEBROW_SCALE_VAR,
  elementCss,
  imageCss,
  mediaSrc,
  mergeStyle,
  orbCss,
  sanitizeSvg,
  sectionBoxCss,
  svgMarkup,
  type AboutHeadingRole,
  type ElementStyle,
  type EyebrowEl,
  type EyebrowScale,
  type IconEl,
  type SectionBox,
  type TextEl,
} from '@/lib/about-sections';
import { lifeMediaKind, visibleMedia, type LifeHighlight, type LifeMediaItem } from '@/lib/life-sections';
import type { LegacyBgMedia, LegacyBgMotion } from '@/lib/legacy-sections';
import {
  HOME_ECO_GLYPHS,
  withHomeDefaults,
  type HomeCertContent,
  type HomeColumns,
  type HomeCta,
  type HomeCtaContent,
  type HomeEcoContent,
  type HomeHeader,
  type HomeHeroContent,
  type HomeHeroSlide,
  type HomeIndustriesContent,
  type HomeIndustryItem,
  type HomeLogo,
  type HomePartnersContent,
  type HomeProjectCard,
  type HomeProjectsContent,
  type HomeSplitContent,
  type HomeSplitFeature,
  type HomeStatsContent,
  type HomeTestimonialsContent,
  type HomeTimelineContent,
  type HomeWhyContent,
} from '@/lib/home-sections';
import { indIconFor } from '@/lib/ind-icons';
import type { CatalogItem } from '@/lib/types';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

/* ------------------------------------------------------------------ */
/* Shared building blocks                                              */
/* ------------------------------------------------------------------ */

const PATTERN_CLASS: Record<string, string> = {
  grid: '',
  'grid-fade': ' az-pattern--fade',
  'grid-fade-top': ' az-pattern--fade-top',
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/** Columns for desktop / tablet (≤1080px) / phone (≤760px), matching the homepage breakpoints. */
function colVars(cols: HomeColumns | undefined, fb: Required<HomeColumns>) {
  return {
    '--hm-cols': String(clampCols(cols?.desktop, fb.desktop)),
    '--hm-cols-t': String(clampCols(cols?.tablet, fb.tablet)),
    '--hm-cols-m': String(clampCols(cols?.mobile, fb.mobile)),
  };
}

/**
 * Section shell: keeps the live section class (eco-section, stat-bar…) and layers the admin
 * background (color / gradient / image / video / slideshow / pattern / orbs) underneath.
 */
function HmShell({
  box,
  bg,
  className,
  id,
  children,
  noContainer,
}: {
  box?: SectionBox;
  bg?: LegacyBgMedia;
  className: string;
  id?: string | null;
  children: ReactNode;
  noContainer?: boolean;
}) {
  const pattern = box?.pattern && box.pattern !== 'none' ? box.pattern : null;
  const video = mediaSrc(box?.bgVideo);
  const orbs = box?.orbs || [];
  return (
    <section
      id={id || undefined}
      className={cx('hm-block', box?.tone && `hm-tone-${box.tone}`, orbs.length > 0 && 'hm-clip', className)}
      style={sectionBoxCss(box)}
    >
      {video ? (
        <div aria-hidden="true" className="az-bg-video">
          <AzVideo src={video} poster={mediaSrc(box?.bgImage)} />
          {box?.bgGradient?.trim() ? <span className="az-bg-video-overlay" style={{ background: box.bgGradient }} /> : null}
        </div>
      ) : null}
      <LgBackground bg={bg} />
      {pattern ? (
        <div
          aria-hidden="true"
          className={`az-pattern${PATTERN_CLASS[pattern] ?? ''}`}
          style={vars({ '--az-pattern-color': box?.patternColor, '--az-pattern-size': box?.patternSize })}
        />
      ) : null}
      {orbs.map((orb, i) => (
        <div key={i} aria-hidden="true" className={`az-orb${orb.drift ? ' az-orb--drift' : ''}`} style={orbCss(orb)} />
      ))}
      {noContainer ? (
        <div className="hm-inner">{children}</div>
      ) : (
        <div className="container hm-inner" style={box?.containerMaxWidth ? { maxWidth: box.containerMaxWidth } : undefined}>
          {children}
        </div>
      )}
    </section>
  );
}

function highlightText(text: string, hl?: LifeHighlight): ReactNode {
  const word = hl?.text?.trim();
  return text.split('\n').map((line, i) => {
    let content: ReactNode = line;
    const at = word ? line.indexOf(word) : -1;
    if (word && at >= 0) {
      content = (
        <>
          {line.slice(0, at)}
          <em
            className={`lz-hl${hl?.color?.trim() ? ' lz-hl--solid' : ''}${hl?.animate === false ? '' : ' lz-hl--anim'}`}
            style={vars({ '--lz-hl-gradient': hl?.gradient, '--lz-hl-color': hl?.color })}
          >
            {word}
          </em>
          {line.slice(at + word.length)}
        </>
      );
    }
    return (
      <Fragment key={i}>
        {i > 0 ? <br /> : null}
        {content}
      </Fragment>
    );
  });
}

/**
 * Heading whose tag and size follow Site Settings → Public typography. When the tag equals the site
 * level no inline size is set, so the live stylesheet (and its phone sizes) stays in charge.
 */
function HmHeading({
  el,
  role,
  secondary,
  className,
  highlight,
  base,
}: {
  el?: TextEl;
  role: AboutHeadingRole;
  /** pageHero only: slides after the first render as <h2> with the hero size */
  secondary?: boolean;
  className?: string;
  highlight?: LifeHighlight;
  base?: ElementStyle;
}) {
  const { settings } = useSiteShell();
  const level = headingTagForRole(settings, role);
  if (!hasText(el)) return null;
  const tag = el.tag || (role === 'pageHero' ? (secondary ? 'h2' : 'h1') : level);
  const classes = [className];
  const sizing: ElementStyle = {};
  if (tag !== level) {
    if (tag === 'h1' || tag === 'h2') classes.push(`heading-size-${level}`);
    else sizing.fontSize = `var(--text-${level})`;
  }
  const Tag = tag as 'h2';
  return (
    <Tag className={cx(...classes) || undefined} style={elementCss(mergeStyle(sizing, base, el.style))}>
      {highlightText(String(el.text), highlight)}
    </Tag>
  );
}

/** Uppercase mono eyebrow sized by Site Settings → Public typography eyebrow scales. */
function HmEyebrow({ el, scale, className, base }: { el?: EyebrowEl; scale?: EyebrowScale; className?: string; base?: ElementStyle }) {
  if (!hasText(el)) return null;
  const size = el.size || scale;
  return (
    <div
      className={cx('eyebrow', el.line !== false && 'hm-eyebrow--line', className)}
      style={elementCss(mergeStyle(size ? { fontSize: EYEBROW_SCALE_VAR[size] } : undefined, base, el.style))}
    >
      {withLines(String(el.text))}
    </div>
  );
}

function HmHeader({
  header,
  scale,
  reveal,
  extra,
}: {
  header?: HomeHeader;
  scale: EyebrowScale;
  reveal?: boolean;
  extra?: ReactNode;
}) {
  if (!header || header.hidden) return null;
  if (!hasText(header.eyebrow) && !hasText(header.title) && !hasText(header.subtitle) && !extra) return null;
  return (
    <div
      className={cx('section-head', header.align === 'center' && 'center', header.align === 'right' && 'hm-head-right', reveal && 'reveal')}
      style={vars({ maxWidth: header.maxWidth, marginBottom: header.marginBottom })}
    >
      <HmEyebrow el={header.eyebrow} scale={scale} />
      <HmHeading el={header.title} role="section" highlight={header.highlight} />
      <AzText el={header.subtitle} defaultTag="p" />
      {extra}
    </div>
  );
}

/** Outline / solid SVG (inline markup or uploaded file) sized by its container class. */
function HmGlyph({
  icon,
  className,
  style,
  stroke,
}: {
  icon?: IconEl;
  className: string;
  style?: CSSProperties;
  stroke?: string;
}) {
  if (!icon || icon.hidden) return null;
  const markup = svgMarkup(icon.svg);
  const src = markup ? '' : mediaSrc(icon.src);
  if (!markup && !src) return null;
  const cls = cx('hm-glyph', className, icon.mode === 'fill' && 'hm-glyph--fill');
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cls} src={src} alt="" aria-hidden="true" style={style} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cls}
      style={{ ...style, ...vars({ '--hm-stroke': icon.strokeWidth || stroke }) }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

/** Icon in a colored box (why cards). */
function HmIconBox({ icon }: { icon?: IconEl }) {
  if (!icon || icon.hidden || (!svgMarkup(icon.svg) && !mediaSrc(icon.src))) return null;
  return (
    <div
      className="hm-icon-box"
      style={vars({
        width: icon.boxSize,
        height: icon.boxSize,
        background: icon.background,
        border: icon.border,
        borderRadius: icon.radius,
        color: icon.color,
      })}
    >
      <HmGlyph icon={icon} className="hm-icon-glyph" style={vars({ width: icon.size, height: icon.size })} />
    </div>
  );
}

function ctaClass(c: HomeCta): string {
  if (c.variant === 'accent') return 'slide-cta';
  if (c.variant === 'outline-cyan') return 'btn-certs';
  return cx('btn', `btn-${c.variant || 'primary'}`, c.size === 'sm' && 'btn-sm', c.lift && 'btn-hover-lift');
}

/** Visible buttons; the solution-finder link falls back to case studies when that tool is switched off. */
function useCtaList(ctas?: HomeCta[]): HomeCta[] {
  const copy = useSiteCopy();
  return (ctas || [])
    .filter((c) => c && !c.hidden && String(c.label || '').trim())
    .map((c) =>
      /\/tools\/solution-finder\/?$/.test(String(c.href || '').trim()) && !copy.features.solutionFinderEnabled
        ? { ...c, href: '/projects', label: 'View case studies' }
        : c
    );
}

function HmCta({ cta }: { cta: HomeCta }) {
  return (
    <a
      href={appHref(cta.href || '#')}
      className={ctaClass(cta)}
      style={elementCss(cta.style)}
      {...(cta.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {cta.label}
    </a>
  );
}

function HmCtas({
  ctas,
  className,
  slots,
  ariaLabel,
}: {
  ctas?: HomeCta[];
  className?: string;
  /** Left / center / right slot row (split, timeline) */
  slots?: boolean;
  ariaLabel?: string;
}) {
  const list = useCtaList(ctas);
  if (!list.length) return null;
  if (slots) {
    const groups: Record<'left' | 'center' | 'right', HomeCta[]> = { left: [], center: [], right: [] };
    list.forEach((c) => groups[c.position === 'center' || c.position === 'right' ? c.position : 'left'].push(c));
    return (
      <div className={cx('timeline-ctas', className)} role="group" aria-label={ariaLabel}>
        {(['left', 'center', 'right'] as const).map((slot) => (
          <div key={slot} className={`timeline-ctas-slot timeline-ctas-slot--${slot}`}>
            {groups[slot].map((c, i) => (
              <HmCta key={`${c.label}-${i}`} cta={c} />
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={className}>
      {list.map((c, i) => (
        <HmCta key={`${c.label}-${i}`} cta={c} />
      ))}
    </div>
  );
}

/** One image / video for a background layer (first hero image is fetched with high priority). */
function HmLayerMedia({ item, priority, onFail }: { item: LifeMediaItem; priority?: boolean; onFail: (src: string) => void }) {
  const src = mediaSrc(item.src);
  if (!src) return null;
  if (lifeMediaKind(item) === 'video') return <AzVideo className="lz-media lgy-bg-media" src={src} poster={mediaSrc(item.poster)} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="lz-media lgy-bg-media"
      src={src}
      alt={item.title || ''}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      onError={() => onFail(src)}
    />
  );
}

function HmMediaLayer({
  items: raw,
  scope,
  intervalMs,
  motion,
  motionSeconds,
  position,
  positionMobile,
  priority,
}: {
  items?: LifeMediaItem[];
  scope?: 'desk' | 'mob';
  intervalMs: number;
  motion?: LegacyBgMotion;
  motionSeconds?: number;
  position?: string;
  positionMobile?: string;
  priority?: boolean;
}) {
  const { items, markFailed } = useOkMedia(raw);
  const { index } = useSlides(items.length, intervalMs);
  if (!items.length) return null;
  const m = motion && motion !== 'none' ? motion : 'none';
  return (
    <div className={`lgy-bg-scope${scope ? ` lgy-bg-scope--${scope}` : ''}`}>
      <div
        aria-hidden="true"
        className={`lgy-bg lgy-bg--${m}`}
        style={vars({
          '--lgy-motion': Number(motionSeconds) > 0 ? `${motionSeconds}s` : undefined,
          '--lgy-pos': position,
          '--lgy-pos-m': positionMobile,
        })}
      >
        {items.map((item, i) => (
          <div key={`${item.src}-${i}`} className={`lgy-bg-slide${i === index ? ' is-on' : ''}`}>
            <HmLayerMedia item={item} priority={priority && i === 0} onFail={markFailed} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Cross-fading media inside a framed box (split image, eco visual, manual project cards). */
function HmFadeMedia({ items: raw, intervalSeconds, showDots }: { items?: LifeMediaItem[]; intervalSeconds?: number; showDots?: boolean }) {
  const { items, markFailed } = useOkMedia(raw);
  const { index } = useSlides(items.length, (Number(intervalSeconds) || 4) * 1000);
  return (
    <>
      {items.map((item, i) => (
        <LzMedia key={`${item.src}-${i}`} item={item} className={i === index ? 'is-on' : ''} onFail={markFailed} />
      ))}
      {showDots && items.length > 1 ? (
        <div className="lz-dots" aria-hidden="true">
          {items.map((_, i) => (
            <i key={i} className={i === index ? 'on' : ''} />
          ))}
        </div>
      ) : null}
    </>
  );
}

function useSwipe(onSwipe: (dir: 1 | -1) => void, enabled = true) {
  const startX = useRef<number | null>(null);
  if (!enabled) return {};
  return {
    onTouchStart: (e: TouchEvent) => {
      startX.current = e.touches[0]?.clientX ?? null;
    },
    onTouchEnd: (e: TouchEvent) => {
      if (startX.current === null) return;
      const dx = (e.changedTouches[0]?.clientX ?? startX.current) - startX.current;
      startX.current = null;
      if (Math.abs(dx) > 50) onSwipe(dx < 0 ? 1 : -1);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Hero slider                                                         */
/* ------------------------------------------------------------------ */

function clampDuration(value: unknown, fallback = 6000) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(30000, Math.max(2500, Math.round(n)));
}

function HeroSlideIcon({ slide }: { slide: HomeHeroSlide }) {
  const icon = slide.icon || {};
  const svg = icon.hidden ? '' : String(icon.svg || '').trim();
  if (!svg) return null;
  const style = vars({ stroke: icon.color, opacity: icon.opacity, width: icon.width });
  if (/^<svg[\s>]/i.test(svg)) {
    return <span aria-hidden="true" className="slide-icon hm-slide-icon" style={style} dangerouslySetInnerHTML={{ __html: sanitizeSvg(svg) }} />;
  }
  return (
    <svg
      aria-hidden="true"
      className="slide-icon"
      viewBox={icon.viewBox || '0 0 400 400'}
      fill="none"
      strokeWidth={icon.strokeWidth || '1.6'}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizeSvg(svg) }}
    />
  );
}

function gridOverlayStyle(color?: string): CSSProperties | undefined {
  const c = color?.trim();
  if (!c) return undefined;
  return { backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)` };
}

export function HomeHeroSection({ content, sectionKey }: SectionProps) {
  const c = withHomeDefaults<HomeHeroContent>('home_hero', content);
  const slides = (c.slides || []).filter((s) => s && !s.hidden);
  const count = slides.length;
  const [current, setCurrent] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [paused, setPaused] = useState(false);
  const idx = count ? current % count : 0;
  const durationMs = clampDuration(slides[idx]?.durationMs);
  const autoplay = c.autoplay !== false && count > 1;

  useEffect(() => {
    if (!autoplay || paused) return;
    const t = window.setTimeout(() => setCurrent((p) => (p + 1) % count), durationMs);
    return () => window.clearTimeout(t);
  }, [autoplay, paused, count, idx, durationMs, epoch]);

  const go = (i: number) => {
    if (!count) return;
    setCurrent(((i % count) + count) % count);
    setEpoch((e) => e + 1);
  };
  const swipe = useSwipe((dir) => go(idx + dir), c.swipe !== false && count > 1);

  if (!count) return null;

  const ov = c.overlay || {};
  const dots = c.dots || {};
  const tags = c.tags || {};
  const layout = c.layout || {};
  const mediaInterval = (Number(c.media?.intervalSeconds) || 5) * 1000;
  const { color: tagColor, background: tagBg, border: tagBorder, ...tagRest } = tags.style || {};
  const tagStyle = elementCss(tagRest);

  return (
    <section
      id={sectionKey || 'home'}
      className={cx(
        'hero-slider hm-block hm-hero',
        tags.singleLine && 'hero-slider--tags-single-line',
        dots.position === 'bottom' && 'hm-hero--dots-bottom',
        dots.showOnMobile && 'hm-hero--dots-m',
        !autoplay && 'hm-hero--static',
        paused && 'is-paused'
      )}
      style={{
        ...sectionBoxCss(c.section),
        ...vars({
          '--hm-hero-h': fitHeroViewportUnits(c.height?.desktop),
          '--hm-hero-min': fitHeroViewportUnits(c.height?.minHeight),
          '--hm-hero-min-m': fitHeroViewportUnits(c.height?.mobileMinHeight),
          '--hm-fade': Number(c.fadeMs) > 0 ? `${c.fadeMs}ms` : undefined,
          '--hm-tag-color': tagColor,
          '--hm-tag-bg': tagBg,
          '--hm-tag-border': tagBorder,
          '--hm-tag-hover': tags.hoverColor,
        }),
      }}
      onMouseEnter={c.pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={
        c.pauseOnHover
          ? () => {
              setPaused(false);
              setEpoch((e) => e + 1);
            }
          : undefined
      }
      {...swipe}
    >
      {slides.map((slide, i) => {
        const custom = !slide.theme;
        return (
          <div
            key={i}
            className={cx('slide', slide.theme, i === idx && 'active')}
            data-index={i}
            aria-hidden={i === idx ? undefined : true}
            style={vars({
              '--accent': slide.accent || (custom ? 'var(--orange)' : undefined),
              '--tint-color': slide.tint || (custom ? slide.accent || 'var(--orange)' : undefined),
            })}
          >
            <div className="slide-bg">
              {visibleMedia(slide.mobileMedia).length ? (
                <>
                  <HmMediaLayer
                    items={slide.media}
                    scope="desk"
                    intervalMs={mediaInterval}
                    motion={c.media?.motion}
                    motionSeconds={c.media?.motionSeconds}
                    position={slide.position}
                    positionMobile={slide.positionMobile}
                    priority={i === 0}
                  />
                  <HmMediaLayer
                    items={slide.mobileMedia}
                    scope="mob"
                    intervalMs={mediaInterval}
                    motion={c.media?.motion}
                    motionSeconds={c.media?.motionSeconds}
                    position={slide.position}
                    positionMobile={slide.positionMobile}
                    priority={i === 0}
                  />
                </>
              ) : (
                <HmMediaLayer
                  items={slide.media}
                  intervalMs={mediaInterval}
                  motion={c.media?.motion}
                  motionSeconds={c.media?.motionSeconds}
                  position={slide.position}
                  positionMobile={slide.positionMobile}
                  priority={i === 0}
                />
              )}
              <div className="slide-scrim" style={vars({ background: slide.scrim || ov.scrim })} />
              {ov.grid !== false ? <div className="grid-overlay" style={gridOverlayStyle(ov.gridColor)} /> : null}
              {ov.tint !== false ? <div className="tint" style={vars({ opacity: ov.tintOpacity })} /> : null}
            </div>
            {slide.numeral && !c.numeralStyle?.hidden ? (
              <div className="big-numeral" style={elementCss(c.numeralStyle)}>
                {slide.numeral}
              </div>
            ) : null}
            <HeroSlideIcon slide={slide} />
            <div
              className="container"
              style={vars({
                '--hm-hero-cols': layout.columns,
                '--hm-hero-pb': layout.paddingBottom,
                '--hm-hero-pb-m': layout.paddingBottomMobile,
              })}
            >
              <div className="slide-content" style={vars({ maxWidth: layout.contentMaxWidth })}>
                <HmEyebrow el={slide.eyebrow} scale="base" base={c.eyebrowStyle} />
                <HmHeading el={slide.title} role="pageHero" secondary={i > 0} highlight={slide.highlight} base={c.titleStyle} />
                <AzText el={slide.lead} defaultTag="p" className="lead" style={c.leadStyle} />
                <HmCtas ctas={slide.ctas} className="hm-hero-ctas" />
              </div>
              {!tags.hidden ? (
                <div className="tag-dock">
                  {(slide.tags || [])
                    .filter((t) => t && String(t.label || '').trim())
                    .map((t, ti) =>
                      t.href ? (
                        <a key={`${t.label}-${ti}`} className="tag-pill" href={appHref(t.href)} style={tagStyle}>
                          {t.label}
                        </a>
                      ) : (
                        <span key={`${t.label}-${ti}`} className="tag-pill" style={tagStyle}>
                          {t.label}
                        </span>
                      )
                    )}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      {!dots.hidden && count > 1 ? (
        <div className="dot-nav" style={vars({ '--hm-dot': dots.color, '--hm-dot-on': dots.activeColor })}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === idx ? 'active' : ''}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === idx ? 'true' : undefined}
            >
              <span
                key={`${i}-${idx}-${epoch}`}
                className={cx('fill', i === idx && autoplay && 'run')}
                style={i === idx ? vars({ '--slide-duration': `${durationMs}ms` }) : undefined}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ecosystem intro                                                     */
/* ------------------------------------------------------------------ */

const ECO_POS_6: Array<[number, number]> = [
  [250, 70],
  [400, 165],
  [400, 335],
  [250, 410],
  [100, 335],
  [100, 165],
];
const ECO_LABEL_SIZE_6 = [11, 11, 11, 11, 10.5, 10.5];

function ecoPositions(n: number): Array<[number, number]> {
  if (n === 6) return ECO_POS_6;
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [Math.round(250 + 172 * Math.cos(a)), Math.round(250 + 172 * Math.sin(a))] as [number, number];
  });
}

function svgInner(svg?: string): string {
  const raw = sanitizeSvg(String(svg || '').trim());
  const m = raw.match(/^<svg[^>]*>([\s\S]*)<\/svg>\s*$/i);
  return m ? m[1] : raw;
}

function EcoDiagram({ c }: { c: HomeEcoContent }) {
  const { settings } = useSiteShell();
  const d = c.visual.diagram;
  const nodes = (d.nodes || []).filter((n) => n && !n.hidden);
  const pos = ecoPositions(nodes.length);
  const logo = mediaSrc(d.hubLogo);
  return (
    <svg viewBox="0 0 500 500" width="100%" height="100%" aria-hidden="true" className={d.animate === false ? 'hm-eco-still' : undefined}>
      {nodes.map((n, i) => (
        <path
          key={`flow-${i}`}
          className="eco-flow"
          d={`M250 250 L${pos[i][0]} ${pos[i][1]}`}
          stroke={n.color || 'var(--cyan)'}
          strokeWidth="1.6"
          style={{ animationDelay: `${(i * 0.3).toFixed(1)}s` }}
        />
      ))}
      <g className="eco-hub-ring">
        <circle cx="250" cy="250" r="70" fill="none" stroke={d.ringColor || 'rgba(255,255,255,0.15)'} strokeDasharray="2 8" />
      </g>
      <circle cx="250" cy="250" r="52" fill={d.hubFill || 'var(--navy-900)'} stroke="var(--white)" strokeOpacity="0.25" />
      {logo ? (
        <foreignObject x="212" y="212" width="76" height="76">
          <div className="logo-chip-circle">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} className="img-cover-circle" alt={d.hubLogoAlt || logoAltText(settings)} />
          </div>
        </foreignObject>
      ) : null}
      {nodes.map((n, i) => {
        const [x, y] = pos[i];
        const color = n.color || 'var(--cyan)';
        const glyph = HOME_ECO_GLYPHS.find((g) => g.key === n.glyph);
        const custom = String(n.svg || '').trim();
        return (
          <g key={`node-${i}`} className="eco-node eco-pulse" style={{ animationDelay: `${(i * 0.3).toFixed(1)}s` }}>
            <circle cx={x} cy={y} r="30" fill={d.nodeFill || 'var(--navy-900)'} stroke={color} strokeWidth="1.6" />
            {custom ? (
              <svg
                x={x - 12}
                y={y - 12}
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: svgInner(custom) }}
              />
            ) : glyph ? (
              <g transform={`translate(${x} ${y})`} stroke={color} dangerouslySetInnerHTML={{ __html: glyph.markup }} />
            ) : null}
            <text
              x={x}
              y={y + 45}
              textAnchor="middle"
              fontSize={nodes.length === 6 ? ECO_LABEL_SIZE_6[i] : 11}
              fill={d.labelColor || '#B7C2D6'}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function EcoVisual({ c }: { c: HomeEcoContent }) {
  const v = c.visual;
  const media = v.mode === 'media' && visibleMedia(v.media).length > 0;
  const { wrap, img } = imageCss({ src: '', ...(v.mediaFrame || {}) });
  return (
    <div
      className={cx('eco-visual', v.frame === false && 'hm-noframe')}
      style={vars({
        '--hm-vis-max': v.maxWidth,
        '--hm-vis-max-m': v.maxWidthMobile,
        aspectRatio: media && v.mediaFrame?.aspectRatio?.trim() ? 'auto' : undefined,
      })}
    >
      {media ? (
        <div
          className="hm-eco-media lz-fade"
          style={{ ...wrap, ...vars({ '--lz-fit': img.objectFit as string, '--lz-pos': img.objectPosition as string }) }}
        >
          <HmFadeMedia items={v.media} intervalSeconds={v.intervalSeconds} showDots={v.showDots !== false} />
          {v.mediaFrame?.overlay?.trim() ? <span aria-hidden="true" className="az-img-overlay" style={{ background: v.mediaFrame.overlay }} /> : null}
        </div>
      ) : (
        <EcoDiagram c={c} />
      )}
    </div>
  );
}

export function HomeEcoSection({ content, sectionKey }: SectionProps) {
  const c = withHomeDefaults<HomeEcoContent>('home_eco', content);
  const left = c.layout?.imageSide !== 'right';
  const showVisual = !c.visual?.hidden;
  const groups = (c.groups || []).filter((g) => g && !g.hidden && (g.items || []).some((it) => String(it).trim()));
  const ck = c.checklist || {};
  const cols = clampCols(ck.columns, 2);
  const trust = (c.trust?.items || []).filter((t) => t && (String(t.badge || '').trim() || String(t.label || '').trim()));

  const visual = showVisual ? <EcoVisual c={c} /> : null;
  const text = (
    <div className="eco-text">
      <HmEyebrow el={c.eyebrow} scale="md" />
      <HmHeading el={c.title} role="section" highlight={c.highlight} />
      <AzText el={c.body} defaultTag="p" />
      {!ck.hidden && groups.length ? (
        <div
          className={cx('cap-checklist hm-caps', ck.flow !== 'row' && 'hm-caps--col', ck.hoverColor === false && 'hm-caps--nohover')}
          style={vars({
            '--hm-cap-cols': String(cols),
            '--hm-cap-cols-m': String(clampCols(ck.columnsMobile, 1)),
            '--hm-cap-rows': String(Math.ceil(groups.length / cols)),
            '--hm-cap-dot': ck.dotSize,
            gap: ck.gap,
          })}
        >
          {groups.map((g, gi) => (
            <div key={gi} className="cap-group" style={vars({ '--hm-cap-c': g.color, '--hm-cap-order': Number.isFinite(g.order) ? g.order : undefined })}>
              {g.items
                .filter((it) => String(it).trim())
                .map((it, ii) => (
                  <div key={`${it}-${ii}`} className="cap-check" style={elementCss(ck.itemStyle)}>
                    <span className="dot" style={vars({ background: g.color })} />
                    {it}
                  </div>
                ))}
            </div>
          ))}
        </div>
      ) : null}
      {!c.trust?.hidden && trust.length ? (
        <div className="mini-trust">
          {trust.map((t, i) => (
            <div key={i} className="mstat">
              {String(t.badge || '').trim() ? (
                <span className="badge-iso" style={vars({ color: t.color, borderColor: t.color })}>
                  {t.badge}
                </span>
              ) : null}
              {String(t.label || '').trim() ? <div className="lbl mt-04">{t.label}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
      <HmCtas ctas={c.ctas} className="hm-ctas" />
    </div>
  );

  return (
    <HmShell box={c.section} bg={c.background} className="eco-section hm-eco" id={sectionKey}>
      <div
        className={cx(
          'eco-grid',
          !visual && 'hm-single',
          c.layout?.mobileImageFirst === false ? 'hm-text-first' : 'hm-img-first'
        )}
        style={vars({
          '--hm-cols-d': c.layout?.columns?.trim() || (left ? '1fr 1.05fr' : '1.05fr 1fr'),
          '--hm-gap': c.layout?.gap,
          alignItems: c.layout?.alignItems,
        })}
      >
        {left ? (
          <>
            {visual}
            {text}
          </>
        ) : (
          <>
            {text}
            {visual}
          </>
        )}
      </div>
    </HmShell>
  );
}

/* ------------------------------------------------------------------ */
/* Stat bar                                                            */
/* ------------------------------------------------------------------ */

function StatIcon({ icon }: { icon?: IconEl }) {
  if (!icon || icon.hidden) return null;
  const markup = svgMarkup(icon.svg);
  const src = markup ? '' : mediaSrc(icon.src);
  if (!markup && !src) return null;
  const style = vars({ '--hm-icon-color': icon.color, '--hm-icon-size': icon.size, '--hm-stroke': icon.strokeWidth });
  const cls = cx('stat-icon', icon.mode === 'fill' && 'hm-glyph--fill');
  if (src) {
    return (
      <div className={cls} aria-hidden="true" style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" />
      </div>
    );
  }
  return <div className={cls} aria-hidden="true" style={style} dangerouslySetInnerHTML={{ __html: markup }} />;
}

export function HomeStatsSection({ content, sectionKey }: SectionProps) {
  const c = withHomeDefaults<HomeStatsContent>('home_stats', content);
  const ref = useRef<HTMLDivElement>(null);
  const phase = useCountPhase(ref, c.animateCount !== false);
  const items = (c.items || []).filter((s) => s && !s.hidden && (String(s.value || '').trim() || String(s.label || '').trim()));
  const is = c.iconStyle || {};
  return (
    <HmShell box={c.section} bg={c.background} className={cx('stat-bar hm-stats', c.hoverLift === false && 'hm-nolift')} id={sectionKey}>
      <div
        ref={ref}
        className="stat-grid"
        style={vars({
          ...colVars(c.columns, { desktop: 6, tablet: 3, mobile: 2 }),
          gap: c.gap,
          '--lgy-suffix': c.suffixColor,
          '--hm-icon-size': is.size,
          '--hm-icon-color': is.color,
          '--hm-icon-hover': is.hoverColor,
          '--hm-icon-op': is.opacity,
          '--hm-stroke': is.strokeWidth,
        })}
      >
        {items.map((s, i) => (
          <div className="stat" key={`${s.label}-${i}`}>
            {!is.hidden ? <StatIcon icon={s.icon} /> : null}
            <StatNumber
              className="num"
              value={String(s.value || '')}
              prefix={s.prefix}
              suffix={s.suffix}
              phase={phase}
              duration={Math.max(200, Number(c.countDurationMs) || 1400)}
              style={c.numberStyle}
            />
            {String(s.label || '').trim() ? (
              <div className="label" style={elementCss(c.labelStyle)}>
                {s.label}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </HmShell>
  );
}

/* ------------------------------------------------------------------ */
/* Why Zigma cards                                                     */
/* ------------------------------------------------------------------ */

export function HomeWhySection({ content, sectionKey }: SectionProps) {
  const c = withHomeDefaults<HomeWhyContent>('home_why', content);
  const cs = c.cardStyle || {};
  const ol = c.outline || {};
  const reveal = c.reveal !== false;
  const cards = (c.cards || []).filter((card) => card && !card.hidden);
  return (
    <HmShell box={c.section} bg={c.background} className="section section-light why-section hm-why" id={sectionKey || 'why'}>
      <HmHeader header={c.header} scale="lg" reveal={reveal} />
      <div
        className="why-grid"
        style={vars({
          ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }),
          gap: c.gap,
          '--hm-outline': ol.color,
          '--hm-outline-speed': Number(ol.speedSeconds) > 0 ? `${ol.speedSeconds}s` : undefined,
          '--hm-title-hover': cs.hoverTitleColor,
          '--hm-card-hover-bg': cs.hoverBackground,
        })}
      >
        {cards.map((card, i) => (
          <div
            key={`${card.index}-${i}`}
            className={cx(
              'why-card',
              ol.animate !== false && 'is-animated',
              reveal && 'reveal',
              cs.hoverBackground?.trim() && 'hm-hover-bg',
              cs.hoverLift && 'hm-lift'
            )}
            style={vars({
              background: card.background || cs.background,
              border: cs.border,
              borderRadius: cs.radius,
              padding: cs.padding,
              boxShadow: cs.shadow,
            })}
          >
            {!ol.hidden ? (
              <svg className="card-outline" width="100%" height="100%" aria-hidden="true">
                <rect className="outline-base" x="0" y="0" width="100%" height="100%" rx="10" pathLength="100" />
                <rect className="outline-highlight" x="0" y="0" width="100%" height="100%" rx="10" pathLength="100" />
              </svg>
            ) : null}
            {card.image && !card.image.hidden && card.image.src ? <AzImage image={card.image} className="hm-card-img" /> : null}
            <HmIconBox icon={card.icon} />
            {String(card.index || '').trim() ? (
              <div className="why-index" style={elementCss(c.indexStyle)}>
                {card.index}
              </div>
            ) : null}
            <AzText el={card.title} defaultTag="h4" style={c.titleStyle} />
            <AzText el={card.body} defaultTag="p" style={c.bodyStyle} />
          </div>
        ))}
      </div>
    </HmShell>
  );
}

/* ------------------------------------------------------------------ */
/* Split service sections (generate / protect / bess / …)              */
/* ------------------------------------------------------------------ */

function SplitFeature({ f, c }: { f: HomeSplitFeature; c: HomeSplitContent }) {
  const fis = c.featIconStyle || {};
  const cs = c.featCardStyle || {};
  const icon = f.icon || {};
  return (
    <div
      className={cx('feat-card', cs.hoverLift === false && 'hm-nolift', cs.hoverBackground?.trim() && 'hm-hover-bg')}
      style={vars({
        background: f.background || cs.background,
        border: cs.border,
        borderRadius: cs.radius,
        padding: cs.padding,
        boxShadow: cs.shadow,
        '--hm-card-hover-bg': cs.hoverBackground,
      })}
    >
      {!fis.hidden && !icon.hidden ? (
        <div
          className="feat-icon-wrap"
          style={vars({
            width: icon.boxSize || fis.boxSize,
            height: icon.boxSize || fis.boxSize,
            background: icon.background || fis.background,
            borderRadius: icon.radius || fis.radius,
            border: icon.border,
          })}
        >
          <HmGlyph
            icon={icon}
            className="feat-icon"
            stroke={fis.strokeWidth || '1.6'}
            style={vars({ width: icon.size || fis.size, height: icon.size || fis.size, color: icon.color || fis.color })}
          />
        </div>
      ) : null}
      <AzText el={f.title} defaultTag="h5" style={c.featTitleStyle} />
      <AzText el={f.body} defaultTag="p" style={c.featBodyStyle} />
    </div>
  );
}

function SplitMedia({ c, reveal }: { c: HomeSplitContent; reveal: boolean }) {
  const f = c.media?.frame || {};
  const { wrap, img } = imageCss({ src: '', ...f });
  const first = visibleMedia(c.media?.items)[0];
  const sizer = first && lifeMediaKind(first) === 'image' && !f.aspectRatio?.trim() ? mediaSrc(first.src) : '';
  return (
    <div
      className={cx('split-img-wrap hm-split-media lz-fade', reveal && 'reveal')}
      style={{
        ...wrap,
        ...vars({
          '--lz-fit': img.objectFit as string,
          '--lz-pos': img.objectPosition as string,
          '--hm-min-h-m': f.minHeightMobile,
          '--hm-max-h-m': f.maxHeightMobile,
        }),
      }}
    >
      {/* In-flow copy of the first image so the stacked (tablet / phone) box takes the image's own height. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {sizer ? <img className="hm-sizer" src={sizer} alt="" aria-hidden="true" /> : null}
      <HmFadeMedia items={c.media?.items} intervalSeconds={c.media?.intervalSeconds} showDots={c.media?.showDots !== false} />
      {f.overlay?.trim() ? <span aria-hidden="true" className="az-img-overlay" style={{ background: f.overlay }} /> : null}
    </div>
  );
}

export function HomeSplitSection({ content, sectionKey }: SectionProps) {
  const c = withHomeDefaults<HomeSplitContent>('home_split', content);
  const left = c.layout?.imageSide !== 'right';
  const reveal = c.reveal !== false;
  const showMedia = !c.media?.hidden && visibleMedia(c.media?.items).length > 0;
  const feats = (c.features || []).filter((f) => f && !f.hidden);
  const imageBlock = showMedia ? <SplitMedia c={c} reveal={reveal} /> : null;
  const contentBlock = (
    <div className={cx('split-content', reveal && 'reveal')}>
      <HmEyebrow el={c.eyebrow} scale="lg" />
      <HmHeading el={c.title} role="section" highlight={c.highlight} />
      <AzText el={c.body} defaultTag="p" className="split-desc" />
      {feats.length ? (
        <div className="split-feat-grid" style={vars({ ...colVars(c.featColumns, { desktop: 2, tablet: 2, mobile: 1 }), gap: c.featGap })}>
          {feats.map((f, i) => (
            <SplitFeature key={i} f={f} c={c} />
          ))}
        </div>
      ) : null}
      <HmCtas ctas={c.ctas} slots className="mt-2" ariaLabel="Section actions" />
    </div>
  );
  return (
    <HmShell box={c.section} bg={c.background} className="section split-section section-light hm-split" id={sectionKey}>
      <div
        className={cx(
          'split-layout',
          left ? 'img-left' : 'img-right',
          !showMedia && 'hm-single',
          c.layout?.mobileImageFirst === false && 'hm-text-first'
        )}
        style={vars({ '--hm-cols-d': c.layout?.columns?.trim(), '--hm-gap': c.layout?.gap, alignItems: c.layout?.alignItems })}
      >
        {left ? imageBlock : null}
        {contentBlock}
        {!left ? imageBlock : null}
      </div>
    </HmShell>
  );
}

/* ------------------------------------------------------------------ */
/* Legacy timeline (travelling runner dot)                             */
/* ------------------------------------------------------------------ */

function splitColor(style?: ElementStyle): { color?: string; rest: ElementStyle } {
  const { color, ...rest } = style || {};
  return { color, rest };
}

export function HomeTimelineSection({ content, sectionKey }: SectionProps) {
  const c = withHomeDefaults<HomeTimelineContent>('home_timeline', content);
  const items = (c.items || []).filter((it) => it && !it.hidden);
  const runnerOn = !c.runner?.hidden;
  const moveMs = Math.max(200, Number(c.runner?.moveMs) || 950);
  const holdMs = Math.max(200, Number(c.runner?.holdMs) || 950);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const activeIdxRef = useRef<number | null>(null);
  const stopKey = items.map((it) => (it.next ? 'n' : 's')).join('');

  useEffect(() => {
    const scroller = scrollerRef.current;
    const runner = runnerRef.current;
    if (!runnerOn || !scroller || !runner) return;
    const stops = stopKey
      .split('')
      .map((k, i) => ({ k, i }))
      .filter(({ k }) => k === 's')
      .map(({ i }) => i);
    if (!stops.length) return;

    let cancelled = false;
    let running = false;
    const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
    const highlight = (idx: number | null) => {
      activeIdxRef.current = idx;
      setActiveIdx(idx);
    };
    const place = (itemEl: HTMLElement, instant: boolean) => {
      const dot = itemEl.querySelector('.timeline-dot') as HTMLElement | null;
      if (!dot) return;
      const d = dot.getBoundingClientRect();
      const s = scroller.getBoundingClientRect();
      if (instant) runner.style.transition = 'none';
      runner.style.left = `${d.left - s.left + scroller.scrollLeft + d.width / 2 - runner.offsetWidth / 2}px`;
      runner.style.top = `${d.top - s.top + d.height / 2 - runner.offsetHeight / 2}px`;
      if (instant) {
        void runner.offsetWidth;
        runner.style.transition = '';
      }
    };

    async function run() {
      if (running || cancelled || !runner) return;
      running = true;
      const first = itemRefs.current[stops[0]];
      if (!first) return;
      place(first, true);
      runner.style.opacity = '1';
      await wait(700);
      while (!cancelled) {
        for (const idx of stops) {
          if (cancelled) return;
          const el = itemRefs.current[idx];
          if (!el) continue;
          place(el, false);
          await wait(moveMs);
          if (cancelled) return;
          highlight(idx);
          await wait(holdMs);
        }
        if (cancelled) return;
        highlight(null);
        runner.style.opacity = '0';
        await wait(450);
        if (cancelled) return;
        const restart = itemRefs.current[stops[0]];
        if (restart) place(restart, true);
        await wait(150);
        if (cancelled) return;
        runner.style.opacity = '1';
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void run();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(scroller);
    const onResize = () => {
      const el = itemRefs.current[activeIdxRef.current ?? stops[0]];
      if (el) place(el, true);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [runnerOn, stopKey, moveMs, holdMs]);

  const year = splitColor(c.yearStyle);
  const title = splitColor(c.titleStyle);
  const body = splitColor(c.bodyStyle);
  const colors = c.colors || {};

  return (
    <HmShell box={c.section} bg={c.background} className="section section-dark hm-timeline" id={sectionKey || 'legacy'}>
      <HmHeader header={c.header} scale="base" />
      <div
        className="timeline-scroller"
        ref={scrollerRef}
        style={vars({
          '--hm-tl-line': colors.line,
          '--hm-tl-dot': colors.dot,
          '--hm-tl-now': colors.now,
          '--hm-tl-active': colors.active,
          '--hm-tl-runner': c.runner?.color,
          '--hm-tl-year': year.color || colors.year,
          '--hm-tl-title': title.color,
          '--hm-tl-body': body.color,
          '--hm-tl-w': c.itemMinWidth,
          '--hm-tl-w-m': c.itemMinWidthMobile,
        })}
      >
        {runnerOn ? <div className="timeline-runner" ref={runnerRef} /> : null}
        {items.map((item, i) => (
          <div
            key={`${item.year}-${item.title}-${i}`}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className={cx('timeline-item', item.now && 'now', item.next && 'next-item', activeIdx === i && 'tl-active')}
          >
            <div className="timeline-dot" />
            {item.year ? (
              <div className="timeline-year" style={elementCss(year.rest)}>
                {item.year}
              </div>
            ) : null}
            {item.title ? <h5 style={elementCss(title.rest)}>{item.title}</h5> : null}
            {item.body ? <p style={elementCss(body.rest)}>{withLines(item.body)}</p> : null}
          </div>
        ))}
      </div>
      <HmCtas ctas={c.ctas} slots className="mt-2" ariaLabel="Legacy section actions" />
    </HmShell>
  );
}

/* ------------------------------------------------------------------ */
/* Featured projects / case studies                                    */
/* ------------------------------------------------------------------ */

function projectHighlight(item: CatalogItem): string | null {
  const s = item.specs_json;
  if (!s) return null;
  if (s.Highlight) return s.Highlight;
  if (s.Stat) return s.Stat;
  if (s.Uptime) return s.Uptime;
  if (s.Savings) return /year/i.test(s.Savings) ? s.Savings : `${s.Savings}, year one`;
  if (s['Grid dependency'] && s.Payback) {
    const pay = String(s.Payback).replace(/\s*years?/i, '-yr');
    return `${s['Grid dependency']} grid dependency · ${pay} payback`;
  }
  const vals = Object.values(s).filter(Boolean);
  return vals.length ? vals.slice(0, 2).join(' · ') : null;
}

function scopePreview(scope: string | undefined | null) {
  if (!scope) return null;
  const s = String(scope).replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.length > 90 ? `${s.slice(0, 88)}…` : s;
}

type ProjectCardView = {
  key: string;
  href: string;
  media: ReactNode;
  eyebrow: string;
  title: string;
  scope?: string | null;
  outcomes?: [string | null, string | null];
  stat?: string | null;
  body?: string | null;
  bodyClass?: string;
};

function ManualCardMedia({ card, intervalSeconds }: { card: HomeProjectCard; intervalSeconds?: number }) {
  return (
    <div className="hub-card-media lz-fade">
      <HmFadeMedia items={card.media} intervalSeconds={intervalSeconds} />
    </div>
  );
}

export function HomeProjectsSection({ content, sectionKey }: SectionProps) {
  const c = withHomeDefaults<HomeProjectsContent>('home_projects', content);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const limit = Math.max(1, Number(c.limit) || 3);
  const source = c.source;
  const isCase = source === 'case_studies';
  const featuredOnly = c.featuredOnly !== false;

  useEffect(() => {
    if (source === 'manual') return;
    let cancelled = false;
    const featured = featuredOnly ? '&featured=1' : '';
    const fetchLimit = isCase ? Math.max(6, limit * 4) : limit;
    const pick = (list: CatalogItem[]) => (isCase ? list.filter((i) => i.case_study_json && i.case_study_json.enabled !== false) : list);
    fetch(`/api/public/catalog/project?limit=${fetchLimit}${featured}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) return;
        let list = pick((data.items || []) as CatalogItem[]);
        if (!list.length) {
          const all = await fetch(`/api/public/catalog/project?limit=${fetchLimit}${featured}`).then((x) => x.json());
          list = pick((all.items || []) as CatalogItem[]);
        }
        if (!cancelled) setItems(list.slice(0, limit));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [limit, featuredOnly, source, isCase]);

  const card = c.card || {};
  const linkLabel = String(c.linkLabel ?? '').trim();
  const views: ProjectCardView[] =
    source === 'manual'
      ? (c.items || [])
          .filter((p) => p && !p.hidden && String(p.title || '').trim())
          .map((p, i) => ({
            key: `m-${i}`,
            href: appHref(p.href || '#'),
            media: <ManualCardMedia card={p} intervalSeconds={card.intervalSeconds} />,
            eyebrow: p.eyebrow || '',
            title: p.title,
            stat: p.stat || null,
            body: p.body || null,
          }))
      : items.map((item) => {
          const cs = item.case_study_json;
          return {
            key: String(item.id),
            href: appHref(`/projects/${encodeURIComponent(item.slug)}`),
            media: (
              <div className="hub-card-media">
                {item.primary_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.primary_image} alt={item.title} loading="lazy" />
                ) : null}
              </div>
            ),
            eyebrow: (isCase ? cs?.client_sector || cs?.client_name : null) || item.category_name || 'PROJECT',
            title: item.title,
            scope: isCase ? scopePreview(cs?.scope) : null,
            outcomes: isCase ? [cs?.outcomes?.[0] || null, cs?.outcomes?.[1] || null] : undefined,
            stat: isCase ? null : projectHighlight(item),
            body: isCase ? scopePreview(cs?.solution) || item.summary : item.summary,
            bodyClass: isCase ? 'projects-teaser-solution' : undefined,
          };
        });

  return (
    <HmShell
      box={c.section}
      bg={c.background}
      className={cx('section section-light projects-teaser hm-projects', isCase && 'projects-teaser--case')}
      id={sectionKey || 'projects'}
    >
      <HmHeader header={c.header} scale="base" />
      <div className="proj-grid projects-teaser-grid" style={vars({ ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }), gap: c.gap })}>
        {views.map((v) => (
          <a
            key={v.key}
            href={v.href}
            className={cx('hub-card projects-teaser-card', isCase && 'projects-teaser-card--case')}
            style={vars({
              minHeight: card.minHeight,
              borderRadius: card.radius,
              border: card.border,
              background: card.background,
              boxShadow: card.shadow,
              '--hm-card-hover-border': card.hoverBorderColor,
              '--hm-min-h-m': card.minHeightMobile,
              '--hm-overlay': card.overlay,
            })}
          >
            {v.media}
            <div className="hub-card-body">
              {v.eyebrow ? (
                <div className="eyebrow" style={elementCss(c.eyebrowStyle)}>
                  {v.eyebrow}
                </div>
              ) : null}
              <h5 style={elementCss(c.titleStyle)}>{v.title}</h5>
              {v.scope ? <div className="projects-teaser-scope">{v.scope}</div> : null}
              {v.outcomes && (v.outcomes[0] || v.outcomes[1]) ? (
                <div className="proj-stat proj-stat--case" style={elementCss(c.statStyle)}>
                  <div className="proj-stat-line proj-stat-line--primary">{v.outcomes[0]}</div>
                  {v.outcomes[1] ? <div className="proj-stat-line proj-stat-line--secondary">{v.outcomes[1]}</div> : null}
                </div>
              ) : v.stat ? (
                <div className="proj-stat" style={elementCss(c.statStyle)}>
                  {v.stat}
                </div>
              ) : null}
              {v.body ? (
                <p className={v.bodyClass} style={elementCss(c.bodyStyle)}>
                  {v.body}
                </p>
              ) : null}
              {linkLabel ? (
                <span className="hub-card-link" style={elementCss(c.linkStyle)}>
                  {linkLabel}
                </span>
              ) : null}
            </div>
          </a>
        ))}
      </div>
      <HmCtas ctas={c.ctas} className="hm-ctas hm-ctas--center mt-26" />
    </HmShell>
  );
}

/* ------------------------------------------------------------------ */
/* Industries (marquee or grid)                                        */
/* ------------------------------------------------------------------ */

function industryHrefForLabel(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('health') || l.includes('hospital')) return '/industries/healthcare';
  if (l.includes('data center') || l.includes('data centre') || l.includes('digital infrastructure')) return '/industries/data-centres';
  if (l.includes('manufactur') || l.includes('automotive') || l.includes('industrial') || l.includes('oil')) return '/industries/manufacturing';
  if (l.includes('bank') || l.includes('financial')) return '/industries/banking';
  if (l.includes('educat') || l.includes('campus')) return '/industries/education';
  if (l.includes('airport') || l.includes('metro')) return '/industries/airports';
  return '/industries';
}

function IndustryItem({
  item,
  href,
  c,
  clone,
}: {
  item: HomeIndustryItem;
  href: string | null;
  c: HomeIndustriesContent;
  clone?: boolean;
}) {
  const icon: IconEl = item.icon?.svg?.trim() || item.icon?.src?.trim() ? item.icon : { ...(item.icon || {}), svg: indIconFor(item.label) };
  const inner = (
    <>
      {!c.iconStyle?.hidden ? (
        <HmGlyph icon={icon} className="ind-icon" stroke={c.iconStyle?.strokeWidth || '1.6'} style={vars({ color: icon.color })} />
      ) : null}
      <span style={elementCss(c.labelStyle)}>{item.label}</span>
    </>
  );
  const cloneProps = clone ? ({ 'aria-hidden': true, tabIndex: -1, 'data-marquee-clone': 'true' } as const) : {};
  return href ? (
    <a className="ind-item" href={appHref(href)} {...cloneProps}>
      {inner}
    </a>
  ) : (
    <div className="ind-item" {...cloneProps}>
      {inner}
    </div>
  );
}

export function HomeIndustriesSection({ content, sectionKey }: SectionProps) {
  const c = withHomeDefaults<HomeIndustriesContent>('home_industries', content);
  const copy = useSiteCopy();
  const enabled = copy.features.industriesEnabled;
  const items = (c.items || []).filter((it) => it && !it.hidden && String(it.label || '').trim());
  const marquee = c.layout !== 'grid';
  const hrefFor = (it: HomeIndustryItem) => it.href?.trim() || (c.autoLinks !== false && enabled ? industryHrefForLabel(it.label) : null);
  const is = c.itemStyle || {};
  const mq = c.marquee || {};
  const duration = Number(mq.speedSeconds) > 0 ? Number(mq.speedSeconds) : Math.max(36, Math.round(items.length * 2.8));
  const link = c.link;
  const linkNode =
    link && !link.hidden && String(link.label || '').trim() && enabled ? (
      <p>
        <a href={appHref(link.href || '/industries')} className="link-orange-dim" style={elementCss(link.style)}>
          {link.label}
        </a>
      </p>
    ) : null;

  return (
    <HmShell
      box={c.section}
      bg={c.background}
      className={cx('section section-gray hm-industries', marquee && 'industries-section--marquee')}
      id={sectionKey || 'industries'}
      noContainer
    >
      <div
        className="hm-ind-vars"
        style={vars({
          '--ind-item-bg': is.background,
          '--ind-item-border-color': is.borderColor,
          '--ind-item-border-width': is.borderWidth,
          '--hm-ind-radius': is.radius,
          '--hm-ind-hover-border': is.hoverBorderColor,
          '--hm-ind-pad': is.padding,
          '--hm-ind-min': is.minWidth,
          '--hm-ind-max': is.maxWidth,
          '--hm-ind-icon': c.iconStyle?.size,
          '--hm-ind-icon-color': c.iconStyle?.color,
        })}
      >
        <div className="container" style={c.section?.containerMaxWidth ? { maxWidth: c.section.containerMaxWidth } : undefined}>
          <HmHeader header={c.header} scale="base" extra={linkNode} />
          {!marquee ? (
            <div className="ind-grid" style={vars(colVars(c.columns, { desktop: 4, tablet: 2, mobile: 1 }))}>
              {items.map((it, i) => (
                <IndustryItem key={`${it.label}-${i}`} item={it} href={hrefFor(it)} c={c} />
              ))}
            </div>
          ) : null}
        </div>
        {marquee && items.length ? (
          <div className="ind-marquee" aria-label="Industries we serve">
            <div className={cx('ind-marquee-wrap', mq.fadeEdges === false && 'hm-nofade', mq.pauseOnHover === false && 'hm-nopause')}>
              <div
                className={cx('ind-marquee-track', mq.direction === 'right' && 'hm-dir-right')}
                style={vars({ '--ind-marquee-duration': `${duration}s`, gap: mq.gap })}
              >
                {[...items, ...items].map((it, i) => (
                  <IndustryItem key={`${it.label}-${i}`} item={it} href={hrefFor(it)} c={c} clone={i >= items.length} />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </HmShell>
  );
}

/* ------------------------------------------------------------------ */
/* Testimonials                                                        */
/* ------------------------------------------------------------------ */

export function HomeTestimonialsSection({ content, sectionKey }: SectionProps) {
  const c = withHomeDefaults<HomeTestimonialsContent>('home_testimonials', content);
  const items = (c.items || []).filter((t) => t && !t.hidden && String(t.quote || '').trim());
  const count = items.length;
  const [current, setCurrent] = useState(0);
  const [hover, setHover] = useState(false);
  const idx = count ? current % count : 0;
  const intervalMs = Math.max(1500, (Number(c.intervalSeconds) || 6) * 1000);
  const running = c.autoplay !== false && count > 1 && !(c.pauseOnHover && hover);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setCurrent((p) => (p + 1) % count), intervalMs);
    return () => window.clearInterval(t);
  }, [running, count, intervalMs]);

  const swipe = useSwipe((dir) => setCurrent((p) => (p + dir + count) % count), count > 1);
  if (!count) return null;
  const card = c.card || {};
  const dots = c.dots || {};

  return (
    <HmShell box={c.section} bg={c.background} className="section section-dark testi-section hm-testi" id={sectionKey}>
      <HmHeader header={c.header} scale="base" />
      <div
        className="testi-wrap"
        style={vars({ maxWidth: card.maxWidth })}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        {...swipe}
      >
        {items.map((t, i) => (
          <div
            key={i}
            className={`testi-slide${i === idx ? ' active' : ''}`}
            style={vars({ background: card.background, border: card.border, borderRadius: card.radius, padding: card.padding })}
          >
            {mediaSrc(t.avatar) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="hm-testi-avatar" src={mediaSrc(t.avatar)} alt={t.name} loading="lazy" style={vars({ width: c.avatarSize, height: c.avatarSize })} />
            ) : null}
            <p className="testi-quote" style={elementCss(c.quoteStyle)}>
              {c.quoteMarks !== false ? <>&ldquo;{t.quote}&rdquo;</> : t.quote}
            </p>
            {t.name || t.role ? (
              <div className="testi-person" style={elementCss(c.nameStyle)}>
                {t.name}
                {t.role ? <span style={elementCss(c.roleStyle)}> · {t.role}</span> : null}
              </div>
            ) : null}
          </div>
        ))}
        {!dots.hidden && count > 1 ? (
          <div className="testi-dots" style={vars({ '--hm-dot': dots.color, '--hm-dot-on': dots.activeColor })}>
            {items.map((_, i) => (
              <button key={i} type="button" className={i === idx ? 'active' : ''} onClick={() => setCurrent(i)} aria-label={`Testimonial ${i + 1}`} />
            ))}
          </div>
        ) : null}
      </div>
    </HmShell>
  );
}

/* ------------------------------------------------------------------ */
/* Partner logos                                                       */
/* ------------------------------------------------------------------ */

function LogoCard({ logo, clone }: { logo: HomeLogo; clone?: boolean }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediaSrc(logo.src)} alt={clone ? '' : logo.alt || ''} loading="lazy" decoding="async" />
  );
  const cloneProps = clone ? ({ 'aria-hidden': true, tabIndex: -1 } as const) : {};
  return logo.href?.trim() ? (
    <a className="partner-logo-card" href={appHref(logo.href)} target="_blank" rel="noopener noreferrer" {...cloneProps}>
      {img}
    </a>
  ) : (
    <div className="partner-logo-card" {...cloneProps}>
      {img}
    </div>
  );
}

export function HomePartnersSection({ content, sectionKey }: SectionProps) {
  const c = withHomeDefaults<HomePartnersContent>('home_partners', content);
  const logos = (c.logos || []).filter((l) => l && !l.hidden && String(l.src || '').trim());
  const mq = c.marquee || {};
  const card = c.card || {};
  const cardVarsStyle = vars({
    '--hm-logo-bg': card.background,
    '--hm-logo-border': card.border,
    '--hm-logo-radius': card.radius,
    '--hm-logo-h': card.height,
    '--hm-logo-h-m': card.heightMobile,
    '--hm-logo-w': card.minWidth,
    '--hm-logo-w-m': card.minWidthMobile,
    '--hm-logo-pad': card.padding,
    '--hm-logo-shadow': card.shadow,
    '--hm-logo-img-h': card.logoMaxHeight,
    '--hm-logo-img-h-m': card.logoMaxHeightMobile,
    '--hm-logo-img-w': card.logoMaxWidth,
  });
  return (
    <HmShell
      box={c.section}
      bg={c.background}
      className={cx('section section-light partners-section hm-partners', card.grayscale && 'hm-gray')}
      id={sectionKey}
      noContainer
    >
      <div style={cardVarsStyle}>
        <div className="container">
          <HmHeader header={c.header} scale="md" />
        </div>
        {logos.length && c.layout !== 'grid' ? (
          <div className={cx('partner-marquee-wrap', mq.fadeEdges === false && 'hm-nofade', mq.pauseOnHover === false && 'hm-nopause')}>
            <div
              className={cx('partner-marquee', mq.direction === 'left' && 'hm-dir-left')}
              style={vars({ animationDuration: Number(mq.speedSeconds) > 0 ? `${mq.speedSeconds}s` : undefined, gap: mq.gap })}
            >
              {[...logos, ...logos].map((logo, i) => (
                <LogoCard key={`${logo.src}-${i}`} logo={logo} clone={i >= logos.length} />
              ))}
            </div>
          </div>
        ) : null}
        {logos.length && c.layout === 'grid' ? (
          <div className="container">
            <div className="hm-logo-grid" style={vars({ ...colVars(c.columns, { desktop: 6, tablet: 4, mobile: 2 }), gap: mq.gap })}>
              {logos.map((logo, i) => (
                <LogoCard key={`${logo.src}-${i}`} logo={logo} />
              ))}
            </div>
          </div>
        ) : null}
        {hasText(c.note) ? (
          <div className="container">
            <AzText el={c.note} defaultTag="p" className="partner-note" />
          </div>
        ) : null}
      </div>
    </HmShell>
  );
}

/* ------------------------------------------------------------------ */
/* Certifications teaser                                               */
/* ------------------------------------------------------------------ */

export function HomeCertSection({ content, sectionKey }: SectionProps) {
  const c = withHomeDefaults<HomeCertContent>('home_cert', content);
  const badges = c.badges || { items: [] };
  const badgeItems = visibleMedia(badges.items);
  return (
    <HmShell box={c.section} bg={c.background} className={cx('cert-teaser hm-cert', `hm-align-${c.align || 'center'}`)} id={sectionKey}>
      <div className="hm-copy" style={vars({ maxWidth: c.maxWidth })}>
        <HmEyebrow el={c.eyebrow} scale="base" />
        <HmHeading el={c.title} role="section" highlight={c.highlight} />
        <AzText el={c.body} defaultTag="p" />
        {!badges.hidden && badgeItems.length ? (
          <div
            className={cx('hm-badges', badges.grayscale && 'hm-gray')}
            style={vars({ '--hm-badge-h': badges.height, '--hm-badge-h-m': badges.heightMobile, gap: badges.gap })}
          >
            {badgeItems.map((m, i) => (
              <LzMedia key={`${m.src}-${i}`} item={m} className="hm-badge" />
            ))}
          </div>
        ) : null}
        <HmCtas ctas={c.ctas} className="hm-ctas hm-ctas--center" />
      </div>
    </HmShell>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

export function HomeCtaSection({ content, sectionKey }: SectionProps) {
  const c = withHomeDefaults<HomeCtaContent>('home_cta', content);
  return (
    <HmShell box={c.section} bg={c.background} className={cx('cta-band hm-cta', `hm-align-${c.align || 'center'}`)} id={sectionKey || 'contact'}>
      <div className="hm-copy" style={vars({ maxWidth: c.maxWidth })}>
        <HmEyebrow el={c.eyebrow} scale="lg" />
        <HmHeading el={c.title} role="section" highlight={c.highlight} />
        <AzText el={c.body} defaultTag="p" />
        <HmCtas ctas={c.ctas} className="cta-actions" />
      </div>
    </HmShell>
  );
}

/* ------------------------------------------------------------------ */

export function renderHomeSection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'home_hero':
      return <HomeHeroSection key={key} {...rest} />;
    case 'home_eco':
      return <HomeEcoSection key={key} {...rest} />;
    case 'home_stats':
      return <HomeStatsSection key={key} {...rest} />;
    case 'home_why':
      return <HomeWhySection key={key} {...rest} />;
    case 'home_split':
      return <HomeSplitSection key={key} {...rest} />;
    case 'home_timeline':
      return <HomeTimelineSection key={key} {...rest} />;
    case 'home_projects':
      return <HomeProjectsSection key={key} {...rest} />;
    case 'home_industries':
      return <HomeIndustriesSection key={key} {...rest} />;
    case 'home_testimonials':
      return <HomeTestimonialsSection key={key} {...rest} />;
    case 'home_partners':
      return <HomePartnersSection key={key} {...rest} />;
    case 'home_cert':
      return <HomeCertSection key={key} {...rest} />;
    case 'home_cta':
      return <HomeCtaSection key={key} {...rest} />;
    default:
      return null;
  }
}
