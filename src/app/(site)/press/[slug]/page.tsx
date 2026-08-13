import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import { getPressPostBySlug } from '@/lib/press';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPressPostBySlug(slug);
  if (!post) return { title: 'Not found' };
  return {
    title: post.title,
    description: post.excerpt || post.title,
  };
}

export default async function PressDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPressPostBySlug(slug);
  if (!post) notFound();

  return (
    <main id="main-content" className="hub-page">
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
