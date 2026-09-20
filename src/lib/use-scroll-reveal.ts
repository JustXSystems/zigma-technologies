'use client';

import { useEffect } from 'react';

/**
 * Port of public/assets/js/main.js scroll-reveal for CMS pages.
 *
 * Mobile caveat: a non-zero `threshold` is a fraction of the *target* height.
 * Tall sections (forms, split layouts, catalog grids) can never reach that
 * ratio on short viewports, so they stay at opacity:0 forever. Use
 * threshold 0 + isIntersecting, and a safety fallback.
 */
export function useScrollReveal(deps: unknown) {
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let cancelled = false;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    const reveal = (el: Element) => {
      el.classList.add('is-visible');
      observer?.unobserve(el);
    };

    const bind = () => {
      if (cancelled) return;
      const els = Array.from(
        document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible), .eyebrow-reveal:not(.is-visible)')
      );
      if (!els.length) return;

      observer?.disconnect();

      // Prefer IO when available; otherwise show content immediately.
      if (typeof IntersectionObserver === 'undefined') {
        els.forEach((el) => el.classList.add('is-visible'));
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) reveal(entry.target);
          });
        },
        {
          // 0 = any pixel visible. Avoid fractional thresholds that tall
          // mobile sections can never satisfy.
          threshold: 0,
          // Start slightly before the element enters, so content isn't blank
          // while the user is mid-scroll on slow devices.
          rootMargin: '0px 0px 12% 0px',
        }
      );

      els.forEach((el) => {
        // Already in (or near) view on first paint — reveal without waiting
        // for the async IO callback (helps iOS Safari + sticky chrome).
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        if (rect.top < vh * 1.12 && rect.bottom > 0) {
          reveal(el);
          return;
        }
        observer!.observe(el);
      });

      // Safety net: never leave sections permanently invisible if IO stalls.
      if (safetyTimer) clearTimeout(safetyTimer);
      safetyTimer = setTimeout(() => {
        if (cancelled) return;
        document
          .querySelectorAll<HTMLElement>('.reveal:not(.is-visible), .eyebrow-reveal:not(.is-visible)')
          .forEach((el) => el.classList.add('is-visible'));
      }, 2500);
    };

    const raf = requestAnimationFrame(bind);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, [deps]);
}
