'use client';

import { useEffect } from 'react';
import { THEME_PREVIEW_MESSAGE } from '@/lib/theme-tokens';

const STYLE_ID = 'zigma-theme-preview';

/**
 * When the public site is loaded inside the admin Theme Studio iframe,
 * apply draft CSS sent from the parent via postMessage.
 */
export default function ThemePreviewBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.parent === window) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== THEME_PREVIEW_MESSAGE || typeof data.css !== 'string') return;

      let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
      if (!el) {
        el = document.createElement('style');
        el.id = STYLE_ID;
        document.head.appendChild(el);
      }
      el.textContent = data.css;
    };

    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: `${THEME_PREVIEW_MESSAGE}-ready` }, window.location.origin);

    return () => {
      window.removeEventListener('message', onMessage);
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return null;
}
