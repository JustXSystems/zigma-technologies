'use client';

import { useEffect } from 'react';

/** Fractional-pixel rounding between measurements shouldn't flip a hero between fit and solo. */
const FIT_TOLERANCE_PX = 2;
const SKIP_TAGS = new Set(['STYLE', 'SCRIPT', 'TEMPLATE', 'LINK', 'NOSCRIPT']);
const ITEM_CLASSES = ['hero-club-item', 'hero-club-item--first', 'hero-club-item--lift'];

type Managed = { items: HTMLElement[]; surfaces: HTMLElement[] };

function isTransparent(color: string) {
  return color === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(color);
}

function luminance(color: string) {
  const m = color.match(/[\d.]+/g);
  if (!m || m.length < 3) return 0;
  const [r, g, b] = m.slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Climb out of single-child wrappers (e.g. CMS className wrappers) so siblings are whole sections. */
function blockOf(hero: HTMLElement) {
  let block = hero;
  while (
    block.parentElement &&
    block.parentElement.tagName !== 'MAIN' &&
    block.parentElement !== document.body &&
    block.parentElement.childElementCount === 1
  ) {
    block = block.parentElement;
  }
  return block;
}

function nextBlocks(block: HTMLElement, count: number) {
  const items: HTMLElement[] = [];
  let el = block.nextElementSibling as HTMLElement | null;
  while (el && items.length < count) {
    if (!SKIP_TAGS.has(el.tagName)) {
      const style = getComputedStyle(el);
      const inFlow = style.display !== 'none' && style.position !== 'fixed' && style.position !== 'absolute';
      if (inFlow && el.offsetHeight > 0) items.push(el);
    }
    el = el.nextElementSibling as HTMLElement | null;
  }
  return items;
}

/** The element that paints the section background: descend through transparent single-child wrappers. */
function surfaceOf(item: HTMLElement) {
  let el = item;
  while (el.childElementCount === 1) {
    const style = getComputedStyle(el);
    if (!isTransparent(style.backgroundColor) || style.backgroundImage !== 'none') break;
    el = el.firstElementChild as HTMLElement;
  }
  return el;
}

function clubConfig(hero: HTMLElement) {
  const match = /(?:^|\s)hero-club-(\d)(?:\s|$)/.exec(hero.className);
  return { count: match ? Number(match[1]) : 1, glass: hero.classList.contains('hero-club--glass') };
}

/**
 * Full-screen heroes marked `hero-club-<n>` take in as many of the next n sections as fit in the first screen
 * alongside the hero's own content: stack shrinks the hero so hero + sections fill the screen exactly; glass keeps the
 * hero full screen and docks the sections over its backdrop as frosted panels tinted to their text colour.
 * Re-evaluated on every resize, content change and route change; where none fit (typically phones) the hero falls
 * back to full screen on its own.
 */
export default function HeroClubSync() {
  useEffect(() => {
    const root = document.documentElement;
    const managed = new Map<HTMLElement, Managed>();
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:var(--hero-vh,100vh);visibility:hidden;pointer-events:none;z-index:-1;';
    document.body.appendChild(probe);

    let frame = 0;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => schedule()) : null;
    const observed = new Set<Element>();

    const release = (m: Managed | undefined) => {
      m?.items.forEach((el) => {
        el.classList.remove(...ITEM_CLASSES);
        el.style.removeProperty('--hero-club-i');
        el.style.removeProperty('--hero-club-rest');
      });
      m?.surfaces.forEach((el) => {
        el.classList.remove('hero-club-surface');
        delete el.dataset.glassTone;
      });
    };

    const resetHero = (hero: HTMLElement) => {
      delete hero.dataset.heroClub;
      ['--hero-club-h', '--hero-club-pb'].forEach((p) => hero.style.removeProperty(p));
    };

    const evaluate = (hero: HTMLElement, avail: number, watch: Set<Element>) => {
      const { count, glass } = clubConfig(hero);
      const candidates = nextBlocks(blockOf(hero), count);

      hero.dataset.heroClub = 'measure';
      const natural = hero.getBoundingClientRect().height;
      const basePad = parseFloat(getComputedStyle(hero).paddingBottom) || 0;
      // Take as many of the following sections as fit in the space the hero's content leaves free.
      const items: HTMLElement[] = [];
      let rest = 0;
      for (const el of candidates) {
        const h = el.getBoundingClientRect().height;
        if (natural + rest + h > avail + FIT_TOLERANCE_PX) break;
        items.push(el);
        rest += h;
      }
      const fits = items.length > 0 && avail > 0;

      candidates.forEach((el) => watch.add(el));
      Array.from(hero.children).forEach((el) => watch.add(el));

      const prev = managed.get(hero);
      if (!fits) {
        release(prev);
        managed.delete(hero);
        hero.dataset.heroClub = 'solo';
        ['--hero-club-h', '--hero-club-pb'].forEach((p) => hero.style.removeProperty(p));
        return;
      }

      const surfaces = glass ? items.map(surfaceOf) : [];
      if (prev) {
        prev.items.filter((el) => !items.includes(el)).forEach((el) => release({ items: [el], surfaces: [] }));
        prev.surfaces.filter((el) => !surfaces.includes(el)).forEach((el) => release({ items: [], surfaces: [el] }));
      }

      items.forEach((el, i) => {
        el.classList.add('hero-club-item');
        el.style.setProperty('--hero-club-i', String(i));
        el.classList.toggle('hero-club-item--first', glass && i === 0);
        if (glass && i === 0) el.style.setProperty('--hero-club-rest', `${rest.toFixed(2)}px`);
        else el.style.removeProperty('--hero-club-rest');
        const lifted = el.classList.contains('hero-club-item--lift') || getComputedStyle(el).position === 'static';
        el.classList.toggle('hero-club-item--lift', glass && lifted);
      });
      surfaces.forEach((el) => {
        el.classList.add('hero-club-surface');
        el.dataset.glassTone = luminance(getComputedStyle(el).color) > 0.45 ? 'dark' : 'light';
      });

      hero.style.setProperty('--hero-club-h', `${(glass ? avail : avail - rest).toFixed(2)}px`);
      if (glass) hero.style.setProperty('--hero-club-pb', `${Math.ceil(basePad + rest)}px`);
      else hero.style.removeProperty('--hero-club-pb');
      hero.dataset.heroClub = glass ? 'glass' : 'fit';
      managed.set(hero, { items, surfaces });
    };

    const scan = () => {
      frame = 0;
      const heroes = Array.from(document.querySelectorAll<HTMLElement>('.hero-club'));
      for (const [hero, m] of managed) {
        if (!heroes.includes(hero)) {
          release(m);
          managed.delete(hero);
          resetHero(hero);
        }
      }
      const avail = probe.getBoundingClientRect().height;
      const watch = new Set<Element>();
      heroes.forEach((hero) => evaluate(hero, avail, watch));
      observed.forEach((el) => {
        if (!watch.has(el)) {
          ro?.unobserve(el);
          observed.delete(el);
        }
      });
      watch.forEach((el) => {
        if (!observed.has(el)) {
          ro?.observe(el);
          observed.add(el);
        }
      });
    };

    function schedule() {
      if (!frame) frame = requestAnimationFrame(scan);
    }

    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes' || [...r.addedNodes, ...r.removedNodes].some((n) => n.nodeType === 1 && n !== probe)) {
          schedule();
          return;
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    mo.observe(root, { attributes: true, attributeFilter: ['style'] });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    document.fonts?.ready.then(schedule).catch(() => {});
    scan();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      mo.disconnect();
      ro?.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('load', schedule);
      for (const [hero, m] of managed) {
        release(m);
        resetHero(hero);
      }
      document.querySelectorAll<HTMLElement>('[data-hero-club]').forEach(resetHero);
      probe.remove();
    };
  }, []);

  return null;
}
