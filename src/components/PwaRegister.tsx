'use client';

import { useEffect } from 'react';

/** Registers the lightweight PWA service worker once on the public site. */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production' && !window.location.hostname.includes('localhost')) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}
