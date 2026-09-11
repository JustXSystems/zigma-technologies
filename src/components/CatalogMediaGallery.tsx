'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CatalogMedia } from '@/lib/types';
import { withBasePath } from '@/lib/base-path';

type Props = {
  media: CatalogMedia[];
  title?: string;
  className?: string;
  variant?: 'default' | 'detail';
  /** Optional backdrop behind gallery media (catalog-gallery-main) */
  backgroundImageUrl?: string | null;
};

export default function CatalogMediaGallery({
  media,
  title,
  className,
  variant = 'default',
  backgroundImageUrl,
}: Props) {
  const sorted = useMemo(
    () => [...media].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order || a.id - b.id),
    [media]
  );

  const [activeId, setActiveId] = useState<number | null>(sorted[0]?.id ?? null);

  useEffect(() => {
    setActiveId(sorted[0]?.id ?? null);
  }, [sorted]);

  const active = sorted.find((m) => m.id === activeId) || sorted[0];
  // CSS url() is not rewritten by BasePathBootstrap (only <img>/<a>/fetch) — must prefix here.
  const bg = withBasePath(backgroundImageUrl?.trim() || '');
  // Encode special chars in URLs for CSS url("…") (spaces, etc.)
  const bgCss = bg ? bg.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\(/g, '\\(').replace(/\)/g, '\\)') : '';

  const rootClass = [
    'catalog-gallery',
    variant === 'detail' ? 'catalog-gallery--detail' : '',
    bg ? 'catalog-gallery--has-bg' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const mainStyle = bgCss ? ({ backgroundImage: `url("${bgCss}")` } as const) : undefined;

  if (!sorted.length) {
    return (
      <div
        className={`${rootClass} catalog-gallery--empty`}
        style={mainStyle}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={rootClass}>
      <div className="catalog-gallery-main" style={mainStyle}>
        {active?.kind === 'video' ? (
          <video
            key={active.id}
            src={withBasePath(active.url)}
            controls
            playsInline
            className="catalog-gallery-media"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={active?.id}
            src={withBasePath(active?.url || '')}
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
                    <video src={withBasePath(m.url)} muted className="catalog-gallery-thumb-media" />
                    <span className="catalog-gallery-thumb-play">▶</span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={withBasePath(m.url)} alt={m.alt || ''} className="catalog-gallery-thumb-media" />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
