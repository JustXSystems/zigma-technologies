'use client';

import { useEffect, useState } from 'react';

export type CertItem = {
  name: string;
  image?: string;
};

type Props = {
  items: CertItem[];
};

export default function CertMarquee({ items }: Props) {
  const [active, setActive] = useState<CertItem | null>(null);
  const loop = items.length ? [...items, ...items] : [];

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
          <div className="cert-marquee">
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
