'use client';

import { useEffect, useRef, useState } from 'react';
import type { ArticleHeading } from '@/lib/blog';

const BODY_SELECTOR = '[data-article-body]';
/** A section counts as "being read" once its heading passes this share of the viewport height. */
const READ_LINE = 0.3;

/** 0–1 progress through the article body (not the whole page, so related posts and the footer don't count). */
function bodyProgress() {
  const body = document.querySelector<HTMLElement>(BODY_SELECTOR);
  if (!body) return 0;
  const r = body.getBoundingClientRect();
  const span = r.height - window.innerHeight;
  if (span <= 0) return r.bottom <= window.innerHeight ? 1 : 0;
  return Math.min(1, Math.max(0, -r.top / span));
}

function onScrollFrame(update: () => void) {
  let raf = 0;
  const schedule = () => {
    if (!raf)
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
  };
  schedule();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };
}

/** Thin bar pinned to the top of the viewport that fills as the article body is read. */
export function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onScrollFrame(() => {
        if (ref.current) ref.current.style.transform = `scaleX(${bodyProgress()})`;
      }),
    []
  );
  return <div ref={ref} aria-hidden="true" className="blg-progress" />;
}

function useReadingState(headings: ArticleHeading[]) {
  const [active, setActive] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => Boolean(el));
    return onScrollFrame(() => {
      setPercent(Math.round(bodyProgress() * 100));
      const line = window.innerHeight * READ_LINE;
      let current: string | null = null;
      for (const el of els) {
        if (el.getBoundingClientRect().top - line > 0) break;
        current = el.id;
      }
      setActive(current);
    });
  }, [headings]);
  return { active, percent };
}

function timeLeft(minutes: number, percent: number) {
  if (percent >= 98) return 'Finished';
  if (percent <= 0) return `${minutes} min read`;
  return `${Math.max(1, Math.ceil(minutes * (1 - percent / 100)))} min left`;
}

function TocList({ headings, active, onPick }: { headings: ArticleHeading[]; active: string | null; onPick?: () => void }) {
  const activeIndex = headings.findIndex((h) => h.id === active);
  return (
    <ol className="blg-toc-list">
      {headings.map((h, i) => {
        const state = i === activeIndex ? 'is-active' : i < activeIndex ? 'is-read' : '';
        return (
          <li key={h.id} className={`${h.level === 3 ? 'is-sub ' : ''}${state}`}>
            <a href={`#${h.id}`} aria-current={i === activeIndex ? 'true' : undefined} onClick={onPick}>
              {h.text}
              {i < activeIndex ? <span className="lz-sr"> (read)</span> : null}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Contents that track reading: a sticky rail (desktop) and/or a floating button with a progress ring that
 * opens the list as a sheet (phones, and the Focus / Feature templates).
 */
export function ArticleToc({
  headings,
  label,
  minutes,
  mode,
}: {
  headings: ArticleHeading[];
  label: string;
  minutes: number;
  /** rail = sticky sidebar with a floating button on small screens; float = floating button everywhere */
  mode: 'rail' | 'float';
}) {
  const { active, percent } = useReadingState(headings);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  if (headings.length < 2) return null;
  const status = timeLeft(minutes, percent);
  const ring = 2 * Math.PI * 15;

  return (
    <>
      {mode === 'rail' ? (
        <nav className="blg-toc blg-toc--rail" aria-label={label}>
          <div className="blg-toc-head">
            <span className="blg-toc-label">{label}</span>
            <span className="blg-toc-status">
              {percent}% · {status}
            </span>
          </div>
          <div className="blg-toc-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${percent / 100})` }} />
          </div>
          <TocList headings={headings} active={active} />
        </nav>
      ) : null}

      <div ref={panelRef} className={`blg-toc-fab-wrap blg-toc-fab-wrap--${mode}${open ? ' is-open' : ''}`}>
        {open ? (
          <nav className="blg-toc blg-toc--sheet" aria-label={label}>
            <div className="blg-toc-head">
              <span className="blg-toc-label">{label}</span>
              <span className="blg-toc-status">{status}</span>
            </div>
            <TocList headings={headings} active={active} onPick={() => setOpen(false)} />
          </nav>
        ) : null}
        <button type="button" className="blg-toc-fab" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="15" className="blg-toc-fab-track" />
            <circle
              cx="18"
              cy="18"
              r="15"
              className="blg-toc-fab-ring"
              strokeDasharray={ring}
              strokeDashoffset={ring * (1 - percent / 100)}
            />
          </svg>
          <span>{open ? 'Close' : label}</span>
        </button>
      </div>
    </>
  );
}

/** Copies the article URL (does nothing when the browser blocks clipboard access). */
export function CopyLinkButton({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      className={className}
      title={copied ? 'Link copied' : 'Copy link'}
      aria-label={copied ? 'Link copied' : 'Copy link'}
      onClick={() => {
        navigator.clipboard
          ?.writeText(url)
          .then(() => setCopied(true))
          .catch(() => undefined);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {copied ? (
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        ) : (
          <>
            <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
            <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
          </>
        )}
      </svg>
    </button>
  );
}
