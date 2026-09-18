'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { CatalogShadowStyle, CatalogMedia } from '@/lib/types';
import { DEFAULT_MEDIA_FIT_PERCENT, normalizeShadowStyle } from '@/lib/types';
import { publicMediaUrl } from '@/lib/media-url';

type Props = {
  media: CatalogMedia[];
  title?: string;
  className?: string;
  variant?: 'default' | 'detail';
  backgroundImageUrl?: string | null;
  backgroundShadingStyle?: CatalogShadowStyle | null;
  /**
   * Explicit frame shadow for `.catalog-gallery-main`.
   * When set (typical for Quick view), applies even without a background image.
   */
  frameShadowStyle?: CatalogShadowStyle | null;
  backgroundFitToSpace?: boolean | null;
  backgroundFitPercent?: number | null;
  /** Fallback product fit when active media lacks values */
  mediaFitToSpace?: boolean | null;
  mediaFitPercent?: number | null;
  /** Same page-level fill as catalog-card-media (Card media background) */
  mediaBgColor?: string | null;
  /** When false, hide the thumbnail strip (admin live preview drives selection). */
  showThumbs?: boolean;
};

export default function CatalogMediaGallery({
  media,
  title,
  className,
  variant = 'default',
  backgroundImageUrl,
  backgroundShadingStyle = 'medium',
  frameShadowStyle = null,
  backgroundFitToSpace = false,
  backgroundFitPercent = 100,
  mediaFitToSpace = true,
  mediaFitPercent = DEFAULT_MEDIA_FIT_PERCENT,
  mediaBgColor = '#ffffff',
  showThumbs = true,
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
  const bg = publicMediaUrl(backgroundImageUrl?.trim() || '');
  const bgCss = bg
    ? encodeURI(bg).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    : '';
  const bgShadow = normalizeShadowStyle(backgroundShadingStyle);
  const resolvedFrameShadow = normalizeShadowStyle(
    frameShadowStyle ?? (bg || variant === 'detail' ? bgShadow : 'none')
  );
  const applyFrameShadow = Boolean(frameShadowStyle) || Boolean(bg) || variant === 'detail';
  const bgFit = backgroundFitToSpace === true;
  const bgPct = Math.min(100, Math.max(20, Number(backgroundFitPercent) || 100));
  const solidMediaBg = mediaBgColor?.trim() || '#ffffff';

  const productFit =
    active?.fit_to_space !== undefined && active?.fit_to_space !== null
      ? active.fit_to_space !== false
      : mediaFitToSpace !== false;
  const productPct = Math.min(
    100,
    Math.max(
      20,
      Number(
        active?.fit_percent !== undefined && active?.fit_percent !== null
          ? active.fit_percent
          : mediaFitPercent
      ) || DEFAULT_MEDIA_FIT_PERCENT
    )
  );
  const productShadow = normalizeShadowStyle(active?.shadow_style || 'medium');
  const useProductFit =
    productFit && (!!bg || variant === 'detail' || frameShadowStyle != null);

  const rootClass = [
    'catalog-gallery',
    variant === 'detail' ? 'catalog-gallery--detail' : '',
    bg ? 'catalog-gallery--has-bg' : '',
    bg ? (bgFit ? 'catalog-gallery--bg-fit' : 'catalog-gallery--bg-cover') : '',
    applyFrameShadow ? `catalog-gallery--bg-shade-${resolvedFrameShadow}` : '',
    useProductFit ? 'catalog-gallery--product-fit catalog-gallery--fit' : bg ? 'catalog-gallery--product-cover' : '',
    useProductFit ? `catalog-gallery--product-shade-${productShadow}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const mediaSurfaceStyle = {
    ['--catalog-card-media-bg']: solidMediaBg,
    backgroundColor: solidMediaBg,
  } as CSSProperties;

  const mainStyle = {
    ...mediaSurfaceStyle,
    ...(bgCss
      ? {
          backgroundImage: `url("${bgCss}")`,
          backgroundSize: bgFit ? undefined : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : null),
    ...(bgFit ? ({ ['--catalog-bg-fit']: `${bgPct}%`, backgroundSize: `${bgPct}% auto` } as CSSProperties) : null),
    ...(useProductFit ? ({ ['--catalog-media-fit']: `${productPct}%` } as CSSProperties) : null),
  } as CSSProperties;

  if (!sorted.length) {
    return <div className={`${rootClass} catalog-gallery--empty`} style={mainStyle} aria-hidden="true" />;
  }

  return (
    <div className={rootClass} style={{ ['--catalog-card-media-bg']: solidMediaBg } as CSSProperties}>
      <div className="catalog-gallery-main" style={mainStyle}>
        {active?.kind === 'video' ? (
          <video
            key={active.id}
            src={publicMediaUrl(active.url)}
            controls
            playsInline
            className="catalog-gallery-media"
            style={mediaSurfaceStyle}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={active?.id}
            src={publicMediaUrl(active?.url || '')}
            alt={active?.alt || title || ''}
            className="catalog-gallery-media"
            style={mediaSurfaceStyle}
          />
        )}
      </div>

      {showThumbs && sorted.length > 1 ? (
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
