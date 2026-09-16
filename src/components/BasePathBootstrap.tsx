'use client';

import { useEffect } from 'react';

/**
 * When NEXT_PUBLIC_BASE_PATH is set (e.g. /zigma-technologies), Next.js Link/_next
 * are handled by basePath — but raw fetch('/api/…'), <img src="/assets/…">, and
 * plain <a href="/projects"> are not. A synchronous <head> script patches fetch
 * first; this bootstrap covers images/anchors and re-applies fetch if needed.
 */
export default function BasePathBootstrap() {
  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
    if (!base || base === '/') return;

    const shouldSkip = (url: string) =>
      !url ||
      url.startsWith('#') ||
      url.startsWith('?') ||
      url.startsWith('tel:') ||
      url.startsWith('mailto:') ||
      url.startsWith('sms:') ||
      url.startsWith('javascript:') ||
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.startsWith('//');

    const prefixPathname = (pathname: string) => {
      if (!pathname.startsWith('/')) return pathname;
      if (pathname === base || pathname.startsWith(`${base}/`)) return pathname;
      return `${base}${pathname}`;
    };

    const prefixUrl = (url: string) => {
      if (shouldSkip(url)) return url;
      try {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          const u = new URL(url);
          if (u.origin === window.location.origin) {
            u.pathname = prefixPathname(u.pathname);
            return u.toString();
          }
          return url;
        }
      } catch {
        /* ignore */
      }
      const match = url.match(/^([^?#]*)([?#].*)?$/);
      const pathname = match?.[1] || url;
      const suffix = match?.[2] || '';
      return `${prefixPathname(pathname.startsWith('/') ? pathname : `/${pathname}`)}${suffix}`;
    };

    // Head script already patches fetch; only install once if missing (HMR / older HTML).
    const g = window as Window & { __zigmaFetchPatched?: boolean };
    if (!g.__zigmaFetchPatched) {
      const originalFetch = window.fetch.bind(window);
      g.__zigmaFetchPatched = true;
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const nextInit: RequestInit = { ...(init || {}) };
        if (nextInit.credentials == null) nextInit.credentials = 'same-origin';
        if (typeof input === 'string') {
          return originalFetch(prefixUrl(input), nextInit);
        }
        if (input instanceof URL) {
          return originalFetch(prefixUrl(input.toString()), nextInit);
        }
        if (input instanceof Request) {
          const nextUrl = prefixUrl(input.url);
          if (nextUrl !== input.url) {
            return originalFetch(new Request(nextUrl, input), nextInit);
          }
        }
        return originalFetch(input, nextInit);
      };
    }

    const fixImg = (img: HTMLImageElement) => {
      const src = img.getAttribute('src');
      if (!src) return;
      const next = prefixUrl(src);
      if (next !== src) img.setAttribute('src', next);
    };

    const fixAnchor = (a: HTMLAnchorElement) => {
      const href = a.getAttribute('href');
      if (!href) return;
      const next = prefixUrl(href);
      if (next !== href) a.setAttribute('href', next);
    };

    document.querySelectorAll('img').forEach((el) => fixImg(el as HTMLImageElement));
    document.querySelectorAll('a[href]').forEach((el) => fixAnchor(el as HTMLAnchorElement));

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.target instanceof HTMLImageElement) {
          fixImg(m.target);
        }
        if (m.type === 'attributes' && m.target instanceof HTMLAnchorElement && m.attributeName === 'href') {
          fixAnchor(m.target);
        }
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) fixImg(node);
          if (node instanceof HTMLAnchorElement) fixAnchor(node);
          if (node instanceof HTMLElement) {
            node.querySelectorAll('img').forEach((el) => fixImg(el as HTMLImageElement));
            node.querySelectorAll('a[href]').forEach((el) => fixAnchor(el as HTMLAnchorElement));
          }
        });
      }
    });
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href'],
    });

    return () => {
      mo.disconnect();
    };
  }, []);

  return null;
}
