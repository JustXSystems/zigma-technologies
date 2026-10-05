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
import type { LegacyBgMedia, LegacyCardStyle, LegacySectionHeader } from '@/lib/legacy-sections';
import type { LifeColumns, LifeHighlight } from '@/lib/life-sections';

/**
 * Blog hub section family (page /blog):
 * blog_hero, blog_featured, blog_topics, blog_feed, blog_cta.
 *
 * Articles are the Resources / Blog posts (resource_posts table, Admin → Resources / Blog) and publish at
 * /blog/[slug]; /resources and /resources/[slug] redirect here. The hub layout itself is a CMS page
 * (Admin → Pages → Blog). Empty style fields fall back to the scoped `.blg-*` CSS defaults.
 */

export const BLOG_SECTION_TYPES = ['blog_hero', 'blog_featured', 'blog_topics', 'blog_feed', 'blog_cta'] as const;
export type BlogSectionType = (typeof BLOG_SECTION_TYPES)[number];

export function isBlogSectionType(type: string): type is BlogSectionType {
  return (BLOG_SECTION_TYPES as readonly string[]).includes(type);
}

export const BLOG_SLUG = 'blog';
export const BLOG_BASE_PATH = '/blog';

export function blogPostPath(slug: string) {
  return `${BLOG_BASE_PATH}/${slug}`;
}

export function blogTagPath(tag: string) {
  return `${BLOG_BASE_PATH}?tag=${encodeURIComponent(tag)}`;
}

/** What a hub card needs from a post (the full body never reaches the browser). */
export type BlogCardPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  tags: string[];
  publishedAt: string | null;
  readMinutes: number;
};

export const BLOG_FALLBACK_COVER = '/assets/images/engineers-reviewing-electrical-design-dr.jpg';

/** Posts shown by a Featured section; the feed uses the same pick to avoid repeating them. */
export function pickFeaturedPosts(posts: BlogCardPost[], c: Pick<BlogFeaturedContent, 'mode' | 'slugs' | 'limit'>): BlogCardPost[] {
  if (c.mode === 'manual') {
    const bySlug = new Map(posts.map((p) => [p.slug, p]));
    return (c.slugs || []).map((s) => bySlug.get(s.trim())).filter((p): p is BlogCardPost => Boolean(p));
  }
  return posts.slice(0, Math.max(1, Number(c.limit) || 3));
}

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

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
  /** Live readout chips under the copy (article / topic counts come from published posts) */
  readout: { hidden?: boolean; articlesLabel: string; topicsLabel: string; latestLabel: string };
};

/** Shared card look for featured + feed grids. */
export type BlogCardOptions = {
  showExcerpt?: boolean;
  showMeta?: boolean;
  showTag?: boolean;
  ctaLabel?: string;
  /** Image height in the card */
  mediaHeight?: string;
  cardStyle?: LegacyCardStyle;
};

export type BlogFeaturedContent = BlogCardOptions & {
  section: SectionBox;
  header: LegacySectionHeader;
  /** latest = newest published posts; manual = the slugs below, in order */
  mode: 'latest' | 'manual';
  slugs: string[];
  limit: number;
  /** spotlight = one large lead card + stacked side cards; grid = equal cards */
  layout: 'spotlight' | 'grid';
  columns: LifeColumns;
  gap?: string;
};

export type BlogTopicsContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  /** Topics in this order; empty = every tag used by published posts */
  topics: string[];
  allLabel: string;
  showCounts?: boolean;
  align?: 'left' | 'center';
  sticky?: boolean;
};

export type BlogFeedContent = BlogCardOptions & {
  section: SectionBox;
  header: LegacySectionHeader;
  columns: LifeColumns;
  gap?: string;
  /** Skip posts already shown in the Featured section */
  excludeFeatured?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  /** Cards per page; extra posts load with the "Load more" button */
  pageSize: number;
  loadMoreLabel?: string;
  emptyTitle: string;
  emptyBody: string;
};

export type BlogCtaContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  align?: 'left' | 'center';
  maxWidth?: string;
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  body: TextEl;
  ctas: CtaButton[];
};

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

const NO_BG: LegacyBgMedia = { hidden: false, items: [], mobileItems: [], intervalSeconds: 6, motion: 'none', overlay: '' };

export function defaultBlogHeroContent(): BlogHeroContent {
  return {
    section: { tone: 'dark', bgColor: 'var(--navy-950)', pattern: 'grid-fade' },
    heroHeight: 'auto-70',
    background: {
      hidden: false,
      items: [{ src: '/assets/images/engineers-reviewing-electrical-design-dr.jpg', title: 'Zigma engineering desk' }],
      mobileItems: [],
      intervalSeconds: 7,
      motion: 'kenburns',
      overlay: 'linear-gradient(105deg, rgba(10,22,40,0.94) 0%, rgba(10,22,40,0.78) 50%, rgba(10,22,40,0.5) 100%)',
    },
    entrance: true,
    align: 'left',
    contentMaxWidth: '760px',
    scrollBar: { hidden: false },
    breadcrumb: { items: [{ label: 'Home', href: '/' }, { label: 'Blog' }], separator: '/' },
    eyebrow: { text: 'ENGINEERING BLOG', line: true, style: { color: 'var(--cyan)' } },
    title: { text: 'Field notes from the power engineering desk' },
    highlight: { text: 'power engineering desk', animate: true },
    lead: {
      text: 'Practical guidance on UPS, solar, battery storage and power continuity from the engineers who size, install and maintain them across India.',
    },
    pills: { items: [{ label: 'UPS' }, { label: 'Solar' }, { label: 'BESS' }, { label: 'AMC' }] },
    ctas: [
      { label: 'Browse articles ↓', href: '#blog-feed', variant: 'primary' },
      { label: 'Talk to an engineer', href: '/contact?consult=1', variant: 'ghost' },
    ],
    readout: { hidden: false, articlesLabel: 'Articles', topicsLabel: 'Topics', latestLabel: 'Latest' },
  };
}

export function defaultBlogFeaturedContent(): BlogFeaturedContent {
  return {
    section: { tone: 'light', bgColor: '#F4F7FB' },
    header: {
      eyebrow: { text: 'FEATURED', line: true, style: { color: 'var(--orange)' } },
      title: { text: 'Start with these' },
      subtitle: { text: 'The briefs our engineers share with facility teams before a site walk.' },
      align: 'left',
      maxWidth: '680px',
    },
    mode: 'latest',
    slugs: [],
    limit: 3,
    layout: 'spotlight',
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    showExcerpt: true,
    showMeta: true,
    showTag: true,
    ctaLabel: 'Read article →',
  };
}

export function defaultBlogTopicsContent(): BlogTopicsContent {
  return {
    section: { tone: 'light', bgColor: '#FFFFFF', borderBottom: '1px solid rgba(10,22,40,0.08)' },
    header: { hidden: true, eyebrow: { text: '' }, title: { text: '' }, subtitle: { text: '' } },
    topics: [],
    allLabel: 'All topics',
    showCounts: true,
    align: 'left',
    sticky: true,
  };
}

export function defaultBlogFeedContent(): BlogFeedContent {
  return {
    section: { tone: 'light', bgColor: '#FFFFFF' },
    header: {
      eyebrow: { text: 'ALL ARTICLES', line: true, style: { color: 'var(--cyan)' } },
      title: { text: 'Latest from the blog' },
      subtitle: { text: 'Search or filter by topic to find what you need.' },
      align: 'left',
      maxWidth: '680px',
    },
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    excludeFeatured: true,
    showSearch: true,
    searchPlaceholder: 'Search articles…',
    pageSize: 9,
    loadMoreLabel: 'Load more articles',
    showExcerpt: true,
    showMeta: true,
    showTag: true,
    ctaLabel: 'Read →',
    emptyTitle: 'No articles found',
    emptyBody: 'Try another topic or search term.',
  };
}

export function defaultBlogCtaContent(): BlogCtaContent {
  return {
    section: { tone: 'dark', bgColor: 'var(--navy-900)', pattern: 'grid-fade' },
    background: NO_BG,
    align: 'center',
    maxWidth: '760px',
    eyebrow: { text: 'NEED IT ON SITE?', line: true, style: { color: 'var(--orange)' } },
    title: { text: 'Turn the guide into a working system' },
    highlight: { text: 'working system', animate: false },
    body: {
      text: 'Our engineers size, install and maintain UPS, solar and storage with documented handover — not generic advice.',
    },
    ctas: [
      { label: 'Request a consultation →', href: '/contact?consult=1', variant: 'primary' },
      { label: 'Call our team', href: 'tel:{{phone}}', variant: 'ghost' },
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

/**
 * Fill any missing top-level keys from defaults (one level of object merge) and normalize arrays
 * so partially saved or hand-edited JSON never crashes the renderer / editor.
 */
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
  const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : []);
  const bg = (v: unknown): LegacyBgMedia => {
    const m = (v && typeof v === 'object' ? v : {}) as LegacyBgMedia;
    return { ...m, items: arr(m.items), mobileItems: arr(m.mobileItems) };
  };
  if (type === 'blog_hero') {
    out.background = bg(out.background);
    const bc = out.breadcrumb as BlogHeroContent['breadcrumb'];
    out.breadcrumb = { ...bc, items: arr<LinkItem>(bc?.items) };
    const pills = out.pills as PillsEl;
    out.pills = { ...pills, items: arr<LinkItem>(pills?.items) };
    out.ctas = arr<CtaButton>(out.ctas);
  }
  if (type === 'blog_featured') out.slugs = strs(out.slugs);
  if (type === 'blog_topics') out.topics = strs(out.topics);
  if (type === 'blog_cta') {
    out.background = bg(out.background);
    out.ctas = arr<CtaButton>(out.ctas);
  }
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
  { type: 'blog_topics', section_key: 'topics', title: 'Topic filter bar', content_json: defaultBlogTopicsContent() },
  { type: 'blog_feed', section_key: 'blog-feed', title: 'Article feed', content_json: defaultBlogFeedContent() },
  { type: 'blog_cta', section_key: 'contact', title: 'CTA band', content_json: defaultBlogCtaContent() },
];
