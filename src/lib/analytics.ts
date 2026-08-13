export type AnalyticsConsent = 'unknown' | 'accepted' | 'declined';

export const CONSENT_COOKIE = 'zt_analytics_consent';
export const CONSENT_STORAGE_KEY = 'zt_analytics_consent';

export type TrackEventName =
  | 'enquiry_submit'
  | 'careers_apply'
  | 'newsletter_subscribe'
  | 'cta_click'
  | 'catalog_open'
  | 'brochure_download'
  | 'consultation_open'
  | 'search'
  | 'thank_you_view'
  | 'configurator_step'
  | 'configurator_complete'
  | 'callback_open'
  | 'callback_submit'
  | 'cta_variant_shown'
  | 'calculator_print'
  | 'calculator_quote';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

export function readConsentFromDocument(): AnalyticsConsent {
  if (typeof document === 'undefined') return 'unknown';
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === 'accepted' || stored === 'declined') return stored;
  } catch {
    /* ignore */
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=(accepted|declined)`));
  return (match?.[1] as AnalyticsConsent) || 'unknown';
}

export function persistConsent(value: 'accepted' | 'declined') {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
  const maxAge = 60 * 60 * 24 * 180;
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

/** Fire a conversion / engagement event (GA4 + Plausible + dataLayer). Safe no-op server-side. */
export function trackEvent(name: TrackEventName, props?: Record<string, string | number | boolean | undefined>) {
  if (typeof window === 'undefined') return;
  const clean = Object.fromEntries(
    Object.entries(props || {}).filter(([, v]) => v !== undefined && v !== '')
  ) as Record<string, string | number | boolean>;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...clean });

  if (typeof window.gtag === 'function') {
    window.gtag('event', name, clean);
  }
  if (typeof window.plausible === 'function') {
    window.plausible(name, { props: clean });
  }
}
