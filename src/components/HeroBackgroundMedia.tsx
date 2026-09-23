'use client';

import { useEffect, useState } from 'react';
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

const MOBILE_MQ = '(max-width: 760px)';

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  return isMobile;
}

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
}: Props) {
  const isMobile = useIsMobileViewport();
  const desktop = publicMediaUrl(String(src || '').trim());
  const mobile = publicMediaUrl(String(mobileSrc || '').trim());
  const active = (isMobile && mobile ? mobile : desktop) || mobile || desktop;
  if (!active) return null;

  if (isVideoMediaPath(active)) {
    const posterCandidate = isMobile
      ? mobile && !isVideoMediaPath(mobile)
        ? mobile
        : desktop && !isVideoMediaPath(desktop)
          ? desktop
          : undefined
      : mobile && !isVideoMediaPath(mobile)
        ? mobile
        : undefined;

    return (
      <video
        key={active}
        className={className}
        src={active}
        poster={posterCandidate}
        autoPlay
        muted
        loop
        playsInline
        preload={eager || isMobile ? 'auto' : 'metadata'}
        aria-label={alt || undefined}
      />
    );
  }

  if (mobile && desktop && mobile !== desktop) {
    return (
      <picture>
        <source media={MOBILE_MQ} srcSet={mobile} />
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
      src={active}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
    />
  );
}
