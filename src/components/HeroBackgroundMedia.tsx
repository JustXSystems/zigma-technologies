'use client';

import BgVideo, { BG_MOBILE_MQ, useIsMobileViewport } from '@/components/BgVideo';
import { isVideoMediaPath, publicMediaUrl } from '@/lib/media-url';

type Props = {
  src?: string | null;
  /** Optional mobile-only still/video (≤760px). Falls back to `src`. */
  mobileSrc?: string | null;
  alt?: string;
  /** Class on the media element (e.g. `slide-img`). */
  className?: string;
  eager?: boolean;
  /** Currently on screen. Inactive videos don't download or play (slideshows). */
  active?: boolean;
  /** Up next: fetch the video index and first frames so the switch is instant. */
  warm?: boolean;
};

/**
 * Full-bleed hero background from a media-library path.
 * Resolves basePath via publicMediaUrl; supports image or video; optional mobile override.
 * Picks mobile vs desktop asset with matchMedia so video works on iOS/Android.
 */
export default function HeroBackgroundMedia({
  src,
  mobileSrc,
  alt = '',
  className = 'slide-img',
  eager = false,
  active = true,
  warm = false,
}: Props) {
  const isMobile = useIsMobileViewport();
  const desktop = publicMediaUrl(String(src || '').trim());
  const mobile = publicMediaUrl(String(mobileSrc || '').trim());
  const chosen = (isMobile && mobile ? mobile : desktop) || mobile || desktop;
  if (!chosen) return null;

  if (isVideoMediaPath(chosen)) {
    const posterCandidate = isMobile
      ? mobile && !isVideoMediaPath(mobile)
        ? mobile
        : desktop && !isVideoMediaPath(desktop)
          ? desktop
          : undefined
      : mobile && !isVideoMediaPath(mobile)
        ? mobile
        : undefined;
    // With per-viewport sources, wait for hydration so phones never start the desktop file.
    const viewportDependent = Boolean(mobile && desktop && mobile !== desktop);
    const waiting = viewportDependent && isMobile === null;

    return (
      <BgVideo
        key={chosen}
        src={chosen}
        poster={posterCandidate}
        className={className}
        alt={alt}
        active={active && !waiting}
        warm={warm && !waiting}
      />
    );
  }

  if (mobile && desktop && mobile !== desktop) {
    return (
      <picture>
        <source media={BG_MOBILE_MQ} srcSet={mobile} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={className}
          src={desktop}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          decoding="async"
        />
      </picture>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={chosen}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
    />
  );
}
