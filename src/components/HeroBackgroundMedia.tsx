'use client';

import { isVideoMediaPath, publicMediaUrl } from '@/lib/media-url';

type Props = {
  src?: string | null;
  /** Optional mobile-only still/video (≤760px). Falls back to `src`. */
  mobileSrc?: string | null;
  alt?: string;
  /** Class on the media element (e.g. `slide-img`). */
  className?: string;
  eager?: boolean;
};

/**
 * Full-bleed hero background from a media-library path.
 * Resolves basePath via publicMediaUrl; supports image or video; optional mobile override.
 */
export default function HeroBackgroundMedia({
  src,
  mobileSrc,
  alt = '',
  className = 'slide-img',
  eager = false,
}: Props) {
  const desktop = publicMediaUrl(String(src || '').trim());
  const mobile = publicMediaUrl(String(mobileSrc || '').trim());
  const primary = desktop || mobile;
  if (!primary) return null;

  if (isVideoMediaPath(primary) || (desktop && isVideoMediaPath(desktop))) {
    const videoSrc = desktop && isVideoMediaPath(desktop) ? desktop : primary;
    const poster = mobile && !isVideoMediaPath(mobile) ? mobile : undefined;
    return (
      <video
        className={className}
        src={videoSrc}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload={eager ? 'auto' : 'metadata'}
        aria-label={alt || undefined}
      />
    );
  }

  if (mobile && mobile !== desktop) {
    return (
      <picture>
        <source media="(max-width: 760px)" srcSet={mobile} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={className}
          src={desktop || mobile}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
        />
      </picture>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={primary}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
    />
  );
}
