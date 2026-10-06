'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { appHref } from '@/lib/base-path';
import { AzCtas, AzEyebrow, AzText, vars } from '@/components/sections/AboutSections';
import { LzHeading, colVars, useStaggerReveal } from '@/components/sections/LifeSections';
import { LgShell, useInView } from '@/components/sections/LegacySections';
import { elementCss, mediaSrc } from '@/lib/about-sections';
import type { CatalogItem } from '@/lib/types';
import {
  withProjects101Defaults,
  type Pj101Category,
  type Pj101DateFormat,
  type Pj101Head,
  type Pj101Illustration,
  type Pj101OngoingContent,
  type Pj101ProjectsContent,
} from '@/lib/projects101-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

/* ------------------------------------------------------------------ */
/* Placeholder artwork (shown until a photo is set, or when it fails)  */
/* ------------------------------------------------------------------ */

function panels(rows: number, cols: number, x0: number, y0: number, w: number, h: number, gap: number, sk: number) {
  let o = '';
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = x0 + k * (w + gap) + (rows - 1 - r) * sk;
      const y = y0 + r * (h + gap);
      o += `<path d="M${x} ${y + h}l${sk} -${h}h${w}l-${sk} ${h}z" fill="#12315f" stroke="currentColor" stroke-opacity=".75" stroke-width="1.4"/><path d="M${x + w / 2} ${y + h}l${sk} -${h}" stroke="currentColor" stroke-opacity=".35"/>`;
    }
  }
  return o;
}

function illustrationMarkup(kind: Pj101Illustration, id: string): string {
  const bg = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F1F3D"/><stop offset="1" stop-color="#1b3a6b"/></linearGradient></defs><rect width="320" height="200" fill="url(#${id})"/>`;
  switch (kind) {
    case 'ups':
      return `${bg}<rect x="70" y="34" width="84" height="138" rx="6" fill="#12315f" stroke="currentColor" stroke-width="2"/><rect x="166" y="34" width="84" height="138" rx="6" fill="#12315f" stroke="currentColor" stroke-width="2"/><g fill="currentColor"><circle cx="86" cy="52" r="4"/><circle cx="100" cy="52" r="4" opacity=".5"/><circle cx="182" cy="52" r="4"/><circle cx="196" cy="52" r="4" opacity=".5"/></g><path d="M122 74l-18 32h14l-6 28 24-36h-14z" fill="currentColor"/><path d="M218 74l-18 32h14l-6 28 24-36h-14z" fill="currentColor" opacity=".7"/>`;
    case 'hybrid':
      return `${bg}<circle cx="60" cy="48" r="18" fill="currentColor" opacity=".9"/>${panels(1, 3, 26, 100, 44, 24, 6, 14)}<g stroke="currentColor" stroke-width="2" fill="#12315f"><rect x="190" y="58" width="96" height="84" rx="8"/><rect x="198" y="68" width="22" height="64" rx="3"/><rect x="226" y="68" width="22" height="64" rx="3"/><rect x="254" y="68" width="22" height="64" rx="3"/></g><g fill="currentColor"><rect x="198" y="96" width="22" height="36"/><rect x="226" y="86" width="22" height="46"/><rect x="254" y="76" width="22" height="56"/></g><path d="M170 100h14" stroke="currentColor" stroke-width="3"/>`;
    case 'om':
      return `${bg}${panels(2, 4, 26, 84, 46, 26, 6, 14)}<g transform="translate(250 56)" fill="none" stroke="currentColor" stroke-width="5"><circle r="16"/><circle r="5" fill="currentColor"/><path d="M0 -26v8M0 18v8M-26 0h8M18 0h8M-18 -18l6 6M12 12l6 6M18 -18l-6 6M-12 12l-6 6"/></g>`;
    default:
      return `${bg}<circle cx="262" cy="46" r="20" fill="currentColor" opacity=".9"/><circle cx="262" cy="46" r="32" fill="currentColor" opacity=".18"/>${panels(3, 4, 28, 92, 48, 26, 6, 16)}`;
  }
}

/** Photo with the category illustration as placeholder / fallback. */
function PjThumb({ image, illustration, color, alt, eager }: { image?: string; illustration: Pj101Illustration; color?: string; alt: string; eager?: boolean }) {
  const id = `pj101g${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const src = mediaSrc(image);
  const [failed, setFailed] = useState('');
  const showImg = Boolean(src) && failed !== src;
  return (
    <div className="pj101-th" style={vars({ color })}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(src)}
          ref={(el) => {
            if (el && el.complete && el.naturalWidth === 0 && !/\.svg(\?|#|$)/i.test(src)) setFailed(src);
          }}
        />
      ) : (
        <svg
          viewBox="0 0 320 200"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label={alt}
          dangerouslySetInnerHTML={{ __html: illustrationMarkup(illustration, id) }}
        />
      )}
    </div>
  );
}

const PLAY_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PIN_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CALENDAR_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Shared head (eyebrow, heading, intro, count badge)                  */
/* ------------------------------------------------------------------ */

function countText(count: Pj101Head['count'], n: number) {
  const template = (n === 1 ? count.templateOne : count.template) || count.template || '{count}';
  return template.replace(/\{count\}/g, String(n));
}

function PjHead({ head, count, reveal }: { head: Pj101Head; count: number; reveal: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, reveal);
  if (head.hidden) return null;
  const badge = head.count.hidden ? '' : countText(head.count, count).trim();
  return (
    <div ref={ref} className={`pj101-head${reveal ? ' pj101-rv' : ''}${seen ? ' is-in' : ''}`} style={vars({ marginBottom: head.marginBottom })}>
      <div className="pj101-head-copy">
        <AzEyebrow el={head.eyebrow} scale="base" />
        <LzHeading el={head.title} role="section" className="pj101-title" highlight={head.highlight} />
        <AzText el={head.subtitle} defaultTag="p" className="pj101-sub" />
      </div>
      {badge ? (
        <div className="pj101-count" style={elementCss(head.count.style)}>
          {badge}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Project data                                                        */
/* ------------------------------------------------------------------ */

type PjView = {
  key: string;
  title: string;
  cat: Pj101Category;
  capacity: string;
  capText: boolean;
  location: string;
  date: string;
  dateIso: string;
  scope: string[];
  scopeText: string;
  image: string;
  video: string;
  description: string;
  href: string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso: string, fmt: Pj101DateFormat = 'day-month-year'): string {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(iso.trim());
  if (!m) return iso.trim();
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1] || mo;
  if (fmt === 'iso') return iso.trim();
  if (fmt === 'year') return y;
  if (fmt === 'month-year' || !d) return `${month} ${y}`;
  return `${Number(d)} ${month} ${y}`;
}

const FALLBACK_COLORS = ['var(--orange)', 'var(--cyan)', 'var(--green)', 'var(--purple)', 'var(--blue)'];

function categoryResolver(categories: Pj101Category[]) {
  const map = new Map(categories.filter((c) => c && c.key).map((c) => [c.key.trim().toLowerCase(), c]));
  const extra = new Map<string, Pj101Category>();
  return (key: string, label?: string): Pj101Category => {
    const k = String(key || '').trim().toLowerCase();
    const hit = map.get(k) || extra.get(k);
    if (hit) return hit;
    const made: Pj101Category = {
      key: k || 'other',
      label: label?.trim() || key || 'Project',
      color: FALLBACK_COLORS[(map.size + extra.size) % FALLBACK_COLORS.length],
      illustration: 'epc',
    };
    extra.set(k, made);
    return made;
  };
}

const splitScope = (s?: string) =>
  String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

function catalogToViews(items: CatalogItem[], resolve: ReturnType<typeof categoryResolver>, linkToDetail: boolean): PjView[] {
  return items.map((it) => {
    const cs = it.case_study_json || {};
    const specs = it.specs_json || {};
    const capacity = String(it.price_label || '').trim();
    const scopeText = String(cs.scope || '').trim() || (it.tags_json || []).join(', ');
    const year = String(cs.delivery_year || '').trim();
    return {
      key: `c-${it.id}`,
      title: it.title,
      cat: resolve(it.category_slug || '', it.category_name || ''),
      capacity,
      capText: Boolean(capacity) && !/^\s*[\d.,]/.test(capacity),
      location: String(cs.location || specs.Location || specs.location || '').trim(),
      date: year,
      dateIso: /^\d{4}/.test(year) ? year.slice(0, 4) : '',
      scope: splitScope(scopeText),
      scopeText,
      image: it.primary_image || '',
      video: String(cs.video_url || '').trim(),
      description: String(it.summary || '').trim(),
      href: linkToDetail ? `/projects/${it.slug}` : '',
    };
  });
}

function useProjectViews(c: Pj101ProjectsContent): { views: PjView[]; loading: boolean } {
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const cat = c.catalog || {};
  const fromCatalog = c.source === 'catalog';
  const limit = Math.max(0, Math.round(Number(cat.limit) || 0));

  useEffect(() => {
    if (!fromCatalog) return;
    let cancelled = false;
    const qs = new URLSearchParams();
    qs.set('limit', String(limit || 60));
    if (cat.featuredOnly) qs.set('featured', '1');
    if (cat.category?.trim()) qs.set('category', cat.category.trim());
    fetch(`/api/public/catalog/project?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) setItems((data.items || []) as CatalogItem[]);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [fromCatalog, limit, cat.featuredOnly, cat.category]);

  const views = useMemo(() => {
    const resolve = categoryResolver(c.categories || []);
    const fmt = c.card?.dateFormat;
    if (fromCatalog) return catalogToViews(items || [], resolve, cat.linkToDetail !== false);
    return (c.projects || [])
      .filter((p) => p && !p.hidden && String(p.title || '').trim())
      .map((p, i): PjView => {
        const dateIso = String(p.date || '').trim();
        return {
          key: `m-${i}`,
          title: p.title.trim(),
          cat: resolve(p.category),
          capacity: String(p.capacity || '').trim(),
          capText: Boolean(p.capacityIsText),
          location: String(p.location || '').trim(),
          date: String(p.dateLabel || '').trim() || (dateIso ? formatDate(dateIso, fmt) : ''),
          dateIso,
          scope: splitScope(p.scope),
          scopeText: String(p.scope || '').trim(),
          image: String(p.image || '').trim(),
          video: String(p.video || '').trim(),
          description: String(p.description || '').trim(),
          href: String(p.href || '').trim(),
        };
      });
  }, [c.projects, c.categories, c.card?.dateFormat, fromCatalog, items, cat.linkToDetail]);

  return { views, loading: fromCatalog && items === null };
}

/* ------------------------------------------------------------------ */
/* Detail popup                                                        */
/* ------------------------------------------------------------------ */

function videoEmbed(url: string): ReactNode {
  const yt = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  if (yt) {
    return <iframe src={`https://www.youtube.com/embed/${yt[1]}?autoplay=1`} title="Project video" allow="autoplay; fullscreen" allowFullScreen />;
  }
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return <iframe src={`https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`} title="Project video" allow="autoplay; fullscreen" allowFullScreen />;
  }
  return <video src={mediaSrc(url)} controls autoPlay playsInline />;
}

function PjPopup({
  views,
  index,
  onIndex,
  onClose,
  popup,
}: {
  views: PjView[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  popup: Pj101ProjectsContent['popup'];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fs, setFs] = useState(false);
  const [playing, setPlaying] = useState(false);
  const p = views[index];
  const many = views.length > 1;
  const labels = popup.labels;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && many) onIndex((index + 1) % views.length);
      else if (e.key === 'ArrowLeft' && many) onIndex((index - 1 + views.length) % views.length);
    };
    const onFs = () => {
      if (!document.fullscreenElement) setFs(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [index, many, views.length, onIndex, onClose]);

  if (!p) return null;

  const toggleFs = () => {
    const on = !fs;
    setFs(on);
    try {
      if (on) rootRef.current?.requestFullscreen?.().catch(() => undefined);
      else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    } catch {
      /* fullscreen API unavailable: the in-page full-size layout still applies */
    }
  };
  const go = (d: number) => {
    setPlaying(false);
    onIndex((index + d + views.length) % views.length);
  };

  return createPortal(
    <div
      ref={rootRef}
      className={`pj101m${fs ? ' fs-on' : ''}`}
      style={vars({ background: popup.backdrop })}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`pj101m-box${fs ? ' fs' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={p.title}
        style={vars({ '--pj': p.cat.color, '--pj101m-max': popup.maxWidth, borderRadius: fs ? undefined : popup.radius, background: popup.background })}
      >
        <div className="pj101m-tools">
          {popup.showCounter !== false && many ? (
            <span className="pj101m-count">
              {index + 1} / {views.length}
            </span>
          ) : null}
          {popup.showNav !== false && many ? (
            <>
              <button type="button" aria-label="Previous project" onClick={() => go(-1)}>
                ‹
              </button>
              <button type="button" aria-label="Next project" onClick={() => go(1)}>
                ›
              </button>
            </>
          ) : null}
          {popup.showFullscreen !== false ? (
            <button type="button" aria-label="Toggle full screen" title={fs ? 'Exit full screen' : 'Full screen'} onClick={toggleFs}>
              {fs ? '⤡' : '⤢'}
            </button>
          ) : null}
          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="pj101m-visual">
          <PjThumb key={p.key} image={p.image} illustration={p.cat.illustration} color={p.cat.color} alt={p.title} eager />
          {p.video && !playing ? (
            <button type="button" className="pj101m-play" aria-label="Play video" onClick={() => setPlaying(true)}>
              {PLAY_ICON}
            </button>
          ) : null}
          {p.video && playing ? videoEmbed(p.video) : null}
        </div>
        <div className="pj101m-info" key={p.key}>
          <span className="pj101m-tag">{p.cat.label}</span>
          <h3>{p.title}</h3>
          {p.capacity ? (
            <div className="pj101m-cap">
              {p.capacity}
              <small>{p.capText ? labels.projectType : labels.installedCapacity}</small>
            </div>
          ) : null}
          <div className="pj101m-grid">
            {p.location ? (
              <div>
                <span>{labels.location}</span>
                <b>{p.location}</b>
              </div>
            ) : null}
            {p.date ? (
              <div>
                <span>{labels.date}</span>
                <b>{p.date}</b>
              </div>
            ) : null}
            <div>
              <span>{labels.category}</span>
              <b>{p.cat.label}</b>
            </div>
            <div>
              <span>{labels.capacity}</span>
              <b>{p.capText || !p.capacity ? '—' : p.capacity}</b>
            </div>
          </div>
          {p.scope.length ? (
            <div>
              <h4>{labels.scope}</h4>
              <div className="pj101m-chips">
                {p.scope.map((s, i) => (
                  <span key={`${s}-${i}`}>{s}</span>
                ))}
              </div>
            </div>
          ) : null}
          {p.description ? (
            <div>
              <h4>{labels.overview}</h4>
              <p className="pj101m-desc">{p.description}</p>
            </div>
          ) : null}
          <div className="pj101m-cta">
            <AzCtas ctas={popup.ctas} />
            {popup.showDetailLink !== false && p.href && popup.detailLinkLabel?.trim() ? (
              <a className="pj101m-detail" href={appHref(p.href)}>
                {popup.detailLinkLabel}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* Recently done projects: head, filter, cards, popup, running strip   */
/* ------------------------------------------------------------------ */

function clip(text: string, max: number) {
  return max > 3 && text.length > max ? `${text.slice(0, max - 2)}…` : text;
}

export function Pj101ProjectsSection({ content, sectionKey }: SectionProps) {
  const c = withProjects101Defaults<Pj101ProjectsContent>('pj101_projects', content);
  const { views, loading } = useProjectViews(c);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const reveal = c.grid?.reveal !== false;
  const card = c.card;
  const popupOn = c.popup?.enabled !== false;

  const filterCats = useMemo(() => {
    const seen = new Map<string, Pj101Category>();
    views.forEach((v) => {
      if (!v.cat.hideInFilter && !seen.has(v.cat.key)) seen.set(v.cat.key, v.cat);
    });
    const order = (c.categories || []).map((cat) => cat.key);
    return [...seen.values()].sort((a, b) => {
      const ia = order.indexOf(a.key);
      const ib = order.indexOf(b.key);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
  }, [views, c.categories]);

  const activeFilter = filter !== 'all' && filterCats.some((cat) => cat.key === filter) ? filter : 'all';
  const shown = activeFilter === 'all' ? views : views.filter((v) => v.cat.key === activeFilter);
  useStaggerReveal(gridRef, '.pj101-card', reveal, `${activeFilter}|${shown.length}`);

  const showFilter = !c.filter?.hidden && filterCats.length > 1;
  const strip = c.strip || {};
  const stripOn = !strip.hidden && views.length > 0;
  const openAt = (v: PjView) => {
    if (!popupOn) return;
    const i = views.indexOf(v);
    if (i >= 0) setOpen(i);
  };

  const cardStyle: CSSProperties = vars({
    '--pj101-card-bg': card.background,
    '--pj101-card-border': card.border,
    '--pj101-card-radius': card.radius,
    '--pj101-card-pt': card.paddingTop,
    '--pj101-card-px': card.paddingX,
    '--pj101-card-pb': card.paddingBottom,
    '--pj101-card-gap': card.gap,
    '--pj101-card-shadow': card.shadow,
    '--pj101-card-hover-shadow': card.hoverShadow,
    '--pj101-card-bar': card.barHeight,
    '--pj101-media-ar': card.mediaAspect,
    '--pj101-media-bg': card.mediaBackground,
  });

  return (
    <>
      <LgShell box={c.section} className="pj101-projects" id={sectionKey || 'projects'}>
        <PjHead head={c.head} count={shown.length} reveal={reveal} />
        {showFilter ? (
          <div
            className={`pj101-filter pj101-filter--${c.filter.align || 'left'}`}
            role="group"
            aria-label="Filter projects by category"
            style={vars({ marginBottom: c.filter.marginBottom })}
          >
            {[{ key: 'all', label: c.filter.allLabel || 'All', color: 'var(--navy-900)' }, ...filterCats].map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={`pj101-pill${activeFilter === cat.key ? ' is-active' : ''}`}
                aria-pressed={activeFilter === cat.key}
                style={vars({ '--pill-color': cat.color })}
                onClick={() => setFilter(cat.key)}
              >
                {c.filter.showDots === false ? null : <span className="pj101-pill-dot" aria-hidden="true" />}
                {cat.label}
              </button>
            ))}
          </div>
        ) : null}
        <div
          ref={gridRef}
          className={`pj101-grid${card.hoverLift === false ? ' pj101-no-lift' : ''}${card.mediaZoom === false ? ' pj101-no-zoom' : ''}`}
          style={{ ...vars({ ...colVars(c.grid?.columns, { desktop: 3, tablet: 2, mobile: 1 }), '--lz-gap': c.grid?.gap }), ...cardStyle }}
          aria-busy={loading || undefined}
        >
          {shown.map((v) => {
            const media = card.showMedia !== false;
            return (
              <article
                key={v.key}
                className={`pj101-card${media ? ' has-media' : ''}${popupOn ? ' is-clickable' : ''}`}
                style={vars({ '--pj': v.cat.color })}
                onClick={() => openAt(v)}
              >
                {media ? (
                  <div className="pj101-media">
                    <PjThumb image={v.image} illustration={v.cat.illustration} color={v.cat.color} alt={v.title} />
                    {v.video ? <span className="pj101-play">{PLAY_ICON}</span> : null}
                  </div>
                ) : null}
                {card.showTag !== false || (card.showCapacity !== false && v.capacity) ? (
                  <div className="pj101-top">
                    {card.showTag !== false ? (
                      <span className="pj101-tag" style={elementCss(card.tagStyle)}>
                        {v.cat.label}
                      </span>
                    ) : (
                      <span />
                    )}
                    {card.showCapacity !== false && v.capacity ? (
                      <div className={`pj101-cap${v.capText ? ' pj101-cap-text' : ''}`} style={elementCss(card.capacityStyle)}>
                        {v.capacity}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <h3 style={elementCss(card.titleStyle)}>{v.title}</h3>
                {(card.showLocation !== false && v.location) || (card.showDate !== false && v.date) ? (
                  <div className="pj101-meta">
                    {card.showLocation !== false && v.location ? (
                      <span className="pj101-chip" style={elementCss(card.chipStyle)}>
                        {PIN_ICON}
                        {v.location}
                      </span>
                    ) : null}
                    {card.showDate !== false && v.date ? (
                      <span className="pj101-chip" style={elementCss(card.chipStyle)}>
                        {CALENDAR_ICON}
                        {v.dateIso ? <time dateTime={v.dateIso}>{v.date}</time> : v.date}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {card.showScope !== false && v.scopeText ? (
                  <p className="pj101-type" style={elementCss(card.scopeStyle)}>
                    {v.scopeText}
                  </p>
                ) : null}
                {card.showLink !== false && card.linkLabel?.trim() && popupOn ? (
                  <button
                    className="pj101-link"
                    type="button"
                    style={elementCss(card.linkStyle)}
                    onClick={(e) => {
                      e.stopPropagation();
                      openAt(v);
                    }}
                  >
                    {card.linkLabel}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
        {!loading && !shown.length && c.emptyText?.trim() ? <p className="pj101-empty">{c.emptyText}</p> : null}
      </LgShell>
      {stripOn ? (
        <section
          className={`pj101-strip${strip.pauseOnHover === false ? '' : ' pj101-strip--pause'}${strip.direction === 'rtl' ? ' pj101-strip--rtl' : ''}`}
          aria-label="All projects"
          style={vars({
            '--pj101-run-dur': Number(strip.speedSeconds) > 0 ? `${strip.speedSeconds}s` : undefined,
            '--pj101-run-w': strip.itemWidth,
            '--pj101-run-h': strip.itemHeight,
            '--pj101-run-radius': strip.itemRadius,
            '--pj101-run-border': strip.itemBorder,
            '--pj101-run-gap': strip.gap,
            '--pj101-run-bg': strip.background,
            '--pj101-run-py': strip.paddingY,
          })}
        >
          <div className="pj101-run">
            <div className="pj101-run-track">
              {[0, 1].map((copy) =>
                views.map((v) => {
                  const cap = `${strip.captionCapacity !== false && v.capacity && !v.capText ? `${v.capacity} · ` : ''}${clip(
                    v.title,
                    Number(strip.captionMaxChars) || 30
                  )}`;
                  const clickable = popupOn && strip.clickOpensPopup !== false;
                  return (
                    <button
                      key={`${copy}-${v.key}`}
                      type="button"
                      className={`pj101-run-item${clickable ? '' : ' is-static'}`}
                      aria-label={v.title}
                      aria-hidden={copy === 1 || undefined}
                      tabIndex={copy === 1 || !clickable ? -1 : undefined}
                      onClick={() => {
                        if (clickable) openAt(v);
                      }}
                    >
                      <PjThumb image={v.image} illustration={v.cat.illustration} color={v.cat.color} alt="" />
                      {strip.showCaption !== false ? <span className="pj101-run-cap">{cap}</span> : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>
      ) : null}
      {open !== null && views[open] ? (
        <PjPopup views={views} index={open} onIndex={setOpen} onClose={() => setOpen(null)} popup={c.popup} />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ongoing projects                                                    */
/* ------------------------------------------------------------------ */

export function Pj101OngoingSection({ content, sectionKey }: SectionProps) {
  const c = withProjects101Defaults<Pj101OngoingContent>('pj101_ongoing', content);
  const items = (c.items || []).filter((it) => it && !it.hidden && String(it.title || '').trim());
  const steps = (c.steps || []).map((s) => s.trim()).filter(Boolean);
  const gridRef = useRef<HTMLDivElement>(null);
  const reveal = c.reveal !== false;
  useStaggerReveal(gridRef, '.pj101-og-card', reveal, items.length);
  const card = c.card || {};
  const theme = c.theme || {};
  if (!items.length && c.head.hidden) return null;

  return (
    <LgShell box={c.section} className="pj101-ongoing" id={sectionKey || 'ongoing'}>
      <div
        className={`pj101-og-scope${c.animateSteps === false ? ' pj101-og-still' : ''}`}
        style={vars({
          '--pj101-og-grad': theme.gradient,
          '--pj101-og-accent': theme.accent,
          '--pj101-og-bar': theme.barWidth,
        })}
      >
        <PjHead head={c.head} count={items.length} reveal={reveal} />
        <div
          ref={gridRef}
          className={`pj101-og-grid${card.hoverLift === false ? ' pj101-no-lift' : ''}`}
          style={vars({
            ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }),
            '--lz-gap': c.gap,
            '--pj101-og-bg': card.background,
            '--pj101-og-border': card.border,
            '--pj101-og-radius': card.radius,
            '--pj101-og-pad': card.padding,
            '--pj101-og-shadow': card.shadow,
            '--pj101-og-hover-shadow': card.hoverShadow,
            '--pj101-og-thumb-w': card.thumbWidth,
            '--pj101-og-thumb-h': card.thumbHeight,
          })}
        >
          {items.map((it, i) => {
            const active = Math.max(0, Math.round(Number(it.activeStep) || 0));
            const status = (it.status || c.statusLabel || '').trim();
            return (
              <article key={`${it.title}-${i}`} className="pj101-og-card">
                {(card.showStatus !== false && status) || (card.showNote !== false && it.note?.trim()) ? (
                  <div className="pj101-og-top">
                    {card.showStatus !== false && status ? (
                      <span className="pj101-og-status" style={elementCss(card.statusStyle)}>
                        <i aria-hidden="true" />
                        {status}
                      </span>
                    ) : (
                      <span />
                    )}
                    {card.showNote !== false && it.note?.trim() ? <span className="pj101-og-note">{it.note}</span> : null}
                  </div>
                ) : null}
                {card.showCategory !== false && it.category?.trim() ? (
                  <span className="pj101-og-cat" style={elementCss(card.categoryStyle)}>
                    {it.category}
                  </span>
                ) : null}
                <div className="pj101-og-head">
                  {card.showThumb !== false ? (
                    <div className="pj101-og-thumb">
                      <PjThumb image={it.image} illustration={it.illustration || 'epc'} alt={it.title} />
                    </div>
                  ) : null}
                  <h3 style={elementCss(card.titleStyle)}>{it.title}</h3>
                </div>
                {card.showDescription !== false && it.description?.trim() ? <p style={elementCss(card.bodyStyle)}>{it.description}</p> : null}
                {card.showSteps !== false && steps.length ? (
                  <ol className="pj101-og-steps" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
                    {steps.map((step, k) => (
                      <li key={`${step}-${k}`} className={k < active ? 'done' : k === active ? 'active' : ''} style={elementCss(card.stepStyle)}>
                        <span aria-hidden="true" />
                        {step}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </LgShell>
  );
}

export function renderProjects101Section(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'pj101_projects':
      return <Pj101ProjectsSection key={key} {...rest} />;
    case 'pj101_ongoing':
      return <Pj101OngoingSection key={key} {...rest} />;
    default:
      return null;
  }
}
