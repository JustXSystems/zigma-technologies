import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getResourcePostBySlug, listResourcePosts } from '@/lib/resources';

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
  const post = await getResourcePostBySlug(slug);
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
    <main id="main-content" className="resource-detail">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="page-hero" style={{ minHeight: 'auto', padding: '10rem 0 3rem' }}>
        <div className="hero-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover_url || '/assets/images/engineers-reviewing-electrical-design-dr.jpg'} alt="" />
          <div className="hero-overlay"></div>
          <div className="grid-overlay"></div>
        </div>
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/resources">Resources</Link>
            <span className="sep">/</span>
            <span className="current">{post.title}</span>
          </nav>
          <div className="eyebrow eyebrow-cyan">Guide</div>
          <h1>{post.title}</h1>
          {post.excerpt ? <p className="lead">{post.excerpt}</p> : null}
          <div className="case-study-tags" style={{ marginTop: '1rem' }}>
            {(post.tags_json || []).map((tag) => (
              <Link key={tag} href={`/resources?tag=${encodeURIComponent(tag)}`} className="case-study-tag">
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="section section-light">
        <div className="container" style={{ maxWidth: 820 }}>
          <article
            className="resource-body"
            dangerouslySetInnerHTML={{ __html: post.body_html || '<p>Content coming soon.</p>' }}
          />
          <p style={{ marginTop: '2rem' }}>
            <Link href="/contact?consult=1&consult_subject=Request%20a%20Quote" className="btn btn-primary">
              Talk to an engineer →
            </Link>
          </p>
        </div>
      </section>
      {related.length ? (
        <section className="section section-gray">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow">Related guides</div>
              <h2>Keep learning</h2>
            </div>
            <div className="proj-grid">
              {related.map((r) => (
                <Link key={r.id} href={`/resources/${r.slug}`} className="proj-card">
                  <div className="proj-body">
                    <h5>{r.title}</h5>
                    <p>{r.excerpt}</p>
                    <span className="link">Read →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
