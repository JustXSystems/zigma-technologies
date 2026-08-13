'use client';

import { useEffect, useState } from 'react';
import {
  persistConsent,
  readConsentFromDocument,
  type AnalyticsConsent,
} from '@/lib/analytics';
import type { SiteSettings } from '@/lib/site-settings';

type Props = {
  settings: SiteSettings;
};

const MARKETING_KEY = 'zt_marketing_consent';

function loadGa4(id: string) {
  if (document.getElementById('zt-ga4')) return;
  const s = document.createElement('script');
  s.id = 'zt-ga4';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments as unknown as Record<string, unknown>);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, { anonymize_ip: true });
}

function loadPlausible(domain: string) {
  if (document.getElementById('zt-plausible')) return;
  const s = document.createElement('script');
  s.id = 'zt-plausible';
  s.defer = true;
  s.dataset.domain = domain;
  s.src = 'https://plausible.io/js/script.js';
  document.head.appendChild(s);
}

export default function CookieConsent({ settings }: Props) {
  const [consent, setConsent] = useState<AnalyticsConsent>('unknown');
  const [analyticsOn, setAnalyticsOn] = useState(true);
  const [marketingOn, setMarketingOn] = useState(false);
  const [ready, setReady] = useState(false);

  const ga4 = settings.ga4MeasurementId?.trim() || '';
  const plausible = settings.plausibleDomain?.trim() || '';
  const required = (settings.analyticsConsentRequired || 'true').toLowerCase() !== 'false';
  const marketingEnabled = (settings.marketingConsentEnabled || 'true').toLowerCase() !== 'false';
  const hasAnalytics = Boolean(ga4 || plausible);

  useEffect(() => {
    const current = readConsentFromDocument();
    setConsent(current);
    setReady(true);
    if (!hasAnalytics) return;
    if (!required || current === 'accepted') {
      if (ga4) loadGa4(ga4);
      if (plausible) loadPlausible(plausible);
    }
  }, [ga4, plausible, required, hasAnalytics]);

  function acceptSelected() {
    if (analyticsOn) {
      persistConsent('accepted');
      setConsent('accepted');
      if (ga4) loadGa4(ga4);
      if (plausible) loadPlausible(plausible);
    } else {
      persistConsent('declined');
      setConsent('declined');
    }
    try {
      window.localStorage.setItem(MARKETING_KEY, marketingOn && marketingEnabled ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  function declineAll() {
    persistConsent('declined');
    setConsent('declined');
    setAnalyticsOn(false);
    setMarketingOn(false);
    try {
      window.localStorage.setItem(MARKETING_KEY, '0');
    } catch {
      /* ignore */
    }
  }

  if (!ready || !hasAnalytics) return null;
  if (!required) return null;
  if (consent !== 'unknown') return null;

  return (
    <div className="cookie-consent" role="dialog" aria-label="Cookie consent">
      <div>
        <p>
          Necessary cookies keep the site working. Optional categories help us improve performance and campaigns. See our{' '}
          <a href={settings.cookiePolicyUrl || '/cookies'}>Cookie Policy</a> and{' '}
          <a href={settings.privacyUrl || '/privacy'}>Privacy Policy</a>.
        </p>
        <div className="cookie-categories">
          <label>
            <input type="checkbox" checked disabled /> Necessary (always on)
          </label>
          <label>
            <input type="checkbox" checked={analyticsOn} onChange={(e) => setAnalyticsOn(e.target.checked)} /> Analytics
            (GA4 / Plausible)
          </label>
          {marketingEnabled ? (
            <label>
              <input type="checkbox" checked={marketingOn} onChange={(e) => setMarketingOn(e.target.checked)} /> Marketing
              (future pixels)
            </label>
          ) : null}
        </div>
      </div>
      <div className="cookie-consent-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={acceptSelected}>
          Save choices
        </button>
        <button type="button" className="btn btn-ghost-dark btn-sm" onClick={declineAll}>
          Decline optional
        </button>
      </div>
    </div>
  );
}
