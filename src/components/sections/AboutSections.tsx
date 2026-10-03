'use client';

import { Fragment, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { appHref } from '@/lib/base-path';
import { heroHeightClass, heroScrollBarOn } from '@/lib/hero-height';
import { heroPlacement } from '@/lib/hero-placement';
import HeroSlot from '@/components/HeroSlot';
import { LgScrollBar, LgShell } from '@/components/sections/LegacySections';
import { useSiteShell } from '@/components/SiteProviders';
import { headingTagForRole } from '@/lib/site-settings';
import {
  EYEBROW_SCALE_VAR,
  elementCss,
  imageCss,
  mediaSrc,
  mergeStyle,
  normalizeLinkItems,
  orbCss,
  sectionBoxCss,
  svgMarkup,
  withAboutDefaults,
  type AboutHeadingRole,
  type AboutHeroContent,
  type CtaButton,
  type ElementStyle,
  type EyebrowEl,
  type EyebrowScale,
  type FacilitiesContent,
  type FounderNoteContent,
  type HeadingTag,
  type IconEl,
  type ImageEl,
  type PillsEl,
  type PurposeContent,
  type SectionBox,
  type SectionHeader,
  type ServicesMarqueeContent,
  type StoryContent,
  type TextEl,
} from '@/lib/about-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

/** Build a style object of CSS custom properties / props, dropping empty values. */
export function vars(input: Record<string, string | number | undefined | null>): CSSProperties {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && !v.trim()) continue;
    out[k] = typeof v === 'string' ? v.trim() : v;
  }
  return out as CSSProperties;
}

export function withLines(text: string): ReactNode {
  const parts = text.split('\n');
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 ? <br /> : null}
      {part}
    </Fragment>
  ));
}

export function hasText(el?: TextEl | null): el is TextEl {
  return Boolean(el && !el.style?.hidden && String(el.text || '').trim());
}

export function AzText({
  el,
  defaultTag,
  className,
  style,
}: {
  el?: TextEl;
  defaultTag: HeadingTag | 'span';
  className?: string;
  style?: ElementStyle;
}) {
  if (!hasText(el)) return null;
  const Tag = (el.tag || defaultTag) as 'div';
  return (
    <Tag className={className} style={elementCss(mergeStyle(style, el.style))}>
      {withLines(String(el.text))}
    </Tag>
  );
}

/** Heading whose tag and size default to Theme Studio → Typography; element tag / style override. */
function AzRoleHeading({ el, role, className }: { el?: TextEl; role: AboutHeadingRole; className: string }) {
  const { settings } = useSiteShell();
  const level = headingTagForRole(settings, role);
  return (
    <AzText
      el={el}
      defaultTag={role === 'pageHero' ? 'h1' : level}
      className={className}
      style={{ fontSize: `var(--text-${level})` }}
    />
  );
}

export function AzEyebrow({ el, className = '', scale }: { el?: EyebrowEl; className?: string; scale: EyebrowScale }) {
  if (!hasText(el)) return null;
  return (
    <div
      className={`az-eyebrow${el.line === false ? '' : ' az-eyebrow--line'}${className ? ` ${className}` : ''}`}
      style={elementCss(mergeStyle({ fontSize: EYEBROW_SCALE_VAR[el.size || scale] }, el.style))}
    >
      {withLines(String(el.text))}
    </div>
  );
}

/** Muted looping video; play() is re-triggered on mount because SSR markup does not carry the muted flag. */
export function AzVideo({
  src,
  poster,
  className,
  controls,
  autoPlay = true,
  loop = true,
}: {
  src: string;
  poster?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
}) {
  return (
    <video
      className={className}
      src={src}
      poster={poster || undefined}
      muted={!controls}
      loop={loop}
      playsInline
      autoPlay={autoPlay}
      controls={controls}
      preload="metadata"
      ref={(el) => {
        if (!el || !autoPlay || el.dataset.azAutoplay) return;
        el.dataset.azAutoplay = '1';
        if (!controls) el.muted = true;
        void el.play().catch(() => {});
      }}
    />
  );
}

const PATTERN_CLASS: Record<string, string> = {
  grid: '',
  'grid-fade': ' az-pattern--fade',
  'grid-fade-top': ' az-pattern--fade-top',
};

export function AzShell({
  box,
  className,
  id,
  children,
  noContainer,
}: {
  box?: SectionBox;
  className: string;
  id?: string | null;
  children: ReactNode;
  noContainer?: boolean;
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
        <div
          className="container az-inner"
          style={box?.containerMaxWidth ? { maxWidth: box.containerMaxWidth } : undefined}
        >
          {children}
        </div>
      )}
    </section>
  );
}

function AzHeader({ header }: { header?: SectionHeader }) {
  if (!header || header.hidden) return null;
  if (!hasText(header.eyebrow) && !hasText(header.title) && !hasText(header.subtitle)) return null;
  const align = header.align || 'left';
  return (
    <div
      className={`az-head az-head--${align}`}
      style={vars({ maxWidth: header.maxWidth, marginBottom: header.marginBottom })}
    >
      <AzEyebrow el={header.eyebrow} scale="lg" />
      <AzRoleHeading el={header.title} role="section" className="az-head-title" />
      <AzText el={header.subtitle} defaultTag="p" className="az-head-sub" />
    </div>
  );
}

export function AzPills({ pills, className = '' }: { pills?: PillsEl; className?: string }) {
  const items = normalizeLinkItems(pills?.items);
  if (!pills || pills.hidden || !items.length) return null;
  const { color, background, border, ...rest } = pills.style || {};
  const pillStyle = elementCss(rest);
  return (
    <div
      className={`az-pill-row${pills.nowrap ? ' az-pill-row--nowrap' : ''}${className ? ` ${className}` : ''}`}
      style={vars({
        '--az-pill-color': color,
        '--az-pill-bg': background,
        '--az-pill-border': border,
        '--az-pill-hover-color': pills.hoverColor,
        '--az-pill-hover-bg': pills.hoverBackground,
        '--az-pill-hover-border': pills.hoverBorderColor,
        justifyContent: pills.justify,
        gap: pills.gap,
        marginTop: pills.marginTop,
      })}
    >
      {items.map((item, i) =>
        item.href ? (
          <a key={`${item.label}-${i}`} className="az-pill" href={appHref(item.href)} style={pillStyle}>
            {item.label}
          </a>
        ) : (
          <span key={`${item.label}-${i}`} className="az-pill" style={pillStyle}>
            {item.label}
          </span>
        )
      )}
    </div>
  );
}

export function AzImage({
  image,
  className,
  eager,
  children,
}: {
  image?: ImageEl;
  className: string;
  eager?: boolean;
  children?: ReactNode;
}) {
  if (!image || image.hidden) return null;
  const src = mediaSrc(image.src);
  const { wrap, img } = imageCss(image);
  return (
    <div className={className} style={wrap}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={image.alt || ''}
          style={img}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
        />
      ) : null}
      {image.overlay?.trim() ? (
        <span aria-hidden="true" className="az-img-overlay" style={{ background: image.overlay }} />
      ) : null}
      {children}
    </div>
  );
}

export function AzIcon({ icon, className }: { icon?: IconEl; className: string }) {
  if (!icon || icon.hidden) return null;
  const markup = svgMarkup(icon.svg);
  const src = markup ? '' : mediaSrc(icon.src);
  if (!markup && !src) return null;
  return (
    <div
      aria-hidden="true"
      className={`${className}${icon.mode === 'fill' ? ' az-icon--fill' : ''}`}
      style={vars({
        '--az-icon-color': icon.color,
        '--az-icon-bg': icon.background,
        '--az-icon-border': icon.border,
        '--az-icon-radius': icon.radius,
        '--az-icon-box': icon.boxSize,
        '--az-icon-size': icon.size,
        '--az-icon-stroke': icon.strokeWidth,
      })}
    >
      {markup ? (
        <span className="az-icon-svg" dangerouslySetInnerHTML={{ __html: markup }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="az-icon-img" src={src} alt="" />
      )}
    </div>
  );
}

export function AzCtas({ ctas, className = '' }: { ctas?: CtaButton[]; className?: string }) {
  const list = (ctas || []).filter((c) => c && String(c.label || '').trim());
  if (!list.length) return null;
  return (
    <div className={`az-ctas${className ? ` ${className}` : ''}`}>
      {list.map((cta, i) => (
        <a
          key={`${cta.label}-${i}`}
          href={appHref(cta.href || '#')}
          className={`btn btn-${cta.variant || 'primary'}`}
          style={elementCss(cta.style)}
        >
          {cta.label}
        </a>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page hero                                                           */
/* ------------------------------------------------------------------ */

export function AboutHeroSection({ content, sectionKey }: SectionProps) {
  const c = withAboutDefaults<AboutHeroContent>('about_hero', content);
  const imageLeft = c.layout?.imageSide === 'left';
  const cols = c.layout?.columns?.trim() || (imageLeft ? '0.98fr 1.15fr' : '1.15fr 0.98fr');
  const crumbs = normalizeLinkItems(c.breadcrumb?.items);
  const { color: crumbColor, ...crumbRest } = c.breadcrumb?.style || {};
  const float = c.floatCard;
  const showFloat = float && !float.hidden && (hasText(float.number) || hasText(float.label));
  const showVisual = !c.image?.hidden || showFloat;
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
      <AzRoleHeading el={c.title} role="pageHero" className="az-hero-title" />
      <AzText el={c.lead} defaultTag="p" className="az-hero-lead" />
      <AzPills pills={c.pills} />
      <AzCtas ctas={c.ctas} />
    </div>
    </HeroSlot>
  );

  const visual = showVisual ? (
    <HeroSlot place={place} name="media">
    <div className="az-hero-visual">
      <AzImage image={c.image} className="az-hero-image" eager />
      {showFloat ? (
        <div
          className={`az-float-card az-float-card--${float.position || 'bottom-left'}`}
          style={vars({ background: float.background, border: float.border, borderRadius: float.radius })}
        >
          <AzText el={float.number} defaultTag="span" className="az-float-num" />
          <AzText el={float.label} defaultTag="span" className="az-float-label" />
        </div>
      ) : null}
    </div>
    </HeroSlot>
  ) : null;

  return (
    <LgShell
      box={c.section}
      bg={c.background}
      className={`az-hero ${heroHeightClass(c.heroHeight)} ${place.rootClass}${c.entrance ? ' lgy-enter' : ''}`}
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
/* Services marquee                                                    */
/* ------------------------------------------------------------------ */

export function ServicesMarqueeSection({ content, sectionKey }: SectionProps) {
  const c = withAboutDefaults<ServicesMarqueeContent>('services_marquee', content);
  const items = normalizeLinkItems(c.items);
  if (!items.length) return null;
  const loop = [...items, ...items];
  const { color: itemColor, ...itemRest } = c.itemStyle || {};
  const itemStyle = elementCss(itemRest);
  const sep = c.separator || { type: 'dot' };
  const speed = Number(c.speedSeconds) > 0 ? Number(c.speedSeconds) : 38;

  const separator =
    sep.type === 'none' ? null : sep.type === 'icon' ? (
      <AzIcon icon={{ color: sep.color, size: sep.size, ...sep.icon }} className="az-marquee-sep-icon" />
    ) : (
      <span aria-hidden="true" className={`az-marquee-sep az-marquee-sep--${sep.type || 'dot'}`} />
    );

  return (
    <AzShell
      box={c.section}
      id={sectionKey}
      noContainer
      className={`az-marquee az-marquee--${c.direction === 'rtl' ? 'rtl' : 'ltr'}${
        c.pauseOnHover === false ? '' : ' az-marquee--pause'
      }`}
    >
      <div
        className="az-marquee-track"
        style={vars({
          '--az-marquee-duration': `${speed}s`,
          '--az-marquee-gap': c.itemGap,
          '--az-marquee-color': itemColor,
          '--az-marquee-hover': c.hoverColor,
          '--az-sep-color': sep.color,
          '--az-sep-size': sep.size,
        })}
      >
        {loop.map((item, i) => {
          const clone = i >= items.length;
          const inner = (
            <>
              {separator}
              {item.label}
            </>
          );
          return item.href ? (
            <a
              key={i}
              href={appHref(item.href)}
              className="az-marquee-item"
              style={itemStyle}
              aria-hidden={clone || undefined}
              tabIndex={clone ? -1 : undefined}
            >
              {inner}
            </a>
          ) : (
            <span key={i} className="az-marquee-item" style={itemStyle} aria-hidden={clone || undefined}>
              {inner}
            </span>
          );
        })}
      </div>
    </AzShell>
  );
}

/* ------------------------------------------------------------------ */
/* Story (image + copy split)                                          */
/* ------------------------------------------------------------------ */

export function StorySection({ content, sectionKey }: SectionProps) {
  const c = withAboutDefaults<StoryContent>('story', content);
  const imageLeft = c.layout?.imageSide !== 'right';
  const cols = c.layout?.columns?.trim() || (imageLeft ? '9fr 11fr' : '11fr 9fr');
  const reveal = c.reveal === false ? '' : ' reveal';
  const image = c.image?.hidden ? null : (
    <AzImage image={c.image} className={`az-split-img${reveal}`} />
  );
  const body = (
    <div className={`az-split-content${reveal}`}>
      <AzEyebrow el={c.eyebrow} scale="lg" />
      <AzRoleHeading el={c.title} role="section" className="az-split-title" />
      {(c.paragraphs || []).map((p, i) => (
        <AzText key={i} el={p} defaultTag="p" className="az-split-p" style={c.paragraphStyle} />
      ))}
      <AzPills pills={c.pills} />
      <AzCtas ctas={c.ctas} />
    </div>
  );
  return (
    <AzShell box={c.section} className="az-section az-story" id={sectionKey || 'story'}>
      <div
        className={`az-split${image ? '' : ' az-split--single'} ${
          c.layout?.mobileImageFirst === false ? 'az-mobile-img-last' : 'az-mobile-img-first'
        }`}
        style={vars({ '--az-cols': cols, gap: c.layout?.gap, alignItems: c.layout?.alignItems })}
      >
        {imageLeft ? (
          <>
            {image}
            {body}
          </>
        ) : (
          <>
            {body}
            {image}
          </>
        )}
      </div>
    </AzShell>
  );
}

/* ------------------------------------------------------------------ */
/* Purpose (mission / vision cards)                                    */
/* ------------------------------------------------------------------ */

export function PurposeSection({ content, sectionKey }: SectionProps) {
  const c = withAboutDefaults<PurposeContent>('purpose', content);
  const cards = c.cards || [];
  const divider = c.divider || { symbol: '&' };
  const showDivider = !divider.hidden;
  const cols = cards.map(() => '1fr').join(showDivider ? ' auto ' : ' ') || '1fr';
  const cs = c.cardStyle || {};
  return (
    <AzShell box={c.section} className="az-section az-purpose" id={sectionKey || 'purpose'}>
      <AzHeader header={c.header} />
      <div className="az-purpose-grid" style={vars({ '--az-purpose-cols': cols })}>
        {cards.map((card, i) => (
          <Fragment key={i}>
            {i > 0 && showDivider ? (
              <div
                className="az-purpose-divider"
                aria-hidden="true"
                style={vars({ '--az-divider-line': divider.lineColor })}
              >
                <span className="line" />
                <span className="sym" style={vars({ color: divider.color, fontSize: divider.fontSize })}>
                  {divider.symbol}
                </span>
                <span className="line" />
              </div>
            ) : null}
            <div
              className={`az-purpose-card${cs.hoverLift === false ? ' az-no-lift' : ''}`}
              style={vars({
                '--az-accent': card.accentColor,
                '--az-accent-bar': card.accentBar || card.accentColor,
                '--az-card-bg': card.background || cs.background,
                '--az-card-border': card.border || cs.border,
                '--az-card-hover-bg': cs.hoverBackground,
                '--az-card-hover-border': cs.hoverBorderColor,
                '--az-card-pad': cs.padding,
                '--az-card-pad-m': cs.paddingMobile,
                borderRadius: cs.radius,
              })}
            >
              {card.watermark ? (
                <span
                  className="az-watermark"
                  aria-hidden="true"
                  style={vars({ color: card.watermarkColor })}
                >
                  {card.watermark}
                </span>
              ) : null}
              <AzIcon icon={card.icon} className="az-purpose-icon" />
              <AzText el={card.tag} defaultTag="span" className="az-purpose-tag" />
              <AzText el={card.title} defaultTag="h3" className="az-purpose-title" />
              <AzText el={card.body} defaultTag="p" className="az-purpose-body" />
            </div>
          </Fragment>
        ))}
      </div>
    </AzShell>
  );
}

/* ------------------------------------------------------------------ */
/* Founder note                                                        */
/* ------------------------------------------------------------------ */

export function FounderNoteSection({ content, sectionKey }: SectionProps) {
  const c = withAboutDefaults<FounderNoteContent>('founder_note', content);
  const photoLeft = c.layout?.photoSide !== 'right';
  const w = c.layout?.photoWidth?.trim() || '260px';
  const photo = c.photo?.hidden ? null : <AzImage image={c.photo} className="az-founder-photo" />;
  const q = c.quote;
  const sig = c.signature;
  const stats = c.stats;
  const statItems = (stats?.items || []).filter((s) => s.label || s.text);

  const body = (
    <div className="az-founder-content">
      <AzText el={c.heading} defaultTag="h3" className="az-founder-heading" />
      {q && !q.hidden && hasText(q) ? (
        <div
          className="az-founder-quote"
          style={vars({
            borderLeftColor: q.borderColor,
            borderLeftWidth: q.borderWidth,
          })}
        >
          <p style={elementCss(q.style)}>{withLines(q.text)}</p>
        </div>
      ) : null}
      {(c.paragraphs || []).length ? (
        <div className="az-founder-body">
          {c.paragraphs.map((p, i) => (
            <AzText key={i} el={p} defaultTag="p" style={c.paragraphStyle} />
          ))}
        </div>
      ) : null}
      {sig && !sig.hidden && (hasText(sig.name) || hasText(sig.role)) ? (
        <div className={`az-founder-sign${sig.divider === false ? ' az-no-divider' : ''}`}>
          <AzText el={sig.name} defaultTag="span" className="az-founder-sign-name" />
          <AzText el={sig.role} defaultTag="span" className="az-founder-sign-role" />
        </div>
      ) : null}
      {stats && !stats.hidden && statItems.length ? (
        <div
          className={`az-founder-stats${stats.divider === false ? ' az-no-divider' : ''}${
            stats.hideTextOnMobile === false ? '' : ' az-stats-hide-text-m'
          }`}
        >
          {statItems.map((s, i) => (
            <div className="az-founder-stat" key={`${s.label}-${i}`}>
              {s.label ? <strong style={elementCss(stats.labelStyle)}>{s.label}</strong> : null}
              {s.text ? <p style={elementCss(stats.textStyle)}>{withLines(s.text)}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <AzShell box={c.section} className="az-section az-founder" id={sectionKey || 'founder-note'}>
      <AzHeader header={c.header} />
      <div
        className={`az-founder-wrap${photo ? '' : ' az-founder-wrap--single'} ${
          c.layout?.mobilePhotoFirst === false ? 'az-mobile-img-last' : 'az-mobile-img-first'
        }`}
        style={vars({
          '--az-founder-cols': photoLeft ? `${w} 1fr` : `1fr ${w}`,
          '--az-founder-photo-w': c.layout?.photoWidthMobile?.trim() || w,
          gap: c.layout?.gap,
          maxWidth: c.layout?.maxWidth,
          alignItems: c.layout?.alignItems,
        })}
      >
        {photoLeft ? (
          <>
            {photo}
            {body}
          </>
        ) : (
          <>
            {body}
            {photo}
          </>
        )}
      </div>
    </AzShell>
  );
}

/* ------------------------------------------------------------------ */
/* Facilities / How we work (zigzag steps)                             */
/* ------------------------------------------------------------------ */

export function FacilitiesSection({ content, sectionKey }: SectionProps) {
  const c = withAboutDefaults<FacilitiesContent>('facilities', content);
  const listRef = useRef<HTMLDivElement>(null);
  const steps = c.steps || [];
  const animateCards = c.animateCards !== false;
  const animateTrack = c.track?.animate !== false;

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = Array.from(list.querySelectorAll<HTMLElement>('.az-zz-item'));
    if (typeof IntersectionObserver === 'undefined') {
      list.classList.add('in-view');
      items.forEach((el) => el.classList.add('in-view'));
      return;
    }
    const trackObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            trackObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    trackObserver.observe(list);

    let itemObserver: IntersectionObserver | null = null;
    if (animateCards) {
      itemObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => entry.target.classList.toggle('in-view', entry.isIntersecting));
        },
        { threshold: 0.2 }
      );
      items.forEach((el) => itemObserver!.observe(el));
    }
    return () => {
      trackObserver.disconnect();
      itemObserver?.disconnect();
    };
  }, [steps.length, animateCards]);

  const colors = steps.map((s) => s.color).filter(Boolean);
  const fill = colors.length > 1 ? `linear-gradient(${colors.join(',')})` : colors[0] || undefined;
  const cs = c.cardStyle || {};
  const is = c.iconStyle || {};

  return (
    <AzShell box={c.section} className="az-section az-facilities" id={sectionKey || 'facilities'}>
      <AzHeader header={c.header} />
      <div
        ref={listRef}
        className={`az-principle-list${animateTrack ? '' : ' az-track-static'}${animateCards ? '' : ' az-zz-static'}`}
        style={vars({
          '--az-card-bg': cs.background,
          '--az-card-border': cs.border,
          '--az-card-radius': cs.radius,
          '--az-card-shadow': cs.shadow,
          '--az-card-padding': cs.padding,
          '--az-card-max': cs.maxWidth,
          '--az-picon-bg': is.background,
          '--az-picon-border': is.border,
          '--az-picon-radius': is.radius,
          '--az-picon-size': is.size,
        })}
      >
        {!c.track?.hidden ? (
          <div className="az-principle-track" aria-hidden="true" style={vars({ background: c.track?.color })}>
            <div className="az-principle-track-fill" style={vars({ background: fill })} />
          </div>
        ) : null}
        {steps.map((step, i) => {
          const firstLeft = c.startSide !== 'right';
          const side = (i % 2 === 0) === firstLeft ? 'left' : 'right';
          const text = (
            <div className="az-zz-text">
              <div className="az-zz-card">
                {step.tag ? (
                  <span className="az-step-tag" style={elementCss(c.tagStyle)}>
                    {step.tag}
                  </span>
                ) : null}
                {step.title ? <h5 style={elementCss(c.titleStyle)}>{withLines(step.title)}</h5> : null}
                {step.body ? <p style={elementCss(c.bodyStyle)}>{withLines(step.body)}</p> : null}
              </div>
            </div>
          );
          const icon = (
            <div className="az-zz-icon">
              <AzIcon icon={{ ...step.icon }} className="az-principle-icon" />
            </div>
          );
          return (
            <div
              key={i}
              className={`az-zz-item az-zz-${side}`}
              style={vars({ '--step-color': step.color })}
            >
              {side === 'left' ? (
                <>
                  {text}
                  {icon}
                </>
              ) : (
                <>
                  {icon}
                  {text}
                </>
              )}
            </div>
          );
        })}
      </div>
    </AzShell>
  );
}

export function renderAboutSection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'about_hero':
      return <AboutHeroSection key={key} {...rest} />;
    case 'services_marquee':
      return <ServicesMarqueeSection key={key} {...rest} />;
    case 'story':
      return <StorySection key={key} {...rest} />;
    case 'purpose':
      return <PurposeSection key={key} {...rest} />;
    case 'founder_note':
      return <FounderNoteSection key={key} {...rest} />;
    case 'facilities':
      return <FacilitiesSection key={key} {...rest} />;
    default:
      return null;
  }
}
