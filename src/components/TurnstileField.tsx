'use client';

import { useEffect, useId, useRef, useState } from 'react';

type Props = {
  onToken: (token: string) => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          'timeout-callback'?: () => void;
          size?: 'normal' | 'compact' | 'flexible';
          theme?: 'light' | 'dark' | 'auto';
          appearance?: 'always' | 'execute' | 'interaction-only';
        }
      ) => string;
      remove: (id: string) => void;
      reset?: (id: string) => void;
    };
  }
}

function preferCompactWidget(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 420px)').matches;
}

/** Renders Cloudflare Turnstile when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. Mobile-safe (flexible/compact). */
export default function TurnstileField({ onToken }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';
  const mountId = useId().replace(/:/g, '');
  const widgetRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [status, setStatus] = useState<'idle' | 'ready' | 'error'>('idle');
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey) return;
    const el = document.getElementById(`cf-turnstile-${mountId}`);
    if (!el) return;

    let cancelled = false;
    let pollId: number | null = null;

    function clearWidget() {
      if (widgetRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetRef.current);
        } catch {
          /* ignore */
        }
        widgetRef.current = null;
      }
    }

    function render() {
      if (cancelled || !window.turnstile || !el || widgetRef.current) return;
      el.replaceChildren();
      const compact = preferCompactWidget();
      try {
        widgetRef.current = window.turnstile.render(el, {
          sitekey: siteKey,
          // flexible fills the container on phones; compact for very narrow widths
          size: compact ? 'compact' : 'flexible',
          theme: 'light',
          appearance: 'always',
          callback: (token) => {
            setStatus('ready');
            onTokenRef.current(token);
          },
          'expired-callback': () => {
            setStatus('idle');
            onTokenRef.current('');
          },
          'error-callback': () => {
            setStatus('error');
            onTokenRef.current('');
          },
          'timeout-callback': () => {
            setStatus('error');
            onTokenRef.current('');
          },
        });
        setStatus('idle');
      } catch (err) {
        console.error('[turnstile] render failed', err);
        setStatus('error');
        onTokenRef.current('');
      }
    }

    function boot() {
      clearWidget();
      render();
    }

    if (window.turnstile) {
      boot();
    } else if (!document.querySelector('script[data-turnstile]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.dataset.turnstile = '1';
      script.onload = () => {
        if (!cancelled) boot();
      };
      script.onerror = () => {
        if (!cancelled) {
          setStatus('error');
          onTokenRef.current('');
        }
      };
      document.head.appendChild(script);
    } else {
      pollId = window.setInterval(() => {
        if (window.turnstile) {
          if (pollId) window.clearInterval(pollId);
          pollId = null;
          if (!cancelled) boot();
        }
      }, 100);
    }

    const mq = window.matchMedia('(max-width: 420px)');
    const onMq = () => {
      // Re-render with compact/flexible when crossing the narrow breakpoint.
      clearWidget();
      if (window.turnstile) render();
    };
    mq.addEventListener?.('change', onMq);

    return () => {
      cancelled = true;
      mq.removeEventListener?.('change', onMq);
      if (pollId) window.clearInterval(pollId);
      clearWidget();
    };
  }, [siteKey, mountId]);

  if (!siteKey) return null;

  return (
    <div className="turnstile-field">
      <div
        id={`cf-turnstile-${mountId}`}
        className="turnstile-slot"
        data-status={status}
        aria-live="polite"
      />
      {status === 'error' ? (
        <p className="turnstile-field-hint" role="alert">
          Captcha failed to load. Check your connection, then refresh and try again.
        </p>
      ) : null}
    </div>
  );
}
