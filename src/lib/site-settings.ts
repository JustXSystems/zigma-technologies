/** Public header mega-menu visual styles (admin Site Settings). */
import { ctaLabelFromConfig, parseHeaderCta } from '@/lib/header-cta';

export const NAV_MENU_STYLES = [
  {
    id: 'classic',
    label: 'Classic mega',
    description: 'Current wide multi-column mega panels with cyan section labels.',
  },
  {
    id: 'corporate',
    label: 'Corporate compact',
    description:
      'JustX-inspired: uppercase top links, tight grouped dropdowns, and soft row hover fills.',
  },
  {
    id: 'elegant',
    label: 'Elegant glass',
    description: 'Frosted panel, underline accents on parents, and refined column hierarchy.',
  },
  {
    id: 'rail',
    label: 'Enterprise rail',
    description: 'Divided columns with a top accent rail — dense, boardroom-ready navigation.',
  },
  {
    id: 'lumen',
    label: 'Lumen glow',
    description: 'Ambient brand glow, soft pill top links, and luminous hover states — modern premium.',
  },
  {
    id: 'mosaic',
    label: 'Mosaic tiles',
    description: 'Each submenu link is a lifted tile card — scannable, product-platform feel.',
  },
  {
    id: 'ribbon',
    label: 'Wide ribbon',
    description: 'Near full-bleed mega strip under the nav — bold, editorial, enterprise showcase.',
  },
] as const;

export type NavMenuStyleId = (typeof NAV_MENU_STYLES)[number]['id'];

export function sanitizeNavMenuStyle(value: string | undefined): NavMenuStyleId {
  const trimmed = value?.trim().toLowerCase() || '';
  if (NAV_MENU_STYLES.some((s) => s.id === trimmed)) return trimmed as NavMenuStyleId;
  return 'classic';
}

/** Public heading tag levels (Site Settings). Default h3 keeps the compact public look. */
export const HEADING_LEVELS = [
  {
    id: 'h1',
    label: 'H1 — largest',
    description: 'Maximum emphasis. Best for a single page hero when you want more presence.',
  },
  {
    id: 'h2',
    label: 'H2 — large',
    description: 'Strong section emphasis without matching the old full-bleed hero scale.',
  },
  {
    id: 'h3',
    label: 'H3 — compact (default)',
    description: 'Current denser public-site scale. Recommended for most pages.',
  },
] as const;

export type HeadingLevelId = (typeof HEADING_LEVELS)[number]['id'];

export type HeadingRole = 'pageHero' | 'section';

export function sanitizeHeadingLevel(value: string | undefined, fallback: HeadingLevelId = 'h3'): HeadingLevelId {
  const trimmed = value?.trim().toLowerCase() || '';
  if (trimmed === 'h1' || trimmed === 'h2' || trimmed === 'h3') return trimmed;
  return fallback;
}

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
  /**
   * Header "Talk to us" trigger + submenu chips (JSON).
   * See `parseHeaderTalk` in `@/lib/header-talk`.
   */
  headerTalkJson: string;
  /**
   * Header "Request Consultation" CTA + optional submenu (JSON).
   * See `parseHeaderCta` in `@/lib/header-cta`. Flat headerCta* fields stay in sync as legacy.
   */
  headerCtaJson: string;
  /**
   * Public header / mega-menu visual style:
   * classic | corporate | elegant | rail | lumen | mosaic | ribbon
   */
  navMenuStyle: string;
  /**
   * HTML tag for page heroes / primary titles (slides, page-hero, catalog heroes).
   * h1 | h2 | h3 — size follows --text-h1/h2/h3.
   */
  headingPageHero: string;
  /**
   * HTML tag for section titles (section-head, eco, split, CTA bands, etc.).
   * h1 | h2 | h3 — size follows --text-h1/h2/h3.
   */
  headingSection: string;
  /** Base .eyebrow font-size (e.g. 0.9rem) → --text-eyebrow */
  eyebrowSize: string;
  /** Large section eyebrows (.eyebrow-lg, why/split/careers) → --text-eyebrow-lg */
  eyebrowSizeLg: string;
  /** Medium eyebrows (page heroes, partners) → --text-eyebrow-md */
  eyebrowSizeMd: string;
  copyright: string;
  /** Footer credit: show/hide (true/false) */
  poweredByEnabled: string;
  poweredByPrefix: string;
  poweredByName: string;
  poweredByUrl: string;
  defaultMetaDescription: string;
  ogImage: string;
  enquiryNotifyEmail: string;
  enquiryNotifyEnabled: string;
  visitorAutoReplyEnabled: string;
  logoUrl: string;
  /** Alt text for the logo image (header, footer, ecosystem mark) */
  logoAlt: string;
  /** Header logo-chip image height (e.g. 42px) */
  logoChipHeight: string;
  /** Header logo-chip image height on mobile ≤760px */
  logoChipHeightMobile: string;
  /** Company name (.logo-word) font-family */
  logoWordFont: string;
  /** Header logo-word / brand name size (e.g. 1.2rem) */
  logoWordSize: string;
  /** Header logo-word size on mobile ≤760px */
  logoWordSizeMobile: string;
  /** Company name font-weight (e.g. 700, bold) */
  logoWordWeight: string;
  /** Company name font-style (normal | italic | oblique) */
  logoWordStyle: string;
  /** Company name letter-spacing (e.g. 0, 0.02em, 1px) */
  logoWordLetterSpacing: string;
  /** Logo tagline (small) font-family */
  logoTaglineFont: string;
  /** Logo tagline font-size (e.g. 0.6em) */
  logoTaglineSize: string;
  /** Logo tagline font-size on mobile ≤760px */
  logoTaglineSizeMobile: string;
  /** Logo tagline font-weight (e.g. 500) */
  logoTaglineWeight: string;
  /** Logo tagline font-style (normal | italic | oblique) */
  logoTaglineStyle: string;
  /** Logo tagline letter-spacing (e.g. 0.1em) */
  logoTaglineLetterSpacing: string;
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
  headerTalkJson: '',
  headerCtaJson: '',
  navMenuStyle: 'classic',
  headingPageHero: 'h3',
  headingSection: 'h3',
  eyebrowSize: '0.9rem',
  eyebrowSizeLg: '1.44rem',
  eyebrowSizeMd: '1.15rem',
  copyright: '© 2026 Zigma Technologies. All rights reserved.',
  poweredByEnabled: 'true',
  poweredByPrefix: 'Powered by',
  poweredByName: 'JustX Systems',
  poweredByUrl: 'https://www.justxsystems.com/',
  defaultMetaDescription:
    'Zigma Technologies delivers Solar EPC, UPS, BESS, EV charging, and industrial engineering solutions across India.',
  ogImage: '/assets/images/zigma-technologies-logo.png',
  enquiryNotifyEmail: 'info@zigma-technologies.com',
  enquiryNotifyEnabled: 'true',
  visitorAutoReplyEnabled: 'true',
  logoUrl: '/assets/images/zigma-technologies-logo.png',
  logoAlt: 'Zigma Technologies logo',
  logoChipHeight: '42px',
  logoChipHeightMobile: '32px',
  logoWordFont: 'var(--font-display)',
  logoWordSize: '1.2rem',
  logoWordSizeMobile: '1rem',
  logoWordWeight: '700',
  logoWordStyle: 'normal',
  logoWordLetterSpacing: '0',
  logoTaglineFont: 'var(--font-mono)',
  logoTaglineSize: '0.6em',
  logoTaglineSizeMobile: '0.6em',
  logoTaglineWeight: '500',
  logoTaglineStyle: 'normal',
  logoTaglineLetterSpacing: '0.1em',
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
  const merged = {
    ...DEFAULT_SITE_SETTINGS,
    ...Object.fromEntries(
      Object.keys(DEFAULT_SITE_SETTINGS).map((key) => {
        const value = input[key];
        return [key, typeof value === 'string' && value.trim() ? value : DEFAULT_SITE_SETTINGS[key as keyof SiteSettings]];
      })
    ),
  } as SiteSettings;
  merged.navMenuStyle = sanitizeNavMenuStyle(merged.navMenuStyle);
  merged.headingPageHero = sanitizeHeadingLevel(merged.headingPageHero, 'h3');
  merged.headingSection = sanitizeHeadingLevel(merged.headingSection, 'h3');
  return merged;
}

/** Resolve the HTML heading tag for a public heading role from site settings. */
export function headingTagForRole(settings: Pick<SiteSettings, 'headingPageHero' | 'headingSection'>, role: HeadingRole): HeadingLevelId {
  return role === 'pageHero'
    ? sanitizeHeadingLevel(settings.headingPageHero, 'h3')
    : sanitizeHeadingLevel(settings.headingSection, 'h3');
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

/**
 * Logo tagline may include limited HTML (e.g. &lt;br&gt; for line breaks).
 * Strips everything except a small inline whitelist.
 */
export function sanitizeTaglineHtml(input: string | undefined): string {
  const raw = input ?? '';
  if (!raw) return '';
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/&lt;br\s*\/?&gt;/gi, '<br />')
    .replace(/&lt;(\/?)(b|i|em|strong|span)&gt;/gi, '<$1$2>');
}

/** Allow only CSS length values (px/rem/em) for logo sizing injection. */
export function sanitizeCssSize(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() || '';
  if (/^\d+(\.\d+)?(px|rem|em)$/i.test(trimmed)) return trimmed;
  return fallback;
}

/** Allow safe font-family stacks (CSS vars, named families, generics). */
export function sanitizeCssFontFamily(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() || '';
  if (
    /^(var\(--[a-zA-Z0-9-]+\)|'[^']{1,64}'|"[^"]{1,64}"|[a-zA-Z][\w\s-]{0,63})(\s*,\s*(var\(--[a-zA-Z0-9-]+\)|'[^']{1,64}'|"[^"]{1,64}"|[a-zA-Z][\w\s-]{0,63}|sans-serif|serif|monospace|cursive|fantasy|system-ui))*$/i.test(
      trimmed
    )
  ) {
    return trimmed;
  }
  return fallback;
}

/** Allow CSS font-weight keywords or 100–900. */
export function sanitizeCssFontWeight(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() || '';
  if (/^(normal|bold|bolder|lighter|[1-9]00)$/i.test(trimmed)) return trimmed;
  return fallback;
}

/** Allow CSS font-style keywords. */
export function sanitizeCssFontStyle(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() || '';
  if (/^(normal|italic|oblique)$/i.test(trimmed)) return trimmed;
  return fallback;
}

/** Allow CSS letter-spacing: normal, 0, or length (px/rem/em). */
export function sanitizeCssLetterSpacing(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() || '';
  if (/^(normal|0)$/i.test(trimmed)) return trimmed;
  if (/^-?\d+(\.\d+)?(px|rem|em)$/i.test(trimmed)) return trimmed;
  return fallback;
}

/** Inline :root vars so header/footer logo-chip, logo-word type, and eyebrow sizes follow Site Settings. */
export function logoSizingCss(settings: SiteSettings): string {
  const chip = sanitizeCssSize(settings.logoChipHeight, DEFAULT_SITE_SETTINGS.logoChipHeight);
  const chipMobile = sanitizeCssSize(settings.logoChipHeightMobile, DEFAULT_SITE_SETTINGS.logoChipHeightMobile);
  const wordFont = sanitizeCssFontFamily(settings.logoWordFont, DEFAULT_SITE_SETTINGS.logoWordFont);
  const word = sanitizeCssSize(settings.logoWordSize, DEFAULT_SITE_SETTINGS.logoWordSize);
  const wordMobile = sanitizeCssSize(settings.logoWordSizeMobile, DEFAULT_SITE_SETTINGS.logoWordSizeMobile);
  const wordWeight = sanitizeCssFontWeight(settings.logoWordWeight, DEFAULT_SITE_SETTINGS.logoWordWeight);
  const wordStyle = sanitizeCssFontStyle(settings.logoWordStyle, DEFAULT_SITE_SETTINGS.logoWordStyle);
  const wordTracking = sanitizeCssLetterSpacing(
    settings.logoWordLetterSpacing,
    DEFAULT_SITE_SETTINGS.logoWordLetterSpacing
  );
  const tagFont = sanitizeCssFontFamily(settings.logoTaglineFont, DEFAULT_SITE_SETTINGS.logoTaglineFont);
  const tagSize = sanitizeCssSize(settings.logoTaglineSize, DEFAULT_SITE_SETTINGS.logoTaglineSize);
  const tagSizeMobile = sanitizeCssSize(settings.logoTaglineSizeMobile, DEFAULT_SITE_SETTINGS.logoTaglineSizeMobile);
  const tagWeight = sanitizeCssFontWeight(settings.logoTaglineWeight, DEFAULT_SITE_SETTINGS.logoTaglineWeight);
  const tagStyle = sanitizeCssFontStyle(settings.logoTaglineStyle, DEFAULT_SITE_SETTINGS.logoTaglineStyle);
  const tagTracking = sanitizeCssLetterSpacing(
    settings.logoTaglineLetterSpacing,
    DEFAULT_SITE_SETTINGS.logoTaglineLetterSpacing
  );
  const eyebrow = sanitizeCssSize(settings.eyebrowSize, DEFAULT_SITE_SETTINGS.eyebrowSize);
  const eyebrowLg = sanitizeCssSize(settings.eyebrowSizeLg, DEFAULT_SITE_SETTINGS.eyebrowSizeLg);
  const eyebrowMd = sanitizeCssSize(settings.eyebrowSizeMd, DEFAULT_SITE_SETTINGS.eyebrowSizeMd);
  return [
    `:root{--logo-chip-h:${chip};--logo-chip-h-mobile:${chipMobile};--logo-word-font:${wordFont};--logo-word-size:${word};--logo-word-size-mobile:${wordMobile};--logo-word-weight:${wordWeight};--logo-word-style:${wordStyle};--logo-word-letter-spacing:${wordTracking};--logo-tagline-font:${tagFont};--logo-tagline-size:${tagSize};--logo-tagline-size-mobile:${tagSizeMobile};--logo-tagline-weight:${tagWeight};--logo-tagline-style:${tagStyle};--logo-tagline-letter-spacing:${tagTracking};--text-eyebrow:${eyebrow};--text-eyebrow-lg:${eyebrowLg};--text-eyebrow-md:${eyebrowMd};}`,
    /* Re-assert mobile sizes after globals.css chrome rules that set desktop vars on header/footer. */
    `@media (max-width:760px){header .logo,.logo,.page-shell .logo{font-size:var(--logo-word-size-mobile);}.logo-chip img{height:var(--logo-chip-h-mobile);}footer .footer-logo .logo-chip img,.footer-logo .logo-chip img{height:calc(var(--logo-chip-h-mobile) * 0.8);}footer .footer-logo .logo-word,.footer-logo .logo-word{font-size:calc(var(--logo-word-size-mobile) * 1.25);}.logo-word small,header .logo-word small,footer .footer-logo .logo-word small,.footer-logo .logo-word small,.page-shell .logo-word small{font-size:var(--logo-tagline-size-mobile);}}`,
  ].join('');
}

export const DEFAULT_FAVICON = '/assets/images/zigma.png';

/**
 * A/B pick from session storage. Client-only — never call during SSR or in a
 * useState initializer, or the header CTA label will hydrate-mismatch.
 */
export function pickCtaVariant(settings: SiteSettings): 'A' | 'B' {
  if (typeof window === 'undefined') return 'A';
  const cta = parseHeaderCta(settings.headerCtaJson, settings);
  const pct = cta.variantBPercent;
  if (!pct || !cta.buttonLabelB.trim()) return 'A';
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
  return ctaLabelFromConfig(parseHeaderCta(settings.headerCtaJson, settings), variant);
}
