'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { CatalogBackgroundShading, CatalogMedia } from '@/lib/types';
import { DEFAULT_MEDIA_FIT_PERCENT } from '@/lib/types';
import { publicMediaUrl } from '@/lib/media-url';

type Props = {
  media: CatalogMedia[];
  title?: string;
  className?: string;
  variant?: 'default' | 'detail';
  /** Optional backdrop behind gallery media (catalog-gallery-main) */
  backgroundImageUrl?: string | null;
  backgroundShadingStyle?: CatalogBackgroundShading | null;
  mediaFitToSpace?: boolean | null;
  mediaFitPercent?: number | null;
};

export default function CatalogMediaGallery({
  media,
  title,
  className,
  variant = 'default',
  backgroundImageUrl,
  backgroundShadingStyle = 'medium',
  mediaFitToSpace = true,
  mediaFitPercent = DEFAULT_MEDIA_FIT_PERCENT,
}: Props) {
  const sorted = useMemo(
    () =>
      [...media].sort(
        (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order || a.id - b.id
      ),
    [media]
  );

  const [activeId, setActiveId] = useState<number | null>(sorted[0]?.id ?? null);

  useEffect(() => {
    setActiveId(sorted[0]?.id ?? null);
  }, [sorted]);

  const active = sorted.find((m) => m.id === activeId) || sorted[0];
  // CSS url() is not rewritten by BasePathBootstrap — must prefix here for PreProd.
  const bg = publicMediaUrl(backgroundImageUrl?.trim() || '');
  const bgCss = bg
    ? encodeURI(bg).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    : '';
  const shading = backgroundShadingStyle || 'medium';
  const fitToSpace = mediaFitToSpace !== false;
  const fitPct = Math.min(100, Math.max(20, Number(mediaFitPercent) || DEFAULT_MEDIA_FIT_PERCENT));
  const useFit = !!bg && fitToSpace;

  const rootClass = [
    'catalog-gallery',
    variant === 'detail' ? 'catalog-gallery--detail' : '',
    bg ? 'catalog-gallery--has-bg' : '',
    bg ? (useFit ? 'catalog-gallery--fit' : 'catalog-gallery--cover') : '',
    `catalog-gallery--shade-${shading}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const mainStyle = {
    ...(bgCss
      ? {
          backgroundImage: `url("${bgCss}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : null),
    ...(useFit
      ? ({
          ['--catalog-media-fit']: `${fitPct}%`,
        } as CSSProperties)
      : null),
  } as CSSProperties | undefined;

  if (!sorted.length) {
    return <div className={`${rootClass} catalog-gallery--empty`} style={mainStyle} aria-hidden="true" />;
  }

  return (
    <div className={rootClass}>
      <div className="catalog-gallery-main" style={mainStyle}>
        {active?.kind === 'video' ? (
          <video
            key={active.id}
            src={publicMediaUrl(active.url)}
            controls
            playsInline
            className="catalog-gallery-media"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={active?.id}
            src={publicMediaUrl(active?.url || '')}
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
                    <video src={publicMediaUrl(m.url)} muted className="catalog-gallery-thumb-media" />
                    <span className="catalog-gallery-thumb-play">▶</span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicMediaUrl(m.url)} alt={m.alt || ''} className="catalog-gallery-thumb-media" />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
