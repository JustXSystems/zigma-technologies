/**
 * Blog design system: the hub templates (/blog), article templates (/blog/[slug]), post formats and the
 * blog-wide settings stored in theme_settings.blog (Admin → Blog → Design). Safe to import on the client.
 */
import type { CSSProperties } from 'react';

export const BLOG_HUB_TEMPLATES = [
  {
    id: 'classic',
    label: 'Classic',
    summary: 'Photo hero, spotlight lead story and an even card grid.',
    bestFor: 'A balanced default for any mix of posts.',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    summary: 'Magazine masthead on warm paper, big lead story and a numbered reading list.',
    bestFor: 'Thought leadership and long reads.',
  },
  {
    id: 'bento',
    label: 'Bento',
    summary: 'Dark, glowing asymmetric tiles with image-led cards — the futuristic look.',
    bestFor: 'Visual posts, launches and product stories.',
  },
  {
    id: 'signal',
    label: 'Signal',
    summary: 'Blueprint knowledge base: numbered briefs and a dense, scannable index.',
    bestFor: 'Technical guides, checklists and docs-style libraries.',
  },
] as const;

export type BlogHubTemplate = (typeof BLOG_HUB_TEMPLATES)[number]['id'];
/** A section's own design; empty = follow the blog template. */
export type BlogHubVariant = '' | BlogHubTemplate;

export const BLOG_ARTICLE_TEMPLATES = [
  {
    id: 'technical',
    label: 'Technical brief',
    summary: 'Dark spec header, key takeaways, and a sticky contents rail that tracks reading progress.',
    bestFor: 'Guides, checklists and engineering explainers.',
  },
  {
    id: 'focus',
    label: 'Focus',
    summary: 'One calm, centred reading column with a wide cover and a floating contents button.',
    bestFor: 'Opinion, news and shorter reads.',
  },
  {
    id: 'feature',
    label: 'Immersive feature',
    summary: 'Full-screen cover with the title over it, drop cap and large pull quotes.',
    bestFor: 'Flagship stories and case studies with strong photos.',
  },
] as const;

export type BlogArticleTemplate = (typeof BLOG_ARTICLE_TEMPLATES)[number]['id'];

export const BLOG_POST_FORMATS = [
  { value: 'article', label: 'Article' },
  { value: 'guide', label: 'Guide' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'brief', label: 'Technical brief' },
  { value: 'case-study', label: 'Case study' },
  { value: 'news', label: 'News' },
] as const;

export type BlogPostFormat = (typeof BLOG_POST_FORMATS)[number]['value'];

export function isHubTemplate(v: unknown): v is BlogHubTemplate {
  return BLOG_HUB_TEMPLATES.some((t) => t.id === v);
}

export function isArticleTemplate(v: unknown): v is BlogArticleTemplate {
  return BLOG_ARTICLE_TEMPLATES.some((t) => t.id === v);
}

/** The label shown on cards and article headers; posts without a format borrow one from their tags. */
export function postFormatLabel(format: string | null | undefined, tags: string[] = []) {
  const known = BLOG_POST_FORMATS.find((f) => f.value === format);
  if (known) return known.label;
  if (tags.some((t) => /checklist/i.test(t))) return 'Checklist';
  if (tags.some((t) => /guide/i.test(t))) return 'Guide';
  if (tags.some((t) => /case stud/i.test(t))) return 'Case study';
  return 'Article';
}

/** Typography and colour of the article body; applied as classes and CSS variables on `.blg-article`. */
export type BlogArticleStyle = {
  /** `#rrggbb`; empty = the brand blue */
  accent: string;
  width: 'narrow' | 'normal' | 'wide';
  textSize: 'small' | 'normal' | 'large';
  headingFont: 'display' | 'serif';
  /** auto = Immersive feature layout only */
  dropCap: 'auto' | 'on' | 'off';
};

export const ARTICLE_STYLE_OPTIONS = {
  width: [
    { value: 'narrow', label: 'Narrow (≈ 60 characters a line)' },
    { value: 'normal', label: 'Comfortable (≈ 70)' },
    { value: 'wide', label: 'Wide (≈ 85)' },
  ],
  textSize: [
    { value: 'small', label: 'Compact' },
    { value: 'normal', label: 'Standard' },
    { value: 'large', label: 'Large' },
  ],
  headingFont: [
    { value: 'display', label: 'Modern sans (site headings)' },
    { value: 'serif', label: 'Editorial serif' },
  ],
  dropCap: [
    { value: 'auto', label: 'Immersive feature only' },
    { value: 'on', label: 'Every layout' },
    { value: 'off', label: 'Never' },
  ],
} as const;

export const ACCENT_SWATCHES = ['#0284A8', '#0F766E', '#4F46E5', '#7C3AED', '#C2410C', '#B91C1C', '#0A1628'] as const;

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
}

type ArticlePartKey = 'progressBar' | 'toc' | 'keyPoints' | 'author' | 'share' | 'prevNext' | 'sideCta' | 'ctaBand' | 'related';

/** One post's departures from the blog-wide design (resource_posts.display_json); missing keys follow the blog. */
export type PostDisplay = Partial<Record<ArticlePartKey, boolean>> & {
  accent?: string;
  width?: BlogArticleStyle['width'];
  dropCap?: boolean;
};

export const POST_DISPLAY_PARTS: ReadonlyArray<{ key: ArticlePartKey; label: string }> = [
  { key: 'toc', label: 'Contents' },
  { key: 'keyPoints', label: 'Key takeaways' },
  { key: 'progressBar', label: 'Progress bar' },
  { key: 'author', label: 'Author' },
  { key: 'share', label: 'Share buttons' },
  { key: 'prevNext', label: 'Previous / next' },
  { key: 'related', label: 'Related articles' },
  { key: 'sideCta', label: 'Side CTA card' },
  { key: 'ctaBand', label: 'CTA band' },
];

/** Keeps only known keys with valid values, so stored JSON can never break the article page. */
export function cleanPostDisplay(raw: unknown): PostDisplay {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: PostDisplay = {};
  for (const { key } of POST_DISPLAY_PARTS) if (typeof src[key] === 'boolean') out[key] = src[key] as boolean;
  if (isHexColor(src.accent)) out.accent = src.accent;
  if (ARTICLE_STYLE_OPTIONS.width.some((w) => w.value === src.width)) out.width = src.width as BlogArticleStyle['width'];
  if (typeof src.dropCap === 'boolean') out.dropCap = src.dropCap;
  return out;
}

export type BlogSettings = {
  hubTemplate: BlogHubTemplate;
  articleTemplate: BlogArticleTemplate;
  style: BlogArticleStyle;
  /** Which parts every article shows */
  article: {
    progressBar: boolean;
    toc: boolean;
    keyPoints: boolean;
    author: boolean;
    share: boolean;
    prevNext: boolean;
    /** Related articles at the end; 0 = hidden */
    related: number;
    sideCta: boolean;
    ctaBand: boolean;
  };
  labels: {
    keyPoints: string;
    toc: string;
    related: string;
    relatedLead: string;
  };
  /** Byline for posts without their own author */
  author: { name: string; role: string; avatar: string; bio: string };
  /** Side card (technical template) and end-of-article band */
  cta: {
    eyebrow: string;
    title: string;
    body: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
};

export const DEFAULT_BLOG_SETTINGS: BlogSettings = {
  hubTemplate: 'classic',
  articleTemplate: 'technical',
  style: { accent: '', width: 'normal', textSize: 'normal', headingFont: 'display', dropCap: 'auto' },
  article: {
    progressBar: true,
    toc: true,
    keyPoints: true,
    author: true,
    share: true,
    prevNext: true,
    related: 3,
    sideCta: true,
    ctaBand: true,
  },
  labels: {
    keyPoints: 'Key takeaways',
    toc: 'On this page',
    related: 'Keep reading',
    relatedLead: 'More practical notes from the Zigma engineering desk.',
  },
  author: {
    name: 'Zigma engineering team',
    role: 'Power continuity & energy engineers',
    avatar: '',
    bio: 'The engineers who size, install and maintain UPS, solar and storage systems for Zigma clients across India.',
  },
  cta: {
    eyebrow: 'Engineering support',
    title: 'Need this implemented on site?',
    body: 'Our engineers size, install and maintain UPS, solar and storage with documented handover — not generic advice.',
    primaryLabel: 'Talk to an engineer →',
    primaryHref: '/contact?consult=1',
    secondaryLabel: 'All articles',
    secondaryHref: '/blog',
  },
};

/** Saved settings over the defaults, one level deep, with unknown template ids dropped. */
export function mergeBlogSettings(raw: unknown): BlogSettings {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<BlogSettings>;
  const d = DEFAULT_BLOG_SETTINGS;
  const article = { ...d.article, ...(src.article || {}) };
  article.related = Math.max(0, Math.min(6, Math.round(Number(article.related) || 0)));
  const rawStyle = (src.style || {}) as Partial<BlogArticleStyle>;
  const pick = <K extends keyof typeof ARTICLE_STYLE_OPTIONS>(key: K): BlogArticleStyle[K] =>
    (ARTICLE_STYLE_OPTIONS[key].some((o) => o.value === rawStyle[key]) ? rawStyle[key] : d.style[key]) as BlogArticleStyle[K];
  return {
    hubTemplate: isHubTemplate(src.hubTemplate) ? src.hubTemplate : d.hubTemplate,
    articleTemplate: isArticleTemplate(src.articleTemplate) ? src.articleTemplate : d.articleTemplate,
    style: {
      accent: isHexColor(rawStyle.accent) ? rawStyle.accent : '',
      width: pick('width'),
      textSize: pick('textSize'),
      headingFont: pick('headingFont'),
      dropCap: pick('dropCap'),
    },
    article,
    labels: { ...d.labels, ...(src.labels || {}) },
    author: { ...d.author, ...(src.author || {}) },
    cta: { ...d.cta, ...(src.cta || {}) },
  };
}

export function resolveHubVariant(variant: unknown, settings: Pick<BlogSettings, 'hubTemplate'>): BlogHubTemplate {
  return isHubTemplate(variant) ? variant : settings.hubTemplate;
}

export function resolveArticleTemplate(postTemplate: unknown, settings: Pick<BlogSettings, 'articleTemplate'>): BlogArticleTemplate {
  return isArticleTemplate(postTemplate) ? postTemplate : settings.articleTemplate;
}

/** Blog settings as one post sees them, with its display overrides applied. */
export function settingsForPost(settings: BlogSettings, display: PostDisplay | null | undefined): BlogSettings {
  if (!display) return settings;
  const d = cleanPostDisplay(display);
  const article = { ...settings.article };
  for (const { key } of POST_DISPLAY_PARTS) {
    if (d[key] === undefined) continue;
    if (key === 'related') article.related = d.related ? article.related || DEFAULT_BLOG_SETTINGS.article.related : 0;
    else article[key] = d[key];
  }
  const style = {
    ...settings.style,
    ...(d.accent ? { accent: d.accent } : {}),
    ...(d.width ? { width: d.width } : {}),
    ...(d.dropCap !== undefined ? { dropCap: d.dropCap ? ('on' as const) : ('off' as const) } : {}),
  };
  return { ...settings, article, style };
}

/** Classes and CSS variables that put a style on `.blg-article` (public page and the admin editor alike). */
export function articleStyleAttrs(style: BlogArticleStyle) {
  const className = [
    style.width !== 'normal' ? `blg-w-${style.width}` : '',
    style.textSize !== 'normal' ? `blg-s-${style.textSize}` : '',
    style.headingFont === 'serif' ? 'blg-h-serif' : '',
    style.dropCap === 'on' ? 'blg-dropcap' : style.dropCap === 'off' ? 'blg-no-dropcap' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const css = isHexColor(style.accent) ? ({ '--blg-accent': style.accent } as CSSProperties) : undefined;
  return { className, style: css };
}
