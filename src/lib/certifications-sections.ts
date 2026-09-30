import {
  ABOUT_TYPOGRAPHY_VERSION,
  type CtaButton,
  type ElementStyle,
  type EyebrowEl,
  type IconEl,
  type SectionBox,
  type TextEl,
} from '@/lib/about-sections';
import { defaultContactHeroContent, withContactDefaults, type ContactHeroContent } from '@/lib/contact-sections';
import { CAREERS_ALL_ICON_PRESETS } from '@/lib/careers-sections';
import type { LegacyBgMedia, LegacyCardStyle, LegacySectionHeader } from '@/lib/legacy-sections';
import type { LifeColumns, LifeHighlight, LifeMediaItem } from '@/lib/life-sections';
import { normalizeHeroHeight } from '@/lib/hero-height';

/**
 * Fully configurable Certifications page section family (page /certifications):
 * certs_hero, certs_gallery, certs_cta.
 *
 * The hero reuses the Contact hero renderer with certifications defaults; the certificate gallery
 * (marquee or grid + lightbox) and the CTA band render with scoped `.cer-*` CSS whose defaults mirror
 * the live certifications design. Headings / eyebrows follow Site Settings → Public typography.
 */

export const CERTS_SECTION_TYPES = ['certs_hero', 'certs_gallery', 'certs_cta'] as const;
export type CertsSectionType = (typeof CERTS_SECTION_TYPES)[number];

export function isCertsSectionType(type: string): type is CertsSectionType {
  return (CERTS_SECTION_TYPES as readonly string[]).includes(type);
}

/** Older minimal section types used by the live /certifications page, and their replacement. */
export const CERTS_UPGRADE_MAP: Record<string, CertsSectionType> = {
  cert_hero: 'certs_hero',
  logo_marquee: 'certs_gallery',
  cert_cta: 'certs_cta',
};

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

export type CertsHeroContent = ContactHeroContent;

export type CertsItem = {
  hidden?: boolean;
  name: string;
  /** Issuer / category line under the name (optional) */
  meta?: string;
  /** First item = card image; every item opens in the lightbox (images, SVGs or videos) */
  media: LifeMediaItem[];
  /** Card background override */
  background?: string;
  /** Open this link instead of the lightbox (verification page, PDF…) */
  href?: string;
  newTab?: boolean;
};

export type CertsGalleryContent = {
  section: SectionBox;
  /** Background images / videos behind the gallery */
  background: LegacyBgMedia;
  header: LegacySectionHeader;
  items: CertsItem[];
  layout: 'marquee' | 'grid';
  /** Section min height (desktop); cards are centred vertically */
  minHeight?: string;
  minHeightMobile?: string;
  marquee: {
    /** Travel direction of the cards */
    direction?: 'right' | 'left';
    /** Place the first certificate at the left or right edge when the page opens */
    startFrom?: 'left' | 'right';
    /** Seconds for one full set of certificates to pass */
    speedSeconds?: number;
    pauseOnHover?: boolean;
    edgeFade?: boolean;
    fadeWidth?: string;
    /** Space between cards */
    gap?: string;
  };
  columns: LifeColumns;
  gap?: string;
  /** Card entrance animation (marquee) / staggered reveal on scroll (grid) */
  reveal?: boolean;
  lightbox: { enabled?: boolean; captions?: boolean };
  card: LegacyCardStyle & {
    width?: string;
    widthMobile?: string;
    imageHeight?: string;
    imageHeightMobile?: string;
    imageFit?: 'contain' | 'cover';
    imageBackground?: string;
    imageBorder?: string;
    imagePadding?: string;
    imageRadius?: string;
    hoverBorderColor?: string;
    hoverShadow?: string;
    zoomOnHover?: boolean;
  };
  /** Optional icon in the card corner (e.g. a verified badge) */
  badgeIcon: IconEl;
  nameStyle?: ElementStyle;
  metaStyle?: ElementStyle;
  /** "Click to enlarge" hint under clickable cards; empty = hidden */
  hint: TextEl;
  /** "+2" counter on cards with more than one image / video */
  showCount?: boolean;
};

export type CertsCtaContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  align?: 'left' | 'center' | 'right';
  maxWidth?: string;
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  body: TextEl;
  ctas: CtaButton[];
  /** Small line under the buttons */
  note: TextEl;
};

/* ------------------------------------------------------------------ */
/* Icon presets                                                        */
/* ------------------------------------------------------------------ */

export const CERTS_ICON_PRESETS: Array<{ key: string; label: string; svg: string }> = [
  { key: 'certs-shield-check', label: 'Shield check (verified)', svg: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>' },
  {
    key: 'certs-award',
    label: 'Award ribbon',
    svg: '<circle cx="12" cy="9" r="6"/><path d="M8.2 13.6L7 22l5-3 5 3-1.2-8.4"/>',
  },
  {
    key: 'certs-badge-check',
    label: 'Badge check',
    svg: '<path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z"/><path d="M8.5 12l2.3 2.3 4.7-4.6"/>',
  },
  { key: 'certs-document', label: 'Certificate document', svg: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>' },
  { key: 'certs-zoom', label: 'Zoom in', svg: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>' },
];

export const CERTS_ALL_ICON_PRESETS = [...CERTS_ICON_PRESETS, ...CAREERS_ALL_ICON_PRESETS];

const certsIcon = (key: string) => CERTS_ICON_PRESETS.find((p) => p.key === key)?.svg || '';

/* ------------------------------------------------------------------ */
/* Defaults (mirror the live certifications page)                      */
/* ------------------------------------------------------------------ */

export const CERTS_DEFAULT_ITEMS: Array<{ name: string; image: string }> = [
  { name: 'Kirloskar Solar Technologies', image: '/assets/images/kirloskar-solar-technologies-authorizati.jpg' },
  { name: 'OCV — ISO 9001:2015', image: '/assets/images/ocv-iso-9001-2015-certificate-of-registr.jpg' },
  { name: 'ABB Channel Partner', image: '/assets/images/abb-channel-partner-certificate.jpg' },
  { name: 'Schneider Electric', image: '/assets/images/schneider-electric-certificate-of-author.jpg' },
  { name: 'Avetta Consortium Member', image: '/assets/images/avetta-consortium-membership-certificate.jpg' },
  { name: 'Karnataka Annual Solar Awards 2025', image: '/assets/images/certifications-img-0.jpg' },
];

const certItem = (name: string, image?: string): CertsItem => ({ name, media: image ? [{ src: image, title: name }] : [] });

const TAGLINE_STYLE: ElementStyle = {
  fontFamily: 'mono',
  fontSize: '0.68rem',
  letterSpacing: '0.04em',
  color: 'var(--cyan)',
  background: 'transparent',
  border: '1px solid rgba(0,212,255,0.35)',
  padding: '0.45rem 1.1rem',
  borderRadius: '100px',
};

export function defaultCertsHeroContent(): CertsHeroContent {
  const d = defaultContactHeroContent();
  return {
    ...d,
    section: {
      tone: 'dark',
      bgColor: '#0A1628',
      bgGradient: 'linear-gradient(160deg,var(--navy-950),var(--navy-900))',
      pattern: 'none',
      patternColor: 'rgba(255,255,255,0.035)',
      patternSize: '64px',
      paddingTop: '11.5rem',
      paddingBottom: '1.6rem',
      paddingTopMobile: '8.5rem',
      paddingBottomMobile: '1.6rem',
    },
    heroHeight: 'full',
    background: { ...d.background, items: [], mobileItems: [], position: 'center 30%' },
    align: 'center',
    contentMaxWidth: '820px',
    breadcrumb: { ...d.breadcrumb, hidden: true, items: [{ label: 'Home', href: '/' }, { label: 'Certifications' }] },
    eyebrow: { text: 'CERTIFICATIONS & PARTNERSHIPS', line: false, style: { color: 'var(--cyan)', marginBottom: '0.5rem' } },
    title: { text: 'Our Certifications, Authorizations & Engineering Partners', style: { marginBottom: '0.5rem' } },
    highlight: { text: '', animate: false },
    leadEmphasis: {
      text: 'Certified Excellence. Trusted Performance.',
      style: { fontFamily: 'display', fontWeight: '600', fontSize: '1rem', color: 'var(--orange)', marginTop: '0.5rem' },
    },
    lead: {
      text: 'Our OEM authorizations, industry certifications, and engineering partnerships demonstrate our commitment to quality, technical expertise, and reliable service across power, renewable energy, and industrial engineering solutions.',
      style: { fontSize: '0.84rem', lineHeight: '1.5', color: '#B9C6DA', maxWidth: '680px', marginTop: '0.5rem' },
    },
    leadAccent: { text: '' },
    pills: {
      items: [{ label: 'Recognized by Industry Leaders. Trusted by Businesses Across India.' }],
      style: { ...TAGLINE_STYLE },
      hoverColor: 'var(--cyan)',
      hoverBackground: 'transparent',
      hoverBorderColor: 'rgba(0,212,255,0.35)',
      justify: 'center',
      marginTop: '0.8rem',
    },
    ctas: [],
  };
}

export function defaultCertsGalleryContent(): CertsGalleryContent {
  return {
    section: { tone: 'light', bgColor: 'var(--gray-100)', paddingTop: '1.2rem', paddingBottom: '1.2rem', paddingTopMobile: '1.2rem', paddingBottomMobile: '1.2rem' },
    background: { hidden: false, items: [], mobileItems: [], intervalSeconds: 6, motion: 'none', overlay: '' },
    header: {
      hidden: true,
      align: 'center',
      eyebrow: { text: 'OEM AUTHORIZATIONS', line: false, style: { color: 'var(--orange)' } },
      title: { text: 'Certificates & Authorizations' },
      subtitle: { text: '' },
      bar: { hidden: true },
    },
    items: CERTS_DEFAULT_ITEMS.map((it) => certItem(it.name, it.image)),
    layout: 'marquee',
    minHeight: '360px',
    minHeightMobile: '',
    marquee: { direction: 'right', startFrom: 'right', speedSeconds: 28, pauseOnHover: true, edgeFade: true, fadeWidth: '6%', gap: '1.8rem' },
    columns: { desktop: 4, tablet: 3, mobile: 2 },
    gap: '1.8rem',
    reveal: true,
    lightbox: { enabled: true, captions: true },
    card: { hoverLift: true, imageFit: 'contain', zoomOnHover: true },
    badgeIcon: { hidden: true, svg: certsIcon('certs-shield-check') },
    hint: { text: 'Click to enlarge' },
    showCount: true,
  };
}

export function defaultCertsCtaContent(): CertsCtaContent {
  return {
    section: { tone: 'light', bgColor: '#FFFFFF', paddingTop: '1rem', paddingBottom: '1rem', paddingTopMobile: '1rem', paddingBottomMobile: '1rem' },
    background: { hidden: false, items: [], mobileItems: [], intervalSeconds: 6, motion: 'none', overlay: '' },
    align: 'center',
    maxWidth: '780px',
    eyebrow: { text: '', line: true },
    title: { text: '' },
    highlight: { text: '', animate: false },
    body: { text: '' },
    ctas: [
      {
        label: 'Talk to Our Engineering Team →',
        href: '/contact#contact-form',
        variant: 'primary',
        style: { padding: '0.7rem 1.5rem', fontSize: '0.82rem', borderRadius: '4px' },
      },
    ],
    note: { text: '' },
  };
}

export function defaultCertsSectionContent(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'certs_hero':
      return defaultCertsHeroContent();
    case 'certs_gallery':
      return defaultCertsGalleryContent();
    case 'certs_cta':
      return defaultCertsCtaContent();
    default:
      return null;
  }
}

/**
 * Fill any missing top-level keys from defaults (one level of object merge) and normalize arrays
 * so partially saved or hand-edited JSON never crashes the renderer / editor.
 */
export function withCertsDefaults<T extends object>(type: CertsSectionType, raw: unknown): T {
  const base = defaultCertsSectionContent(type) as Record<string, unknown>;
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
  if (type === 'certs_hero') return withContactDefaults<T>('contact_hero', merged);

  const out = merged;
  const arr = <V>(v: unknown): V[] => (Array.isArray(v) ? (v as V[]).filter((x) => x && typeof x === 'object') : []);
  const bgOf = (v: unknown): LegacyBgMedia => {
    const bg = (v && typeof v === 'object' ? v : {}) as LegacyBgMedia;
    return { ...bg, items: arr<LifeMediaItem>(bg.items), mobileItems: arr<LifeMediaItem>(bg.mobileItems) };
  };
  out.background = bgOf(out.background);
  if (type === 'certs_gallery') {
    out.items = arr<CertsItem>(out.items).map((it) => ({ ...it, name: typeof it.name === 'string' ? it.name : String(it.name ?? ''), media: arr<LifeMediaItem>(it.media) }));
    out.layout = out.layout === 'grid' ? 'grid' : 'marquee';
    const bi = out.badgeIcon;
    out.badgeIcon = bi && typeof bi === 'object' ? bi : { hidden: true, svg: typeof bi === 'string' ? bi : '' };
    out.card = out.card && typeof out.card === 'object' ? out.card : {};
  }
  if (type === 'certs_cta') {
    out.ctas = arr<CtaButton>(out.ctas);
  }
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out as T;
}

/* ------------------------------------------------------------------ */
/* Upgrade: old minimal certifications sections → certs_* (keeps content) */
/* ------------------------------------------------------------------ */

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const s = (v: unknown) => str(v).trim();

function upgradeHero(o: Raw): CertsHeroContent {
  const d = defaultCertsHeroContent();
  const image = s(o.image);
  const imageMobile = s(o.imageMobile);
  const tagline = s(o.tagline);
  return {
    ...d,
    heroHeight: normalizeHeroHeight(o.heroHeight),
    background: {
      ...d.background,
      items: image ? [{ src: image, title: '' }] : [],
      mobileItems: imageMobile ? [{ src: imageMobile, title: '' }] : [],
      overlay: image ? 'linear-gradient(160deg,rgba(10,22,40,0.88),rgba(15,31,61,0.78))' : d.background.overlay,
    },
    section: image ? { ...d.section, pattern: 'grid', patternColor: 'rgba(255,255,255,0.04)' } : d.section,
    eyebrow: { ...d.eyebrow, text: s(o.eyebrow) || 'CERTIFICATIONS' },
    title: { ...d.title, text: str(o.title) },
    leadEmphasis: { ...d.leadEmphasis, text: str(o.sub) },
    lead: { ...d.lead, text: str(o.lead) || str(o.body) },
    pills: { ...d.pills, items: tagline ? [{ label: tagline }] : [] },
  };
}

/** Same rules as the old marquee's normalizeCertItems: strings, or objects with name/title + image/img/src. */
function upgradeGallery(o: Raw): CertsGalleryContent {
  const d = defaultCertsGalleryContent();
  const raw = Array.isArray(o.items) ? o.items : null;
  const items = raw
    ? raw
        .map((entry): CertsItem | null => {
          if (typeof entry === 'string') return entry.trim() ? certItem(entry.trim()) : null;
          if (entry && typeof entry === 'object') {
            const e = entry as Raw;
            const name = s(e.name || e.title);
            if (!name) return null;
            return certItem(name, s(e.image || e.img || e.src) || undefined);
          }
          return null;
        })
        .filter((x): x is CertsItem => Boolean(x))
    : d.items;
  return {
    ...d,
    items,
    marquee: { ...d.marquee, startFrom: o.startFrom === 'right' ? 'right' : 'left' },
  };
}

function upgradeCta(o: Raw): CertsCtaContent {
  const d = defaultCertsCtaContent();
  const base = d.ctas[0];
  return {
    ...d,
    ctas: [{ ...base, label: s(o.cta) || 'Get in Touch', href: s(o.ctaHref) || '/contact' }],
  };
}

/** Convert an old minimal certifications section into its configurable replacement, keeping all content. */
export function upgradeCertsSection(oldType: string, content: unknown): { type: CertsSectionType; content: Record<string, unknown> } | null {
  const next = CERTS_UPGRADE_MAP[oldType];
  if (!next) return null;
  const o = (content && typeof content === 'object' ? content : {}) as Raw;
  const map: Record<CertsSectionType, (o: Raw) => object> = {
    certs_hero: upgradeHero,
    certs_gallery: upgradeGallery,
    certs_cta: upgradeCta,
  };
  return { type: next, content: map[next](o) as Record<string, unknown> };
}

export const CERTS_SLUG = 'certifications';

export const CERTIFICATIONS_SEED_SECTIONS_V2: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'certs_hero', section_key: 'cert-hero', title: 'Certifications hero', content_json: defaultCertsHeroContent() },
  { type: 'certs_gallery', section_key: 'oem-marquee', title: 'Certificates gallery (marquee)', content_json: defaultCertsGalleryContent() },
  { type: 'certs_cta', section_key: 'cert-cta', title: 'Certifications CTA', content_json: defaultCertsCtaContent() },
];
