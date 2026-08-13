'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CatalogMedia } from '@/lib/types';

type Props = {
  media: CatalogMedia[];
  title?: string;
  className?: string;
  variant?: 'default' | 'detail';
};

export default function CatalogMediaGallery({ media, title, className, variant = 'default' }: Props) {
  const sorted = useMemo(
    () => [...media].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order || a.id - b.id),
    [media]
  );

  const [activeId, setActiveId] = useState<number | null>(sorted[0]?.id ?? null);

  useEffect(() => {
    setActiveId(sorted[0]?.id ?? null);
  }, [sorted]);

  const active = sorted.find((m) => m.id === activeId) || sorted[0];

  const rootClass = ['catalog-gallery', variant === 'detail' ? 'catalog-gallery--detail' : '', className]
    .filter(Boolean)
    .join(' ');

  if (!sorted.length) {
    return <div className={`${rootClass} catalog-gallery--empty`} aria-hidden="true" />;
  }

  return (
    <div className={rootClass}>
      <div className="catalog-gallery-main">
        {active?.kind === 'video' ? (
          <video key={active.id} src={active.url} controls playsInline className="catalog-gallery-media" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={active?.id}
            src={active?.url || ''}
            alt={active?.alt || title || ''}
            className="catalog-gallery-media"
          />
        )}
      </div>

      {sorted.length > 1 ? (
        <div className="catalog-gallery-thumbs">
          {sorted.map((m) => {
            const selected = m.id === active?.id;
            return (
              <button
                key={m.id}
                type="button"
                className={`catalog-gallery-thumb${selected ? ' is-active' : ''}`}
                onClick={() => setActiveId(m.id)}
                aria-label={`View ${m.kind} ${m.alt || title || ''}`}
                aria-pressed={selected}
              >
                {m.kind === 'video' ? (
                  <>
                    <video src={m.url} muted className="catalog-gallery-thumb-media" />
                    <span className="catalog-gallery-thumb-play">▶</span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.alt || ''} className="catalog-gallery-thumb-media" />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
