import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ResourceDetailView from '@/components/resources/ResourceDetailView';
import { getResourcePostBySlug, listResourcePosts } from '@/lib/resources';
import { getSiteCopy } from '@/lib/site-content';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getResourcePostBySlug(slug);
  if (!post) return { title: 'Resource not found' };
  return {
    title: post.meta_title || `${post.title} | Zigma Technologies`,
    description: post.meta_description || post.excerpt || undefined,
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || undefined,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  };
}

export default async function ResourceDetailPage({ params }: Props) {
  const { slug } = await params;
  const [post, copy] = await Promise.all([getResourcePostBySlug(slug), getSiteCopy()]);
  if (!post) notFound();

  const related = (await listResourcePosts({ tag: post.tags_json?.[0], limit: 4 }))
    .filter((p) => p.id !== post.id)
    .slice(0, 3);

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zigma-technologies.com').replace(/\/$/, '');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.cover_url ? [`${origin}${post.cover_url}`] : undefined,
    datePublished: post.published_at || undefined,
    author: { '@type': 'Organization', name: 'Zigma Technologies' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ResourceDetailView post={post} related={related} copy={copy} />
    </>
  );
}
