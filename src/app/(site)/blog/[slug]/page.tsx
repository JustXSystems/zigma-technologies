import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import BlogArticleView from '@/components/blog/BlogArticleView';
import { toBlogCard } from '@/lib/blog';
import { resolveArticleTemplate, settingsForPost } from '@/lib/blog-design';
import { blogPostPath } from '@/lib/blog-sections';
import { faqEntries, firstBodyImage } from '@/lib/blog-writing';
import { getBlogSettings } from '@/lib/blog-settings';
import { blogPreviewKey } from '@/lib/blog-preview';
import { verifyPreviewToken } from '@/lib/preview';
import { getResourcePostBySlug, listResourcePosts, type ResourcePost } from '@/lib/resources';
import { absoluteUrl, buildPageMetadata, organizationId, plainText, toIsoDate } from '@/lib/seo';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string; token?: string }>;
};

/** Published post, or any post when the request carries a valid admin preview link. */
async function loadPost({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const preview = sp.preview === '1' && verifyPreviewToken(blogPreviewKey(slug), sp.token);
  const post = await getResourcePostBySlug(slug, { admin: preview });
  return { post, hidden: Boolean(post && (post.status !== 'published' || !post.enabled)) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { post, hidden } = await loadPost(props);
  if (!post) notFound();
  return buildPageMetadata({
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || plainText(post.body_html),
    path: blogPostPath(post.slug),
    image: post.cover_url || firstBodyImage(post.body_html),
    type: 'article',
    publishedTime: post.published_at,
    modifiedTime: post.updated_at,
    noindex: hidden,
  });
}

/** Up to `count` posts sharing a tag (most shared tags first), topped up with the newest. */
function relatedPosts(post: ResourcePost, all: ResourcePost[], count: number) {
  if (count <= 0) return [];
  const tags = new Set(post.tags_json || []);
  const scored = all
    .filter((p) => p.id !== post.id)
    .map((p, i) => ({ p, i, score: (p.tags_json || []).filter((t) => tags.has(t)).length }));
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored.slice(0, count).map((s) => s.p);
}

export default async function BlogPostPage(props: Props) {
  const [{ post, hidden }, settings, all] = await Promise.all([loadPost(props), getBlogSettings(), listResourcePosts()]);
  if (!post) notFound();

  const index = all.findIndex((p) => p.id === post.id);
  const older = index >= 0 ? all[index + 1] : undefined;
  const newer = index > 0 ? all[index - 1] : undefined;
  const related = relatedPosts(post, all, settingsForPost(settings, post.display_json).article.related).map(toBlogCard);
  const image = post.cover_url || firstBodyImage(post.body_html);

  const url = absoluteUrl(blogPostPath(post.slug));
  const author = post.author_name?.trim()
    ? { '@type': 'Person', name: post.author_name.trim(), ...(post.author_role ? { jobTitle: post.author_role } : {}) }
    : { '@id': organizationId() };
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: plainText(post.meta_description || post.excerpt) || undefined,
    ...(image ? { image: [absoluteUrl(image)] } : {}),
    ...(post.published_at ? { datePublished: toIsoDate(post.published_at) } : {}),
    ...(post.updated_at ? { dateModified: toIsoDate(post.updated_at) } : {}),
    ...(post.tags_json?.length ? { keywords: post.tags_json.join(', ') } : {}),
    mainEntityOfPage: url,
    url,
    author,
    publisher: { '@id': organizationId() },
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: absoluteUrl('/blog') },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  const faqs = faqEntries(post.body_html);
  const faqLd = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
      }
    : null;

  return (
    <>
      {hidden ? null : <JsonLd data={jsonLd} />}
      {hidden ? null : <JsonLd data={breadcrumbLd} />}
      {hidden || !faqLd ? null : <JsonLd data={faqLd} />}
      <BlogArticleView
        post={post}
        template={resolveArticleTemplate(post.template, settings)}
        settings={settings}
        related={related}
        prev={older ? toBlogCard(older) : null}
        next={newer ? toBlogCard(newer) : null}
        preview={hidden}
      />
    </>
  );
}
