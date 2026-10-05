import {
  ABOUT_TYPOGRAPHY_VERSION,
  type CtaButton,
  type ElementStyle,
  type EyebrowEl,
  type LinkItem,
  type PillsEl,
  type SectionBox,
  type TextEl,
} from '@/lib/about-sections';
import type { HeroHeight, HeroVAlign } from '@/lib/hero-height';
import type { HeroPlacement } from '@/lib/hero-placement';
import type { LegacyBgMedia, LegacySectionHeader } from '@/lib/legacy-sections';
import type { LifeColumns, LifeHighlight } from '@/lib/life-sections';
import { defaultCertsCtaContent, type CertsCtaContent } from '@/lib/certifications-sections';

/**
 * Blog hub section family (page /blog):
 * blog_hero, blog_featured, blog_topics, blog_feed, blog_cta.
 *
 * Posts live in resource_posts (Admin → Resources / Blog). Public URLs are /blog and /blog/[slug].
 */

export const BLOG_SECTION_TYPES = ['blog_hero', 'blog_featured', 'blog_topics', 'blog_feed', 'blog_cta'] as const;
export type BlogSectionType = (typeof BLOG_SECTION_TYPES)[number];

export function isBlogSectionType(type: string): type is BlogSectionType {
  return (BLOG_SECTION_TYPES as readonly string[]).includes(type);
}

export const BLOG_SLUG = 'blog';
/** Canonical public base for articles (resource_posts). */
export const BLOG_PUBLIC_BASE = '/blog';

export type BlogHeroContent = {
  section: SectionBox;
  heroHeight?: HeroHeight;
  placement?: HeroPlacement;
  background: LegacyBgMedia;
  entrance?: boolean;
  align?: 'left' | 'center';
  vAlign?: HeroVAlign;
  contentMaxWidth?: string;
  scrollBar?: { hidden?: boolean; gradient?: string };
  breadcrumb: {
    hidden?: boolean;
    items: LinkItem[];
    separator: string;
    style?: ElementStyle;
    hoverColor?: string;
    currentColor?: string;
  };
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  lead: TextEl;
  pills: PillsEl;
  ctas: CtaButton[];
  /** Floating mono readout under the hero copy */
  signal?: { hidden?: boolean; value: string; label: string };
};

export type BlogFeaturedContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  /** auto = latest published; manual = only listed slugs (in order) */
  mode: 'auto' | 'manual';
  slugs: string[];
  limit: number;
  columns: LifeColumns;
  gap?: string;
  showExcerpt?: boolean;
  showMeta?: boolean;
  ctaLabel?: string;
};

export type BlogTopicsContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  /** empty = derive from published post tags */
  topics: string[];
  allLabel?: string;
  align?: 'left' | 'center';
};

export type BlogFeedContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  columns: LifeColumns;
  gap?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  showExcerpt?: boolean;
  showMeta?: boolean;
  ctaLabel?: string;
  emptyTitle?: string;
  emptyBody?: string;
  limit?: number;
};

export type BlogCtaContent = CertsCtaContent;

function txt(text: string, extra: Partial<TextEl> = {}): TextEl {
  return { text, ...extra };
}

function eyebrow(text: string, color = 'var(--cyan)'): EyebrowEl {
  return { text, color };
}

export function defaultBlogHeroContent(): BlogHeroContent {
  return {
    section: {
      tone: 'dark',
      bgColor: 'var(--navy-950)',
      paddingTop: '8.5rem',
      paddingBottom: '4.5rem',
      paddingTopMobile: '6.75rem',
      paddingBottomMobile: '3rem',
    },
    heroHeight: 'screen',
    placement: { mode: 'full' },
    background: {
      hidden: false,
      items: [
        {
          src: '/assets/images/engineers-reviewing-electrical-design-dr.jpg',
          title: 'Engineering desk',
        },
      ],
      intervalSeconds: 8,
      motion: 'kenburns',
      overlay: 'linear-gradient(105deg, rgba(10,22,40,0.92) 0%, rgba(10,22,40,0.72) 48%, rgba(10,22,40,0.45) 100%)',
    },
    entrance: true,
    align: 'left',
    vAlign: 'center',
    contentMaxWidth: '720px',
    scrollBar: { hidden: false, gradient: 'linear-gradient(90deg, var(--cyan), var(--orange))' },
    breadcrumb: {
      hidden: false,
      items: [
        { label: 'Home', href: '/' },
        { label: 'Blog' },
      ],
      separator: '/',
    },
    eyebrow: eyebrow('ENGINEERING BRIEFINGS'),
    title: txt('Field notes from the power desk'),
    highlight: { text: 'power desk', color: 'var(--cyan)' },
    lead: txt(
      'Practical UPS, solar, BESS and continuity guidance from Zigma engineers — sized for commercial and industrial sites across India.'
    ),
    pills: {
      hidden: false,
      items: [{ label: 'UPS' }, { label: 'Solar' }, { label: 'BESS' }, { label: 'AMC' }],
    },
    ctas: [
      { label: 'Browse articles', href: '#blog-feed', variant: 'primary' },
      { label: 'Talk to an engineer', href: '/contact?consult=1', variant: 'ghost' },
    ],
    signal: { hidden: false, value: 'LIVE', label: 'Published engineering guides' },
  };
}

export function defaultBlogFeaturedContent(): BlogFeaturedContent {
  return {
    section: {
      tone: 'light',
      bgColor: '#F4F7FB',
      paddingTop: '3.5rem',
      paddingBottom: '1.5rem',
      paddingTopMobile: '2.75rem',
      paddingBottomMobile: '1.25rem',
    },
    header: {
      eyebrow: eyebrow('FEATURED', 'var(--orange)'),
      title: txt('Start here'),
      subtitle: txt('Flagship briefs our engineers send to facilities and EPCs before a site walk.'),
      align: 'left',
      maxWidth: '640px',
      marginBottom: '1.75rem',
    },
    mode: 'auto',
    slugs: [],
    limit: 2,
    columns: { desktop: 2, tablet: 2, mobile: 1 },
    gap: '1.25rem',
    showExcerpt: true,
    showMeta: true,
    ctaLabel: 'Read briefing →',
  };
}

export function defaultBlogTopicsContent(): BlogTopicsContent {
  return {
    section: {
      tone: 'light',
      bgColor: '#FFFFFF',
      paddingTop: '1.25rem',
      paddingBottom: '0.5rem',
      paddingTopMobile: '1rem',
      paddingBottomMobile: '0.35rem',
    },
    header: {
      eyebrow: { text: '', hidden: true },
      title: { text: '', hidden: true },
      subtitle: { text: '', hidden: true },
      align: 'left',
    },
    topics: [],
    allLabel: 'All topics',
    align: 'left',
  };
}

export function defaultBlogFeedContent(): BlogFeedContent {
  return {
    section: {
      tone: 'light',
      bgColor: '#FFFFFF',
      paddingTop: '1.5rem',
      paddingBottom: '4.5rem',
      paddingTopMobile: '1.25rem',
      paddingBottomMobile: '3.25rem',
    },
    header: {
      eyebrow: eyebrow('ARCHIVE', 'var(--cyan)'),
      title: txt('All briefings'),
      subtitle: txt('Filter by topic or search titles — every article is editable in Admin → Resources / Blog.'),
      align: 'left',
      maxWidth: '720px',
      marginBottom: '1.75rem',
    },
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    gap: '1.25rem',
    showSearch: true,
    searchPlaceholder: 'Search titles, excerpts, tags…',
    showExcerpt: true,
    showMeta: true,
    ctaLabel: 'Read →',
    emptyTitle: 'No articles in this view',
    emptyBody: 'Clear the topic filter or publish a post in Admin → Resources / Blog.',
    limit: 0,
  };
}

export function defaultBlogCtaContent(): BlogCtaContent {
  const d = defaultCertsCtaContent();
  return {
    ...d,
    section: {
      ...d.section,
      tone: 'dark',
      bgColor: 'var(--navy-900)',
      paddingTop: '4.5rem',
      paddingBottom: '4.5rem',
      paddingTopMobile: '3.25rem',
      paddingBottomMobile: '3.25rem',
    },
    eyebrow: eyebrow('NEXT STEP', 'var(--orange)'),
    title: txt('Need this implemented on site?'),
    body: txt('Zigma teams size, install and maintain UPS, solar and storage with documented handover — not generic advice.'),
    ctas: [
      { label: 'Request consultation →', href: '/contact?consult=1', variant: 'primary' },
      { label: 'Solution finder', href: '/tools/solution-finder', variant: 'ghost' },
    ],
  };
}

export function defaultBlogSectionContent(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'blog_hero':
      return defaultBlogHeroContent();
    case 'blog_featured':
      return defaultBlogFeaturedContent();
    case 'blog_topics':
      return defaultBlogTopicsContent();
    case 'blog_feed':
      return defaultBlogFeedContent();
    case 'blog_cta':
      return defaultBlogCtaContent();
    default:
      return null;
  }
}

export function withBlogDefaults<T extends object>(type: BlogSectionType, raw: unknown): T {
  const base = (defaultBlogSectionContent(type) || {}) as Record<string, unknown>;
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined || v === null) continue;
    const b = base[k];
    if (b && typeof b === 'object' && !Array.isArray(b) && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = { ...(b as object), ...(v as object) };
    } else {
      out[k] = v;
    }
  }
  const arr = <V>(v: unknown): V[] => (Array.isArray(v) ? (v as V[]).filter((x) => x && typeof x === 'object') : []);
  const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  if (type === 'blog_hero') {
    const bc = out.breadcrumb as BlogHeroContent['breadcrumb'];
    out.breadcrumb = { ...((base.breadcrumb as object) || {}), ...bc, items: Array.isArray(bc?.items) ? bc.items : [] };
    out.pills = { ...((base.pills as object) || {}), ...(out.pills as object), items: arr((out.pills as PillsEl)?.items) };
    out.ctas = arr<CtaButton>(out.ctas);
  }
  if (type === 'blog_featured') {
    out.slugs = strs(out.slugs);
    out.columns = { ...((base.columns as object) || {}), ...(out.columns as object) };
  }
  if (type === 'blog_topics') out.topics = strs(out.topics);
  if (type === 'blog_feed') out.columns = { ...((base.columns as object) || {}), ...(out.columns as object) };
  if (type === 'blog_cta') out.ctas = arr<CtaButton>(out.ctas);
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out as T;
}

export const BLOG_SEED_SECTIONS: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'blog_hero', section_key: 'top', title: 'Blog hero', content_json: defaultBlogHeroContent() },
  { type: 'blog_featured', section_key: 'featured', title: 'Featured articles', content_json: defaultBlogFeaturedContent() },
  { type: 'blog_topics', section_key: 'topics', title: 'Topic filter', content_json: defaultBlogTopicsContent() },
  { type: 'blog_feed', section_key: 'blog-feed', title: 'Article feed', content_json: defaultBlogFeedContent() },
  { type: 'blog_cta', section_key: 'contact', title: 'CTA band', content_json: defaultBlogCtaContent() },
];
