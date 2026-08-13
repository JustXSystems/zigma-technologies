import type { Metadata } from 'next';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import { listResourcePosts } from '@/lib/resources';

type Props = { searchParams: Promise<{ tag?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { tag } = await searchParams;
  return {
    title: tag ? `${tag} guides | Zigma Technologies` : 'Resources & Guides | Zigma Technologies',
    description: 'Practical guides on UPS sizing, solar O&M, BESS peak shaving, and power infrastructure.',
  };
}

export default async function ResourcesIndexPage({ searchParams }: Props) {
  const { tag } = await searchParams;
  const posts = await listResourcePosts({ tag: tag || undefined });
  const all = tag ? await listResourcePosts() : posts;
  const tags = Array.from(new Set(all.flatMap((p) => p.tags_json || []))).sort();

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        accent="cyan"
        eyebrow="Knowledge"
        title={tag ? `${tag} guides` : 'Resources & guides'}
        lead="Engineering playbooks for UPS, solar O&M, BESS, and critical power decisions."
        image="/assets/images/engineers-reviewing-electrical-design-dr.jpg"
        actions={
          <>
            <Link href="/tools/ups-calculator" className="btn btn-primary">
              UPS calculator →
            </Link>
            <Link href="/tools/solar-roi" className="btn btn-ghost">
              Solar ROI
            </Link>
          </>
        }
      />

      <section className="hub-section hub-section--soft">
        <div className="container">
          {tags.length ? (
            <div className="resource-tag-hub">
              <Link href="/resources" className={`btn btn-sm ${!tag ? 'btn-primary' : 'btn-ghost-dark'}`}>
                All
              </Link>
              {tags.map((t) => (
                <Link
                  key={t}
                  href={`/resources?tag=${encodeURIComponent(t)}`}
                  className={`btn btn-sm ${tag === t ? 'btn-primary' : 'btn-ghost-dark'}`}
                >
                  {t}
                </Link>
              ))}
            </div>
          ) : null}
          {posts.length ? (
            <div className="hub-grid">
              {posts.map((post) => (
                <Link key={post.id} href={`/resources/${post.slug}`} className="hub-card">
                  <div className="hub-card-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.cover_url || '/assets/images/engineers-reviewing-electrical-design-dr.jpg'}
                      alt=""
                      loading="lazy"
                    />
                  </div>
                  <div className="hub-card-body">
                    <div className="eyebrow">{(post.tags_json || [])[0] || 'Guide'}</div>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                    <span className="hub-card-link">Read guide →</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p>
              No guides in this tag. <Link href="/resources">Browse all resources</Link>.
            </p>
          )}
        </div>
      </section>

      <InnerCtaBand
        title="Prefer a guided recommendation?"
        lead="Use the solution finder or jump straight into a consultation with an engineer."
        primaryHref="/tools/solution-finder"
        primaryLabel="Solution finder →"
        secondaryHref="/contact?consult=1"
        secondaryLabel="Request quote"
      />
    </main>
  );
}
