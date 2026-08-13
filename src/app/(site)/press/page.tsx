import type { Metadata } from 'next';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import { listPressPosts } from '@/lib/press';

export const metadata: Metadata = {
  title: 'Press & newsroom',
  description: 'Company announcements, partnership news, and project milestones from Zigma Technologies.',
};

export default async function PressIndexPage() {
  const posts = await listPressPosts();

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        eyebrow="Newsroom"
        title="Press & announcements"
        lead="Partnership updates, EPC milestones, and company news from Zigma Technologies."
        image="/assets/images/zigma-technologies-engineers-collaborati.jpg"
        actions={
          <>
            <Link href="/contact" className="btn btn-primary">
              Media enquiry →
            </Link>
            <Link href="/resources" className="btn btn-ghost">
              Technical guides
            </Link>
          </>
        }
      />

      <section className="hub-section hub-section--soft">
        <div className="container">
          {posts.length === 0 ? (
            <p>No press posts yet. Seed samples from Admin → Press.</p>
          ) : (
            <div className="press-list">
              {posts.map((post) => (
                <article key={post.id} className="press-card">
                  <h2>
                    <Link href={`/press/${post.slug}`}>{post.title}</Link>
                  </h2>
                  {post.excerpt ? <p>{post.excerpt}</p> : null}
                  <p className="meta">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('en-IN') : ''}
                    {post.source_name ? ` · ${post.source_name}` : ''}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <InnerCtaBand
        title="Looking for project proof instead?"
        lead="Browse published case studies and OEM-backed deployments across India."
        primaryHref="/projects"
        primaryLabel="View case studies →"
        secondaryHref="/certifications"
        secondaryLabel="Certifications"
      />
    </main>
  );
}
