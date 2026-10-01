'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/** Browsers without svh/lvh: height-only growth below this on touch screens is treated as toolbar collapse. */
const LEGACY_TOOLBAR_DELTA_PX = 120;
/** iOS/Android report stale sizes right after rotation or fold changes; re-measure once things settle. */
const SETTLE_DELAYS_MS = [120, 360, 800];

const PROBE_CSS = 'position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;z-index:-1;';

function isEditable(el: Element | null) {
  return Boolean(el?.matches('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
}

/**
 * Publishes the visible viewport height as `--hero-vh` on <html> so full-screen heroes fill exactly the space
 * the device/browser offers on every resize, rotation, fold or split-screen change. The fixed header overlays
 * the hero; the fixed mobile CTA bar does not. Mobile toolbar show/hide (svh↔lvh) keeps the small height so the
 * page doesn't jump while scrolling, and an open on-screen keyboard never shrinks the hero.
 */
export default function HeroViewportSync() {
  const pathname = usePathname();
  const remeasureRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = document.documentElement;
    const coarse = window.matchMedia('(pointer: coarse)');
    const dynamicUnits = typeof CSS !== 'undefined' && CSS.supports('height', '100svh');

    const makeProbe = (height: string) => {
      const el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = `${PROBE_CSS}height:${height};`;
      document.body.appendChild(el);
      return el;
    };
    const svhProbe = dynamicUnits ? makeProbe('100svh') : null;
    const lvhProbe = dynamicUnits ? makeProbe('100lvh') : null;

    let lastWidth = 0;
    let lastViewH = 0;
    let lastValue = '';
    let lastNavValue = '';
    let frame = 0;
    let ctaObserved: HTMLElement | null = null;
    let navObserved: HTMLElement | null = null;
    const timers = new Set<number>();

    /** Header row height (unaffected by the scrolled state), so positioned hero content clears a wrapped header. */
    const measureNav = () => {
      const nav = document.querySelector<HTMLElement>('#siteHeader > .nav-wrap');
      if (nav !== navObserved) {
        if (navObserved) ro?.unobserve(navObserved);
        if (nav) ro?.observe(nav);
        navObserved = nav;
      }
      const h = nav?.getBoundingClientRect().height ?? 0;
      const value = h > 0 ? `${Math.round(h)}px` : '';
      if (value === lastNavValue) return;
      lastNavValue = value;
      if (value) root.style.setProperty('--site-nav-h', value);
      else root.style.removeProperty('--site-nav-h');
    };

    const viewportHeight = () => {
      const inner = Math.min(window.innerHeight, root.clientHeight || Infinity);
      if (!svhProbe || !lvhProbe) return inner;
      const svh = svhProbe.getBoundingClientRect().height;
      const lvh = lvhProbe.getBoundingClientRect().height;
      return svh > 0 && lvh - svh > 1 && inner >= svh - 1 && inner <= lvh + 1 ? svh : inner;
    };

    const measure = (force: boolean) => {
      frame = 0;
      if ((window.visualViewport?.scale ?? 1) > 1.01) return;
      measureNav();
      const width = window.innerWidth;
      const viewH = viewportHeight();
      if (!viewH) return;
      if (!force && width === lastWidth && lastViewH && coarse.matches) {
        const delta = viewH - lastViewH;
        if (delta < 0 && isEditable(document.activeElement)) return;
        if (!dynamicUnits && delta > 0 && delta < LEGACY_TOOLBAR_DELTA_PX) return;
      }
      lastWidth = width;
      lastViewH = viewH;

      const cta = document.querySelector<HTMLElement>('.sticky-mobile-cta');
      if (cta !== ctaObserved) {
        if (ctaObserved) ro?.unobserve(ctaObserved);
        if (cta) ro?.observe(cta);
        ctaObserved = cta;
      }
      let bottom = viewH;
      if (cta) {
        const style = getComputedStyle(cta);
        const rect = cta.getBoundingClientRect();
        if (style.display !== 'none' && style.position === 'fixed' && rect.height > 0) {
          bottom = Math.min(bottom, rect.top);
        }
      }
      const value = `${Math.max(0, Math.round(bottom))}px`;
      if (value === lastValue) return;
      lastValue = value;
      root.style.setProperty('--hero-vh', value);
    };

    function schedule(force = false) {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => measure(force));
    }
    const settle = () => {
      schedule(true);
      for (const ms of SETTLE_DELAYS_MS) {
        const id = window.setTimeout(() => {
          timers.delete(id);
          schedule(true);
        }, ms);
        timers.add(id);
      }
    };

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => schedule()) : null;
    if (svhProbe) ro?.observe(svhProbe);
    if (lvhProbe) ro?.observe(lvhProbe);

    const onResize = () => schedule();
    const onFocusOut = (e: FocusEvent) => {
      if (isEditable(e.target as Element | null)) window.setTimeout(() => schedule(true), 250);
    };
    const vv = window.visualViewport;

    remeasureRef.current = () => schedule(true);
    measure(true);
    window.addEventListener('resize', onResize);
    vv?.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', settle);
    screen.orientation?.addEventListener?.('change', settle);
    window.addEventListener('pageshow', settle);
    document.addEventListener('fullscreenchange', settle);
    document.addEventListener('focusout', onFocusOut);
    coarse.addEventListener?.('change', settle);
    return () => {
      remeasureRef.current = () => {};
      if (frame) cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
      ro?.disconnect();
      svhProbe?.remove();
      lvhProbe?.remove();
      window.removeEventListener('resize', onResize);
      vv?.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', settle);
      screen.orientation?.removeEventListener?.('change', settle);
      window.removeEventListener('pageshow', settle);
      document.removeEventListener('fullscreenchange', settle);
      document.removeEventListener('focusout', onFocusOut);
      coarse.removeEventListener?.('change', settle);
      root.style.removeProperty('--hero-vh');
      root.style.removeProperty('--site-nav-h');
    };
  }, []);

  useEffect(() => {
    remeasureRef.current();
  }, [pathname]);

  return null;
}
