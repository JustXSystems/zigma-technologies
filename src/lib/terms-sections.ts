import {
  defaultPrivacyCtaContent,
  defaultPrivacyHeroContent,
  defaultPrivacyPolicyContent,
  upgradeLegalCta,
  upgradeLegalHero,
  upgradeLegalPolicy,
  withPrivacyDefaults,
  type PrivacyCtaContent,
  type PrivacyHeroContent,
  type PrivacyPolicyContent,
  type PrivacySectionType,
} from '@/lib/privacy-sections';

/**
 * Fully configurable Terms of Use section family (page /terms): terms_hero, terms_policy, terms_cta.
 *
 * Same shapes, renderers, editors and `.pvc-*` CSS as the Privacy family, with terms defaults that mirror
 * the live terms page. Headings / eyebrows follow Theme Studio → Typography.
 */

export const TERMS_SECTION_TYPES = ['terms_hero', 'terms_policy', 'terms_cta'] as const;
export type TermsSectionType = (typeof TERMS_SECTION_TYPES)[number];

export function isTermsSectionType(type: string): type is TermsSectionType {
  return (TERMS_SECTION_TYPES as readonly string[]).includes(type);
}

/** Older generic section types used by the live /terms page, and their replacement (terms page only). */
export const TERMS_UPGRADE_MAP: Record<string, TermsSectionType> = {
  page_hero: 'terms_hero',
  rich_text: 'terms_policy',
  cta: 'terms_cta',
};

/** The privacy type whose shape / normalization each terms type shares. */
export const TERMS_SHAPE: Record<TermsSectionType, PrivacySectionType> = {
  terms_hero: 'privacy_hero',
  terms_policy: 'privacy_policy',
  terms_cta: 'privacy_cta',
};

export type TermsHeroContent = PrivacyHeroContent;
export type TermsPolicyContent = PrivacyPolicyContent;
export type TermsCtaContent = PrivacyCtaContent;

/* ------------------------------------------------------------------ */
/* Defaults (mirror the live terms page)                               */
/* ------------------------------------------------------------------ */

export const TERMS_DEFAULT_HTML = `<p>Content on this website is provided for general information about our engineering capabilities, products, and services. Specifications and availability may change without notice.</p>
<p>All trademarks, logos, and project imagery remain the property of their respective owners. You may not copy or redistribute site materials for commercial use without written permission.</p>
<p>Enquiries submitted through the site do not create a binding contract until confirmed in writing by Zigma Technologies.</p>
<p>To the fullest extent permitted by law, we are not liable for indirect or consequential damages arising from use of this website. Governing law is that of India, with disputes subject to courts in Bengaluru unless otherwise agreed.</p>`;

export function defaultTermsHeroContent(): TermsHeroContent {
  const d = defaultPrivacyHeroContent();
  return {
    ...d,
    background: { ...d.background, items: [{ src: '/assets/images/engineers-inspecting-switchgear-panels-i.jpg', title: '' }] },
    breadcrumb: { ...d.breadcrumb, items: [{ label: 'Home', href: '/' }, { label: 'Terms' }] },
    title: { text: 'Terms of Use' },
    lead: { text: 'Guidelines for using the Zigma Technologies website and related digital content.' },
  };
}

export function defaultTermsPolicyContent(): TermsPolicyContent {
  const d = defaultPrivacyPolicyContent();
  return {
    ...d,
    header: { ...d.header, eyebrow: { ...d.header.eyebrow, text: 'THE FINE PRINT' }, title: { text: 'Terms of Use' } },
    blocks: [{ title: { text: '' }, html: TERMS_DEFAULT_HTML, media: [] }],
  };
}

export function defaultTermsCtaContent(): TermsCtaContent {
  const d = defaultPrivacyCtaContent();
  return {
    ...d,
    title: { text: 'Need a formal agreement?' },
    body: { text: 'Project scopes, SLAs, and commercial terms are issued separately for each engagement.' },
    ctas: [
      { label: 'Request consultation', href: '/contact#contact-form', variant: 'primary' },
      { label: 'Privacy policy', href: '/privacy', variant: 'ghost' },
    ],
  };
}

export function defaultTermsSectionContent(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'terms_hero':
      return defaultTermsHeroContent();
    case 'terms_policy':
      return defaultTermsPolicyContent();
    case 'terms_cta':
      return defaultTermsCtaContent();
    default:
      return null;
  }
}

/**
 * Fill missing top-level keys from the terms defaults (one level of object merge), then let the privacy
 * normalizer fix arrays / nested shapes — every key is already present, so privacy defaults never leak in.
 */
export function withTermsDefaults<T extends object>(type: TermsSectionType, raw: unknown): T {
  const base = defaultTermsSectionContent(type) as Record<string, unknown>;
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined || v === null) continue;
    const b = base[k];
    merged[k] =
      b && typeof b === 'object' && !Array.isArray(b) && typeof v === 'object' && !Array.isArray(v) ? { ...(b as object), ...(v as object) } : v;
  }
  return withPrivacyDefaults<T>(TERMS_SHAPE[type], merged);
}

/* ------------------------------------------------------------------ */
/* Upgrade: old generic terms sections → terms_* (keeps content)       */
/* ------------------------------------------------------------------ */

/** Convert an old generic terms section into its configurable replacement, keeping all content. */
export function upgradeTermsSection(oldType: string, content: unknown): { type: TermsSectionType; content: Record<string, unknown> } | null {
  const next = TERMS_UPGRADE_MAP[oldType];
  if (!next) return null;
  const o = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>;
  const out =
    next === 'terms_hero'
      ? upgradeLegalHero(o, defaultTermsHeroContent())
      : next === 'terms_policy'
        ? upgradeLegalPolicy(o, defaultTermsPolicyContent())
        : upgradeLegalCta(o, defaultTermsCtaContent());
  return { type: next, content: out as Record<string, unknown> };
}

export const TERMS_SLUG = 'terms';

export const TERMS_SEED_SECTIONS_V2: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'terms_hero', section_key: 'terms-hero', title: 'Terms hero', content_json: defaultTermsHeroContent() },
  { type: 'terms_policy', section_key: 'terms-body', title: 'Terms text', content_json: defaultTermsPolicyContent() },
  { type: 'terms_cta', section_key: 'terms-cta', title: 'Terms CTA', content_json: defaultTermsCtaContent() },
];
