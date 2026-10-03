import { ABOUT_TYPOGRAPHY_VERSION, type CtaButton, type ElementStyle, type IconEl, type SectionBox, type TextEl } from '@/lib/about-sections';
import {
  defaultContactHeroContent,
  upgradeContactSection,
  withContactDefaults,
  type ContactHeroContent,
  type ContactIconStyle,
} from '@/lib/contact-sections';
import { defaultCertsCtaContent, withCertsDefaults, CERTS_ALL_ICON_PRESETS, type CertsCtaContent } from '@/lib/certifications-sections';
import type { LegacyBgMedia, LegacyCardStyle, LegacySectionHeader } from '@/lib/legacy-sections';
import type { LifeMediaItem } from '@/lib/life-sections';

/**
 * Fully configurable Privacy page section family (page /privacy):
 * privacy_hero, privacy_policy, privacy_cta.
 *
 * The hero reuses the Contact hero renderer and the CTA band reuses the Certifications CTA renderer, both with
 * privacy defaults; the policy body renders with scoped `.pvc-*` CSS. Defaults mirror the live privacy page.
 * Headings / eyebrows follow Theme Studio → Typography; section padding follows the theme --section-pad.
 */

export const PRIVACY_SECTION_TYPES = ['privacy_hero', 'privacy_policy', 'privacy_cta'] as const;
export type PrivacySectionType = (typeof PRIVACY_SECTION_TYPES)[number];

export function isPrivacySectionType(type: string): type is PrivacySectionType {
  return (PRIVACY_SECTION_TYPES as readonly string[]).includes(type);
}

/** Older generic section types used by the live /privacy page, and their replacement (privacy page only). */
export const PRIVACY_UPGRADE_MAP: Record<string, PrivacySectionType> = {
  page_hero: 'privacy_hero',
  rich_text: 'privacy_policy',
  cta: 'privacy_cta',
};

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

export type PrivacyHeroContent = ContactHeroContent;
export type PrivacyCtaContent = CertsCtaContent;

export type PrivacyBlock = {
  hidden?: boolean;
  /** Link target (#anchor); empty = built from the title */
  anchor?: string;
  title: TextEl;
  /** Rich text (HTML): paragraphs, lists, links, tables… Site tokens like {{email}} work here. */
  html: string;
  icon?: IconEl;
  /** Images / videos under the text (several = cross-fading slideshow) */
  media: LifeMediaItem[];
};

export type PrivacyPolicyContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: LegacySectionHeader;
  /** "Last updated" line above the policy */
  updated: TextEl;
  intro: TextEl;
  blocks: PrivacyBlock[];
  /** Number the block titles (01, 02…) */
  numbered?: boolean;
  toc: {
    hidden?: boolean;
    title: string;
    position?: 'left' | 'right';
    sticky?: boolean;
    /** Distance from the top while sticky (clears the site header) */
    stickyTop?: string;
    width?: string;
    background?: string;
    border?: string;
    radius?: string;
    padding?: string;
    linkStyle?: ElementStyle;
    activeColor?: string;
  };
  layout: {
    /** Max width of the policy text column */
    maxWidth?: string;
    /** Space between the table of contents and the text */
    gap?: string;
    /** Space between blocks */
    blockGap?: string;
    dividers?: boolean;
    dividerColor?: string;
  };
  /** Optional card around the policy text */
  panel: LegacyCardStyle;
  updatedStyle?: ElementStyle;
  introStyle?: ElementStyle;
  blockTitleStyle?: ElementStyle;
  /** Policy text: font, size, colour, line height */
  bodyStyle?: ElementStyle;
  paragraphGap?: string;
  linkColor?: string;
  linkHoverColor?: string;
  markerColor?: string;
  mediaHeight?: string;
  mediaIntervalSeconds?: number;
  iconStyle: ContactIconStyle;
};

export const PRIVACY_ALL_ICON_PRESETS = CERTS_ALL_ICON_PRESETS;

/* ------------------------------------------------------------------ */
/* Defaults (mirror the live privacy page)                             */
/* ------------------------------------------------------------------ */

export const PRIVACY_DEFAULT_HTML = `<p>We collect contact details you voluntarily submit via enquiry forms, careers applications, newsletter signup, and direct email or phone. This may include name, company, email, phone number, project requirements, and — when you apply for a role — work experience and a CV/resume file.</p>
<p>Information is used to respond to requests, evaluate job applications, improve our services, and (with consent) send occasional updates. We do not sell personal data. Resume files are stored privately and are accessible only to authorized staff through the admin portal.</p>
<p>Data is stored securely with access limited to authorized staff. You may request correction or deletion by contacting <a href="mailto:{{email}}">{{email}}</a>.</p>
<p>This policy may be updated periodically. Continued use of the site after changes constitutes acceptance of the revised policy.</p>`;

export function defaultPrivacyHeroContent(): PrivacyHeroContent {
  const d = defaultContactHeroContent();
  return {
    ...d,
    section: { ...d.section, paddingTop: '8rem', paddingBottom: '4rem', paddingTopMobile: '6.5rem', paddingBottomMobile: '2.75rem' },
    background: {
      ...d.background,
      items: [{ src: '/assets/images/engineers-reviewing-electrical-design-dr.jpg', title: '' }],
      position: 'center 35%',
    },
    breadcrumb: { ...d.breadcrumb, items: [{ label: 'Home', href: '/' }, { label: 'Privacy' }] },
    eyebrow: { ...d.eyebrow, text: 'LEGAL' },
    title: { text: 'Privacy Policy' },
    leadEmphasis: { text: '' },
    lead: { text: 'How Zigma Technologies collects, uses, and protects information shared through our website and enquiry channels.' },
    leadAccent: { text: '' },
  };
}

export function defaultPrivacyPolicyContent(): PrivacyPolicyContent {
  return {
    section: { tone: 'light', bgColor: 'var(--white)' },
    background: { hidden: false, items: [], mobileItems: [], intervalSeconds: 6, motion: 'none', overlay: '' },
    header: {
      hidden: true,
      align: 'left',
      eyebrow: { text: 'YOUR DATA', line: false, style: { color: 'var(--orange)' } },
      title: { text: 'Privacy Policy' },
      subtitle: { text: '' },
      bar: { hidden: true },
    },
    updated: { text: '' },
    intro: { text: '' },
    blocks: [{ title: { text: '' }, html: PRIVACY_DEFAULT_HTML, media: [] }],
    numbered: false,
    toc: { hidden: true, title: 'On this page', position: 'left', sticky: true },
    layout: { maxWidth: '', gap: '', blockGap: '', dividers: false },
    panel: {},
    paragraphGap: '',
    mediaIntervalSeconds: 5,
    iconStyle: {},
  };
}

export function defaultPrivacyCtaContent(): PrivacyCtaContent {
  const d = defaultCertsCtaContent();
  return {
    ...d,
    section: {
      tone: 'dark',
      bgColor: '#0A1628',
      bgGradient: 'linear-gradient(120deg,var(--navy-950),var(--navy-900))',
      paddingTop: '6rem',
      paddingBottom: '6rem',
      paddingTopMobile: '3.75rem',
      paddingBottomMobile: '3.75rem',
    },
    title: { text: 'Questions about your data?' },
    body: { text: 'Reach our team and we will help with access, correction, or deletion requests.' },
    ctas: [
      { label: 'Contact us', href: '/contact', variant: 'primary' },
      { label: 'Terms of use', href: '/terms', variant: 'ghost' },
    ],
  };
}

export function defaultPrivacySectionContent(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'privacy_hero':
      return defaultPrivacyHeroContent();
    case 'privacy_policy':
      return defaultPrivacyPolicyContent();
    case 'privacy_cta':
      return defaultPrivacyCtaContent();
    default:
      return null;
  }
}

/**
 * Fill any missing top-level keys from defaults (one level of object merge) and normalize arrays
 * so partially saved or hand-edited JSON never crashes the renderer / editor.
 */
export function withPrivacyDefaults<T extends object>(type: PrivacySectionType, raw: unknown): T {
  const base = defaultPrivacySectionContent(type) as Record<string, unknown>;
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined || v === null) continue;
    const b = base[k];
    if (b && typeof b === 'object' && !Array.isArray(b) && typeof v === 'object' && !Array.isArray(v)) {
      merged[k] = { ...(b as object), ...(v as object) };
    } else {
      merged[k] = v;
    }
  }
  /* Shared shapes: every key is already present, so the other family's defaults only normalize arrays. */
  if (type === 'privacy_hero') return withContactDefaults<T>('contact_hero', merged);
  if (type === 'privacy_cta') return withCertsDefaults<T>('certs_cta', merged);

  const out = merged;
  const arr = <V>(v: unknown): V[] => (Array.isArray(v) ? (v as V[]).filter((x) => x && typeof x === 'object') : []);
  const bg = (out.background && typeof out.background === 'object' ? out.background : {}) as LegacyBgMedia;
  out.background = { ...bg, items: arr<LifeMediaItem>(bg.items), mobileItems: arr<LifeMediaItem>(bg.mobileItems) };
  out.blocks = arr<PrivacyBlock>(out.blocks).map((b) => ({
    ...b,
    title: b.title && typeof b.title === 'object' ? b.title : { text: typeof b.title === 'string' ? b.title : '' },
    html: typeof b.html === 'string' ? b.html : '',
    icon: b.icon && typeof b.icon === 'object' ? b.icon : undefined,
    media: arr<LifeMediaItem>(b.media),
  }));
  out.iconStyle = out.iconStyle || {};
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out as T;
}

/** "Data We Collect" → "data-we-collect" (block anchors / table of contents). */
export function privacyAnchor(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* ------------------------------------------------------------------ */
/* Upgrade: old generic privacy sections → privacy_* (keeps content)   */
/* ------------------------------------------------------------------ */

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const s = (v: unknown) => str(v).trim();

/** Old page_hero → configurable hero on top of the given page defaults (shared with the Terms page). */
export function upgradeLegalHero(o: Raw, d: PrivacyHeroContent = defaultPrivacyHeroContent()): PrivacyHeroContent {
  const up = upgradeContactSection('page_hero', o)?.content as ContactHeroContent | undefined;
  if (!up) return d;
  const fallback = d.breadcrumb.items[d.breadcrumb.items.length - 1]?.label || '';
  return {
    ...up,
    section: d.section,
    background: { ...d.background, items: s(o.image) ? up.background.items : d.background.items, mobileItems: up.background.mobileItems },
    breadcrumb: { ...d.breadcrumb, items: [{ label: 'Home', href: '/' }, { label: s(o.breadcrumb) || s(o.title) || fallback }] },
  };
}

/** Old rich_text → policy text with one block (shared with the Terms page). */
export function upgradeLegalPolicy(o: Raw, d: PrivacyPolicyContent = defaultPrivacyPolicyContent()): PrivacyPolicyContent {
  const title = str(o.title);
  return {
    ...d,
    header: { ...d.header, hidden: !title.trim(), title: { text: title } },
    blocks: [{ title: { text: '' }, html: str(o.html) || str(o.body), media: [] }],
  };
}

/** Old cta → CTA band (shared with the Terms page). */
export function upgradeLegalCta(o: Raw, d: PrivacyCtaContent = defaultPrivacyCtaContent()): PrivacyCtaContent {
  const ctas: CtaButton[] = [];
  if (s(o.primaryCta)) ctas.push({ label: s(o.primaryCta), href: s(o.primaryHref) || '/contact', variant: 'primary' });
  if (s(o.secondaryCta) && s(o.secondaryHref)) ctas.push({ label: s(o.secondaryCta), href: s(o.secondaryHref), variant: 'ghost' });
  return {
    ...d,
    eyebrow: { ...d.eyebrow, text: str(o.eyebrow) },
    title: { text: str(o.title) },
    body: { text: str(o.body) },
    ctas,
  };
}

/** Convert an old generic privacy section into its configurable replacement, keeping all content. */
export function upgradePrivacySection(oldType: string, content: unknown): { type: PrivacySectionType; content: Record<string, unknown> } | null {
  const next = PRIVACY_UPGRADE_MAP[oldType];
  if (!next) return null;
  const o = (content && typeof content === 'object' ? content : {}) as Raw;
  const map: Record<PrivacySectionType, (o: Raw) => object> = {
    privacy_hero: (o) => upgradeLegalHero(o),
    privacy_policy: (o) => upgradeLegalPolicy(o),
    privacy_cta: (o) => upgradeLegalCta(o),
  };
  return { type: next, content: map[next](o) as Record<string, unknown> };
}

export const PRIVACY_SLUG = 'privacy';

export const PRIVACY_SEED_SECTIONS_V2: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'privacy_hero', section_key: 'privacy-hero', title: 'Privacy hero', content_json: defaultPrivacyHeroContent() },
  { type: 'privacy_policy', section_key: 'privacy-body', title: 'Privacy policy text', content_json: defaultPrivacyPolicyContent() },
  { type: 'privacy_cta', section_key: 'privacy-cta', title: 'Privacy CTA', content_json: defaultPrivacyCtaContent() },
];
