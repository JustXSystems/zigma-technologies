'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AzCtas, AzEyebrow, AzPills, AzText, vars } from '@/components/sections/AboutSections';
import { LzHeading, colVars } from '@/components/sections/LifeSections';
import { LgHeader, LgScrollBar, LgShell } from '@/components/sections/LegacySections';
import { useBlogPosts } from '@/components/blog/BlogPostsContext';
import { elementCss, normalizeLinkItems } from '@/lib/about-sections';
import { heroHeightClass, heroScrollBarOn, heroVAlignClass } from '@/lib/hero-height';
import { heroPlacement } from '@/lib/hero-placement';
import HeroSlot from '@/components/HeroSlot';
import {
  BLOG_PUBLIC_BASE,
  withBlogDefaults,
  type BlogCtaContent,
  type BlogFeaturedContent,
  type BlogFeedContent,
  type BlogHeroContent,
  type BlogTopicsContent,
} from '@/lib/blog-sections';
import type { ResourcePost } from '@/lib/resources';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function readingMinutes(html: string | null) {
  const words = stripTags(html || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

function postHref(slug: string) {
  return `${BLOG_PUBLIC_BASE}/${slug}`;
}

function coverOf(post: ResourcePost) {
  return post.cover_url || '/assets/images/engineers-reviewing-electrical-design-dr.jpg';
}

function BlogCard({
  post,
  featured,
  showExcerpt,
  showMeta,
  ctaLabel,
}: {
  post: ResourcePost;
  featured?: boolean;
  showExcerpt?: boolean;
  showMeta?: boolean;
  ctaLabel?: string;
}) {
  const tag = post.tags_json?.[0] || 'Guide';
  const mins = readingMinutes(post.body_html);
  const published = formatDate(post.published_at);
  return (
    <Link href={postHref(post.slug)} className={`blg-card${featured ? ' blg-card--featured' : ''}`}>
      <div className="blg-card-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverOf(post)} alt="" loading="lazy" />
        <span className="blg-card-tag">{tag}</span>
      </div>
      <div className="blg-card-body">
        {showMeta !== false ? (
          <div className="blg-card-meta">
            <span>{mins} min</span>
            {published ? <span>{published}</span> : null}
          </div>
        ) : null}
        <h3 className="blg-card-title">{post.title}</h3>
        {showExcerpt !== false && post.excerpt ? <p className="blg-card-excerpt">{post.excerpt}</p> : null}
        <span className="blg-card-cta">{ctaLabel || 'Read →'}</span>
      </div>
    </Link>
  );
}

/** Hero reuses Contact hero chrome with blog-specific signal chip + scoped class. */
export function BlogHeroSection({ content, sectionKey }: SectionProps) {
  const c = withBlogDefaults<BlogHeroContent>('blog_hero', content);
  const align = c.align === 'center' ? 'center' : 'left';
  const signal = c.signal;
  return (
    <LgShell
      box={c.section}
      bg={c.background}
      className={`az-hero ctc-hero blg-hero blg-hero--${align} ${heroHeightClass(c.heroHeight)} ${heroVAlignClass(c.vAlign)}${
        c.entrance === false ? '' : ' blg-hero--enter'
      }`}
      id={sectionKey || 'top'}
      noContainer
      layers={heroScrollBarOn(c.scrollBar) ? <LgScrollBar gradient={c.scrollBar?.gradient} /> : null}
    >
      <HeroSlot placement={heroPlacement(c.placement)}>
        <div className="container">
          <div className="blg-hero-copy" style={vars({ maxWidth: c.contentMaxWidth })}>
            {c.breadcrumb?.hidden ? null : (
              <nav className="blg-breadcrumb" aria-label="Breadcrumb" style={elementCss(c.breadcrumb?.style)}>
                {normalizeLinkItems(c.breadcrumb?.items).map((it, i, arr) => (
                  <span key={`${it.label}-${i}`}>
                    {i > 0 ? <span className="blg-bc-sep">{c.breadcrumb?.separator || '/'}</span> : null}
                    {it.href && i < arr.length - 1 ? (
                      <Link href={it.href}>{it.label}</Link>
                    ) : (
                      <span className="blg-bc-current">{it.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            <AzEyebrow el={c.eyebrow} scale="md" />
            <LzHeading el={c.title} role="pageHero" className="blg-hero-title" highlight={c.highlight} />
            <AzText el={c.lead} defaultTag="p" className="blg-hero-lead" />
            <AzPills pills={c.pills} className="blg-hero-pills" />
            <AzCtas ctas={c.ctas} className="blg-hero-actions" />
            {signal && !signal.hidden && (signal.value || signal.label) ? (
              <div className="blg-hero-signal" aria-label={`${signal.value} ${signal.label}`}>
                <span className="blg-hero-signal-val">{signal.value}</span>
                <span className="blg-hero-signal-lbl">{signal.label}</span>
              </div>
            ) : null}
          </div>
        </div>
      </HeroSlot>
    </LgShell>
  );
}

export function BlogFeaturedSection({ content, sectionKey }: SectionProps) {
  const c = withBlogDefaults<BlogFeaturedContent>('blog_featured', content);
  const { allPosts } = useBlogPosts();
  const items = useMemo(() => {
    if (c.mode === 'manual' && c.slugs?.length) {
      const map = new Map(allPosts.map((p) => [p.slug, p]));
      return c.slugs.map((s) => map.get(s)).filter(Boolean) as ResourcePost[];
    }
    const limit = Math.max(1, Number(c.limit) || 2);
    return allPosts.slice(0, limit);
  }, [allPosts, c.mode, c.slugs, c.limit]);
  if (!items.length) return null;
  return (
    <LgShell box={c.section} className="blg-featured" id={sectionKey || 'featured'}>
      <LgHeader header={c.header} />
      <div
        className="blg-featured-grid"
        style={vars({
          ...colVars(c.columns, { desktop: 2, tablet: 2, mobile: 1 }),
          '--lz-gap': c.gap,
        })}
      >
        {items.map((post) => (
          <BlogCard
            key={post.id}
            post={post}
            featured
            showExcerpt={c.showExcerpt !== false}
            showMeta={c.showMeta !== false}
            ctaLabel={c.ctaLabel}
          />
        ))}
      </div>
    </LgShell>
  );
}

export function BlogTopicsSection({ content, sectionKey }: SectionProps) {
  const c = withBlogDefaults<BlogTopicsContent>('blog_topics', content);
  const { tags, activeTag } = useBlogPosts();
  const topics = (c.topics?.length ? c.topics : tags).filter(Boolean);
  if (!topics.length && !activeTag) return null;
  const allLabel = c.allLabel || 'All topics';
  return (
    <LgShell box={c.section} className={`blg-topics blg-topics--${c.align || 'left'}`} id={sectionKey || 'topics'}>
      <LgHeader header={c.header} />
      <div className="blg-topic-rail" role="navigation" aria-label="Blog topics">
        <Link href={BLOG_PUBLIC_BASE} className={`blg-topic${!activeTag ? ' is-active' : ''}`}>
          {allLabel}
        </Link>
        {topics.map((tag) => (
          <Link
            key={tag}
            href={`${BLOG_PUBLIC_BASE}?tag=${encodeURIComponent(tag)}`}
            className={`blg-topic${activeTag === tag ? ' is-active' : ''}`}
          >
            {tag}
          </Link>
        ))}
      </div>
    </LgShell>
  );
}

export function BlogFeedSection({ content, sectionKey }: SectionProps) {
  const c = withBlogDefaults<BlogFeedContent>('blog_feed', content);
  const { posts, activeTag, query: initialQ } = useBlogPosts();
  const [q, setQ] = useState(initialQ || '');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setQ(initialQ || '');
  }, [initialQ]);

  const filtered = useMemo(() => {
    let list = posts;
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((p) => {
        const hay = `${p.title} ${p.excerpt || ''} ${(p.tags_json || []).join(' ')}`.toLowerCase();
        return hay.includes(needle);
      });
    }
    const limit = Number(c.limit) || 0;
    return limit > 0 ? list.slice(0, limit) : list;
  }, [posts, q, c.limit]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams?.toString() || '');
    const next = q.trim();
    if (next) params.set('q', next);
    else params.delete('q');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <LgShell box={c.section} className="blg-feed" id={sectionKey || 'blog-feed'}>
      <div className="blg-feed-head">
        <LgHeader header={c.header} />
        {c.showSearch !== false ? (
          <form className="blg-search" onSubmit={onSearch} role="search">
            <label className="lz-sr" htmlFor="blg-search-input">
              Search articles
            </label>
            <input
              id="blg-search-input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={c.searchPlaceholder || 'Search…'}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-sm btn-primary">
              Search
            </button>
          </form>
        ) : null}
      </div>
      {activeTag || q.trim() ? (
        <p className="blg-feed-filter">
          Showing {filtered.length} article{filtered.length === 1 ? '' : 's'}
          {activeTag ? (
            <>
              {' '}
              in <strong>{activeTag}</strong>
            </>
          ) : null}
          {q.trim() ? (
            <>
              {' '}
              matching <strong>{q.trim()}</strong>
            </>
          ) : null}
          .{' '}
          <Link href={BLOG_PUBLIC_BASE}>Clear filters</Link>
        </p>
      ) : null}
      {filtered.length ? (
        <div
          className="blg-feed-grid"
          style={vars({
            ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }),
            '--lz-gap': c.gap,
          })}
        >
          {filtered.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
              showExcerpt={c.showExcerpt !== false}
              showMeta={c.showMeta !== false}
              ctaLabel={c.ctaLabel}
            />
          ))}
        </div>
      ) : (
        <div className="blg-empty">
          <h3>{c.emptyTitle || 'No articles'}</h3>
          <p>{c.emptyBody || 'Publish a post in Admin → Resources / Blog.'}</p>
          <Link href={BLOG_PUBLIC_BASE} className="btn btn-ghost-dark btn-sm">
            View all
          </Link>
        </div>
      )}
    </LgShell>
  );
}

export function BlogCtaSection({ content, sectionKey }: SectionProps) {
  const c = withBlogDefaults<BlogCtaContent>('blog_cta', content);
  const align = c.align || 'center';
  return (
    <LgShell box={c.section} bg={c.background} className={`lz-cta lz-cta--${align} blg-cta`} id={sectionKey || 'contact'}>
      <div className="lz-cta-inner" style={vars({ maxWidth: c.maxWidth })}>
        <AzEyebrow el={c.eyebrow} scale="lg" />
        <LzHeading el={c.title} role="section" className="lz-cta-title" highlight={c.highlight} />
        <AzText el={c.body} defaultTag="p" className="lz-cta-body" />
        <AzCtas ctas={c.ctas} className="lz-cta-actions" />
      </div>
    </LgShell>
  );
}

export function renderBlogSection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'blog_hero':
      return <BlogHeroSection key={key} {...rest} />;
    case 'blog_featured':
      return <BlogFeaturedSection key={key} {...rest} />;
    case 'blog_topics':
      return <BlogTopicsSection key={key} {...rest} />;
    case 'blog_feed':
      return <BlogFeedSection key={key} {...rest} />;
    case 'blog_cta':
      return <BlogCtaSection key={key} {...rest} />;
    default:
      return null;
  }
}
