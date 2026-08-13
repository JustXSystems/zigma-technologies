'use client';

import { useEffect, useRef, useState } from 'react';
import type { CmsSection } from '@/lib/cms-types';
import EnquiryFormSection from '@/components/sections/EnquiryFormSection';
import CareersApplySection from '@/components/sections/CareersApplySection';
import CertMarquee, { normalizeCertItems } from '@/components/sections/CertMarquee';
import EcoVisual from '@/components/sections/EcoVisual';
import { HERO_SLIDE_ICONS } from '@/lib/hero-icons';
import { featIconFor } from '@/lib/feat-icons';
import { indIconFor } from '@/lib/ind-icons';
import { statIconFor } from '@/lib/stat-icons';
import { useScrollReveal } from '@/lib/use-scroll-reveal';
import { focusApplyRole } from '@/lib/careers-apply';
import type { CatalogItem } from '@/lib/types';

type Slide = {
  theme: string;
  eyebrow: string;
  title: string;
  lead: string;
  cta: string;
  ctaHref: string;
  tags: string[];
  image: string;
  numeral?: string;
  iconHtml?: string;
};

function HeroSection({ content }: { content: Record<string, unknown> }) {
  const slides = (content.slides as Slide[]) || [];
  const [current, setCurrent] = useState(0);
  const [fillKey, setFillKey] = useState(0);
  const [timerTick, setTimerTick] = useState(0);

  useEffect(() => {
    if (!slides.length) return;
    const t = setInterval(() => {
      setCurrent((p) => (p + 1) % slides.length);
      setFillKey((k) => k + 1);
    }, 6000);
    return () => clearInterval(t);
  }, [slides.length, timerTick]);

  const goToSlide = (i: number) => {
    setCurrent(i);
    setFillKey((k) => k + 1);
    setTimerTick((n) => n + 1);
  };

  if (!slides.length) return null;

  return (
    <section className="hero-slider" id="home">
      {slides.map((slide, i) => {
        const icon = HERO_SLIDE_ICONS[slide.theme];
        const iconHtml = slide.iconHtml || icon?.html;
        return (
          <div key={i} className={`slide ${slide.theme} ${i === current ? 'active' : ''}`} data-index={i}>
            <div className="slide-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="slide-img" src={slide.image} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
              <div className="slide-scrim"></div>
              <div className="grid-overlay"></div>
              <div className="tint"></div>
            </div>
            {slide.numeral ? <div className="big-numeral">{slide.numeral}</div> : null}
            {iconHtml ? (
              <svg
                className="slide-icon"
                viewBox={icon?.viewBox || '0 0 400 400'}
                fill="none"
                strokeWidth={icon?.strokeWidth || '1.6'}
                dangerouslySetInnerHTML={{ __html: iconHtml }}
              />
            ) : null}
            <div className="container">
              <div className="slide-content">
                <div className="eyebrow">{slide.eyebrow}</div>
                <h1>{slide.title}</h1>
                <p className="lead">{slide.lead}</p>
                <a href={slide.ctaHref} className="slide-cta">
                  {slide.cta}
                </a>
              </div>
              <div className="tag-dock">
                {slide.tags?.map((tag) => (
                  <span key={tag} className="tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      <div className="dot-nav" id="dotNav">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            className={i === current ? 'active' : ''}
            onClick={() => goToSlide(i)}
            data-goto={i}
            aria-label={`Go to slide ${i + 1}`}
          >
            <span key={`${i}-${fillKey}`} className={`fill ${i === current ? 'run' : ''}`}></span>
          </button>
        ))}
      </div>
    </section>
  );
}

function EcoSection({ content }: { content: Record<string, unknown> }) {
  const groups = (content.groups as Array<{ className: string; items: string[]; dot: string }>) || [];
  return (
    <section className="eco-section">
      <div className="container">
        <div className="eco-grid">
          <div className="eco-visual">
            <EcoVisual />
          </div>
          <div className="eco-text">
            <div className="eyebrow eyebrow-orange">{String(content.eyebrow || '')}</div>
            <h2>{String(content.title || '')}</h2>
            <p>{String(content.body || '')}</p>
            <div className="cap-checklist">
              {groups.map((g) => (
                <div key={g.className} className={`cap-group ${g.className}`}>
                  {g.items.map((item) => (
                    <div key={item} className="cap-check">
                      <span className={`dot ${g.dot}`}></span>
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mini-trust">
              <div className="mstat">
                <span className="badge-iso">ISO-ALIGNED PROCESS</span>
                <div className="lbl mt-04">Quality Certified</div>
              </div>
            </div>
            <a href={String(content.ctaHref || '#why')} className="btn btn-primary">
              {String(content.cta || 'Learn more')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection({ content }: { content: Record<string, unknown> }) {
  const stats =
    (content.stats as Array<{ label: string; value: number; suffix?: string; icon?: string }>) || [];
  const rootRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<number[]>(() => stats.map(() => 0));
  const started = useRef<Set<number>>(new Set());

  useEffect(() => {
    setValues(stats.map(() => 0));
    started.current = new Set();
  }, [stats]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !stats.length) return;

    const counters = root.querySelectorAll<HTMLElement>('.num[data-count]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const idx = Number(el.dataset.idx);
          if (Number.isNaN(idx) || started.current.has(idx)) return;
          started.current.add(idx);

          const target = parseInt(el.dataset.count || '0', 10);
          const duration = 1400;
          const start = performance.now();

          function tick(now: number) {
            const progress = Math.min((now - start) / duration, 1);
            const current = Math.floor(progress * target);
            setValues((prev) => {
              const next = [...prev];
              next[idx] = progress < 1 ? current : target;
              return next;
            });
            if (progress < 1) requestAnimationFrame(tick);
          }

          requestAnimationFrame(tick);
          observer.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [stats]);

  return (
    <div className="stat-bar" ref={rootRef}>
      <div className="container stat-grid">
        {stats.map((s, i) => (
          <div className="stat" key={s.label}>
            <div
              className="stat-icon"
              aria-hidden="true"
              dangerouslySetInnerHTML={{
                __html: `<svg viewBox="0 0 24 24">${statIconFor(s.label, i, s.icon)}</svg>`,
              }}
            />
            <div className="num" data-count={s.value} data-idx={i}>
              {values[i] ?? 0}
              <span className="plus">{s.suffix || '+'}</span>
            </div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhySection({ content, sectionKey }: { content: Record<string, unknown>; sectionKey?: string | null }) {
  const cards =
    (content.cards as Array<{ index: string; title: string; desc: string; tint: string }>) || [];
  const tone =
    content.tone === 'gray' ? 'section-gray' : content.tone === 'dark' ? 'section-dark' : 'section-light';
  return (
    <section className={`section ${tone} why-section`} id={sectionKey || 'why'}>
      <div className="container">
        <div className="section-head reveal">
          <div className="eyebrow eyebrow-orange">{String(content.eyebrow || '')}</div>
          <h2>{String(content.title || '')}</h2>
          <p>{String(content.body || '')}</p>
        </div>
        <div className="why-grid">
          {cards.map((card) => (
            <div key={card.index} className={`why-card is-animated ${card.tint} reveal`}>
              <svg className="card-outline" width="100%" height="100%">
                <rect className="outline-base" x="0" y="0" width="100%" height="100%" rx="10" pathLength="100" />
                <rect className="outline-highlight" x="0" y="0" width="100%" height="100%" rx="10" pathLength="100" />
              </svg>
              <div className="why-index">{card.index}</div>
              <h4>{card.title}</h4>
              <p>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TimelineSection({ content, sectionKey }: { content: Record<string, unknown>; sectionKey?: string | null }) {
  const items =
    (content.items as Array<{ year: string; title: string; body: string; now?: boolean; next?: boolean }>) ||
    [];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const activeIdxRef = useRef<number | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const runner = runnerRef.current;
    if (!scroller || !runner || !items.length) return;

    const stopIndexes = items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => !item.next)
      .map(({ i }) => i);
    if (!stopIndexes.length) return;

    let cancelled = false;
    let running = false;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      });

    function highlight(idx: number | null) {
      activeIdxRef.current = idx;
      setActiveIdx(idx);
    }

    function positionFor(itemEl: HTMLElement) {
      const dot = itemEl.querySelector('.timeline-dot') as HTMLElement | null;
      if (!dot || !scroller || !runner) return { left: 0, top: 0 };
      const dotRect = dot.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      return {
        left:
          dotRect.left -
          scrollerRect.left +
          scroller.scrollLeft +
          dotRect.width / 2 -
          runner.offsetWidth / 2,
        top: dotRect.top - scrollerRect.top + dotRect.height / 2 - runner.offsetHeight / 2,
      };
    }

    function placeRunner(itemEl: HTMLElement, instant: boolean) {
      if (!runner) return;
      const pos = positionFor(itemEl);
      if (instant) runner.style.transition = 'none';
      runner.style.left = `${pos.left}px`;
      runner.style.top = `${pos.top}px`;
      if (instant) {
        void runner.offsetWidth;
        runner.style.transition = '';
      }
    }

    async function run() {
      if (running || cancelled || !runner) return;
      running = true;
      const firstEl = itemRefs.current[stopIndexes[0]];
      if (!firstEl) return;

      placeRunner(firstEl, true);
      runner.style.opacity = '1';
      await wait(700);

      while (!cancelled) {
        for (const idx of stopIndexes) {
          if (cancelled) return;
          const el = itemRefs.current[idx];
          if (!el) continue;
          placeRunner(el, false);
          await wait(950);
          if (cancelled) return;
          highlight(idx);
          await wait(950);
        }
        if (cancelled) return;
        highlight(null);
        runner.style.opacity = '0';
        await wait(450);
        if (cancelled) return;
        const restart = itemRefs.current[stopIndexes[0]];
        if (restart) placeRunner(restart, true);
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
      const idx = activeIdxRef.current ?? stopIndexes[0];
      const el = itemRefs.current[idx];
      if (el) placeRunner(el, true);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  return (
    <section className="section section-dark" id={sectionKey || 'legacy'}>
      <div className="container">
        <div className="section-head">
          <div className="eyebrow eyebrow-cyan">{String(content.eyebrow || '')}</div>
          <h2>{String(content.title || '')}</h2>
        </div>
        <div className="timeline-scroller" ref={scrollerRef}>
          <div className="timeline-runner" ref={runnerRef} id="timelineRunner" />
          {items.map((item, i) => (
            <div
              key={`${item.year}-${item.title}`}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={`timeline-item ${item.now ? 'now' : ''} ${item.next ? 'next-item' : ''} ${
                activeIdx === i ? 'tl-active' : ''
              }`}
            >
              <div className="timeline-dot"></div>
              <div className="timeline-year">{item.year}</div>
              <h5>{item.title}</h5>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
        {content.cta ? (
          <a href={String(content.ctaHref || '#')} className="btn btn-ghost btn-sm mt-2">
            {String(content.cta)}
          </a>
        ) : null}
      </div>
    </section>
  );
}

function projectHighlight(item: CatalogItem): string | null {
  const s = item.specs_json;
  if (!s) return null;
  if (s.Highlight) return s.Highlight;
  if (s.Stat) return s.Stat;
  if (s.Uptime) return s.Uptime;
  if (s.Savings) {
    return /year/i.test(s.Savings) ? s.Savings : `${s.Savings}, year one`;
  }
  if (s['Grid dependency'] && s.Payback) {
    const pay = String(s.Payback).replace(/\s*years?/i, '-yr');
    return `${s['Grid dependency']} grid dependency · ${pay} payback`;
  }
  const vals = Object.values(s).filter(Boolean);
  return vals.length ? vals.slice(0, 2).join(' · ') : null;
}

function ProjectsTeaserSection({
  content,
  sectionKey,
}: {
  content: Record<string, unknown>;
  sectionKey?: string | null;
}) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const limit = Number(content.limit || 3);
  const source = String(content.source || 'catalog');

  function scopePreview(scope: string | undefined | null) {
    if (!scope) return null;
    const s = String(scope).replace(/\s+/g, ' ').trim();
    if (!s) return null;
    return s.length > 90 ? `${s.slice(0, 88)}…` : s;
  }

  useEffect(() => {
    const featured = content.featuredOnly === false ? '' : '&featured=1';
    const onlyCaseStudies = source === 'case_studies';

    // If we need case-studies only, fetch extra and filter client-side.
    const fetchLimit = onlyCaseStudies ? Math.max(6, limit * 4) : limit;
    fetch(`/api/public/catalog/project?limit=${fetchLimit}${featured}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) return;

        let list = (data.items || []) as CatalogItem[];

        if (onlyCaseStudies) {
          list = list.filter((i) => i.case_study_json && i.case_study_json.enabled !== false);
        }

        // Fallback if nothing matches featured / case-study filters
        if (!list.length) {
          const baseFeatured = featured ? '&featured=1' : '';
          const allRes = await fetch(`/api/public/catalog/project?limit=${fetchLimit}${baseFeatured}`).then((x) => x.json());
          const all = (allRes.items || []) as CatalogItem[];
          if (onlyCaseStudies) {
            list = all.filter((i) => i.case_study_json && i.case_study_json.enabled !== false);
          } else {
            list = all;
          }
        }

        setItems(list.slice(0, limit));
      })
      .catch(() => undefined);
  }, [limit, content.featuredOnly, source]);

  return (
    <section
      className={`section section-light projects-teaser ${
        source === 'case_studies' ? 'projects-teaser--case' : ''
      }`}
      id={sectionKey || 'projects'}
    >
      <div className="container">
        <div className="section-head">
          <div className="eyebrow eyebrow-orange">{String(content.eyebrow || '')}</div>
          <h2>{String(content.title || 'Featured projects')}</h2>
        </div>
        <div className="proj-grid">
          {items.map((item) => {
            const cs = item.case_study_json;
            const caseKicker =
              source === 'case_studies'
                ? cs?.client_sector || cs?.client_name || null
                : null;
            const caseOutcome1 = source === 'case_studies' ? cs?.outcomes?.[0] || null : null;
            const caseOutcome2 = source === 'case_studies' ? cs?.outcomes?.[1] || null : null;
            const caseScopeLine = source === 'case_studies' ? scopePreview(cs?.scope) : null;
            const caseSolutionLine = source === 'case_studies' ? scopePreview(cs?.solution) : null;
            const highlight = source === 'case_studies' ? caseOutcome1 : projectHighlight(item);
            return (
              <a
                key={item.id}
                href={`/projects/${encodeURIComponent(item.slug)}`}
                className={`proj-card projects-teaser-card ${source === 'case_studies' ? 'projects-teaser-card--case' : ''}`}
              >
                <div className="proj-media">
                  {item.primary_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.primary_image} alt={item.title} loading="lazy" />
                  ) : null}
                  <span className="tag">{item.category_name || 'PROJECT'}</span>
                </div>
                <div className="proj-body">
                  {caseKicker ? <div className="projects-teaser-case-kicker">{caseKicker}</div> : null}
                  <h5>{item.title}</h5>
                  {caseScopeLine ? <div className="projects-teaser-scope">{caseScopeLine}</div> : null}
                  {source === 'case_studies' && (caseOutcome1 || caseOutcome2) ? (
                    <div className="proj-stat proj-stat--case">
                      <div className="proj-stat-line proj-stat-line--primary">{caseOutcome1}</div>
                      {caseOutcome2 ? <div className="proj-stat-line proj-stat-line--secondary">{caseOutcome2}</div> : null}
                    </div>
                  ) : highlight ? (
                    <div className="proj-stat">{highlight}</div>
                  ) : null}
                  {source === 'case_studies' ? (
                    <p className="projects-teaser-solution">
                      {caseSolutionLine || item.summary}
                    </p>
                  ) : (
                    <p>{item.summary}</p>
                  )}
                  <span className="link">View case study →</span>
                </div>
              </a>
            );
          })}
        </div>
        <div className="text-center mt-26">
          <a href={String(content.ctaHref || '/projects')} className="btn btn-ghost-dark btn-sm">
            {String(content.cta || 'View All Projects →')}
          </a>
        </div>
      </div>
    </section>
  );
}

function IndustriesSection({
  content,
  sectionKey,
}: {
  content: Record<string, unknown>;
  sectionKey?: string | null;
}) {
  const items = (content.items as string[]) || [];
  return (
    <section className="section section-gray" id={sectionKey || 'industries'}>
      <div className="container">
        <div className="section-head center">
          <div className="eyebrow eyebrow-orange">{String(content.eyebrow || '')}</div>
          <h2>{String(content.title || '')}</h2>
          {content.linkLabel ? (
            <p>
              <a href={String(content.linkHref || '/industries')} className="link-orange-dim">
                {String(content.linkLabel)}
              </a>
            </p>
          ) : null}
        </div>
        <div className="ind-grid">
          {items.map((label) => {
            const href = industryHrefForLabel(label);
            const inner = (
              <>
                <svg
                  className="ind-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  dangerouslySetInnerHTML={{ __html: indIconFor(label) }}
                />
                <span>{label}</span>
              </>
            );
            return href ? (
              <a className="ind-item" key={label} href={href}>
                {inner}
              </a>
            ) : (
              <div className="ind-item" key={label}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function industryHrefForLabel(label: string): string | null {
  const l = label.toLowerCase();
  if (l.includes('health') || l.includes('hospital')) return '/industries/healthcare';
  if (l.includes('data center') || l.includes('data centre') || l.includes('digital infrastructure'))
    return '/industries/data-centres';
  if (l.includes('manufactur') || l.includes('automotive') || l.includes('industrial') || l.includes('oil'))
    return '/industries/manufacturing';
  if (l.includes('bank') || l.includes('financial')) return '/industries/banking';
  if (l.includes('educat') || l.includes('campus')) return '/industries/education';
  if (l.includes('airport') || l.includes('metro')) return '/industries/airports';
  return '/industries';
}

function CtaSection({ content, sectionKey }: { content: Record<string, unknown>; sectionKey?: string | null }) {
  return (
    <section className="cta-band" id={sectionKey || 'contact'}>
      <div className="container">
        <h2>{String(content.title || '')}</h2>
        <p>{String(content.body || '')}</p>
        <div className="cta-actions">
          {content.primaryCta ? (
            <a href={String(content.primaryHref || '#')} className="btn btn-primary">
              {String(content.primaryCta)}
            </a>
          ) : null}
          {content.secondaryCta ? (
            <a href={String(content.secondaryHref || '#')} className="btn btn-ghost">
              {String(content.secondaryCta)}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function RichTextSection({ content, sectionKey }: { content: Record<string, unknown>; sectionKey?: string | null }) {
  return (
    <section className="section section-light" id={sectionKey || undefined}>
      <div className="container">
        {content.title ? <h2 style={{ marginBottom: '1rem' }}>{String(content.title)}</h2> : null}
        <div dangerouslySetInnerHTML={{ __html: String(content.html || content.body || '') }} />
      </div>
    </section>
  );
}

function PageHeroSection({ content }: { content: Record<string, unknown> }) {
  const crumb = String(content.breadcrumb || content.title || '');
  return (
    <section className="page-hero">
      <div className="hero-bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={String(content.image || '/assets/images/engineers-reviewing-electrical-design-dr.jpg')}
          alt={String(content.imageAlt || '')}
        />
      </div>
      <div className="hero-overlay"></div>
      <div className="grid-overlay"></div>
      <div className="container">
        <div className="breadcrumb">
          <a href="/">Home</a>
          <span className="sep">/</span>
          <span className="current">{crumb}</span>
        </div>
        {content.eyebrow ? <div className="eyebrow">{String(content.eyebrow)}</div> : null}
        <h1>{String(content.title || '')}</h1>
        {content.leadEmphasis ? <p className="lead lead-emphasis">{String(content.leadEmphasis)}</p> : null}
        {content.lead ? <p className="lead">{String(content.lead)}</p> : null}
        {content.leadAccent ? <p className="lead lead-accent">{String(content.leadAccent)}</p> : null}
      </div>
    </section>
  );
}

function QuickContactSection({ content }: { content: Record<string, unknown> }) {
  const items =
    (content.items as Array<{
      label: string;
      value: string;
      href?: string | null;
      emergency?: boolean;
      icon?: string;
      subject?: string;
    }>) || [];

  return (
    <section className="quick-contact-bar">
      <div className="container">
        <div className="quick-contact-grid">
          {items.map((item) => (
            <div key={item.label} className={`qc-item${item.emergency ? ' qc-emergency' : ''}`}>
              {item.icon ? (
                <div
                  className="qc-icon"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{
                    __html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${item.icon}</svg>`,
                  }}
                />
              ) : null}
              <div>
                <span className="qc-label">{item.label}</span>
                {item.subject ? (
                  <button
                    type="button"
                    className="qc-value"
                    onClick={() => {
                      void import('@/lib/contact-subject').then((m) => m.focusContactSubject(item.subject));
                    }}
                  >
                    {item.value}
                  </button>
                ) : item.href ? (
                  <a href={item.href} className="qc-value">
                    {item.value}
                  </a>
                ) : (
                  <div className="qc-value">{item.value}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CultureStatsSection({ content }: { content: Record<string, unknown> }) {
  const items = (content.items as Array<{ value: string; label: string }>) || [];
  return (
    <section className="culture-bar">
      <div className="container">
        <div className="culture-grid">
          {items.map((item) => (
            <div className="culture-item" key={item.label}>
              <div className="cn">{item.value}</div>
              <div className="cl">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SplitSection({ content, sectionKey }: { content: Record<string, unknown>; sectionKey?: string | null }) {
  const feats =
    (content.features as Array<{ title: string; body: string; icon?: string }>) || [];
  const imgLeft = content.imagePosition !== 'right';
  const sectionClass =
    content.tone === 'gray'
      ? 'section-gray'
      : content.tone === 'ice'
        ? 'section-iceblue'
        : 'section-light';

  const imageBlock = (
    <div className="split-img-wrap reveal">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={String(content.image || '')} alt="" />
    </div>
  );

  const contentBlock = (
    <div className="split-content reveal">
      <div className={`eyebrow ${content.eyebrowClass || 'eyebrow-orange'}`}>
        {String(content.eyebrow || '')}
      </div>
      <h2>{String(content.title || '')}</h2>
      <p className="split-desc">{String(content.body || '')}</p>
      {feats.length ? (
        <div className="split-feat-grid">
          {feats.map((f, i) => (
            <div className="feat-card" key={`${f.title}-${i}`}>
              <div className="feat-icon-wrap">
                <svg
                  className="feat-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  dangerouslySetInnerHTML={{ __html: featIconFor(i, f.icon, f.title) }}
                />
              </div>
              <h5>{f.title}</h5>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      ) : null}
      {content.cta ? (
        <a href={String(content.ctaHref || '#')} className="btn btn-primary btn-sm btn-hover-lift">
          {String(content.cta)}
        </a>
      ) : null}
    </div>
  );

  return (
    <section className={`section ${sectionClass}`} id={sectionKey || undefined}>
      <div className="container">
        <div className={`split-layout ${imgLeft ? 'img-left' : 'img-right'}`}>
          {imgLeft ? imageBlock : null}
          {contentBlock}
          {!imgLeft ? imageBlock : null}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ content }: { content: Record<string, unknown> }) {
  const items =
    (content.items as Array<{ quote: string; name: string; role?: string }>) || [];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;

  return (
    <section className="section section-dark testi-section">
      <div className="container">
        <div className="section-head center">
          <div className="eyebrow eyebrow-cyan">{String(content.eyebrow || 'TESTIMONIALS')}</div>
          <h2>{String(content.title || '')}</h2>
        </div>
        <div className="testi-wrap">
          {items.map((item, i) => (
            <div key={i} className={`testi-slide${i === current ? ' active' : ''}`}>
              <p className="testi-quote">&ldquo;{item.quote}&rdquo;</p>
              <div className="testi-person">
                {item.name}
                {item.role ? <span> · {item.role}</span> : null}
              </div>
            </div>
          ))}
          <div className="testi-dots">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                className={i === current ? 'active' : ''}
                onClick={() => setCurrent(i)}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PartnersSection({ content }: { content: Record<string, unknown> }) {
  const logos = (content.logos as Array<{ src: string; alt?: string }>) || [];
  const loop = [...logos, ...logos];
  return (
    <section className="section section-light partners-section">
      <div className="container">
        <div className="section-head center">
          <div className="eyebrow eyebrow-orange">{String(content.eyebrow || '')}</div>
          <h2>{String(content.title || '')}</h2>
        </div>
      </div>
      {logos.length ? (
        <div className="partner-marquee-wrap">
          <div className="partner-marquee">
            {loop.map((logo, i) => (
              <div className="partner-logo-card" key={`${logo.src}-${i}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo.src} alt={logo.alt || ''} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {content.note ? (
        <div className="container">
          <p className="partner-note">{String(content.note)}</p>
        </div>
      ) : null}
    </section>
  );
}

function CertTeaserSection({ content }: { content: Record<string, unknown> }) {
  return (
    <section className="cert-teaser">
      <div className="container">
        <div className="eyebrow">{String(content.eyebrow || 'CERTIFICATIONS')}</div>
        <h3>{String(content.title || '')}</h3>
        <p>{String(content.body || '')}</p>
        {content.cta ? (
          <a href={String(content.ctaHref || '/certifications')} className="btn-certs">
            {String(content.cta)}
          </a>
        ) : null}
      </div>
    </section>
  );
}

function CertHeroSection({ content }: { content: Record<string, unknown> }) {
  return (
    <section className="cert-hero">
      <div className="container">
        <div className="eyebrow">{String(content.eyebrow || 'CERTIFICATIONS')}</div>
        <h1>{String(content.title || '')}</h1>
        {content.sub ? <div className="sub">{String(content.sub)}</div> : null}
        <p>{String(content.lead || content.body || '')}</p>
        {content.tagline ? <div className="cert-tagline">{String(content.tagline)}</div> : null}
      </div>
    </section>
  );
}

function LogoMarqueeSection({ content }: { content: Record<string, unknown> }) {
  return <CertMarquee items={normalizeCertItems(content.items)} />;
}

function FeatureGridSection({
  content,
  sectionKey,
}: {
  content: Record<string, unknown>;
  sectionKey?: string | null;
}) {
  const cards =
    (content.cards as Array<{
      title: string;
      body: string;
      badge?: string;
      badgeColor?: string;
      icon?: string;
      variant?: string;
      linkLabel?: string;
      linkHref?: string;
      subject?: string;
    }>) || [];
  const tone =
    content.tone === 'gray' ? 'section-gray' : content.tone === 'dark' ? 'section-dark' : 'section-light';
  const darkCards = !!content.darkCards;
  const headClass = sectionKey === 'how-we-help' || sectionKey === 'life-at-zigma' ? 'section-head reveal' : 'section-head center reveal';

  return (
    <section className={`section ${tone}`} id={sectionKey || undefined}>
      <div className="container">
        <div className={headClass}>
          {content.eyebrow ? (
            <div className={`eyebrow ${content.eyebrowClass || 'eyebrow-orange'}`}>{String(content.eyebrow)}</div>
          ) : null}
          <h2>{String(content.title || '')}</h2>
          {content.body ? <p>{String(content.body)}</p> : null}
        </div>
        <div className="feat-grid">
          {cards.map((card) => {
            const variantClass =
              card.variant === 'pastel-green'
                ? ' pastel-green'
                : card.variant === 'emergency'
                  ? ' emergency-card'
                  : '';
            return (
              <div
                key={card.title}
                className={`feat-card reveal${variantClass}`}
                style={
                  darkCards
                    ? {
                        background: 'var(--navy-950)',
                        color: 'var(--white)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }
                    : undefined
                }
              >
                {card.icon ? (
                  <div className="feat-icon-wrap">
                    <svg
                      className="feat-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      dangerouslySetInnerHTML={{ __html: card.icon }}
                    />
                  </div>
                ) : card.badge ? (
                  <div className="feat-icon-wrap">
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        color: card.badgeColor || 'var(--cyan)',
                      }}
                    >
                      {card.badge}
                    </div>
                  </div>
                ) : darkCards ? (
                  <div className="feat-icon-wrap" style={{ background: 'rgba(0,212,255,0.15)' }} />
                ) : null}
                <h5 style={darkCards ? { color: 'var(--cyan)' } : undefined}>{card.title}</h5>
                <p style={darkCards ? { color: '#B7C2D6' } : undefined}>{card.body}</p>
                {card.linkLabel ? (
                  card.subject ? (
                    <button
                      type="button"
                      className="feat-link"
                      onClick={() => {
                        void import('@/lib/contact-subject').then((m) => m.focusContactSubject(card.subject));
                      }}
                    >
                      {card.linkLabel}
                    </button>
                  ) : (
                    <a href={card.linkHref || '#'} className="feat-link">
                      {card.linkLabel}
                    </a>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LocationsSection({ content, sectionKey }: { content: Record<string, unknown>; sectionKey?: string | null }) {
  const locations =
    (content.locations as Array<{
      tag?: string;
      title: string;
      address: string;
      phone?: string;
      phoneHref?: string;
      directionsUrl?: string;
      icon?: string;
    }>) || [];

  return (
    <section className="section section-gray" id={sectionKey || 'locations'}>
      <div className="container">
        <div className="split-layout img-right">
          <div className="split-content reveal">
            <div className={`eyebrow ${content.eyebrowClass || 'eyebrow-orange'}`}>
              {String(content.eyebrow || 'LOCATIONS')}
            </div>
            <h2>{String(content.title || '')}</h2>
            <p className="split-desc">{String(content.body || '')}</p>
            <div className="loc-grid">
              {locations.map((loc) => (
                <div className="loc-card" key={loc.title}>
                  <div
                    className="loc-icon"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{
                      __html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${
                        loc.icon ||
                        '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>'
                      }</svg>`,
                    }}
                  />
                  <div className="loc-body">
                    {loc.tag ? <span className="loc-tag">{loc.tag}</span> : null}
                    <h5>{loc.title}</h5>
                    <p>{loc.address}</p>
                    {loc.phone ? (
                      <a href={loc.phoneHref || `tel:${loc.phone.replace(/\s/g, '')}`} className="loc-link">
                        {loc.phone}
                      </a>
                    ) : null}
                    {loc.directionsUrl ? (
                      <a
                        href={loc.directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="loc-link loc-link-block"
                      >
                        Get Directions →
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {content.mapEmbedUrl ? (
            <div className="split-img-wrap reveal map-wrap">
              <iframe
                src={String(content.mapEmbedUrl)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={String(content.mapTitle || 'Office map')}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function JobListSection({ content, sectionKey }: { content: Record<string, unknown>; sectionKey?: string | null }) {
  const jobs =
    (content.jobs as Array<{ title: string; department?: string; location?: string; type?: string }>) || [];

  return (
    <section className="section section-light" id={sectionKey || 'current-openings'}>
      <div className="container">
        <div className="section-head reveal">
          <div className="eyebrow eyebrow-orange">{String(content.eyebrow || 'CURRENT OPENINGS')}</div>
          <h2>{String(content.title || '')}</h2>
          {content.body ? <p>{String(content.body)}</p> : null}
        </div>
        <div className="job-list">
          {jobs.map((job) => (
            <div className="job-card reveal" key={job.title}>
              <div className="job-main">
                <h5>{job.title}</h5>
                <div className="job-meta">
                  {job.department ? <span className="job-chip">{job.department}</span> : null}
                  {job.location ? <span className="job-chip">{job.location}</span> : null}
                  {job.type ? <span className="job-chip">{job.type}</span> : null}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                data-role={job.title}
                onClick={() => focusApplyRole(job.title)}
              >
                Apply Now →
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InternshipSection({ content, sectionKey }: { content: Record<string, unknown>; sectionKey?: string | null }) {
  const points = (content.points as Array<{ label: string; value: string }>) || [];
  const role = String(content.applyRole || 'Internship Program');
  return (
    <section className="section section-gray" id={sectionKey || 'internship-program'}>
      <div className="container">
        <div className="split-layout img-right">
          <div className="split-content reveal">
            <div className="eyebrow eyebrow-orange">{String(content.eyebrow || 'INTERNSHIP PROGRAM')}</div>
            <h2>{String(content.title || '')}</h2>
            <p className="split-desc">{String(content.body || '')}</p>
          </div>
          <div className="reveal">
            <div className="program-card">
              <h3>{String(content.cardTitle || '')}</h3>
              <p>{String(content.cardBody || '')}</p>
              <div className="program-grid">
                {points.map((p) => (
                  <div className="program-point" key={p.label}>
                    <div>
                      <div className="pp-label">{p.label}</div>
                      <div className="pp-value">{p.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              {content.cta ? (
                <button
                  type="button"
                  className="btn btn-primary btn-hover-lift btn-block"
                  data-role={role}
                  onClick={() => focusApplyRole(role)}
                >
                  {String(content.cta)}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CertCtaSection({ content }: { content: Record<string, unknown> }) {
  return (
    <section className="cert-cta">
      <div className="container">
        <a href={String(content.ctaHref || '/contact')} className="btn-home">
          {String(content.cta || 'Get in Touch')}
        </a>
      </div>
    </section>
  );
}

type ComparisonColumn = { label: string; sub?: string; highlight?: boolean };
type ComparisonRow = { feature: string; group?: string; values: (string | boolean | null)[] };

function ComparisonTableSection({
  content,
  sectionKey,
}: {
  content: Record<string, unknown>;
  sectionKey?: string | null;
}) {
  const columns = (content.columns as ComparisonColumn[]) || [];
  const rows = (content.rows as ComparisonRow[]) || [];
  const tone = String(content.tone || 'light');
  const sectionClass = tone === 'dark' ? '' : tone === 'gray' ? 'section-gray' : 'section-light';

  function renderCell(val: string | boolean | null, colHighlight?: boolean) {
    if (val === true || val === 'true' || val === '✓') {
      return (
        <td key={String(val)} className={`ctbl-cell ctbl-cell--yes${colHighlight ? ' ctbl-cell--hl' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-label="Yes">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </td>
      );
    }
    if (val === false || val === 'false' || val === '✗' || val === null) {
      return (
        <td key={String(val)} className={`ctbl-cell ctbl-cell--no${colHighlight ? ' ctbl-cell--hl' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="No">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </td>
      );
    }
    return (
      <td key={String(val)} className={`ctbl-cell${colHighlight ? ' ctbl-cell--hl' : ''}`}>
        {String(val ?? '—')}
      </td>
    );
  }

  let lastGroup = '';

  return (
    <section className={`section ${sectionClass} comparison-section`} id={sectionKey || undefined}>
      <div className="container">
        {content.eyebrow ? (
          <div className="eyebrow eyebrow-orange">{String(content.eyebrow)}</div>
        ) : null}
        {content.title ? <h2 className="comparison-title">{String(content.title)}</h2> : null}
        {content.body ? <p className="comparison-lead">{String(content.body)}</p> : null}

        <div className="ctbl-wrap">
          <table className="ctbl">
            <thead>
              <tr>
                <th className="ctbl-feature-head">{String(content.featureLabel || 'Capability')}</th>
                {columns.map((col, i) => (
                  <th key={i} className={`ctbl-col-head${col.highlight ? ' ctbl-col-head--hl' : ''}`}>
                    {col.label}
                    {col.sub ? <span className="ctbl-col-sub">{col.sub}</span> : null}
                    {col.highlight ? <span className="ctbl-recommended">Recommended</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const groupChanged = row.group && row.group !== lastGroup;
                if (row.group) lastGroup = row.group;
                return (
                  <>
                    {groupChanged ? (
                      <tr key={`grp-${ri}`} className="ctbl-group-row">
                        <td colSpan={columns.length + 1}>{row.group}</td>
                      </tr>
                    ) : null}
                    <tr key={ri} className="ctbl-row">
                      <td className="ctbl-feature">{row.feature}</td>
                      {(row.values || []).map((val, ci) =>
                        renderCell(val, columns[ci]?.highlight)
                      )}
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {content.cta || content.ctaHref ? (
          <div className="comparison-cta">
            <a href={String(content.ctaHref || '/contact')} className="btn btn-primary">
              {String(content.cta || 'Get a tailored quote →')}
            </a>
            {content.ctaNote ? <p className="comparison-cta-note">{String(content.ctaNote)}</p> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function SectionRenderer({ sections }: { sections: CmsSection[] }) {
  useScrollReveal(sections);

  const scopedCss = sections
    .map((s) => {
      const css = String((s.style_json as { css?: string })?.css || '').trim();
      return css;
    })
    .filter(Boolean)
    .join('\n');

  return (
    <main id="main-content">
      {scopedCss ? <style dangerouslySetInnerHTML={{ __html: scopedCss }} /> : null}
      {sections
        .filter((s) => s.enabled)
        .map((section) => {
          const content = section.content_json || {};
          const key = section.id;
          const extraClass = String((section.style_json as { className?: string })?.className || '');
          const wrap = (node: React.ReactNode) =>
            extraClass ? (
              <div key={key} className={extraClass} data-section-type={section.type}>
                {node}
              </div>
            ) : (
              node
            );

          switch (section.type) {
            case 'hero':
              return wrap(<HeroSection key={key} content={content} />);
            case 'page_hero':
              return wrap(<PageHeroSection key={key} content={content} />);
            case 'eco':
              return wrap(<EcoSection key={key} content={content} />);
            case 'stats':
              return wrap(<StatsSection key={key} content={content} />);
            case 'culture_stats':
              return wrap(<CultureStatsSection key={key} content={content} />);
            case 'quick_contact':
              return wrap(<QuickContactSection key={key} content={content} />);
            case 'why':
              return wrap(<WhySection key={key} content={content} sectionKey={section.section_key} />);
            case 'timeline':
              return wrap(<TimelineSection key={key} content={content} sectionKey={section.section_key} />);
            case 'projects_teaser':
              return wrap(<ProjectsTeaserSection key={key} content={content} sectionKey={section.section_key} />);
            case 'industries':
              return wrap(<IndustriesSection key={key} content={content} sectionKey={section.section_key} />);
            case 'testimonials':
              return wrap(<TestimonialsSection key={key} content={content} />);
            case 'partners':
              return wrap(<PartnersSection key={key} content={content} />);
            case 'cert_teaser':
              return wrap(<CertTeaserSection key={key} content={content} />);
            case 'cert_hero':
              return wrap(<CertHeroSection key={key} content={content} />);
            case 'logo_marquee':
              return wrap(<LogoMarqueeSection key={key} content={content} />);
            case 'feature_grid':
              return wrap(<FeatureGridSection key={key} content={content} sectionKey={section.section_key} />);
            case 'locations':
              return wrap(<LocationsSection key={key} content={content} sectionKey={section.section_key} />);
            case 'job_list':
              return wrap(<JobListSection key={key} content={content} sectionKey={section.section_key} />);
            case 'internship':
              return wrap(<InternshipSection key={key} content={content} sectionKey={section.section_key} />);
            case 'careers_apply':
              return wrap(<CareersApplySection key={key} content={content} sectionKey={section.section_key} />);
            case 'cert_cta':
              return wrap(<CertCtaSection key={key} content={content} />);
            case 'enquiry_form':
              return wrap(<EnquiryFormSection key={key} content={content} sectionKey={section.section_key} />);
            case 'cta':
              return wrap(<CtaSection key={key} content={content} sectionKey={section.section_key} />);
            case 'split':
              return wrap(<SplitSection key={key} content={content} sectionKey={section.section_key} />);
            case 'rich_text':
              return wrap(<RichTextSection key={key} content={content} sectionKey={section.section_key} />);
            case 'comparison_table':
              return wrap(<ComparisonTableSection key={key} content={content} sectionKey={section.section_key} />);
            default:
              return (
                <section key={key} className="section section-light">
                  <div className="container">
                    <p>Unknown section type: {section.type}</p>
                  </div>
                </section>
              );
          }
        })}
    </main>
  );
}
