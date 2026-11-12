'use client';

import { Fragment, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { appHref } from '@/lib/base-path';
import { heroScrimStyle } from '@/lib/hero-scrim';
import { AzText, hasText, vars, withLines } from '@/components/sections/AboutSections';
import { elementCss, mediaSrc, sanitizeSvg, sectionBoxCss, svgMarkup, type CtaButton } from '@/lib/about-sections';
import {
  withSolarDefaults,
  type SolarBannerContent,
  type SolarBar,
  type SolarBox,
  type SolarCta,
  type SolarCtaContent,
  type SolarDeliveryContent,
  type SolarE2eContent,
  type SolarExpertiseContent,
  type SolarEyebrow,
  type SolarHead,
  type SolarHeroContent,
  type SolarIndustriesContent,
  type SolarInvertersContent,
  type SolarOrb,
  type SolarPerformanceContent,
  type SolarProcessContent,
  type SolarProjectsContent,
  type SolarRoiModal,
  type SolarTypesContent,
} from '@/lib/solar-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

const pad2 = (n: number) => String(n).padStart(2, '0');
const num = (v: unknown, fallback: number) => {
  if (v === '' || v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Every section sits in `.sol-page`: the design's stylesheet is scoped to that wrapper. */
function SolPage({ children }: { children: ReactNode }) {
  return <div className="sol-page">{children}</div>;
}

/** Optional per-section background / text / padding overrides (the design's own CSS applies when empty). */
function boxStyle(box?: SolarBox, extra?: Record<string, string | undefined>): CSSProperties {
  const css = { ...sectionBoxCss(box) } as Record<string, unknown>;
  for (const k of Object.keys(css)) if (k.startsWith('--az-')) delete css[k];
  const pt = box?.paddingTop?.trim();
  const pb = box?.paddingBottom?.trim();
  if (pt) css.paddingTop = pt;
  if (pb) css.paddingBottom = pb;
  return { ...css, ...vars(extra || {}) } as CSSProperties;
}

const cssUrl = (src?: string) => {
  const s = mediaSrc(src);
  return s ? `url("${s.replace(/"/g, '%22')}")` : undefined;
};

/** Inline SVG icon: inner shapes (24×24) or a full <svg>. `display: contents` keeps the svg a direct layout child. */
function SolIcon({ svg }: { svg?: string }) {
  const markup = svgMarkup(svg);
  if (!markup) return null;
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: markup }} />;
}

/** Inner shapes of an icon, for drawing it inside another <svg>. */
function svgInner(svg?: string): string {
  const raw = (svg || '').trim();
  const m = raw.match(/^<svg[^>]*>([\s\S]*)<\/svg>$/i);
  return sanitizeSvg(m ? m[1] : raw);
}

function SolEyebrowEl({ el }: { el?: SolarEyebrow }) {
  if (!hasText(el)) return null;
  const tone = el.tone && el.tone !== 'none' ? ` eyebrow-${el.tone}` : '';
  return (
    <div className={`eyebrow${tone}`} style={elementCss(el.style)}>
      {withLines(String(el.text))}
    </div>
  );
}

function SolHeadBlock({ head }: { head?: SolarHead }) {
  if (!head || head.hidden) return null;
  if (!hasText(head.eyebrow) && !hasText(head.title) && !hasText(head.subtitle)) return null;
  return (
    <div className={`section-head${head.align === 'left' ? '' : ' center'}`}>
      <SolEyebrowEl el={head.eyebrow} />
      <AzText el={head.title} defaultTag="h2" />
      <AzText el={head.subtitle} defaultTag="p" />
    </div>
  );
}

function SolOrbEl({ orb }: { orb?: SolarOrb }) {
  if (!orb || orb.hidden) return null;
  return (
    <div
      aria-hidden="true"
      className={`bg-orb orb-${orb.tone || 'orange'}`}
      style={vars({ width: orb.size, height: orb.size, top: orb.top, right: orb.right, bottom: orb.bottom, left: orb.left, opacity: orb.opacity })}
    />
  );
}

function SolCtas({ ctas, className = 'sec-cta', linkClass }: { ctas?: CtaButton[]; className?: string; linkClass?: string }) {
  const list = (ctas || []).filter((c) => c && String(c.label || '').trim());
  if (!list.length) return null;
  return (
    <div className={className}>
      {list.map((cta, i) => (
        <a
          key={`${cta.label}-${i}`}
          href={appHref(cta.href || '#')}
          className={`btn btn-${cta.variant || 'primary'}${linkClass ? ` ${linkClass}` : ''}`}
          style={elementCss(cta.style)}
        >
          {cta.label}
        </a>
      ))}
    </div>
  );
}

/** Re-runs the page's scroll effects (staggered `.reveal`, `.anim-on-view` / `[data-sol-view]` → `in-view`). */
function useSolFx(ref: RefObject<HTMLElement | null>, sig: string) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reveals = Array.from(root.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'));
    const views = Array.from(root.querySelectorAll<HTMLElement>('.anim-on-view:not(.in-view), [data-sol-view]:not(.in-view)'));
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (typeof IntersectionObserver === 'undefined' || reduce) {
      reveals.forEach((el) => el.classList.add('is-visible'));
      views.forEach((el) => el.classList.add('in-view'));
      return;
    }
    const timers: number[] = [];
    const revealIo = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const siblings = Array.from(el.parentElement?.children ?? []).filter((c) => c.classList.contains('reveal'));
          el.style.transitionDelay = `${siblings.indexOf(el) * 90}ms`;
          el.classList.add('is-visible');
          timers.push(window.setTimeout(() => (el.style.transitionDelay = ''), 1000));
          revealIo.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    const viewIo = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).classList.add('in-view');
          viewIo.unobserve(entry.target);
        }
      },
      { threshold: 0.3 }
    );
    reveals.forEach((el) => revealIo.observe(el));
    views.forEach((el) => viewIo.observe(el));
    return () => {
      revealIo.disconnect();
      viewIo.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [ref, sig]);
}

const sigOf = (c: unknown) => String(JSON.stringify(c).length);

/** Auto-advancing index; picking one restarts the timer. */
function useCycle(count: number, intervalMs: number, paused: boolean) {
  const [state, setState] = useState({ cur: 0, epoch: 0 });
  useEffect(() => {
    if (paused || count < 2) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setState((s) => ({ ...s, cur: (s.cur + 1) % count }));
    }, Math.max(800, intervalMs));
    return () => window.clearInterval(id);
  }, [paused, count, intervalMs, state.epoch]);
  const go = useCallback((i: number) => setState((s) => ({ cur: i, epoch: s.epoch + 1 })), []);
  return { cur: count ? state.cur % count : 0, epoch: state.epoch, go };
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const PLAY_ICON = (
  <svg viewBox="0 0 24 24" className="play">
    <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M10 8.2l6 3.8-6 3.8z" fill="currentColor" />
  </svg>
);

function HeroCta({ cta }: { cta: SolarCta }) {
  if (!String(cta.label || '').trim()) return null;
  const href = appHref(cta.href || '#');
  if (cta.variant === 'ghost' || cta.variant === 'ghost-dark') {
    return (
      <a href={href} className="btn hero-ghost" style={elementCss(cta.style)}>
        {cta.play ? PLAY_ICON : null}
        <span>{cta.label}</span>
      </a>
    );
  }
  return (
    <a href={href} className="btn btn-primary" style={elementCss(cta.style)}>
      {cta.label}
    </a>
  );
}

export function SolarHeroSection({ content, sectionKey }: SectionProps) {
  const c = withSolarDefaults<SolarHeroContent>('solar_hero', content);
  const slides = (c.slides || []).filter((s) => !s.hidden);
  const { cur, epoch, go } = useCycle(slides.length, num(c.intervalSeconds, 6.5) * 1000, false);
  const nodes = (c.nodes?.items || []).filter((n) => !n.hidden);
  const stats = (c.stats?.items || []).filter((s) => !s.hidden && (String(s.value || '').trim() || String(s.label || '').trim()));
  const sep = c.wordSeparator ?? '·';
  const seconds = num(c.intervalSeconds, 6.5);
  return (
    <SolPage>
      <section className="solar-hero" id={sectionKey || 'top'} style={{ ...boxStyle(c.section), ...heroScrimStyle(c.scrimStrength) }}>
        <div className="hero-bgs">
          {slides.map((s, i) => (
            <div key={i} className={`hero-bg${i === cur ? ' on' : ''}`} style={{ backgroundImage: cssUrl(s.image) }} />
          ))}
        </div>
        <div className="hero-shade" style={c.shade?.trim() ? { background: c.shade.trim() } : undefined} />
        <div className="container hero-main">
          <div className="hero-copy-stack">
            {slides.map((s, i) => {
              const words = (s.words || []).filter((w) => String(w || '').trim());
              return (
                <div key={i} className={`hero-copy${i === cur ? ' on' : ''}`} aria-hidden={i === cur ? undefined : true}>
                  {String(s.eyebrow || '').trim() ? (
                    <div className="hero-eyebrow">
                      <i />
                      {s.eyebrow}
                    </div>
                  ) : null}
                  <AzText el={s.title} defaultTag="h1" />
                  {words.length ? (
                    <div className="hero-words">
                      {words.map((w, k) => (
                        <Fragment key={k}>
                          {k > 0 ? (
                            <>
                              {' '}
                              {sep ? <span className="dot">{sep}</span> : null}{' '}
                            </>
                          ) : null}
                          <span>{w}</span>
                        </Fragment>
                      ))}
                    </div>
                  ) : null}
                  <AzText el={s.lead} defaultTag="p" />
                  {(s.ctas || []).length ? (
                    <div className="hero-btns">
                      {(s.ctas || []).map((cta, k) => (
                        <HeroCta key={`${cta.label}-${k}`} cta={cta} />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {!c.nodes?.hidden && nodes.length ? (
            <div className="hero-nodes" aria-label={c.nodes.ariaLabel || undefined}>
              <svg viewBox="0 0 640 470" className="hn-svg" aria-hidden="true">
                <defs>
                  <linearGradient id="hnArc" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stopColor="#5CC8FF" stopOpacity=".1" />
                    <stop offset=".45" stopColor="#7FD6FF" />
                    <stop offset="1" stopColor="#fff" />
                  </linearGradient>
                  <filter id="hnBlur">
                    <feGaussianBlur stdDeviation="5" />
                  </filter>
                </defs>
                {c.nodes.arc?.trim() ? (
                  <>
                    <path d={c.nodes.arc} fill="none" stroke="#3AA8FF" strokeWidth="7" opacity=".55" filter="url(#hnBlur)" />
                    <path d={c.nodes.arc} fill="none" stroke="url(#hnArc)" strokeWidth="2.4" strokeLinecap="round" />
                  </>
                ) : null}
                {nodes.map((n, i) => (
                  <line key={`l${i}`} x1={n.x} y1={n.cardY} x2={n.x} y2={n.dotY} stroke="rgba(255,255,255,.75)" strokeWidth="1.5" />
                ))}
                {nodes.map((n, i) => (
                  <Fragment key={`d${i}`}>
                    <circle className="hn-pulse" cx={n.x} cy={n.dotY} r="6" />
                    <circle cx={n.x} cy={n.dotY} r="4.5" fill="#fff" />
                    <circle cx={n.x} cy={n.dotY} r="9" fill="#5CC8FF" opacity=".25" />
                  </Fragment>
                ))}
              </svg>
              {nodes.map((n, i) => (
                <a
                  key={i}
                  className="hn"
                  href={appHref(n.href || '#')}
                  style={{ left: `${((num(n.x, 0) / 640) * 100).toFixed(2)}%`, top: `${((num(n.cardY, 0) / 470) * 100).toFixed(2)}%` }}
                >
                  <span className="hn-card">
                    <SolIcon svg={n.icon} />
                    <b>{withLines(String(n.label || ''))}</b>
                  </span>
                </a>
              ))}
            </div>
          ) : null}
        </div>
        {c.showDots !== false && slides.length > 1 ? (
          <div className="hero-dots" style={vars({ '--sol-dot-s': `${seconds}s` })}>
            {slides.map((_, i) => (
              <button
                key={`${i}-${i === cur ? epoch : 0}`}
                type="button"
                className={`hero-dot${i === cur ? ' on' : ''}`}
                aria-label={`Show slide ${i + 1}`}
                aria-current={i === cur ? 'true' : 'false'}
                onClick={() => go(i)}
              />
            ))}
          </div>
        ) : null}
        {!c.stats?.hidden && stats.length ? (
          <div className="hero-stats">
            {stats.map((s, i) => (
              <div className="hs" key={i}>
                <SolIcon svg={s.icon} />
                <div>
                  <b>{s.value}</b>
                  <span>{withLines(String(s.label || ''))}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </SolPage>
  );
}

/* ------------------------------------------------------------------ */
/* What we deliver                                                     */
/* ------------------------------------------------------------------ */

export function SolarDeliverySection({ content, sectionKey }: SectionProps) {
  const c = withSolarDefaults<SolarDeliveryContent>('solar_delivery', content);
  const ref = useRef<HTMLElement>(null);
  useSolFx(ref, sigOf(c));
  const cards = (c.cards || []).filter((card) => !card.hidden);
  return (
    <SolPage>
      <section ref={ref} className="section delivery-section" id={sectionKey || 'services'} style={boxStyle(c.section, { '--sec-img': cssUrl(c.bgImage) })}>
        <div className="container">
          <SolHeadBlock head={c.head} />
          {cards.length ? (
            <div className="pillar-grid">
              {cards.map((card, i) => (
                <div key={i} className="pillar-card reveal" style={vars({ '--card-img': cssUrl(card.bgImage), '--accent': card.accent })}>
                  <div className="pillar-top">
                    <div className="pillar-icon">
                      <SolIcon svg={card.icon} />
                    </div>
                    {String(card.tag || '').trim() ? <span className="pillar-tag">{card.tag}</span> : null}
                  </div>
                  <h3>{card.title}</h3>
                  {String(card.sub || '').trim() ? <p className="sub">{card.sub}</p> : null}
                  {(card.items || []).length ? (
                    <ul className="tick-list">
                      {(card.items || []).map((li, k) => (
                        <li key={k}>{li}</li>
                      ))}
                    </ul>
                  ) : null}
                  {String(card.linkLabel || '').trim() ? (
                    <a href={appHref(card.linkHref || '#')} className="pillar-link">
                      {card.linkLabel} <span>→</span>
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {!c.note?.hidden && (String(c.note?.strong || '').trim() || String(c.note?.text || '').trim()) ? (
            <div className="pillar-note reveal">
              <span>
                {String(c.note.strong || '').trim() ? <strong>{c.note.strong}</strong> : null} {c.note.text}
              </span>
            </div>
          ) : null}
          <SolCtas ctas={c.ctas} />
        </div>
      </section>
    </SolPage>
  );
}

/* ------------------------------------------------------------------ */
/* Part banner                                                         */
/* ------------------------------------------------------------------ */

const BANNER_CLASS = { orange: 'part-1', green: 'part-2', purple: 'part-3' } as const;

export function SolarBannerSection({ content, sectionKey }: SectionProps) {
  const c = withSolarDefaults<SolarBannerContent>('solar_banner', content);
  const chips = (c.chips || []).filter((s) => String(s || '').trim());
  const id = c.anchorId?.trim() || sectionKey || undefined;
  return (
    <SolPage>
      <section className={`part-banner ${BANNER_CLASS[c.tone] || 'part-1'}`} id={id} style={boxStyle(c.section, { '--pa': c.accent })}>
        <SolOrbEl orb={c.orb} />
        <div className="container part-inner">
          {String(c.num || '').trim() ? <div className="part-num">{c.num}</div> : null}
          <div className="part-copy">
            <SolEyebrowEl el={c.eyebrow} />
            <AzText el={c.title} defaultTag="h2" />
            <AzText el={c.body} defaultTag="p" />
            {chips.length ? (
              <div className="part-chips">
                {chips.map((chip, i) => (
                  <span key={i}>{chip}</span>
                ))}
              </div>
            ) : null}
            <SolCtas ctas={c.ctas} className="part-actions" linkClass="part-btn" />
          </div>
        </div>
      </section>
    </SolPage>
  );
}

/* ------------------------------------------------------------------ */
/* End-to-end blocks (timeline / loop / stepper)                       */
/* ------------------------------------------------------------------ */

const E2E_ACCENT = { timeline: 'var(--orange)', loop: 'var(--blue)', stepper: 'var(--purple)' } as const;
const E2E_ID = { timeline: 'epc-e2e', loop: 'amc-e2e', stepper: 'inv-e2e' } as const;

type E2eStepVm = SolarE2eContent['steps'][number];

function E2eTimeline({ c, steps }: { c: SolarE2eContent; steps: E2eStepVm[] }) {
  return (
    <div className="tl-h anim-on-view" style={vars({ '--sol-n': steps.length })}>
      <div className="tl-track">
        <span />
      </div>
      {steps.map((s, i) => (
        <div className="tl-item reveal" key={i}>
          <div className="tl-dot">
            <SolIcon svg={s.icon} />
          </div>
          <span className="tl-n">{`${c.stepPrefix || 'STEP'} ${pad2(i + 1)}`.trim()}</span>
          <h5>{s.title}</h5>
          <p>{s.body}</p>
        </div>
      ))}
    </div>
  );
}

function E2eLoop({ c, steps }: { c: SolarE2eContent; steps: E2eStepVm[] }) {
  const [paused, setPaused] = useState(false);
  const { cur, go } = useCycle(steps.length, num(c.loop?.intervalSeconds, 2.6) * 1000, paused || c.autoplay === false);
  const n = Math.max(1, steps.length);
  const R = 128;
  const hover = (i: number) => {
    setPaused(true);
    go(i);
  };
  const point = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: 180 + R * Math.cos(a), y: 180 + R * Math.sin(a) };
  };
  return (
    <div className="loop-wrap">
      <div className="loop-fig anim-on-view">
        <svg viewBox="0 0 360 360" role="img" aria-label={c.loop?.ariaLabel || undefined}>
          <circle className="ring" cx="180" cy="180" r="128" />
          <circle className="pulse" cx="180" cy="180" r="70" />
          <circle className="core" cx="180" cy="180" r="70" />
          <g className="arrows">
            {steps.map((_, i) => {
              const deg = -90 + ((i + 0.5) * 360) / n;
              const p = point(deg);
              return (
                <path
                  key={i}
                  d="M-4 -5L3 0L-4 5"
                  transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(deg + 90).toFixed(0)})`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
          </g>
          {String(c.loop?.centerTop || '').trim() ? (
            <text className="c1" x="180" y="166" textAnchor="middle">
              {c.loop.centerTop}
            </text>
          ) : null}
          {String(c.loop?.centerTitle || '').trim() ? (
            <text className="c2" x="180" y="192" textAnchor="middle">
              {c.loop.centerTitle}
            </text>
          ) : null}
          {String(c.loop?.centerSub || '').trim() ? (
            <text className="c3" x="180" y="212" textAnchor="middle">
              {c.loop.centerSub}
            </text>
          ) : null}
          {steps.map((s, i) => {
            const p = point(-90 + (i * 360) / n);
            return (
              <g
                key={i}
                className={`node${i === cur ? ' active' : ''}`}
                style={{ transitionDelay: `${i * 160}ms` }}
                onMouseEnter={() => hover(i)}
                onMouseLeave={() => setPaused(false)}
              >
                <circle className="nbg" cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="29" />
                <g
                  className="n-ico"
                  transform={`translate(${(p.x - 11).toFixed(1)} ${(p.y - 11).toFixed(1)}) scale(.92)`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dangerouslySetInnerHTML={{ __html: svgInner(s.icon) }}
                />
                <circle className="nbadge" cx={(p.x + 21).toFixed(1)} cy={(p.y - 21).toFixed(1)} r="9" />
                <text className="ntxt" x={(p.x + 21).toFixed(1)} y={(p.y - 17.5).toFixed(1)} textAnchor="middle">
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ol className="loop-list">
        {steps.map((s, i) => (
          <li key={i} className={i === cur ? 'active' : undefined} onMouseEnter={() => hover(i)} onMouseLeave={() => setPaused(false)}>
            <span className="ll-n">{pad2(i + 1)}</span>
            <div>
              <h5>{s.title}</h5>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function E2eStepper({ c, steps }: { c: SolarE2eContent; steps: E2eStepVm[] }) {
  const [paused, setPaused] = useState(false);
  const { cur, go } = useCycle(steps.length, num(c.stepper?.intervalSeconds, 4.8) * 1000, paused || c.autoplay === false);
  const total = pad2(steps.length);
  const format = c.stepOfFormat?.trim() || 'STEP {n} OF {total}';
  return (
    <div
      className="te"
      style={vars({ '--p': steps.length > 1 ? cur / (steps.length - 1) : 0, '--sol-n': steps.length })}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="te-bar" role="tablist">
        <div className="te-line">
          <span className="te-fill" />
        </div>
        {steps.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`te-tab${i === cur ? ' active' : ''}${i < cur ? ' done' : ''}`}
            role="tab"
            aria-selected={i === cur}
            onClick={() => go(i)}
          >
            <span className="te-dot">{pad2(i + 1)}</span>
            <span className="te-lbl">{s.tabLabel?.trim() || s.title}</span>
          </button>
        ))}
      </div>
      <div className="te-panels">
        {steps.map((s, i) => (
          <div key={i} className={`te-panel${i === cur ? ' active' : ''}`} role="tabpanel">
            <div className="te-icon">
              <SolIcon svg={s.icon} />
            </div>
            <div className="te-body">
              <span className="te-step">{format.replace('{n}', pad2(i + 1)).replace('{total}', total)}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              {String(s.get || '').trim() ? (
                <div className="te-get">
                  <b>{c.youGetLabel || 'You get:'}</b> {s.get}
                </div>
              ) : null}
            </div>
            <span className="te-wm">{pad2(i + 1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SolarE2eSection({ content, sectionKey }: SectionProps) {
  const c = withSolarDefaults<SolarE2eContent>('solar_e2e', content);
  const ref = useRef<HTMLElement>(null);
  useSolFx(ref, sigOf(c));
  const variant = c.variant === 'loop' || c.variant === 'stepper' ? c.variant : 'timeline';
  const steps = (c.steps || []).filter((s) => !s.hidden);
  const promise = (c.promise?.items || []).filter((s) => String(s || '').trim());
  return (
    <SolPage>
      <section
        ref={ref}
        className="section e2e-section"
        id={sectionKey || E2E_ID[variant]}
        style={boxStyle(c.section, { '--ea': c.accent?.trim() || E2E_ACCENT[variant] })}
      >
        <div className="container">
          <SolHeadBlock head={c.head} />
          {steps.length ? (
            variant === 'loop' ? (
              <E2eLoop c={c} steps={steps} />
            ) : variant === 'stepper' ? (
              <E2eStepper c={c} steps={steps} />
            ) : (
              <E2eTimeline c={c} steps={steps} />
            )
          ) : null}
          {!c.promise?.hidden && promise.length ? (
            <div className="e2e-promise">
              {String(c.promise.title || '').trim() ? <div className="e2e-promise-h">{c.promise.title}</div> : null}
              {promise.map((p, i) => (
                <div className="e2e-pt reveal" key={i}>
                  <span className="e2e-tick" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </SolPage>
  );
}

/* ------------------------------------------------------------------ */
/* Solar system types (accordion + illustrations)                      */
/* ------------------------------------------------------------------ */

export function SolarTypesSection({ content, sectionKey }: SectionProps) {
  const c = withSolarDefaults<SolarTypesContent>('solar_types', content);
  const items = (c.items || []).filter((it) => !it.hidden);
  const uid = useId().replace(/:/g, '');
  const initial = Math.min(items.length - 1, Math.floor(num(c.openIndex, 0)));
  // Selection resets whenever the configured start item or the item count changes (e.g. after an admin edit).
  const selKey = `${initial}:${items.length}`;
  const [sel, setSel] = useState({ key: selKey, open: initial, shown: Math.max(0, initial) });
  const { open, shown } = sel.key === selKey ? sel : { open: initial, shown: Math.max(0, initial) };
  const current = items[Math.min(shown, items.length - 1)];
  const visuals = items.filter((it) => String(it.illustrationSvg || '').trim());
  return (
    <SolPage>
      <section className="section types-section" id={sectionKey || 'types'} style={boxStyle(c.section)}>
        <div className="container">
          <div className="ty-wrap">
            <div className="ty-left">
              <SolEyebrowEl el={c.eyebrow} />
              <AzText el={c.title} defaultTag="h2" />
              <AzText el={c.lead} defaultTag="p" className="ty-lead" />
              {visuals.length ? (
                <div className="ty-visual" aria-live="polite">
                  {items.map((it, i) => (
                    <div
                      key={i}
                      className={`ty-img${i === shown ? ' on' : ''}`}
                      dangerouslySetInnerHTML={{ __html: svgMarkup(it.illustrationSvg) }}
                    />
                  ))}
                  {c.showCaption !== false && current ? (
                    <div className="ty-cap">
                      <span>{`${pad2(Math.min(shown, items.length - 1) + 1)} / ${pad2(items.length)}`}</span>
                      <span>{current.title}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="ty-acc">
              {items.map((it, i) => {
                const isOpen = open === i;
                const chips = (it.chips || []).filter((s) => String(s || '').trim());
                return (
                  <div key={i} className={`ty-item${isOpen ? ' open' : ''}`}>
                    <button
                      type="button"
                      className="ty-head"
                      aria-expanded={isOpen}
                      aria-controls={`ty-p-${uid}-${i}`}
                      id={`ty-h-${uid}-${i}`}
                      onClick={() => {
                        setSel(isOpen ? { key: selKey, open: -1, shown } : { key: selKey, open: i, shown: i });
                      }}
                    >
                      <span className="ty-num">{pad2(i + 1)}</span>
                      <span className="ty-title">{it.title}</span>
                      <span className="ty-ico" aria-hidden="true" />
                    </button>
                    <div className="ty-panel" id={`ty-p-${uid}-${i}`} role="region" aria-labelledby={`ty-h-${uid}-${i}`}>
                      <div className="ty-inner">
                        <div className="ty-body">
                          <p>{it.body}</p>
                          {String(it.bestFor || '').trim() ? (
                            <div className="ty-best">
                              <b>{c.bestForLabel || 'Best for'}</b> {it.bestFor}
                            </div>
                          ) : null}
                          {chips.length ? (
                            <div className="ty-chips">
                              {chips.map((chip, k) => (
                                <span key={k}>{chip}</span>
                              ))}
                            </div>
                          ) : null}
                          {String(it.ctaLabel || '').trim() ? (
                            <a href={appHref(it.ctaHref || '#')} className="ty-btn">
                              <span>{it.ctaLabel}</span>
                              <i>→</i>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </SolPage>
  );
}

/* ------------------------------------------------------------------ */
/* EPC process                                                         */
/* ------------------------------------------------------------------ */

export function SolarProcessSection({ content, sectionKey }: SectionProps) {
  const c = withSolarDefaults<SolarProcessContent>('solar_process', content);
  const ref = useRef<HTMLElement>(null);
  useSolFx(ref, sigOf(c));
  const steps = (c.steps || []).filter((s) => !s.hidden);
  return (
    <SolPage>
      <section ref={ref} className="section section-iceblue" id={sectionKey || 'process'} style={boxStyle(c.section)}>
        <div className="container">
          <SolHeadBlock head={c.head} />
          {steps.length ? (
            <div className="steps-row" data-sol-view="" style={vars({ '--sol-n': steps.length })}>
              <div className="steps-line">
                <span />
              </div>
              {steps.map((s, i) => (
                <div className="step-col reveal" key={i} style={vars({ '--sc': s.color })}>
                  <div className="step-node">
                    <SolIcon svg={s.icon} />
                  </div>
                  <div>
                    <span className="s-tag">{`${c.stepPrefix || 'STEP'} ${pad2(i + 1)}`.trim()}</span>
                    <h5>{s.title}</h5>
                    <p>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <SolCtas ctas={c.ctas} />
        </div>
      </section>
    </SolPage>
  );
}

/* ------------------------------------------------------------------ */
/* O&M performance (intro, dashboard, ROI calculator, services)        */
/* ------------------------------------------------------------------ */

const BAR_MAX = 105;
const BAR_BASE = 150;
const DONUT_LEN = 251.3;

function OutputChart({ o }: { o: SolarPerformanceContent['dashboard']['output'] }) {
  const bars = (o.bars || []).filter((b): b is SolarBar => Boolean(b));
  const n = Math.max(1, bars.length);
  const width = 40 * n + 60;
  const h = (v: unknown) => (BAR_MAX * Math.max(0, Math.min(100, num(v, 0)))) / 100;
  const last = bars[bars.length - 1];
  const gx = 16 + 40 * n + 6;
  const y1 = last ? BAR_BASE - h(last.with) : 0;
  const y2 = last ? BAR_BASE - h(last.without) : 0;
  const lo = Math.min(y1, y2);
  const hi = Math.max(y1, y2);
  return (
    <svg viewBox={`0 0 ${width} 180`} className="chart-svg">
      <g stroke="rgba(10,22,40,0.08)">
        <line x1="10" y1="45" x2={width - 10} y2="45" />
        <line x1="10" y1="97" x2={width - 10} y2="97" />
        <line x1="10" y1="150" x2={width - 10} y2="150" />
      </g>
      {bars.map((b, i) => (
        <Fragment key={i}>
          <rect
            className="bar bar-a"
            x={16 + 40 * i}
            y={(BAR_BASE - h(b.without)).toFixed(1)}
            width="14"
            height={h(b.without).toFixed(1)}
            rx="2"
            style={{ transitionDelay: `${i * 90}ms` }}
          />
          <rect
            className="bar bar-b"
            x={32 + 40 * i}
            y={(BAR_BASE - h(b.with)).toFixed(1)}
            width="14"
            height={h(b.with).toFixed(1)}
            rx="2"
            style={{ transitionDelay: `${i * 90 + 60}ms` }}
          />
          <text x={31 + 40 * i} y="168" className="ax">
            {b.label}
          </text>
        </Fragment>
      ))}
      {last && hi - lo > 12 ? (
        <g className="gap-mark">
          <line x1={gx} y1={lo.toFixed(1)} x2={gx} y2={hi.toFixed(1)} stroke="#FF6B1A" strokeWidth="1.5" strokeDasharray="3 3" />
          <path
            d={`M${gx - 4} ${(lo + 6).toFixed(1)} L${gx} ${lo.toFixed(1)} L${gx + 4} ${(lo + 6).toFixed(1)} M${gx - 4} ${(hi - 6).toFixed(1)} L${gx} ${hi.toFixed(1)} L${gx + 4} ${(hi - 6).toFixed(1)}`}
            stroke="#FF6B1A"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          {String(o.gapLabel || '').trim() ? (
            <text
              x={gx + 14}
              y={((lo + hi) / 2).toFixed(1)}
              className="gap-lbl"
              transform={`rotate(-90 ${gx + 14} ${((lo + hi) / 2).toFixed(1)})`}
            >
              {o.gapLabel}
            </text>
          ) : null}
        </g>
      ) : null}
    </svg>
  );
}

function LossDonut({ l }: { l: SolarPerformanceContent['dashboard']['losses'] }) {
  const segs = (l.segments || []).filter((s) => s && num(s.value, 0) > 0);
  const lengths = segs.map((s) => (num(s.value, 0) / 100) * DONUT_LEN);
  const offsets = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 120 120" className="donut-svg">
        <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(10,22,40,0.06)" strokeWidth="16" />
        {segs.map((s, i) => (
          <circle
            key={i}
            className="seg"
            cx="60"
            cy="60"
            r="40"
            fill="none"
            stroke={s.color}
            strokeWidth="16"
            style={vars({ '--d': `${lengths[i].toFixed(1)}px` })}
            strokeDashoffset={(-offsets[i]).toFixed(1)}
            transform="rotate(-90 60 60)"
          />
        ))}
      </svg>
      <ul className="donut-legend">
        {(l.segments || []).map((s, i) => (
          <li key={i}>
            <i style={{ background: s.color }} />
            {s.label}
            <b>{num(s.value, 0)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function fmtMoney(n: number, currency: string) {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e7) return `${s}${currency}${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${s}${currency}${(a / 1e5).toFixed(2)} L`;
  return `${s}${currency}${Math.round(a).toLocaleString('en-IN')}`;
}

type RoiResult = { size: string; capex: string; payback: string; net: string; summary: string };

function computeRoi(cfg: SolarRoiModal, bill: number, tariff: number): RoiResult {
  const a = cfg.assumptions || ({} as SolarRoiModal['assumptions']);
  const offset = num(a.offset, 0.8);
  const cost = num(a.costPerKw, 45000);
  const yld = num(a.yieldPerKwDay, 4.2);
  const esc = num(a.tariffEscalation, 0.03);
  const deg = num(a.degradation, 0.007);
  const omPct = num(a.omPct, 0.01);
  const co2 = num(a.co2KgPerKwh, 0.82);
  const cur = cfg.currency ?? '₹';
  const kw = Math.max((bill / tariff * offset) / (yld * 30.4), 0.1);
  const capex = kw * cost;
  const gen1 = kw * yld * 365;
  const omCost = capex * omPct;
  let cum = -capex;
  let prev = cum;
  let payback: number | null = null;
  for (let y = 1; y <= 25; y++) {
    cum += gen1 * Math.pow(1 - deg, y - 1) * tariff * Math.pow(1 + esc, y - 1) - omCost;
    if (payback === null && cum >= 0) payback = y - 1 + -prev / (cum - prev);
    prev = cum;
  }
  const summary = (cfg.summaryTemplate || '')
    .replace('{year1}', fmtMoney(gen1 * tariff - omCost, cur))
    .replace('{co2}', ((gen1 * co2) / 1000).toFixed(1));
  return {
    size: `${kw.toFixed(1)} kW`,
    capex: fmtMoney(capex, cur),
    payback: payback === null ? '25+ yrs' : `${payback.toFixed(1)} yrs`,
    net: fmtMoney(cum, cur),
    summary,
  };
}

function RoiModal({ cfg, open, onClose }: { cfg: SolarRoiModal; open: boolean; onClose: () => void }) {
  const uid = useId().replace(/:/g, '');
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [bill, setBill] = useState(String(num(cfg.billDefault, 150000)));
  const [tariff, setTariff] = useState(String(num(cfg.tariffDefault, 8)));
  const [error, setError] = useState('');
  const [result, setResult] = useState<RoiResult | null>(null);
  const billRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => billRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);

  const calc = () => {
    const b = parseFloat(bill);
    const t = parseFloat(tariff);
    if (!(b > 0) || !(t > 0)) {
      setError(cfg.errorText || 'Please enter a monthly bill and tariff greater than zero.');
      setResult(null);
      return;
    }
    setError('');
    setResult(computeRoi(cfg, b, t));
  };
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') calc();
  };

  if (!mounted) return null;
  return createPortal(
    <div className="sol-page">
      <div className={`modal${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-labelledby={`roi-title-${uid}`} aria-hidden={!open}>
        <div className="modal-backdrop" onClick={onClose} />
        <div className="modal-dialog">
          <button type="button" className="modal-close" aria-label={cfg.closeLabel || 'Close calculator'} onClick={onClose}>
            ×
          </button>
          <div className="modal-head">
            {String(cfg.badge || '').trim() ? (
              <span className="free-badge" style={{ margin: '0 0 0.6rem' }}>
                {cfg.badge}
              </span>
            ) : null}
            <h3 id={`roi-title-${uid}`}>{cfg.title}</h3>
            {String(cfg.subtitle || '').trim() ? <p>{cfg.subtitle}</p> : null}
          </div>
          <div className="m-field">
            <label htmlFor={`m-bill-${uid}`}>
              {cfg.billLabel} {cfg.billUnit ? <em>{cfg.billUnit}</em> : null}
            </label>
            <input
              id={`m-bill-${uid}`}
              ref={billRef}
              type="number"
              inputMode="numeric"
              min={num(cfg.billMin, 1000)}
              step={num(cfg.billStep, 1000)}
              value={bill}
              onChange={(e) => setBill(e.target.value)}
              onKeyDown={onEnter}
            />
          </div>
          <div className="m-field">
            <label htmlFor={`m-tariff-${uid}`}>
              {cfg.tariffLabel} {cfg.tariffUnit ? <em>{cfg.tariffUnit}</em> : null}
            </label>
            <input
              id={`m-tariff-${uid}`}
              type="number"
              inputMode="decimal"
              min={num(cfg.tariffMin, 1)}
              step={num(cfg.tariffStep, 0.1)}
              value={tariff}
              onChange={(e) => setTariff(e.target.value)}
              onKeyDown={onEnter}
            />
          </div>
          <button type="button" className="btn btn-primary m-calc" onClick={calc}>
            {cfg.calcLabel}
          </button>
          <p className="m-error" role="alert">
            {error}
          </p>
          <div className={`m-results${result ? ' show' : ''}`}>
            <div className="m-kpis">
              <div className="m-kpi">
                <small>{cfg.kpiSize}</small>
                <b>{result?.size ?? '–'}</b>
              </div>
              <div className="m-kpi">
                <small>{cfg.kpiInvestment}</small>
                <b>{result?.capex ?? '–'}</b>
              </div>
              <div className="m-kpi">
                <small>{cfg.kpiPayback}</small>
                <b>{result?.payback ?? '–'}</b>
              </div>
              <div className="m-kpi hl">
                <small>{cfg.kpiNet}</small>
                <b>{result?.net ?? '–'}</b>
              </div>
            </div>
            <p className="m-sum">{result?.summary}</p>
            {String(cfg.ctaLabel || '').trim() ? (
              <a href={appHref(cfg.ctaHref || '#contact')} className="btn btn-primary btn-sm" onClick={onClose}>
                {cfg.ctaLabel}
              </a>
            ) : null}
          </div>
          {String(cfg.assumptionsText || '').trim() ? <p className="m-assume">{cfg.assumptionsText}</p> : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function SolarPerformanceSection({ content, sectionKey }: SectionProps) {
  const c = withSolarDefaults<SolarPerformanceContent>('solar_performance', content);
  const ref = useRef<HTMLElement>(null);
  useSolFx(ref, sigOf(c));
  const [roiOpen, setRoiOpen] = useState(false);
  const closeRoi = useCallback(() => setRoiOpen(false), []);
  const { intro, dashboard: d, roi, services } = c;
  const paragraphs = (intro?.paragraphs || []).filter((p) => String(p || '').trim());
  const introItems = (intro?.card?.items || []).filter((p) => String(p || '').trim());
  const showIntro = Boolean(intro && !intro.hidden);
  const showDash = Boolean(d && !d.hidden);
  const showRoi = Boolean(roi && !roi.hidden);
  const svc = (services?.items || []).filter((s) => !s.hidden);
  const monitor = d?.monitor;
  const health = d?.health;
  const gaugeValue = Math.max(0, Math.min(100, num(health?.value, 0)));
  return (
    <SolPage>
      <section ref={ref} className="section section-light" id={sectionKey || 'performance'} style={boxStyle(c.section)}>
        <div className="container">
          {showIntro ? (
            <div className="om-intro">
              <div className="reveal">
                <SolEyebrowEl el={intro.eyebrow} />
                <AzText el={intro.title} defaultTag="h2" />
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <div className="om-intro-card reveal">
                {String(intro.card?.title || '').trim() ? <h5>{intro.card.title}</h5> : null}
                {introItems.length ? (
                  <ul className="two-col-list">
                    {introItems.map((li, i) => (
                      <li key={i}>{li}</li>
                    ))}
                  </ul>
                ) : null}
                {(intro.card?.ctas || [])
                  .filter((cta) => String(cta.label || '').trim())
                  .map((cta, i) => (
                    <a key={i} href={appHref(cta.href || '#')} className={`btn btn-${cta.variant || 'primary'}`} style={elementCss(cta.style)}>
                      {cta.label}
                    </a>
                  ))}
              </div>
            </div>
          ) : null}

          {showDash || showRoi ? (
            <div className="om-row">
              {showDash ? (
                <div className="om-dash">
                  {(d.orbs || []).map((o, i) => (
                    <SolOrbEl key={i} orb={o} />
                  ))}
                  <div className="om-block-head reveal">
                    <SolEyebrowEl el={d.eyebrow} />
                    <AzText el={d.title} defaultTag="h3" />
                  </div>
                  <div className="om-dash-grid">
                    {monitor && !monitor.hidden ? (
                      <div className="om-card dash-card reveal" data-sol-view="">
                        <div className="om-head">
                          <span>{monitor.title}</span>
                          {String(monitor.liveLabel || '').trim() ? <span className="om-live">{monitor.liveLabel}</span> : null}
                        </div>
                        <div className="om-chart">
                          <svg viewBox="0 0 420 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <linearGradient id="omGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FF6B1A" stopOpacity="0.45" />
                                <stop offset="100%" stopColor="#FF6B1A" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <g stroke="rgba(255,255,255,0.08)">
                              <line x1="0" y1="40" x2="420" y2="40" />
                              <line x1="0" y1="90" x2="420" y2="90" />
                              <line x1="0" y1="140" x2="420" y2="140" />
                              <line x1="0" y1="185" x2="420" y2="185" />
                            </g>
                            {monitor.areaPath?.trim() ? <path className="om-area" d={monitor.areaPath} fill="url(#omGrad)" /> : null}
                            {monitor.linePath?.trim() ? <path className="om-line" d={monitor.linePath} stroke="#FF6B1A" strokeWidth="3" strokeLinecap="round" /> : null}
                          </svg>
                        </div>
                        <div className="om-metrics">
                          {(monitor.metrics || []).map((m, i) => (
                            <div className="om-metric" key={i}>
                              <b>{m.value}</b>
                              <small>{m.label}</small>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {d.output && !d.output.hidden ? (
                      <div className="chart-card dash-card anim-on-view reveal">
                        <h5>{d.output.title}</h5>
                        <p className="c-sub">{d.output.sub}</p>
                        <OutputChart o={d.output} />
                        <div className="c-legend">
                          <span>
                            <i style={{ background: '#64748B' }} />
                            {d.output.withoutLabel}
                          </span>
                          <span>
                            <i style={{ background: 'var(--orange)' }} />
                            {d.output.withLabel}
                          </span>
                        </div>
                      </div>
                    ) : null}
                    {d.losses && !d.losses.hidden ? (
                      <div className="chart-card dash-card anim-on-view reveal">
                        <h5>{d.losses.title}</h5>
                        <p className="c-sub">{d.losses.sub}</p>
                        <LossDonut l={d.losses} />
                      </div>
                    ) : null}
                    {health && !health.hidden ? (
                      <div className="chart-card dash-card anim-on-view reveal">
                        <h5>{health.title}</h5>
                        <p className="c-sub">{health.sub}</p>
                        <svg viewBox="0 0 200 125" className="gauge-svg">
                          <defs>
                            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#FF6B1A" />
                              <stop offset="100%" stopColor="#12B76A" />
                            </linearGradient>
                          </defs>
                          <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgba(10,22,40,0.08)" strokeWidth="16" strokeLinecap="round" />
                          <path
                            className="gauge-fill"
                            d="M20 100 A80 80 0 0 1 180 100"
                            fill="none"
                            stroke="url(#gaugeGrad)"
                            strokeWidth="16"
                            strokeLinecap="round"
                            strokeDasharray={DONUT_LEN}
                            style={vars({ '--g': (DONUT_LEN * (1 - gaugeValue / 100)).toFixed(1) })}
                          />
                          <text x="100" y="92" textAnchor="middle" className="g-num">{`${gaugeValue}%`}</text>
                          <text x="100" y="112" textAnchor="middle" className="g-lbl">
                            {health.label}
                          </text>
                        </svg>
                        <div className="c-legend">
                          {(health.legend || []).map((l, i) => (
                            <span key={i}>
                              <i style={{ background: l.color }} />
                              {l.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {String(d.note || '').trim() ? <p className="chart-note">{d.note}</p> : null}
                </div>
              ) : null}

              {showRoi ? (
                <div className="roi-cta reveal" id="roi">
                  <SolOrbEl orb={roi.orb} />
                  <div className="roi-cta-copy">
                    {String(roi.badge || '').trim() ? (
                      <span className="free-badge" style={{ margin: '0 0 0.8rem' }}>
                        {roi.badge}
                      </span>
                    ) : null}
                    <h3>{roi.title}</h3>
                    <p>{roi.body}</p>
                    {(roi.points || []).length ? (
                      <div className="roi-cta-pts">
                        {(roi.points || []).map((p, i) => (
                          <span key={i}>{p}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="roi-cta-action">
                    <div className="roi-cta-icon">
                      <SolIcon svg={roi.icon} />
                    </div>
                    <button type="button" className="btn btn-primary" onClick={() => setRoiOpen(true)}>
                      {roi.buttonLabel}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {services && !services.hidden && svc.length ? (
            <>
              <div className="om-block-head reveal">
                <SolEyebrowEl el={services.eyebrow} />
                <AzText el={services.title} defaultTag="h3" />
              </div>
              <div className="om-svc-grid">
                {svc.map((s, i) => (
                  <div className="om-svc reveal" key={i} style={vars({ '--oc': s.color })}>
                    <div className="om-svc-icon">
                      <SolIcon svg={s.icon} />
                    </div>
                    <div>
                      <h5>{s.title}</h5>
                      <p>{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <SolCtas ctas={c.ctas} />
        </div>
      </section>
      {showRoi ? <RoiModal cfg={roi.modal} open={roiOpen} onClose={closeRoi} /> : null}
    </SolPage>
  );
}

/* ------------------------------------------------------------------ */
/* Expertise                                                           */
/* ------------------------------------------------------------------ */

export function SolarExpertiseSection({ content, sectionKey }: SectionProps) {
  const c = withSolarDefaults<SolarExpertiseContent>('solar_expertise', content);
  const ref = useRef<HTMLElement>(null);
  useSolFx(ref, sigOf(c));
  const cards = (c.cards || []).filter((card) => !card.hidden);
  const strip = (c.strip || []).filter((s) => String(s || '').trim());
  return (
    <SolPage>
      <section ref={ref} className="section expertise-section" id={sectionKey || 'expertise'} style={boxStyle(c.section, { '--sec-img': cssUrl(c.bgImage) })}>
        <div className="container">
          <SolHeadBlock head={c.head} />
          {cards.length ? (
            <div className="exp-grid">
              {cards.map((card, i) => (
                <div className="exp-card reveal" key={i}>
                  {String(card.num || '').trim() ? <span className="e-num">{card.num}</span> : null}
                  <h4>{card.title}</h4>
                  <p>{card.body}</p>
                </div>
              ))}
            </div>
          ) : null}
          {strip.length ? (
            <div className="tech-strip">
              {strip.map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </div>
          ) : null}
          <SolCtas ctas={c.ctas} />
        </div>
      </section>
    </SolPage>
  );
}

/* ------------------------------------------------------------------ */
/* Inverters                                                           */
/* ------------------------------------------------------------------ */

export function SolarInvertersSection({ content, sectionKey }: SectionProps) {
  const c = withSolarDefaults<SolarInvertersContent>('solar_inverters', content);
  const ref = useRef<HTMLElement>(null);
  useSolFx(ref, sigOf(c));
  const cards = (c.cards || []).filter((card) => !card.hidden);
  const services = (c.services || []).filter((s) => !s.hidden);
  const flow = svgMarkup(c.flow?.svg);
  return (
    <SolPage>
      <section ref={ref} className="section section-light" id={sectionKey || 'inverters'} style={boxStyle(c.section)}>
        <div className="container">
          <SolHeadBlock head={c.head} />
          {!c.flow?.hidden && flow ? <div className="inv-flow reveal" dangerouslySetInnerHTML={{ __html: flow }} /> : null}
          {cards.length ? (
            <div className="inv-grid">
              {cards.map((card, i) => (
                <div className="inv-card reveal" key={i} style={vars({ '--ic': card.color })}>
                  <div className="inv-icon">
                    <SolIcon svg={card.icon} />
                  </div>
                  <h4>{card.title}</h4>
                  <p>{card.body}</p>
                  {String(card.best || '').trim() ? <span className="inv-best">{card.best}</span> : null}
                </div>
              ))}
            </div>
          ) : null}
          {services.length ? (
            <>
              {String(c.servicesTitle || '').trim() ? (
                <div className="inv-services-head reveal">
                  <h3>{c.servicesTitle}</h3>
                </div>
              ) : null}
              <div className="inv-serv-grid">
                {services.map((s, i) => (
                  <div className="inv-serv reveal" key={i}>
                    <span className="inv-tick" />
                    <div>
                      <h5>{s.title}</h5>
                      <p>{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <SolCtas ctas={c.ctas} className="inv-cta" />
        </div>
      </section>
    </SolPage>
  );
}

/* ------------------------------------------------------------------ */
/* Who we power / Projects (marquees)                                  */
/* ------------------------------------------------------------------ */

export function SolarIndustriesSection({ content, sectionKey }: SectionProps) {
  const c = withSolarDefaults<SolarIndustriesContent>('solar_industries', content);
  const pills = (c.pills || []).filter((p) => !p.hidden && String(p.label || '').trim());
  return (
    <SolPage>
      <section className="section industries-section" id={sectionKey || 'industries'} style={boxStyle(c.section)}>
        <div className="container">
          <SolHeadBlock head={c.head} />
        </div>
        {pills.length ? (
          <div className={`marquee${c.reverse ? ' rev' : ''}`}>
            <div className="marquee-track" style={vars({ '--dur': `${num(c.durationSeconds, 80)}s` })}>
              {[0, 1].map((copy) => (
                <Fragment key={copy}>
                  {pills.map((p, i) => (
                    <span key={i} className={`ind-pill${p.residential ? ' res' : ''}`} aria-hidden={copy ? true : undefined}>
                      <i />
                      {p.label}
                    </span>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        ) : null}
        <div className="container">
          <SolCtas ctas={c.ctas} />
        </div>
      </section>
    </SolPage>
  );
}

export function SolarProjectsSection({ content, sectionKey }: SectionProps) {
  const c = withSolarDefaults<SolarProjectsContent>('solar_projects', content);
  const items = (c.items || []).filter((p) => !p.hidden && (String(p.title || '').trim() || String(p.image || '').trim()));
  return (
    <SolPage>
      <section className="section section-light" id={sectionKey || 'projects'} style={boxStyle(c.section)}>
        <div className="container">
          <SolHeadBlock head={c.head} />
        </div>
        {items.length ? (
          <div className={`marquee${c.reverse === false ? '' : ' rev'} proj-row`}>
            <div className="marquee-track" style={vars({ '--dur': `${num(c.durationSeconds, 70)}s` })}>
              {[0, 1].map((copy) => (
                <Fragment key={copy}>
                  {items.map((p, i) => {
                    const inner = (
                      <>
                        <div className="proj-thumb">
                          {mediaSrc(p.image) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mediaSrc(p.image)} alt={copy ? '' : p.title} loading="lazy" style={{ objectPosition: p.position?.trim() || undefined }} />
                          ) : null}
                          {String(p.tag || '').trim() ? <span className="proj-tag">{p.tag}</span> : null}
                        </div>
                        <div className="proj-meta">
                          <h5>{p.title}</h5>
                          <p>{p.body}</p>
                        </div>
                      </>
                    );
                    return p.href?.trim() ? (
                      <a key={i} className="proj-chip" href={appHref(p.href)} aria-hidden={copy ? true : undefined} tabIndex={copy ? -1 : undefined}>
                        {inner}
                      </a>
                    ) : (
                      <div key={i} className="proj-chip" aria-hidden={copy ? true : undefined}>
                        {inner}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        ) : null}
        <div className="container">
          <SolCtas ctas={c.ctas} />
        </div>
      </section>
    </SolPage>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

export function SolarCtaSection({ content, sectionKey }: SectionProps) {
  const c = withSolarDefaults<SolarCtaContent>('solar_cta', content);
  return (
    <SolPage>
      <section className="cta-band has-orbs" id={sectionKey || 'contact'} style={boxStyle(c.section)}>
        <SolOrbEl orb={c.orb} />
        <div className="container">
          <AzText el={c.title} defaultTag="h2" />
          <AzText el={c.body} defaultTag="p" />
          <SolCtas ctas={c.ctas} className="cta-actions" />
        </div>
      </section>
    </SolPage>
  );
}

export function renderSolarSection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'solar_hero':
      return <SolarHeroSection key={key} {...rest} />;
    case 'solar_delivery':
      return <SolarDeliverySection key={key} {...rest} />;
    case 'solar_banner':
      return <SolarBannerSection key={key} {...rest} />;
    case 'solar_e2e':
      return <SolarE2eSection key={key} {...rest} />;
    case 'solar_types':
      return <SolarTypesSection key={key} {...rest} />;
    case 'solar_process':
      return <SolarProcessSection key={key} {...rest} />;
    case 'solar_performance':
      return <SolarPerformanceSection key={key} {...rest} />;
    case 'solar_expertise':
      return <SolarExpertiseSection key={key} {...rest} />;
    case 'solar_inverters':
      return <SolarInvertersSection key={key} {...rest} />;
    case 'solar_industries':
      return <SolarIndustriesSection key={key} {...rest} />;
    case 'solar_projects':
      return <SolarProjectsSection key={key} {...rest} />;
    case 'solar_cta':
      return <SolarCtaSection key={key} {...rest} />;
    default:
      return null;
  }
}
