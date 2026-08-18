import type { Metadata } from 'next';
import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import { getThemeSettings } from '@/lib/cms';
import { listResourcePosts } from '@/lib/resources';
import { getSiteCopy } from '@/lib/site-content';
import { mergeSiteSettings } from '@/lib/site-settings';

type Props = { searchParams: Promise<{ tag?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { tag } = await searchParams;
  const [copy, theme] = await Promise.all([getSiteCopy(), getThemeSettings().catch(() => ({}))]);
  const site = mergeSiteSettings((theme as { site?: unknown }).site);
  return {
    title: tag ? `${tag} guides | ${site.companyName}` : `${copy.hubs.resources.title} | ${site.companyName}`,
    description: copy.hubs.resources.lead,
  };
}

export default async function ResourcesIndexPage({ searchParams }: Props) {
  const { tag } = await searchParams;
  const [copy, posts] = await Promise.all([
    getSiteCopy(),
    listResourcePosts({ tag: tag || undefined }),
  ]);
  const hub = copy.hubs.resources;
  const all = tag ? await listResourcePosts() : posts;
  const tags = Array.from(new Set(all.flatMap((p) => p.tags_json || []))).sort();

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        accent="cyan"
        eyebrow={hub.eyebrow}
        title={tag ? `${tag} guides` : hub.title}
        lead={hub.lead}
        image="/assets/images/engineers-reviewing-electrical-design-dr.jpg"
        actions={
          <>
            <Link href={copy.features.toolsEnabled ? '/tools/ups-calculator' : hub.ctaPrimaryHref} className="btn btn-primary">
              {copy.features.toolsEnabled ? 'UPS calculator →' : hub.ctaPrimary}
            </Link>
            <Link href={hub.ctaSecondaryHref} className="btn btn-ghost">
              {hub.ctaSecondary}
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
        eyebrow={hub.ctaBandEyebrow}
        title={hub.ctaBandTitle}
        lead={hub.ctaBandLead}
        primaryHref={copy.features.solutionFinderEnabled ? '/tools/solution-finder' : hub.ctaPrimaryHref}
        primaryLabel={copy.features.solutionFinderEnabled ? 'Solution finder →' : hub.ctaPrimary}
        secondaryHref={hub.ctaPrimaryHref}
        secondaryLabel={hub.ctaPrimary}
      />
    </main>
  );
}
