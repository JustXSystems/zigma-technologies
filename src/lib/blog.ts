import { postFormatLabel } from '@/lib/blog-design';
import { BLOG_FALLBACK_COVER, type BlogCardPost } from '@/lib/blog-sections';
import { firstBodyImage } from '@/lib/blog-writing';
import { listResourcePosts, type ResourcePost } from '@/lib/resources';

export function stripHtml(html: string | null | undefined) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readingMinutes(html: string | null | undefined) {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

/** mysql2 returns DATETIME as a Date; normalise so it serialises cleanly to the client. */
export function isoDate(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** The post's cover, else the first image in its body, else the blog's stock photo. */
export function postCover(post: Pick<ResourcePost, 'cover_url' | 'body_html'>) {
  return post.cover_url || firstBodyImage(post.body_html) || BLOG_FALLBACK_COVER;
}

export function toBlogCard(post: ResourcePost): BlogCardPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || stripHtml(post.body_html).slice(0, 180),
    cover: postCover(post),
    tags: post.tags_json || [],
    format: postFormatLabel(post.format, post.tags_json || []),
    featured: Boolean(post.featured),
    author: post.author_name || '',
    publishedAt: isoDate(post.published_at),
    readMinutes: readingMinutes(post.body_html),
  };
}

/** Published posts as hub cards, newest first. An unreachable table yields an empty blog, not a crash. */
export async function listBlogCards(): Promise<BlogCardPost[]> {
  try {
    return (await listResourcePosts()).map(toBlogCard);
  } catch (error) {
    console.error('[blog] failed to list posts', error);
    return [];
  }
}

export type ArticleHeading = { id: string; text: string; level: 2 | 3 };

function headingSlug(text: string) {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&[a-z#0-9]+;/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'section'
  );
}

/**
 * Give every h2 / h3 a readable id (for the contents list and shareable #links) plus a hover anchor,
 * and lazy-load body images.
 */
export function enrichArticleHtml(html: string) {
  const headings: ArticleHeading[] = [];
  const used = new Map<string, number>();
  const withHeadings = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level: string, attrs: string, inner: string) => {
    const text = stripHtml(inner);
    if (!text) return match;
    const base = headingSlug(text);
    const n = used.get(base) || 0;
    used.set(base, n + 1);
    const id = n ? `${base}-${n + 1}` : base;
    headings.push({ id, text, level: level === '2' ? 2 : 3 });
    const cleanAttrs = attrs.replace(/\sid="[^"]*"/gi, '');
    return `<h${level}${cleanAttrs} id="${id}">${inner}<a class="blg-anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>`;
  });
  const withLazyImages = withHeadings
    .replace(/<img(?![^>]*\sloading=)/gi, '<img loading="lazy" decoding="async"')
    .replace(/<figcaption>\s*<\/figcaption>/gi, '');
  const external = withLazyImages.replace(/<a\b(?=[^>]*\shref="https?:\/\/)(?![^>]*\starget=)([^>]*)>/gi, '<a$1 target="_blank" rel="noopener">');
  return { html: external, headings };
}

export function blogTags(posts: BlogCardPost[]) {
  const counts = new Map<string, number>();
  for (const p of posts) for (const t of p.tags) counts.set(t, (counts.get(t) || 0) + 1);
  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
