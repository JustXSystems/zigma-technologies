import { BLOG_FALLBACK_COVER, type BlogCardPost } from '@/lib/blog-sections';
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

export function toBlogCard(post: ResourcePost): BlogCardPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || stripHtml(post.body_html).slice(0, 180),
    cover: post.cover_url || BLOG_FALLBACK_COVER,
    tags: post.tags_json || [],
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

export function blogTags(posts: BlogCardPost[]) {
  const counts = new Map<string, number>();
  for (const p of posts) for (const t of p.tags) counts.set(t, (counts.get(t) || 0) + 1);
  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
