'use client';

import { useEffect } from 'react';

/**
 * When NEXT_PUBLIC_BASE_PATH is set (e.g. /zigma-technologies), Next.js Link/_next
 * are handled by basePath — but raw fetch('/api/…') and <img src="/assets/…"> are not.
 * This bootstrap prefixes those client-side so the subdirectory deploy works without
 * rewriting every call site.
 */
export default function BasePathBootstrap() {
  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
    if (!base || base === '/') return;

    const prefixPathname = (pathname: string) => {
      if (!pathname.startsWith('/')) return pathname;
      if (pathname === base || pathname.startsWith(`${base}/`)) return pathname;
      return `${base}${pathname}`;
    };

    const prefixUrl = (url: string) => {
      if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('//')) return url;
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
      return prefixPathname(url);
    };

    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string') {
        return originalFetch(prefixUrl(input), init);
      }
      if (input instanceof URL) {
        return originalFetch(prefixUrl(input.toString()), init);
      }
      if (input instanceof Request) {
        const nextUrl = prefixUrl(input.url);
        if (nextUrl !== input.url) {
          return originalFetch(new Request(nextUrl, input), init);
        }
      }
      return originalFetch(input, init);
    };

    const fixImg = (img: HTMLImageElement) => {
      const src = img.getAttribute('src');
      if (!src) return;
      const next = prefixUrl(src);
      if (next !== src) img.setAttribute('src', next);
    };

    document.querySelectorAll('img').forEach((el) => fixImg(el as HTMLImageElement));

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.target instanceof HTMLImageElement) {
          fixImg(m.target);
        }
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) fixImg(node);
          if (node instanceof HTMLElement) {
            node.querySelectorAll('img').forEach((el) => fixImg(el as HTMLImageElement));
          }
        });
      }
    });
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });

    return () => {
      window.fetch = originalFetch;
      mo.disconnect();
    };
  }, []);

  return null;
}
