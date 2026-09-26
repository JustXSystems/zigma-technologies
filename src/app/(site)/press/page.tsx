import type { Metadata } from 'next';
import SiteHeading from '@/components/SiteHeading';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import { listPressPosts } from '@/lib/press';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteCopy } from '@/lib/site-content';

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  return buildPageMetadata({
    title: copy.hubs.press.title,
    description: copy.hubs.press.lead,
    path: '/press',
  });
}

export default async function PressIndexPage() {
  const [copy, posts] = await Promise.all([getSiteCopy(), listPressPosts()]);
  const hub = copy.hubs.press;

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        eyebrow={hub.eyebrow}
        title={hub.title}
        lead={hub.lead}
        image="/assets/images/zigma-technologies-engineers-collaborati.jpg"
        actions={
          <>
            <Link href={hub.ctaPrimaryHref} className="btn btn-primary">
              {hub.ctaPrimary}
            </Link>
            <Link href={hub.ctaSecondaryHref} className="btn btn-ghost">
              {hub.ctaSecondary}
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
                  <SiteHeading role="section">
                    <Link href={`/press/${post.slug}`}>{post.title}</Link>
                  </SiteHeading>
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
        eyebrow={hub.ctaBandEyebrow}
        title={hub.ctaBandTitle}
        lead={hub.ctaBandLead}
        primaryHref={hub.ctaPrimaryHref}
        primaryLabel={hub.ctaPrimary}
        secondaryHref={hub.ctaSecondaryHref}
        secondaryLabel={hub.ctaSecondary}
      />
    </main>
  );
}
