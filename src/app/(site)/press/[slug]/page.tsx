import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import JsonLd from '@/components/JsonLd';
import { getPressPostBySlug } from '@/lib/press';
import { absoluteUrl, buildPageMetadata, organizationId, plainText, toIsoDate } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPressPostBySlug(slug);
  if (!post) notFound();
  return buildPageMetadata({
    title: post.title,
    description: post.excerpt || plainText(post.body_html) || post.title,
    path: `/press/${post.slug}`,
    image: post.cover_url,
    type: 'article',
    publishedTime: post.published_at,
  });
}

export default async function PressDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPressPostBySlug(slug);
  if (!post) notFound();

  const path = `/press/${post.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: plainText(post.excerpt) || undefined,
    ...(post.cover_url ? { image: [absoluteUrl(post.cover_url)] } : {}),
    ...(post.published_at ? { datePublished: toIsoDate(post.published_at) } : {}),
    mainEntityOfPage: absoluteUrl(path),
    author: { '@id': organizationId() },
    publisher: { '@id': organizationId() },
  };

  return (
    <main id="main-content" className="hub-page">
      <JsonLd data={jsonLd} />
      <InnerPageHero
        accent="cyan"
        eyebrow="Press"
        title={post.title}
        lead={post.excerpt || undefined}
        image="/assets/images/zigma-technologies-engineers-collaborati.jpg"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Press', href: '/press' },
          { label: post.title },
        ]}
      >
        <p className="press-hero-meta">
          {post.published_at ? new Date(post.published_at).toLocaleDateString('en-IN') : ''}
          {post.source_name ? ` · ${post.source_name}` : ''}
        </p>
      </InnerPageHero>

      <section className="hub-section hub-section--soft">
        <div className="container press-article">
          {post.body_html ? (
            <div className="rich-text thank-you-card" dangerouslySetInnerHTML={{ __html: post.body_html }} />
          ) : null}
          {post.source_url ? (
            <p style={{ marginTop: '1.25rem' }}>
              <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="link">
                Original source →
              </a>
            </p>
          ) : null}
          <p style={{ marginTop: '1.5rem' }}>
            <Link href="/press" className="link">
              ← Back to newsroom
            </Link>
          </p>
        </div>
      </section>

      <InnerCtaBand
        title="Want the engineering story behind the headline?"
        lead="Browse case studies or speak with an engineer about a similar deployment."
        primaryHref="/projects"
        primaryLabel="Case studies →"
        secondaryHref="/contact?consult=1"
        secondaryLabel="Request consultation"
      />
    </main>
  );
}
