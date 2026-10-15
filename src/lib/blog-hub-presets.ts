import type { CtaButton, EyebrowEl, SectionBox } from '@/lib/about-sections';
import type { BlogHubTemplate } from '@/lib/blog-design';
import { defaultBlogHeroContent, isBlogSectionType, type BlogSectionType } from '@/lib/blog-sections';
import type { LegacyBgMedia } from '@/lib/legacy-sections';

/**
 * The colour scheme each hub template is designed around. Applying one rewrites only the colour side of the
 * /blog sections (background, tone, pattern, eyebrow colour, button style) and keeps all copy and spacing.
 */
type Scheme = {
  boxes: Record<BlogSectionType, SectionBox>;
  /** Show the hero photo slideshow */
  heroPhoto: boolean;
  eyebrow: { light: string; dark: string };
};

const LIGHT_EYEBROW = 'var(--orange-dim,#c9540f)';
const PAPER_LINE = '1px solid rgba(10,22,40,0.1)';

const SCHEMES: Record<BlogHubTemplate, Scheme> = {
  classic: {
    heroPhoto: true,
    eyebrow: { light: 'var(--orange)', dark: 'var(--cyan)' },
    boxes: {
      blog_hero: { tone: 'dark', bgColor: 'var(--navy-950)', pattern: 'grid-fade' },
      blog_featured: { tone: 'light', bgColor: '#F4F7FB', pattern: 'none' },
      blog_topics: { tone: 'light', bgColor: '#FFFFFF', pattern: 'none', borderBottom: '1px solid rgba(10,22,40,0.08)' },
      blog_feed: { tone: 'light', bgColor: '#FFFFFF', pattern: 'none' },
      blog_cta: { tone: 'dark', bgColor: 'var(--navy-900)', pattern: 'grid-fade' },
    },
  },
  editorial: {
    heroPhoto: false,
    eyebrow: { light: LIGHT_EYEBROW, dark: 'var(--orange)' },
    boxes: {
      blog_hero: { tone: 'light', bgColor: '#F6F4EF', pattern: 'none', borderBottom: PAPER_LINE },
      blog_featured: { tone: 'light', bgColor: '#F6F4EF', pattern: 'none' },
      blog_topics: { tone: 'light', bgColor: '#F6F4EF', pattern: 'none', borderBottom: PAPER_LINE },
      blog_feed: { tone: 'light', bgColor: '#FBFAF7', pattern: 'none' },
      blog_cta: { tone: 'dark', bgColor: 'var(--navy-950)', pattern: 'none' },
    },
  },
  bento: {
    heroPhoto: false,
    eyebrow: { light: LIGHT_EYEBROW, dark: 'var(--cyan)' },
    boxes: {
      blog_hero: { tone: 'dark', bgColor: '#060B16', pattern: 'none' },
      blog_featured: { tone: 'dark', bgColor: '#060B16', pattern: 'none' },
      blog_topics: { tone: 'dark', bgColor: '#060B16', pattern: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' },
      blog_feed: { tone: 'dark', bgColor: '#060B16', pattern: 'none' },
      blog_cta: { tone: 'dark', bgColor: '#060B16', pattern: 'none' },
    },
  },
  signal: {
    heroPhoto: false,
    eyebrow: { light: LIGHT_EYEBROW, dark: 'var(--cyan)' },
    boxes: {
      blog_hero: { tone: 'light', bgColor: '#F3F6FA', pattern: 'grid', patternColor: 'rgba(10,22,40,0.06)', borderBottom: PAPER_LINE },
      blog_featured: { tone: 'light', bgColor: '#FFFFFF', pattern: 'none' },
      blog_topics: { tone: 'light', bgColor: '#F3F6FA', pattern: 'none', borderBottom: PAPER_LINE },
      blog_feed: { tone: 'light', bgColor: '#FFFFFF', pattern: 'none' },
      blog_cta: { tone: 'dark', bgColor: 'var(--navy-950)', pattern: 'grid-fade' },
    },
  },
};

/** Colour fields a scheme owns; any custom value is cleared so the scheme shows through. */
const COLOUR_KEYS = ['bgColor', 'bgGradient', 'bgImage', 'bgVideo', 'textColor', 'pattern', 'patternColor', 'borderTop', 'borderBottom'] as const;

function recolourBox(box: SectionBox | undefined, scheme: SectionBox): SectionBox {
  const next: SectionBox = { ...(box || {}) };
  for (const key of COLOUR_KEYS) delete next[key];
  return { ...next, ...scheme };
}

function recolourEyebrow(el: EyebrowEl | undefined, color: string): EyebrowEl | undefined {
  if (!el) return el;
  return { ...el, style: { ...(el.style || {}), color } };
}

function recolourButtons(ctas: unknown, tone: SectionBox['tone']): CtaButton[] | undefined {
  if (!Array.isArray(ctas)) return undefined;
  return (ctas as CtaButton[]).map((b) => {
    if (b.variant === 'primary' || !b.variant) return b;
    return { ...b, variant: tone === 'light' ? 'ghost-dark' : 'ghost' };
  });
}

/** Section content recoloured for `template`; `variant` is cleared so the section follows the blog design. */
export function applyHubScheme(type: string, content: Record<string, unknown>, template: BlogHubTemplate) {
  if (!isBlogSectionType(type)) return null;
  const scheme = SCHEMES[template];
  const box = scheme.boxes[type];
  const eyebrowColor = box.tone === 'light' ? scheme.eyebrow.light : scheme.eyebrow.dark;
  const out: Record<string, unknown> = { ...content, variant: '', section: recolourBox(content.section as SectionBox, box) };

  if (type === 'blog_hero' || type === 'blog_cta') {
    out.eyebrow = recolourEyebrow(content.eyebrow as EyebrowEl, eyebrowColor);
    const ctas = recolourButtons(content.ctas, box.tone);
    if (ctas) out.ctas = ctas;
  }
  if (type === 'blog_hero') {
    const bg = (content.background || {}) as LegacyBgMedia;
    const items = bg.items?.length ? bg.items : defaultBlogHeroContent().background.items;
    out.background = scheme.heroPhoto ? { ...bg, hidden: false, items } : { ...bg, hidden: true };
  }
  if (type === 'blog_cta' && !scheme.heroPhoto) {
    out.background = { ...((content.background || {}) as LegacyBgMedia), hidden: true };
  }
  const header = content.header as { eyebrow?: EyebrowEl } | undefined;
  if (header?.eyebrow) out.header = { ...header, eyebrow: recolourEyebrow(header.eyebrow, eyebrowColor) };
  return out;
}
