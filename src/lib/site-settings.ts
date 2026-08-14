export type SiteSettings = {
  companyName: string;
  tagline: string;
  footerBlurb: string;
  phone: string;
  emergencyPhone: string;
  email: string;
  supportEmail: string;
  whatsapp: string;
  headerCtaLabel: string;
  headerCtaHref: string;
  /** Optional A/B alternate CTA label (variant B) */
  headerCtaLabelB: string;
  /** Percent 0–100 to show variant B */
  ctaVariantBPercent: string;
  copyright: string;
  defaultMetaDescription: string;
  ogImage: string;
  enquiryNotifyEmail: string;
  enquiryNotifyEnabled: string;
  visitorAutoReplyEnabled: string;
  logoUrl: string;
  /** Alt text for the logo image (header, footer, ecosystem mark) */
  logoAlt: string;
  facebookUrl: string;
  linkedinUrl: string;
  privacyUrl: string;
  termsUrl: string;
  cookiePolicyUrl: string;
  addressStreet: string;
  addressLocality: string;
  addressRegion: string;
  addressPostal: string;
  addressCountry: string;
  ga4MeasurementId: string;
  plausibleDomain: string;
  analyticsConsentRequired: string;
  marketingConsentEnabled: string;
  officeHours: string;
  responseSla: string;
  bookingUrl: string;
  /** Generic CRM webhook (Zapier/Make/HubSpot/custom) */
  crmWebhookUrl: string;
  crmWebhookSecret: string;
  crmProvider: string;
  /** Public SLA dashboard metrics (JSON string) */
  slaMetricsJson: string;
  turnstileEnabled: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  companyName: 'Zigma Technologies',
  tagline: 'POWER & ENERGY ENGINEERING',
  footerBlurb:
    'Engineering power infrastructure for Indian industry since 2006 — Solar EPC, Industrial UPS, Battery Solutions, and 24×7 AMC.',
  phone: '+91 95901 37444',
  emergencyPhone: '+91 95901 37666',
  email: 'info@zigma-technologies.com',
  supportEmail: 'support@zigma-technologies.com',
  whatsapp: '919590137444',
  headerCtaLabel: 'Request Consultation',
  headerCtaHref: '/contact#contact-form',
  headerCtaLabelB: 'Get a Quote',
  ctaVariantBPercent: '50',
  copyright: '© 2026 Zigma Technologies. All rights reserved.',
  defaultMetaDescription:
    'Zigma Technologies delivers Solar EPC, UPS, BESS, EV charging, and industrial engineering solutions across India.',
  ogImage: '/assets/images/zigma-technologies-logo.png',
  enquiryNotifyEmail: 'info@zigma-technologies.com',
  enquiryNotifyEnabled: 'true',
  visitorAutoReplyEnabled: 'true',
  logoUrl: '/assets/images/zigma-technologies-logo.png',
  logoAlt: 'Zigma Technologies logo',
  facebookUrl: '',
  linkedinUrl: '',
  privacyUrl: '/privacy',
  termsUrl: '/terms',
  cookiePolicyUrl: '/cookies',
  addressStreet: '',
  addressLocality: 'Bengaluru',
  addressRegion: 'Karnataka',
  addressPostal: '',
  addressCountry: 'IN',
  ga4MeasurementId: '',
  plausibleDomain: '',
  analyticsConsentRequired: 'true',
  marketingConsentEnabled: 'true',
  officeHours: 'Mon–Sat 9:30–18:30 IST',
  responseSla: 'within 1 business day',
  bookingUrl: '',
  crmWebhookUrl: '',
  crmWebhookSecret: '',
  crmProvider: 'webhook',
  slaMetricsJson: JSON.stringify([
    { label: 'First response', value: '< 1 business day' },
    { label: 'Emergency UPS callout', value: '4–8 hours (metro)' },
    { label: 'AMC coverage', value: '24×7 help desk' },
    { label: 'Solar O&M ticket', value: '< 24 hours' },
  ]),
  turnstileEnabled: 'false',
};

export function mergeSiteSettings(raw: unknown): SiteSettings {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    ...DEFAULT_SITE_SETTINGS,
    ...Object.fromEntries(
      Object.keys(DEFAULT_SITE_SETTINGS).map((key) => {
        const value = input[key];
        return [key, typeof value === 'string' && value.trim() ? value : DEFAULT_SITE_SETTINGS[key as keyof SiteSettings]];
      })
    ),
  } as SiteSettings;
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function logoAltText(settings: SiteSettings) {
  const alt = settings.logoAlt?.trim();
  if (alt) return alt;
  const name = settings.companyName?.trim();
  return name ? `${name} logo` : DEFAULT_SITE_SETTINGS.logoAlt;
}

export const DEFAULT_FAVICON = '/assets/images/zigma.png';

/** Browser tab / PWA icon — always the square white-Z mark (readable at 16–32px). */
export function faviconSrc(_settings?: Pick<SiteSettings, 'logoUrl'>) {
  return DEFAULT_FAVICON;
}

/**
 * A/B pick from session storage. Client-only — never call during SSR or in a
 * useState initializer, or the header CTA label will hydrate-mismatch.
 */
export function pickCtaVariant(settings: SiteSettings): 'A' | 'B' {
  if (typeof window === 'undefined') return 'A';
  const pct = Math.min(100, Math.max(0, Number(settings.ctaVariantBPercent) || 0));
  if (!pct || !settings.headerCtaLabelB?.trim()) return 'A';
  try {
    const key = 'zt_cta_variant';
    const existing = window.sessionStorage.getItem(key);
    if (existing === 'A' || existing === 'B') return existing;
    const roll = Math.floor(Math.random() * 100);
    const variant = roll < pct ? 'B' : 'A';
    window.sessionStorage.setItem(key, variant);
    return variant;
  } catch {
    return 'A';
  }
}

export function ctaLabelForVariant(settings: SiteSettings, variant: 'A' | 'B') {
  return variant === 'B' && settings.headerCtaLabelB.trim()
    ? settings.headerCtaLabelB.trim()
    : settings.headerCtaLabel;
}
