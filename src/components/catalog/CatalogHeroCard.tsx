'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { catalogHeroCardClass, catalogHeroCardStyle, type CatalogHeroCard as CardSettings } from '@/lib/catalog-hero-card';
import { publicMediaUrl } from '@/lib/media-url';

export type CatalogHeroCardItem = {
  id: number;
  title: string;
  primary_image?: string | null;
  background_image_url?: string | null;
  price_label?: string | null;
  category_name?: string | null;
};

const FALLBACK_SRC = '/assets/images/engineers-reviewing-electrical-design-dr.jpg';

export default function CatalogHeroCard({
  card,
  items,
  activeIndex,
  autoplayMs,
  onOpen,
  className,
}: {
  card: CardSettings;
  items: CatalogHeroCardItem[];
  activeIndex: number;
  /** Length of the active slide, drives the progress bar */
  autoplayMs: number;
  onOpen?: (index: number) => void;
  className?: string;
}) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const n = items.length;
  const cur = n ? ((activeIndex % n) + n) % n : 0;
  const [shown, setShown] = useState<{ cur: number; prev: number | null }>({ cur, prev: null });
  if (shown.cur !== cur) setShown({ cur, prev: shown.cur });

  const tilt = card.cardMotion === 'tilt' || card.cardMotion === 'float-tilt';
  useEffect(() => {
    const el = tiltRef.current;
    if (!el || !tilt) return;
    if (window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const apply = (x: number, y: number, on: boolean) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--chc-tx', x.toFixed(3));
        el.style.setProperty('--chc-ty', y.toFixed(3));
        el.classList.toggle('is-tilting', on);
      });
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      apply((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5, true);
    };
    const onLeave = () => apply(0, 0, false);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.style.removeProperty('--chc-tx');
      el.style.removeProperty('--chc-ty');
      el.classList.remove('is-tilting');
    };
  }, [tilt]);

  if (!card.enabled || !n) return null;
  const active = items[shown.cur] ?? items[0];
  const old = shown.prev === null ? null : ((shown.prev % n) + n) % n;
  const clickable = card.clickable && !!onOpen;

  const caption =
    card.caption === 'none' ? null : (
      <div
        key={`cap-${active.id}`}
        className={`chc-caption chc-caption--${card.caption} chc-caption--${card.captionTone}`}
      >
        {card.captionCategory && active.category_name ? <span className="chc-caption-kicker">{active.category_name}</span> : null}
        <strong className="chc-caption-title">{active.title}</strong>
        {card.captionPrice && active.price_label ? <span className="chc-caption-price">{active.price_label}</span> : null}
      </div>
    );

  const interact = clickable
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-label': `View ${active.title}`,
        onClick: () => onOpen?.(shown.cur),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen?.(shown.cur);
          }
        },
      }
    : {};

  return (
    <div className={`${catalogHeroCardClass(card)}${className ? ` ${className}` : ''}`} style={catalogHeroCardStyle(card)}>
      <div className="chc-tilt" ref={tiltRef}>
        <div className="chc-float">
          <div className="chc-card" {...interact}>
            <div className="chc-frame">
              {card.animatedBorder ? <span className="chc-border-spin" aria-hidden="true" /> : null}
              <div className="chc-surface">
                {card.pattern !== 'none' ? <span className="chc-pattern" aria-hidden="true" /> : null}
                {card.spotGlow ? <span className="chc-glow" aria-hidden="true" /> : null}
                <div className="chc-stack">
                  {items.map((item, i) => {
                    // Only mount images near the active slide so long rotations stay light.
                    const near = i === shown.cur || i === old || i === (shown.cur + 1) % n;
                    const state = i === shown.cur ? ' is-active' : i === old ? ' is-prev' : '';
                    const bg = card.fill === 'item' && item.background_image_url ? publicMediaUrl(item.background_image_url) : '';
                    return (
                      <div key={`${item.id}-${i}`} className={`chc-slide${state}`} aria-hidden={i !== shown.cur}>
                        {near ? (
                          <>
                            {bg ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img className="chc-slide-bg" src={bg} alt="" decoding="async" />
                            ) : null}
                            <div className="chc-img-wrap">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                className="chc-img"
                                src={publicMediaUrl(item.primary_image || FALLBACK_SRC)}
                                alt={i === shown.cur ? item.title : ''}
                                decoding="async"
                                loading={i === 0 ? 'eager' : 'lazy'}
                              />
                            </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {card.shine ? <span className="chc-shine" aria-hidden="true" /> : null}
                {tilt ? <span className="chc-glare" aria-hidden="true" /> : null}
                {card.caption === 'inside' ? caption : null}
                {card.progress && n > 1 ? (
                  <span className="chc-progress" aria-hidden="true">
                    <i key={`${shown.cur}-${activeIndex}`} style={{ animationDuration: `${autoplayMs}ms` }} />
                  </span>
                ) : null}
              </div>
            </div>
            {card.caption !== 'inside' ? caption : null}
          </div>
        </div>
      </div>
    </div>
  );
}
