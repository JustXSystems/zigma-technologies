'use client';

import { useEffect, useRef, useState } from 'react';
import { catalogHeroBgClass, catalogHeroBgStyle, type CatalogHeroBg } from '@/lib/catalog-hero-bg';
import { lifeMediaKind, visibleMedia, type LifeMediaItem } from '@/lib/life-sections';
import { publicMediaUrl } from '@/lib/media-url';

type Slide = { src: string; kind: 'image' | 'video'; poster?: string };

const FALLBACK_SRC = '/assets/images/engineers-reviewing-electrical-design-dr.jpg';

function toSlides(items: LifeMediaItem[]): Slide[] {
  return visibleMedia(items).map((m) => ({ src: m.src, kind: lifeMediaKind(m), poster: m.poster || undefined }));
}

function SlideStack({
  slides,
  current,
  prev,
  ambient,
  className,
}: {
  slides: Slide[];
  current: number;
  prev: number | null;
  ambient: boolean;
  className: string;
}) {
  const n = slides.length;
  const cur = ((current % n) + n) % n;
  const old = prev === null ? null : ((prev % n) + n) % n;
  return (
    <div className={className}>
      {slides.map((s, i) => {
        // Only mount media near the active slide so long slideshows stay light.
        const near = i === cur || i === old || i === (cur + 1) % n;
        const state = i === cur ? ' is-active' : i === old ? ' is-prev' : '';
        const src = publicMediaUrl(s.src);
        const fill = s.kind === 'video' ? (s.poster ? publicMediaUrl(s.poster) : '') : src;
        return (
          <div key={`${i}-${s.src}`} className={`chb-slide${state}`} data-slide={i}>
            {near ? (
              <>
                {ambient && fill ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="chb-ambient" src={fill} alt="" decoding="async" />
                ) : null}
                <div className="chb-frame">
                  {s.kind === 'video' ? (
                    <video
                      className="chb-media"
                      src={src}
                      poster={s.poster ? publicMediaUrl(s.poster) : undefined}
                      muted
                      loop
                      playsInline
                      preload={i === cur ? 'auto' : 'metadata'}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="chb-media" src={src} alt="" decoding="async" />
                  )}
                </div>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function CatalogHeroBackground({
  bg,
  spotlight,
  activeIndex,
  className,
}: {
  bg: CatalogHeroBg;
  /** Image of each spotlight slide, in rotation order */
  spotlight: Array<string | null | undefined>;
  activeIndex: number;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const custom = bg.source === 'custom' ? toSlides(bg.items) : [];
  const useCustom = custom.length > 0;
  const spotlightSlides: Slide[] = spotlight.map((src) => ({ src: src || FALLBACK_SRC, kind: 'image' }));
  const slides: Slide[] = useCustom ? custom : spotlightSlides.length ? spotlightSlides : [{ src: FALLBACK_SRC, kind: 'image' }];
  const phoneSlides = useCustom ? toSlides(bg.mobileItems) : [];
  const synced = !useCustom || bg.sync;
  const count = Math.max(slides.length, phoneSlides.length);

  const [ownIndex, setOwnIndex] = useState(0);
  useEffect(() => {
    if (synced || count < 2) return;
    const timer = window.setInterval(() => setOwnIndex((i) => i + 1), bg.intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [synced, count, bg.intervalSeconds]);

  const current = synced ? activeIndex : ownIndex;
  const [shown, setShown] = useState<{ cur: number; prev: number | null }>({ cur: current, prev: null });
  if (shown.cur !== current) setShown({ cur: current, prev: shown.cur });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLVideoElement>('video.chb-media').forEach((video) => {
      const active = Boolean(video.closest('.chb-slide.is-active'));
      const visible = video.getClientRects().length > 0;
      video.playbackRate = bg.videoRate;
      if (active && visible) void video.play().catch(() => {});
      else video.pause();
    });
  }, [current, bg.videoRate, slides.length, phoneSlides.length]);

  useEffect(() => {
    const root = rootRef.current;
    const host = root?.parentElement;
    if (!root || !host || bg.motion !== 'cursor') return;
    if (window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const apply = (x: number, y: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--chb-mx', x.toFixed(3));
        root.style.setProperty('--chb-my', y.toFixed(3));
      });
    };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      apply((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    };
    const onLeave = () => apply(0, 0);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      root.style.removeProperty('--chb-mx');
      root.style.removeProperty('--chb-my');
    };
  }, [bg.motion]);

  const ambient = bg.fit === 'ambient' || bg.fitMobile === 'ambient';
  const showMedia = bg.source !== 'none';
  const grad = bg.gradType !== 'none';

  return (
    <div
      ref={rootRef}
      className={`hero-bg catalog-hero-bg ${catalogHeroBgClass(bg)}${className ? ` ${className}` : ''}`}
      style={catalogHeroBgStyle(bg)}
      aria-hidden="true"
    >
      {grad && bg.gradLayer === 'under' ? <div className="chb-grad chb-grad--under"></div> : null}
      <div className="chb-stage">
        {showMedia ? (
          <SlideStack
            slides={slides}
            current={shown.cur}
            prev={shown.prev}
            ambient={ambient}
            className={phoneSlides.length ? 'chb-stack chb-stack--desk' : 'chb-stack'}
          />
        ) : null}
        {showMedia && phoneSlides.length ? (
          <SlideStack slides={phoneSlides} current={shown.cur} prev={shown.prev} ambient={ambient} className="chb-stack chb-stack--phone" />
        ) : null}
        {bg.tintOpacity > 0 ? <div className="chb-tint" /> : null}
      </div>
      {grad && bg.gradLayer === 'over' ? <div className="chb-grad chb-grad--over"></div> : null}
      <div className="hero-overlay chb-ov"></div>
      {bg.texture === 'grid' ? <div className="grid-overlay"></div> : null}
      {bg.texture !== 'grid' && bg.texture !== 'none' ? <div className="chb-texture"></div> : null}
      <div className="catalog-hero-tint chb-ov"></div>
      {bg.vignette > 0 ? <div className="chb-vignette"></div> : null}
    </div>
  );
}
