'use client';

import { useEffect, useId, useRef } from 'react';

type Props = {
  onToken: (token: string) => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void }
      ) => string;
      remove: (id: string) => void;
    };
  }
}

/** Renders Cloudflare Turnstile when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. */
export default function TurnstileField({ onToken }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';
  const mountId = useId().replace(/:/g, '');
  const widgetRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey) return;
    const el = document.getElementById(`cf-turnstile-${mountId}`);
    if (!el) return;

    function render() {
      if (!window.turnstile || !el || widgetRef.current) return;
      widgetRef.current = window.turnstile.render(el, {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(''),
      });
    }

    if (window.turnstile) {
      render();
    } else if (!document.querySelector('script[data-turnstile]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.dataset.turnstile = '1';
      script.onload = () => render();
      document.head.appendChild(script);
    } else {
      const t = window.setInterval(() => {
        if (window.turnstile) {
          window.clearInterval(t);
          render();
        }
      }, 100);
      return () => window.clearInterval(t);
    }

    return () => {
      if (widgetRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetRef.current);
        } catch {
          /* ignore */
        }
        widgetRef.current = null;
      }
    };
  }, [siteKey, mountId]);

  if (!siteKey) return null;
  return <div id={`cf-turnstile-${mountId}`} className="turnstile-slot" />;
}
