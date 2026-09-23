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
  /**
   * Footer brand (.foot-brand) logo type mode:
   * inherit = scale from header logo type; custom = use footerLogo* fields
   */
  footerLogoMode: string;
  /** Optional footer-only logo image URL (blank = use logoUrl) */
  footerLogoUrl: string;
  footerLogoChipHeight: string;
  footerLogoChipHeightMobile: string;
  footerLogoWordFont: string;
  footerLogoWordSize: string;
  footerLogoWordSizeMobile: string;
  footerLogoWordWeight: string;
  footerLogoWordStyle: string;
  footerLogoWordLetterSpacing: string;
  footerLogoTaglineFont: string;
  footerLogoTaglineSize: string;
  footerLogoTaglineSizeMobile: string;
  footerLogoTaglineWeight: string;
  footerLogoTaglineStyle: string;
  footerLogoTaglineLetterSpacing: string;
  /** Footer brand column show/hide (true/false) */
  footerBrandShowLogo: string;
  footerBrandShowName: string;
  footerBrandShowTagline: string;
  footerBrandShowBlurb: string;
  footerBrandShowNewsletter: string;
  /** Footer brand text/logo alignment: start | center | end */
  footerBrandAlign: string;
  /** Footer brand max width desktop (e.g. 420px); none = full column */
  footerBrandMaxWidth: string;
  /** Footer brand max width mobile ≤760px; none = full column */
  footerBrandMaxWidthMobile: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  /** X (Twitter) profile URL */
  xUrl: string;
  youtubeUrl: string;
  privacyUrl: string;
  termsUrl: string;
  cookiePolicyUrl: string;
  addressStreet: string;
  /** Second street line (building, floor, landmark) for multi-line footer display */
  addressStreet2: string;
  addressLocality: string;
  addressRegion: string;
  addressPostal: string;
  addressCountry: string;
  /** Show office/address block in footer Contact column (true/false) */
  footerOfficeEnabled: string;
  /** Show postal address lines in footer office block (true/false) */
  footerOfficeShowAddress: string;
  /** Show office hours in footer office block (true/false) */
  footerOfficeShowHours: string;
  /** Show response SLA in footer office block (true/false) */
  footerOfficeShowSla: string;
  /**
   * Footer office line layout JSON: { lines: [{ parts: [{ field }], join?, showLabel? }] }.
   * Fields: street | locality | region | postal | country | hours | sla | custom.
   */
  footerOfficeLayoutJson: string;
  /** Footer office text alignment: start | center | end */
  footerOfficeAlign: string;
  /** Max width of footer office block (e.g. 280px); blank = full column */
  footerOfficeMaxWidth: string;
  /** Top margin above footer office block (e.g. 1.15rem) */
  footerOfficeMarginTop: string;
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
  footerLogoMode: 'inherit',
  footerLogoUrl: '',
  footerLogoChipHeight: '34px',
  footerLogoChipHeightMobile: '26px',
  footerLogoWordFont: 'var(--font-display)',
  footerLogoWordSize: '1.5rem',
  footerLogoWordSizeMobile: '1.25rem',
  footerLogoWordWeight: '700',
  footerLogoWordStyle: 'normal',
  footerLogoWordLetterSpacing: '0',
  footerLogoTaglineFont: 'var(--font-mono)',
  footerLogoTaglineSize: '0.6em',
  footerLogoTaglineSizeMobile: '0.6em',
  footerLogoTaglineWeight: '500',
  footerLogoTaglineStyle: 'normal',
  footerLogoTaglineLetterSpacing: '0.1em',
  footerBrandShowLogo: 'true',
  footerBrandShowName: 'true',
  footerBrandShowTagline: 'true',
  footerBrandShowBlurb: 'true',
  footerBrandShowNewsletter: 'true',
  footerBrandAlign: 'start',
  footerBrandMaxWidth: '420px',
  footerBrandMaxWidthMobile: 'none',
  facebookUrl: '',
  instagramUrl: '',
  linkedinUrl: '',
  xUrl: '',
  youtubeUrl: '',
  privacyUrl: '/privacy',
  termsUrl: '/terms',
  cookiePolicyUrl: '/cookies',
  addressStreet: '',
  addressStreet2: '',
  addressLocality: 'Bengaluru',
  addressRegion: 'Karnataka',
  addressPostal: '',
  addressCountry: 'IN',
  footerOfficeEnabled: 'true',
  footerOfficeShowAddress: 'true',
  footerOfficeShowHours: 'true',
  footerOfficeShowSla: 'false',
  footerOfficeLayoutJson: '',
  footerOfficeAlign: 'start',
  footerOfficeMaxWidth: '',
  footerOfficeMarginTop: '1.15rem',
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

/** Treat Site Settings true/false string fields. */
export function isSettingEnabled(value: string | undefined, fallback = false): boolean {
  const trimmed = value?.trim().toLowerCase();
  if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes') return true;
  if (trimmed === 'false' || trimmed === '0' || trimmed === 'no') return false;
  return fallback;
}

export type FooterOfficeAlign = 'start' | 'center' | 'end';

export function sanitizeFooterOfficeAlign(value: string | undefined): FooterOfficeAlign {
  const v = value?.trim().toLowerCase();
  if (v === 'center' || v === 'end' || v === 'start') return v;
  if (v === 'left') return 'start';
  if (v === 'right') return 'end';
  return 'start';
}

export type FooterLogoMode = 'inherit' | 'custom';

export function sanitizeFooterLogoMode(value: string | undefined): FooterLogoMode {
  return value?.trim().toLowerCase() === 'custom' ? 'custom' : 'inherit';
}

/** Max-width: none | length | %. */
export function sanitizeCssMaxWidth(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() || '';
  if (/^none$/i.test(trimmed)) return 'none';
  if (/^\d+(\.\d+)?(px|rem|em|%)$/i.test(trimmed)) return trimmed;
  if (!trimmed) return fallback;
  return fallback;
}

/** Scale a px/rem/em size by a factor (used when footer logo mode = inherit). */
export function scaleCssSize(value: string, factor: number, fallback: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+(\.\d+)?)(px|rem|em)$/i);
  if (!match) return fallback;
  const n = Math.round(parseFloat(match[1]) * factor * 1000) / 1000;
  return `${n}${match[3]}`;
}

export type FooterLogoTokens = {
  chip: string;
  chipMobile: string;
  wordFont: string;
  word: string;
  wordMobile: string;
  wordWeight: string;
  wordStyle: string;
  wordTracking: string;
  tagFont: string;
  tag: string;
  tagMobile: string;
  tagWeight: string;
  tagStyle: string;
  tagTracking: string;
};

/** Effective footer logo tokens — either custom fields or scaled header tokens. */
export function resolveFooterLogoTokens(settings: SiteSettings): FooterLogoTokens {
  const mode = sanitizeFooterLogoMode(settings.footerLogoMode);
  if (mode === 'custom') {
    return {
      chip: sanitizeCssSize(settings.footerLogoChipHeight, DEFAULT_SITE_SETTINGS.footerLogoChipHeight),
      chipMobile: sanitizeCssSize(settings.footerLogoChipHeightMobile, DEFAULT_SITE_SETTINGS.footerLogoChipHeightMobile),
      wordFont: sanitizeCssFontFamily(settings.footerLogoWordFont, DEFAULT_SITE_SETTINGS.footerLogoWordFont),
      word: sanitizeCssSize(settings.footerLogoWordSize, DEFAULT_SITE_SETTINGS.footerLogoWordSize),
      wordMobile: sanitizeCssSize(settings.footerLogoWordSizeMobile, DEFAULT_SITE_SETTINGS.footerLogoWordSizeMobile),
      wordWeight: sanitizeCssFontWeight(settings.footerLogoWordWeight, DEFAULT_SITE_SETTINGS.footerLogoWordWeight),
      wordStyle: sanitizeCssFontStyle(settings.footerLogoWordStyle, DEFAULT_SITE_SETTINGS.footerLogoWordStyle),
      wordTracking: sanitizeCssLetterSpacing(
        settings.footerLogoWordLetterSpacing,
        DEFAULT_SITE_SETTINGS.footerLogoWordLetterSpacing
      ),
      tagFont: sanitizeCssFontFamily(settings.footerLogoTaglineFont, DEFAULT_SITE_SETTINGS.footerLogoTaglineFont),
      tag: sanitizeCssSize(settings.footerLogoTaglineSize, DEFAULT_SITE_SETTINGS.footerLogoTaglineSize),
      tagMobile: sanitizeCssSize(settings.footerLogoTaglineSizeMobile, DEFAULT_SITE_SETTINGS.footerLogoTaglineSizeMobile),
      tagWeight: sanitizeCssFontWeight(settings.footerLogoTaglineWeight, DEFAULT_SITE_SETTINGS.footerLogoTaglineWeight),
      tagStyle: sanitizeCssFontStyle(settings.footerLogoTaglineStyle, DEFAULT_SITE_SETTINGS.footerLogoTaglineStyle),
      tagTracking: sanitizeCssLetterSpacing(
        settings.footerLogoTaglineLetterSpacing,
        DEFAULT_SITE_SETTINGS.footerLogoTaglineLetterSpacing
      ),
    };
  }

  const chip = sanitizeCssSize(settings.logoChipHeight, DEFAULT_SITE_SETTINGS.logoChipHeight);
  const chipMobile = sanitizeCssSize(settings.logoChipHeightMobile, DEFAULT_SITE_SETTINGS.logoChipHeightMobile);
  const word = sanitizeCssSize(settings.logoWordSize, DEFAULT_SITE_SETTINGS.logoWordSize);
  const wordMobile = sanitizeCssSize(settings.logoWordSizeMobile, DEFAULT_SITE_SETTINGS.logoWordSizeMobile);
  return {
    chip: scaleCssSize(chip, 0.8, DEFAULT_SITE_SETTINGS.footerLogoChipHeight),
    chipMobile: scaleCssSize(chipMobile, 0.8, DEFAULT_SITE_SETTINGS.footerLogoChipHeightMobile),
    wordFont: sanitizeCssFontFamily(settings.logoWordFont, DEFAULT_SITE_SETTINGS.logoWordFont),
    word: scaleCssSize(word, 1.25, DEFAULT_SITE_SETTINGS.footerLogoWordSize),
    wordMobile: scaleCssSize(wordMobile, 1.25, DEFAULT_SITE_SETTINGS.footerLogoWordSizeMobile),
    wordWeight: sanitizeCssFontWeight(settings.logoWordWeight, DEFAULT_SITE_SETTINGS.logoWordWeight),
    wordStyle: sanitizeCssFontStyle(settings.logoWordStyle, DEFAULT_SITE_SETTINGS.logoWordStyle),
    wordTracking: sanitizeCssLetterSpacing(settings.logoWordLetterSpacing, DEFAULT_SITE_SETTINGS.logoWordLetterSpacing),
    tagFont: sanitizeCssFontFamily(settings.logoTaglineFont, DEFAULT_SITE_SETTINGS.logoTaglineFont),
    tag: sanitizeCssSize(settings.logoTaglineSize, DEFAULT_SITE_SETTINGS.logoTaglineSize),
    tagMobile: sanitizeCssSize(settings.logoTaglineSizeMobile, DEFAULT_SITE_SETTINGS.logoTaglineSizeMobile),
    tagWeight: sanitizeCssFontWeight(settings.logoTaglineWeight, DEFAULT_SITE_SETTINGS.logoTaglineWeight),
    tagStyle: sanitizeCssFontStyle(settings.logoTaglineStyle, DEFAULT_SITE_SETTINGS.logoTaglineStyle),
    tagTracking: sanitizeCssLetterSpacing(
      settings.logoTaglineLetterSpacing,
      DEFAULT_SITE_SETTINGS.logoTaglineLetterSpacing
    ),
  };
}

/** Public footer logo image — optional footer override, else shared brand logo. */
export function footerLogoSrc(settings: SiteSettings): string {
  return settings.footerLogoUrl?.trim() || settings.logoUrl?.trim() || DEFAULT_SITE_SETTINGS.logoUrl;
}

const COUNTRY_DISPLAY: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  GB: 'United Kingdom',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
};

/** Multi-line postal address for footer / contact surfaces. Empty lines omitted. */
export function formatOfficeAddressLines(
  site: Pick<
    SiteSettings,
    'addressStreet' | 'addressStreet2' | 'addressLocality' | 'addressRegion' | 'addressPostal' | 'addressCountry'
  >
): string[] {
  const lines: string[] = [];
  const street = site.addressStreet?.trim();
  if (street) lines.push(street);
  const street2 = site.addressStreet2?.trim();
  if (street2) lines.push(street2);

  const cityBits = [site.addressLocality, site.addressRegion, site.addressPostal]
    .map((part) => part?.trim())
    .filter(Boolean) as string[];
  if (cityBits.length) lines.push(cityBits.join(', '));

  const countryRaw = site.addressCountry?.trim();
  if (countryRaw) {
    const code = countryRaw.toUpperCase();
    lines.push(COUNTRY_DISPLAY[code] || countryRaw);
  }
  return lines;
}

/** Combined street for schema / single-line consumers. */
export function formatStreetAddress(
  site: Pick<SiteSettings, 'addressStreet' | 'addressStreet2'>
): string {
  return [site.addressStreet, site.addressStreet2]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

export type SocialNetworkId = 'facebook' | 'instagram' | 'linkedin' | 'x' | 'youtube';

export type SocialLinkDef = {
  id: SocialNetworkId;
  href: string;
  className: string;
};

/** Accept http(s) URLs; prepend https:// when the host is given without a scheme. Reject other schemes. */
export function normalizeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  return `https://${trimmed}`;
}

const SOCIAL_LINK_FIELDS: Array<{
  id: SocialNetworkId;
  key: keyof Pick<SiteSettings, 'facebookUrl' | 'instagramUrl' | 'linkedinUrl' | 'xUrl' | 'youtubeUrl'>;
  className: string;
}> = [
  { id: 'facebook', key: 'facebookUrl', className: 'sl-fb' },
  { id: 'instagram', key: 'instagramUrl', className: 'sl-ig' },
  { id: 'linkedin', key: 'linkedinUrl', className: 'sl-li' },
  { id: 'x', key: 'xUrl', className: 'sl-x' },
  { id: 'youtube', key: 'youtubeUrl', className: 'sl-yt' },
];

/** Active social profile links from Site Settings (blank URLs omitted). */
export function socialLinksFromSettings(
  site: Pick<SiteSettings, 'facebookUrl' | 'instagramUrl' | 'linkedinUrl' | 'xUrl' | 'youtubeUrl'>
): SocialLinkDef[] {
  const links: SocialLinkDef[] = [];
  for (const field of SOCIAL_LINK_FIELDS) {
    const href = normalizeExternalUrl(site[field.key] || '');
    if (href) links.push({ id: field.id, href, className: field.className });
  }
  return links;
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
  const footer = resolveFooterLogoTokens(settings);
  const brandMax = sanitizeCssMaxWidth(settings.footerBrandMaxWidth, DEFAULT_SITE_SETTINGS.footerBrandMaxWidth);
  const brandMaxMobile = sanitizeCssMaxWidth(
    settings.footerBrandMaxWidthMobile,
    DEFAULT_SITE_SETTINGS.footerBrandMaxWidthMobile
  );
  const brandAlign = sanitizeFooterOfficeAlign(settings.footerBrandAlign);

  return [
    `:root{--logo-chip-h:${chip};--logo-chip-h-mobile:${chipMobile};--logo-word-font:${wordFont};--logo-word-size:${word};--logo-word-size-mobile:${wordMobile};--logo-word-weight:${wordWeight};--logo-word-style:${wordStyle};--logo-word-letter-spacing:${wordTracking};--logo-tagline-font:${tagFont};--logo-tagline-size:${tagSize};--logo-tagline-size-mobile:${tagSizeMobile};--logo-tagline-weight:${tagWeight};--logo-tagline-style:${tagStyle};--logo-tagline-letter-spacing:${tagTracking};--footer-logo-chip-h:${footer.chip};--footer-logo-chip-h-mobile:${footer.chipMobile};--footer-logo-word-font:${footer.wordFont};--footer-logo-word-size:${footer.word};--footer-logo-word-size-mobile:${footer.wordMobile};--footer-logo-word-weight:${footer.wordWeight};--footer-logo-word-style:${footer.wordStyle};--footer-logo-word-letter-spacing:${footer.wordTracking};--footer-logo-tagline-font:${footer.tagFont};--footer-logo-tagline-size:${footer.tag};--footer-logo-tagline-size-mobile:${footer.tagMobile};--footer-logo-tagline-weight:${footer.tagWeight};--footer-logo-tagline-style:${footer.tagStyle};--footer-logo-tagline-letter-spacing:${footer.tagTracking};--footer-brand-max-width:${brandMax};--footer-brand-max-width-mobile:${brandMaxMobile};--footer-brand-align:${brandAlign};--text-eyebrow:${eyebrow};--text-eyebrow-lg:${eyebrowLg};--text-eyebrow-md:${eyebrowMd};}`,
    /* Re-assert mobile sizes after globals.css chrome rules that set desktop vars on header/footer. */
    `@media (max-width:760px){header .logo,.logo,.page-shell .logo{font-size:var(--logo-word-size-mobile);}.logo-chip img{height:var(--logo-chip-h-mobile);}footer .footer-logo .logo-chip img,.footer-logo .logo-chip img{height:var(--footer-logo-chip-h-mobile);}footer .footer-logo .logo-word,.footer-logo .logo-word{font-size:var(--footer-logo-word-size-mobile);}footer .footer-logo .logo-word small,.footer-logo .logo-word small{font-size:var(--footer-logo-tagline-size-mobile);}.logo-word small,header .logo-word small,.page-shell .logo-word small{font-size:var(--logo-tagline-size-mobile);}footer .foot-brand{max-width:var(--footer-brand-max-width-mobile);}}`,
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
