'use client';

import { useEffect } from 'react';

/** Registers the lightweight PWA service worker once on the public site. */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Never run a service worker in dev — it caches navigations and breaks Turbopack HMR.
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      return;
    }

    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}
