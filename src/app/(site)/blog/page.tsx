import type { Metadata } from 'next';
import CmsPageShell from '@/components/CmsPageShell';
import { BlogHubProvider } from '@/components/blog/BlogPostsContext';
import { blogTags, listBlogCards } from '@/lib/blog';
import { BLOG_SLUG, pickFeaturedPosts, withBlogDefaults, type BlogFeaturedContent } from '@/lib/blog-sections';
import { getBlogSettings } from '@/lib/blog-settings';
import { loadPublicCmsPage } from '@/lib/cms-public-page';
import { buildCmsMetadata } from '@/lib/cms-seo';

type Props = { searchParams: Promise<{ tag?: string; q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { tag, q } = await searchParams;
  const meta = await buildCmsMetadata(BLOG_SLUG);
  // Topic and search views re-sort the hub; keep them followable but out of the index.
  return tag || q ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default async function BlogPage({ searchParams }: Props) {
  const { tag, q } = await searchParams;
  const [posts, page, settings] = await Promise.all([
    listBlogCards(),
    loadPublicCmsPage(BLOG_SLUG).catch(() => null),
    getBlogSettings(),
  ]);
  const featured = page?.page.sections?.find((s) => s.type === 'blog_featured' && s.enabled);
  const featuredIds = featured
    ? pickFeaturedPosts(posts, withBlogDefaults<BlogFeaturedContent>('blog_featured', featured.content_json)).map((p) => p.id)
    : [];
  const tags = blogTags(posts);
  const activeTag = tag && tags.some((t) => t.tag === tag) ? tag : null;

  return (
    <BlogHubProvider
      value={{
        posts,
        tags,
        activeTag,
        query: (q || '').trim(),
        featuredIds,
        template: settings.hubTemplate,
        defaultAuthor: settings.author.name,
      }}
    >
      <CmsPageShell slug={BLOG_SLUG} />
    </BlogHubProvider>
  );
}
