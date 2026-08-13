import Link from 'next/link';
import InnerCtaBand from '@/components/InnerCtaBand';
import InnerPageHero from '@/components/InnerPageHero';
import type { ResourcePost } from '@/lib/resources';
import type { SiteCopy } from '@/lib/site-copy';

type Props = {
  post: ResourcePost;
  related: ResourcePost[];
  copy: SiteCopy;
};

type ArticleHeading = { id: string; text: string; level: number };

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function estimateReadingMinutes(html: string | null) {
  const words = stripTags(html || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function enrichArticleHtml(html: string) {
  const headings: ArticleHeading[] = [];
  let counter = 0;
  const enriched = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
    const text = stripTags(inner);
    if (!text) return match;
    const id = `resource-section-${++counter}`;
    headings.push({ id, text, level: Number(level) });
    const cleanAttrs = String(attrs).replace(/\sid="[^"]*"/gi, '');
    return `<h${level}${cleanAttrs} id="${id}">${inner}</h${level}>`;
  });
  return { html: enriched, headings };
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

function primaryTag(tags: string[] | null | undefined) {
  return tags?.[0] || 'Engineering guide';
}

export default function ResourceDetailView({ post, related, copy }: Props) {
  const hub = copy.hubs.resources;
  const tags = post.tags_json || [];
  const readMins = estimateReadingMinutes(post.body_html);
  const published = formatDate(post.published_at);
  const body = post.body_html || '<p>Content coming soon.</p>';
  const { html: articleHtml, headings } = enrichArticleHtml(body);
  const docType = tags.some((t) => /checklist/i.test(t))
    ? 'Checklist'
    : tags.some((t) => /guide/i.test(t))
      ? 'Guide'
      : 'Technical brief';

  return (
    <main id="main-content" className="resource-detail">
      <InnerPageHero
        accent="cyan"
        eyebrow={primaryTag(tags)}
        title={post.title}
        lead={post.excerpt || undefined}
        image={post.cover_url || '/assets/images/engineers-reviewing-electrical-design-dr.jpg'}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Resources', href: '/resources' },
          { label: post.title },
        ]}
        actions={
          <>
            <Link href="/contact?consult=1&consult_subject=Request%20a%20Quote" className="btn btn-primary">
              Talk to an engineer →
            </Link>
            {copy.features.toolsEnabled ? (
              <Link href="/tools/solution-finder" className="btn btn-ghost">
                Solution finder
              </Link>
            ) : (
              <Link href={hub.ctaSecondaryHref} className="btn btn-ghost">
                {hub.ctaSecondary}
              </Link>
            )}
          </>
        }
      >
        <div className="resource-hero-meta">
          <span>{docType}</span>
          <span>{readMins} min read</span>
          {published ? <span>{published}</span> : null}
        </div>
        {tags.length ? (
          <div className="resource-hero-tags">
            {tags.map((tag) => (
              <Link key={tag} href={`/resources?tag=${encodeURIComponent(tag)}`} className="resource-hero-tag">
                {tag}
              </Link>
            ))}
          </div>
        ) : null}
      </InnerPageHero>

      <div className="resource-meta-band">
        <div className="container resource-meta-grid">
          <div className="resource-meta-item">
            <span className="resource-meta-label">Format</span>
            <span className="resource-meta-value">{docType}</span>
          </div>
          <div className="resource-meta-item">
            <span className="resource-meta-label">Reading time</span>
            <span className="resource-meta-value">{readMins} minutes</span>
          </div>
          <div className="resource-meta-item">
            <span className="resource-meta-label">Prepared by</span>
            <span className="resource-meta-value">Zigma engineering team</span>
          </div>
          <div className="resource-meta-item">
            <span className="resource-meta-label">Use case</span>
            <span className="resource-meta-value">Commercial &amp; industrial planning</span>
          </div>
        </div>
      </div>

      <section className="hub-section hub-section--soft resource-content">
        <div className="container resource-layout">
          <article className="resource-article">
            <div className="resource-article-card rich-text resource-prose" dangerouslySetInnerHTML={{ __html: articleHtml }} />
            <div className="resource-article-foot">
              <Link href="/resources" className="link">
                ← All resources
              </Link>
            </div>
          </article>

          <aside className="resource-sidebar">
            {headings.length ? (
              <div className="resource-sidebar-block">
                <h3>On this page</h3>
                <nav className="resource-toc" aria-label="Table of contents">
                  <ul>
                    {headings.map((h) => (
                      <li key={h.id} className={h.level === 3 ? 'is-sub' : undefined}>
                        <a href={`#${h.id}`}>{h.text}</a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            ) : null}

            <div className="resource-sidebar-block resource-sidebar-cta">
              <div className="eyebrow eyebrow-orange">Engineering support</div>
              <h3>Need this implemented on site?</h3>
              <p>Zigma teams deliver sizing, AMC, and commissioning with documented handover — not generic advice.</p>
              <Link href="/contact?consult=1&consult_subject=Request%20a%20Quote" className="btn btn-primary btn-sm">
                Request consultation →
              </Link>
            </div>

            {copy.features.toolsEnabled ? (
              <div className="resource-sidebar-block">
                <h3>Related tools</h3>
                <ul className="resource-sidebar-links">
                  <li>
                    <Link href="/tools/solution-finder">Solution finder</Link>
                  </li>
                  <li>
                    <Link href="/tools/solar-roi">Solar ROI calculator</Link>
                  </li>
                  <li>
                    <Link href="/tools/ups-calculator">UPS sizing calculator</Link>
                  </li>
                </ul>
              </div>
            ) : null}

            {tags.length ? (
              <div className="resource-sidebar-block">
                <h3>Topics</h3>
                <div className="resource-sidebar-tags">
                  {tags.map((tag) => (
                    <Link key={tag} href={`/resources?tag=${encodeURIComponent(tag)}`} className="case-study-tag">
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {related.length ? (
        <section className="hub-section resource-related">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow eyebrow-orange">Related guides</div>
              <h2>Keep learning</h2>
              <p>More practical notes from the Zigma engineering desk.</p>
            </div>
            <div className="hub-grid">
              {related.map((r) => (
                <Link key={r.id} href={`/resources/${r.slug}`} className="hub-card">
                  <div className="hub-card-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.cover_url || '/assets/images/engineers-reviewing-electrical-design-dr.jpg'}
                      alt=""
                      loading="lazy"
                    />
                  </div>
                  <div className="hub-card-body">
                    <div className="eyebrow">{(r.tags_json || [])[0] || 'Guide'}</div>
                    <h3>{r.title}</h3>
                    <p>{r.excerpt}</p>
                    <span className="hub-card-link">Read guide →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <InnerCtaBand
        eyebrow={hub.ctaBandEyebrow}
        title={hub.ctaBandTitle}
        lead={hub.ctaBandLead}
        primaryHref={copy.features.toolsEnabled ? '/tools/solution-finder' : hub.ctaPrimaryHref}
        primaryLabel={copy.features.toolsEnabled ? 'Solution finder →' : hub.ctaPrimary}
        secondaryHref={hub.ctaPrimaryHref}
        secondaryLabel={hub.ctaPrimary}
      />
    </main>
  );
}
