import { withContactDefaults } from '@/lib/contact-sections';
import { withCertsDefaults } from '@/lib/certifications-sections';
import { defaultPrivacyPolicyContent, upgradeLegalPolicy, withPrivacyDefaults } from '@/lib/privacy-sections';
import {
  defaultIndustriesCtaContent,
  defaultIndustriesHeroContent,
  upgradeInnerCta,
  upgradeInnerHero,
  withInnerHeroLook,
  type IndustriesCtaContent,
  type IndustriesHeroContent,
} from '@/lib/industries-sections';
import type { PrivacyPolicyContent } from '@/lib/privacy-sections';
import { INDUSTRY_DEFS, industryPageSlug, industryPublicPath, type IndustryDef } from '@/lib/industries';
import { INDUSTRY_HUB_IMAGES } from '@/lib/industry-hub-seed';

/**
 * Fully configurable industry page section family (CMS pages industries-{key}, e.g. /industries-healthcare):
 * industry_page_hero, industry_page_overview, industry_page_cta.
 *
 * The hero reuses the Contact hero renderer, the overview the Privacy text section (blocks, media, optional
 * table of contents) and the CTA the Certifications CTA band, with defaults per industry (INDUSTRY_DEFS) that
 * mirror the live industry pages. Headings / eyebrows follow Site Settings → Public typography.
 */

export const INDUSTRY_PAGE_SECTION_TYPES = ['industry_page_hero', 'industry_page_overview', 'industry_page_cta'] as const;
export type IndustryPageSectionType = (typeof INDUSTRY_PAGE_SECTION_TYPES)[number];

export function isIndustryPageSectionType(type: string): type is IndustryPageSectionType {
  return (INDUSTRY_PAGE_SECTION_TYPES as readonly string[]).includes(type);
}

/** Older generic section types used by the live industry pages, and their replacement. */
export const INDUSTRY_PAGE_UPGRADE_MAP: Record<string, IndustryPageSectionType> = {
  page_hero: 'industry_page_hero',
  rich_text: 'industry_page_overview',
  cta: 'industry_page_cta',
};

/** Industry pages the admin upgrade / restore buttons may convert. */
export const INDUSTRY_PAGE_UPGRADE_SLUGS = [
  industryPageSlug('healthcare'),
  industryPageSlug('data-centres'),
  industryPageSlug('manufacturing'),
  industryPageSlug('banking'),
  industryPageSlug('education'),
  industryPageSlug('airports'),
] as const;

export type IndustryPageHeroContent = IndustriesHeroContent;
export type IndustryPageOverviewContent = PrivacyPolicyContent;
export type IndustryPageCtaContent = IndustriesCtaContent;

/** "industries-healthcare" → "healthcare" (unknown slugs fall back to the first industry). */
export function industryKeyFromSlug(slug?: string | null): string {
  const key = String(slug || '').replace(/^industries-/, '');
  return INDUSTRY_DEFS.some((d) => d.key === key) ? key : INDUSTRY_DEFS[0].key;
}

function industryDef(key?: string | null): IndustryDef {
  return INDUSTRY_DEFS.find((d) => d.key === key) || INDUSTRY_DEFS[0];
}

const consultHref = (ind: IndustryDef) => `/contact?consult=1&consult_subject=${encodeURIComponent(ind.subject)}`;

/* ------------------------------------------------------------------ */
/* Defaults (mirror the live industry pages)                           */
/* ------------------------------------------------------------------ */

export function defaultIndustryPageHeroContent(key?: string | null): IndustryPageHeroContent {
  const ind = industryDef(key);
  const d = withInnerHeroLook(defaultIndustriesHeroContent());
  return {
    ...d,
    background: {
      ...d.background,
      items: [{ src: INDUSTRY_HUB_IMAGES[ind.key] || '/assets/images/city-skyline-with-solar-panels-and-indus.jpg', title: '' }],
    },
    breadcrumb: { ...d.breadcrumb, items: [{ label: 'Home', href: '/' }, { label: 'Industries' }] },
    eyebrow: { ...d.eyebrow, text: ind.eyebrow },
    title: { text: ind.name },
    lead: { text: ind.lead },
    ctas: [
      { label: 'Request industry consultation →', href: consultHref(ind), variant: 'primary' },
      { label: 'Browse projects', href: '/projects', variant: 'ghost' },
    ],
  };
}

export function defaultIndustryPageOverviewContent(key?: string | null): IndustryPageOverviewContent {
  const ind = industryDef(key);
  const d = defaultPrivacyPolicyContent();
  const path = industryPublicPath(ind.key);
  return {
    ...d,
    header: { ...d.header, hidden: true, eyebrow: { ...d.header.eyebrow, text: 'OVERVIEW' }, title: { text: 'Overview' } },
    blocks: [{ title: { text: '' }, html: `<p>${ind.lead}</p><p>Public landing: <a href="${path}">${path}</a></p>`, media: [] }],
  };
}

export function defaultIndustryPageCtaContent(key?: string | null): IndustryPageCtaContent {
  const ind = industryDef(key);
  const d = defaultIndustriesCtaContent();
  return {
    ...d,
    eyebrow: { ...d.eyebrow, text: 'Next step' },
    title: { text: `Talk to us about ${ind.name}` },
    body: { text: 'Share your load profile, site constraints, and timeline — we will propose a clear path.' },
    ctas: [{ label: 'Request consultation', href: consultHref(ind), variant: 'primary' }],
  };
}

/** Defaults for a new section; `pageSlug` (industries-{key}) picks the industry's copy. */
export function defaultIndustryPageSectionContent(type: string, pageSlug?: string | null): Record<string, unknown> | null {
  const key = industryKeyFromSlug(pageSlug);
  switch (type) {
    case 'industry_page_hero':
      return defaultIndustryPageHeroContent(key);
    case 'industry_page_overview':
      return defaultIndustryPageOverviewContent(key);
    case 'industry_page_cta':
      return defaultIndustryPageCtaContent(key);
    default:
      return null;
  }
}

/**
 * Fill missing top-level keys from the defaults (one level of object merge), then let the shared family's
 * normalizer fix arrays / nested shapes — every key is already present, so its own defaults never leak in.
 */
export function withIndustryPageDefaults<T extends object>(type: IndustryPageSectionType, raw: unknown): T {
  const base = defaultIndustryPageSectionContent(type) as Record<string, unknown>;
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined || v === null) continue;
    const b = base[k];
    merged[k] =
      b && typeof b === 'object' && !Array.isArray(b) && typeof v === 'object' && !Array.isArray(v) ? { ...(b as object), ...(v as object) } : v;
  }
  if (type === 'industry_page_hero') return withContactDefaults<T>('contact_hero', merged);
  if (type === 'industry_page_overview') return withPrivacyDefaults<T>('privacy_policy', merged);
  return withCertsDefaults<T>('certs_cta', merged);
}

/* ------------------------------------------------------------------ */
/* Upgrade: old generic industry page sections → industry_page_*       */
/* ------------------------------------------------------------------ */

/** Convert an old industry page section into its configurable replacement, keeping all content. */
export function upgradeIndustryPageSection(
  oldType: string,
  content: unknown,
  pageSlug?: string | null
): { type: IndustryPageSectionType; content: Record<string, unknown> } | null {
  const next = INDUSTRY_PAGE_UPGRADE_MAP[oldType];
  if (!next) return null;
  const o = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>;
  const key = industryKeyFromSlug(pageSlug);
  const out =
    next === 'industry_page_hero'
      ? upgradeInnerHero(o, defaultIndustryPageHeroContent(key))
      : next === 'industry_page_overview'
        ? upgradeLegalPolicy(o, defaultIndustryPageOverviewContent(key))
        : upgradeInnerCta(o, defaultIndustryPageCtaContent(key));
  return { type: next, content: out as Record<string, unknown> };
}

/** Sections for a new industry page (industries-{key}); same order as the live pages. */
export function industryPageSeedSections(key: string): Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> {
  const ind = industryDef(key);
  return [
    { type: 'industry_page_hero', section_key: 'hero', title: ind.name, content_json: defaultIndustryPageHeroContent(ind.key) },
    { type: 'industry_page_overview', section_key: 'overview', title: 'Overview', content_json: defaultIndustryPageOverviewContent(ind.key) },
    { type: 'industry_page_cta', section_key: 'cta', title: 'CTA', content_json: defaultIndustryPageCtaContent(ind.key) },
  ];
}
