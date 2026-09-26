import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import ResourceDetailView from '@/components/resources/ResourceDetailView';
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
    path: `/resources/${post.slug}`,
    image: post.cover_url,
    type: 'article',
    publishedTime: post.published_at,
    modifiedTime: post.updated_at,
  });
}

export default async function ResourceDetailPage({ params }: Props) {
  const { slug } = await params;
  const [post, copy] = await Promise.all([getResourcePostBySlug(slug), getSiteCopy()]);
  if (!post) notFound();

  const related = (await listResourcePosts({ tag: post.tags_json?.[0], limit: 4 }))
    .filter((p) => p.id !== post.id)
    .slice(0, 3);

  const url = absoluteUrl(`/resources/${post.slug}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
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

  return (
    <>
      <JsonLd data={jsonLd} />
      <ResourceDetailView post={post} related={related} copy={copy} />
    </>
  );
}
