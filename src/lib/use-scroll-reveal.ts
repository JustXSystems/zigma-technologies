'use client';

import { useEffect } from 'react';

/** Port of public/assets/js/main.js scroll-reveal for CMS pages. */
export function useScrollReveal(deps: unknown) {
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let cancelled = false;

    const bind = () => {
      if (cancelled) return;
      const els = Array.from(
        document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible), .eyebrow-reveal:not(.is-visible)')
      );
      if (!els.length) return;

      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );

      els.forEach((el) => observer!.observe(el));
    };

    const raf = requestAnimationFrame(bind);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [deps]);
}
