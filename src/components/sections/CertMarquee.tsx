'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

export type CertItem = {
  name: string;
  image?: string;
};

export type CertMarqueeStart = 'left' | 'right';

type Props = {
  items: CertItem[];
  startFrom?: CertMarqueeStart;
};

/** Seconds for one full set of certificates to scroll past (matches the CSS default). */
const BASE_DURATION_S = 28;

type FillState = {
  copies: number;
  durationS: number;
  delayS: number;
  /** Static translate used instead of the animation when the user prefers reduced motion. */
  offsetPx: number;
  still: boolean;
};

export default function CertMarquee({ items, startFrom = 'left' }: Props) {
  const [active, setActive] = useState<CertItem | null>(null);
  const [fill, setFill] = useState<FillState | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fromRight = startFrom === 'right';
  const copies = fromRight && fill ? fill.copies : 1;
  const unit = Array.from({ length: copies }, () => items).flat();
  const loop = items.length ? [...unit, ...unit] : [];

  useEffect(() => {
    if (!fromRight || !items.length) return;
    const track = trackRef.current;
    const wrap = track?.parentElement;
    if (!track || !wrap) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const measure = () => {
      const first = track.children[0] as HTMLElement | undefined;
      const nextSet = track.children[items.length] as HTMLElement | undefined;
      if (!first || !nextSet) return;
      const period = nextSet.offsetLeft - first.offsetLeft;
      const viewport = wrap.clientWidth;
      if (period <= 0 || viewport <= 0) return;

      // Half the track must be at least as wide as the viewport, or a gap shows.
      const nextCopies = Math.max(1, Math.ceil(viewport / period));
      const unitWidth = nextCopies * period;
      // Translate that puts the first certificate's right edge on the viewport's right edge.
      let offset = viewport - first.offsetWidth;
      offset -= Math.ceil(offset / period) * period;
      const durationS = BASE_DURATION_S * nextCopies;
      const delayS = -((offset + unitWidth) / unitWidth) * durationS;
      const still = reducedMotion.matches;

      setFill((prev) =>
        prev &&
        prev.copies === nextCopies &&
        prev.still === still &&
        Math.abs(prev.delayS - delayS) < 0.01
          ? prev
          : { copies: nextCopies, durationS, delayS, offsetPx: offset, still }
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    reducedMotion.addEventListener('change', measure);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener('change', measure);
    };
  }, [fromRight, items.length]);

  // Animation stays off until measured so it starts fresh with the computed delay
  // (some mobile browsers ignore a delay changed on an already-running animation).
  const trackStyle: CSSProperties | undefined = fromRight
    ? !fill
      ? { visibility: 'hidden', animationName: 'none' }
      : fill.still
        ? { animationName: 'none', transform: `translateX(${fill.offsetPx}px)` }
        : { animationDuration: `${fill.durationS}s`, animationDelay: `${fill.delayS}s` }
    : undefined;

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setActive(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  if (!items.length) return null;

  return (
    <>
      <section className="cert-marquee-section">
        <div className="cert-marquee-wrap">
          <div className="cert-marquee" ref={trackRef} style={trackStyle}>
            {loop.map((item, i) => {
              const clickable = Boolean(item.image);
              return (
                <div
                  key={`${item.name}-${i}`}
                  className="cert-card"
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={() => clickable && setActive(item)}
                  onKeyDown={(e) => {
                    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setActive(item);
                    }
                  }}
                  style={clickable ? { cursor: 'zoom-in' } : undefined}
                >
                  <div className="cert-img-wrap">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          color: 'var(--graphite-800)',
                        }}
                      >
                        {item.name}
                      </div>
                    )}
                  </div>
                  <div className="cert-name">{item.name}</div>
                  {clickable ? <div className="zoom-hint">Click to enlarge</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {active?.image ? (
        <div
          className="lightbox-overlay active"
          role="dialog"
          aria-modal="true"
          aria-label={active.name}
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            className="lightbox-close"
            aria-label="Close"
            onClick={() => setActive(null)}
          >
            ×
          </button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.image} alt={active.name} />
            <div className="lightbox-caption">{active.name}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function normalizeCertItems(raw: unknown): CertItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return { name: entry };
      if (entry && typeof entry === 'object') {
        const o = entry as Record<string, unknown>;
        const name = String(o.name || o.title || '').trim();
        if (!name) return null;
        const image = o.image || o.img || o.src;
        return { name, image: typeof image === 'string' && image.trim() ? image.trim() : undefined };
      }
      return null;
    })
    .filter(Boolean) as CertItem[];
}
