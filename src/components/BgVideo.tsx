'use client';

import { useEffect, useRef, useState } from 'react';

/** Must match the CSS breakpoint that swaps `--desk` / `--mob` background scopes. */
export const BG_MOBILE_MQ = '(max-width: 760px)';

/** `null` until hydrated (viewport unknown during SSR). */
export function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(BG_MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  return isMobile;
}

export type BgVideoProps = {
  src: string;
  poster?: string;
  className?: string;
  alt?: string;
  /** On screen now. Inactive videos neither download nor play (slideshows). */
  active?: boolean;
  /** Next up: fetch the index and first frames so the switch is instant. */
  warm?: boolean;
  /** Only load on this viewport; the other scope is hidden by CSS and never fetched. */
  scope?: 'desk' | 'mob';
};

/**
 * Muted looping background video that only spends bandwidth on what the visitor sees,
 * and fades in on its first decoded frame instead of flashing an empty box.
 */
export default function BgVideo({ src, poster, className, alt, active = true, warm = false, scope }: BgVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const isMobile = useIsMobileViewport();
  const inScope = !scope || (isMobile !== null && isMobile === (scope === 'mob'));
  const resolvedSrc = inScope ? src : undefined;
  const live = active && inScope;

  useEffect(() => {
    const video = ref.current;
    if (!video || !resolvedSrc) return;
    // Autoplay can start (and fire loadeddata) before hydration attaches handlers.
    if (video.readyState >= 2) setReady(true);
    if (live) {
      video.muted = true;
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [live, resolvedSrc]);

  return (
    <video
      ref={ref}
      className={className}
      src={resolvedSrc}
      poster={poster || undefined}
      autoPlay={live}
      muted
      loop
      playsInline
      preload={live ? 'auto' : warm && inScope ? 'metadata' : 'none'}
      data-hbm={ready || poster ? 'ready' : 'loading'}
      onLoadedData={() => setReady(true)}
      aria-label={alt || undefined}
    />
  );
}
