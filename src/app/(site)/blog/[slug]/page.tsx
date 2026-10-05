import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import ResourceDetailView from '@/components/resources/ResourceDetailView';
import { blogPostPath } from '@/lib/blog-sections';
import { getResourcePostBySlug, listResourcePosts } from '@/lib/resources';
import { absoluteUrl, buildPageMetadata, organizationId, plainText, toIsoDate } from '@/lib/seo';
import { getSiteCopy } from '@/lib/site-content';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getResourcePostBySlug(slug);
  if (!post) notFound();
  return buildPageMetadata({
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || plainText(post.body_html),
    path: blogPostPath(post.slug),
    image: post.cover_url,
    type: 'article',
    publishedTime: post.published_at,
    modifiedTime: post.updated_at,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [post, copy] = await Promise.all([getResourcePostBySlug(slug), getSiteCopy()]);
  if (!post) notFound();

  const sameTopic = post.tags_json?.[0] ? await listResourcePosts({ tag: post.tags_json[0], limit: 4 }) : [];
  const related = sameTopic.filter((p) => p.id !== post.id).slice(0, 3);
  if (related.length < 3) {
    const seen = new Set([post.id, ...related.map((p) => p.id)]);
    for (const p of await listResourcePosts({ limit: 8 })) {
      if (related.length >= 3) break;
      if (!seen.has(p.id)) related.push(p);
    }
  }

  const url = absoluteUrl(blogPostPath(post.slug));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: plainText(post.meta_description || post.excerpt) || undefined,
    ...(post.cover_url ? { image: [absoluteUrl(post.cover_url)] } : {}),
    ...(post.published_at ? { datePublished: toIsoDate(post.published_at) } : {}),
    ...(post.updated_at ? { dateModified: toIsoDate(post.updated_at) } : {}),
    ...(post.tags_json?.length ? { keywords: post.tags_json.join(', ') } : {}),
    mainEntityOfPage: url,
    url,
    author: { '@id': organizationId() },
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

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />
      <ResourceDetailView post={post} related={related} copy={copy} />
    </>
  );
}
