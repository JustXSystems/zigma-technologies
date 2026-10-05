'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { AzCtas, AzEyebrow, AzPills, AzText, vars } from '@/components/sections/AboutSections';
import { LzHeading, colVars } from '@/components/sections/LifeSections';
import { LgHeader, LgScrollBar, LgShell, cardVars } from '@/components/sections/LegacySections';
import HeroSlot from '@/components/HeroSlot';
import { useBlogHub } from '@/components/blog/BlogPostsContext';
import { appHref } from '@/lib/base-path';
import { elementCss, normalizeLinkItems } from '@/lib/about-sections';
import { heroHeightClass, heroScrollBarOn, heroVAlignClass } from '@/lib/hero-height';
import { heroPlacement } from '@/lib/hero-placement';
import {
  BLOG_BASE_PATH,
  blogPostPath,
  blogTagPath,
  pickFeaturedPosts,
  withBlogDefaults,
  type BlogCardOptions,
  type BlogCardPost,
  type BlogCtaContent,
  type BlogFeaturedContent,
  type BlogFeedContent,
  type BlogHeroContent,
  type BlogTopicsContent,
} from '@/lib/blog-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

function formatDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function BlogCard({ post, opts, variant = 'grid' }: { post: BlogCardPost; opts: BlogCardOptions; variant?: 'grid' | 'lead' | 'side' }) {
  const date = formatDate(post.publishedAt);
  return (
    <Link href={blogPostPath(post.slug)} className={`blg-card blg-card--${variant}`}>
      <div className="blg-card-media" style={vars({ height: variant === 'grid' ? opts.mediaHeight : undefined })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={appHref(post.cover)} alt="" loading="lazy" />
        {opts.showTag !== false && post.tags[0] ? <span className="blg-card-tag">{post.tags[0]}</span> : null}
      </div>
      <div className="blg-card-body">
        {opts.showMeta !== false ? (
          <div className="blg-card-meta">
            {date ? <time dateTime={post.publishedAt || undefined}>{date}</time> : null}
            <span>{post.readMinutes} min read</span>
          </div>
        ) : null}
        <h3 className="blg-card-title">{post.title}</h3>
        {opts.showExcerpt !== false && post.excerpt && variant !== 'side' ? <p className="blg-card-excerpt">{post.excerpt}</p> : null}
        {opts.ctaLabel?.trim() ? <span className="blg-card-cta">{opts.ctaLabel}</span> : null}
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export function BlogHeroSection({ content, sectionKey }: SectionProps) {
  const c = withBlogDefaults<BlogHeroContent>('blog_hero', content);
  const { posts, tags } = useBlogHub();
  const crumbs = normalizeLinkItems(c.breadcrumb?.items);
  const { color: crumbColor, ...crumbRest } = c.breadcrumb?.style || {};
  const place = heroPlacement(c.placement);
  const ro = c.readout;
  const latest = formatDate(posts[0]?.publishedAt || null);
  return (
    <LgShell
      box={c.section}
      bg={c.background}
      className={`az-hero ctc-hero blg-hero ctc-hero--${c.align === 'center' ? 'center' : 'left'} ${heroHeightClass(c.heroHeight)} ${heroVAlignClass(
        c.vAlign
      )} ${place.rootClass}${c.entrance === false ? '' : ' lgy-enter'}`}
      id={sectionKey || 'top'}
    >
      {heroScrollBarOn(c.scrollBar) ? <LgScrollBar gradient={c.scrollBar?.gradient} /> : null}
      <HeroSlot place={place} name="text">
        <div className="az-hero-copy ctc-hero-copy blg-hero-copy" style={vars({ maxWidth: c.contentMaxWidth })}>
          {!c.breadcrumb?.hidden && crumbs.length ? (
            <nav
              aria-label="Breadcrumb"
              className="az-breadcrumb ctc-crumb"
              style={{
                ...elementCss(crumbRest),
                ...vars({
                  '--az-crumb-color': crumbColor,
                  '--az-crumb-hover': c.breadcrumb.hoverColor,
                  '--ctc-crumb-current': c.breadcrumb.currentColor,
                }),
              }}
            >
              {crumbs.map((item, i) => (
                <Fragment key={`${item.label}-${i}`}>
                  {i > 0 ? <span className="ctc-crumb-sep">{c.breadcrumb.separator || '/'}</span> : null}
                  {item.href && i < crumbs.length - 1 ? (
                    <a href={appHref(item.href)}>{item.label}</a>
                  ) : (
                    <span aria-current={i === crumbs.length - 1 ? 'page' : undefined} className="ctc-crumb-current">
                      {item.label}
                    </span>
                  )}
                </Fragment>
              ))}
            </nav>
          ) : null}
          <AzEyebrow el={c.eyebrow} scale="md" />
          <LzHeading el={c.title} role="pageHero" className="az-hero-title ctc-hero-title" highlight={c.highlight} />
          <AzText el={c.lead} defaultTag="p" className="az-hero-lead ctc-lead" />
          <AzPills pills={c.pills} />
          <AzCtas ctas={c.ctas} />
          {!ro?.hidden && posts.length ? (
            <dl className="blg-readout">
              <div>
                <dt>{ro.articlesLabel}</dt>
                <dd>{posts.length}</dd>
              </div>
              {tags.length ? (
                <div>
                  <dt>{ro.topicsLabel}</dt>
                  <dd>{tags.length}</dd>
                </div>
              ) : null}
              {latest ? (
                <div>
                  <dt>{ro.latestLabel}</dt>
                  <dd>{latest}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </HeroSlot>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Featured                                                            */
/* ------------------------------------------------------------------ */

export function BlogFeaturedSection({ content, sectionKey }: SectionProps) {
  const c = withBlogDefaults<BlogFeaturedContent>('blog_featured', content);
  const { posts, activeTag, query } = useBlogHub();
  const items = useMemo(() => pickFeaturedPosts(posts, c), [posts, c]);
  // A topic or search view is about the archive; the featured strip would only repeat it.
  if (!items.length || activeTag || query) return null;
  const spotlight = c.layout !== 'grid' && items.length > 1;
  const style = vars({ ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }), '--lz-gap': c.gap, ...cardVars(c.cardStyle || {}) });
  return (
    <LgShell box={c.section} className="blg-featured" id={sectionKey || 'featured'}>
      <LgHeader header={c.header} />
      {spotlight ? (
        <div className="blg-spotlight" style={style}>
          <BlogCard post={items[0]} opts={c} variant="lead" />
          <div className="blg-spotlight-side">
            {items.slice(1).map((post) => (
              <BlogCard key={post.id} post={post} opts={c} variant="side" />
            ))}
          </div>
        </div>
      ) : (
        <div className="blg-grid" style={style}>
          {items.map((post) => (
            <BlogCard key={post.id} post={post} opts={c} />
          ))}
        </div>
      )}
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Topic bar                                                           */
/* ------------------------------------------------------------------ */

export function BlogTopicsSection({ content, sectionKey }: SectionProps) {
  const c = withBlogDefaults<BlogTopicsContent>('blog_topics', content);
  const { posts, tags, activeTag } = useBlogHub();
  const counts = new Map(tags.map((t) => [t.tag, t.count]));
  const topics = c.topics.length ? c.topics : tags.map((t) => t.tag);
  if (!topics.length) return null;
  return (
    <LgShell box={c.section} className={`blg-topics blg-topics--${c.align || 'left'}${c.sticky === false ? '' : ' blg-topics--sticky'}`} id={sectionKey || 'topics'}>
      <LgHeader header={c.header} />
      <nav className="blg-topic-rail" aria-label="Blog topics">
        <Link href={`${BLOG_BASE_PATH}#blog-feed`} scroll={false} className={`blg-topic${!activeTag ? ' is-active' : ''}`}>
          {c.allLabel || 'All'}
          {c.showCounts !== false ? <span className="blg-topic-count">{posts.length}</span> : null}
        </Link>
        {topics.map((tag) => (
          <Link
            key={tag}
            href={`${blogTagPath(tag)}#blog-feed`}
            scroll={false}
            className={`blg-topic${activeTag === tag ? ' is-active' : ''}`}
            aria-current={activeTag === tag ? 'page' : undefined}
          >
            {tag}
            {c.showCounts !== false ? <span className="blg-topic-count">{counts.get(tag) || 0}</span> : null}
          </Link>
        ))}
      </nav>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Feed                                                                */
/* ------------------------------------------------------------------ */

export function BlogFeedSection({ content, sectionKey }: SectionProps) {
  const c = withBlogDefaults<BlogFeedContent>('blog_feed', content);
  const { posts, activeTag, query, featuredIds } = useBlogHubWithFeatured();
  const [q, setQ] = useState(query);
  const pageSize = Math.max(1, Number(c.pageSize) || 9);
  const [shown, setShown] = useState(pageSize);

  const needle = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = posts;
    if (activeTag) list = list.filter((p) => p.tags.includes(activeTag));
    if (needle) list = list.filter((p) => `${p.title} ${p.excerpt} ${p.tags.join(' ')}`.toLowerCase().includes(needle));
    if (c.excludeFeatured !== false && !activeTag && !needle) {
      const rest = list.filter((p) => !featuredIds.has(p.id));
      if (rest.length) list = rest;
    }
    return list;
  }, [posts, activeTag, needle, c.excludeFeatured, featuredIds]);

  const visible = filtered.slice(0, shown);
  const filteredView = Boolean(activeTag || needle);

  return (
    <LgShell box={c.section} className="blg-feed" id={sectionKey || 'blog-feed'}>
      <div className="blg-feed-head">
        <LgHeader header={c.header} />
        {c.showSearch !== false ? (
          <div className="blg-search" role="search">
            <label className="lz-sr" htmlFor="blg-search-input">
              Search articles
            </label>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="blg-search-input"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setShown(pageSize);
              }}
              placeholder={c.searchPlaceholder || 'Search articles…'}
              autoComplete="off"
            />
          </div>
        ) : null}
      </div>

      {filteredView ? (
        <p className="blg-feed-status" aria-live="polite">
          {filtered.length} article{filtered.length === 1 ? '' : 's'}
          {activeTag ? (
            <>
              {' '}
              in <strong>{activeTag}</strong>
            </>
          ) : null}
          {needle ? (
            <>
              {' '}
              matching <strong>“{q.trim()}”</strong>
            </>
          ) : null}
          <Link href={`${BLOG_BASE_PATH}#blog-feed`} scroll={false} onClick={() => setQ('')} className="blg-feed-clear">
            Clear
          </Link>
        </p>
      ) : null}

      {visible.length ? (
        <div className="blg-grid" style={vars({ ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }), '--lz-gap': c.gap, ...cardVars(c.cardStyle || {}) })}>
          {visible.map((post) => (
            <BlogCard key={post.id} post={post} opts={c} />
          ))}
        </div>
      ) : (
        <div className="blg-empty">
          <h3>{c.emptyTitle}</h3>
          <p>{c.emptyBody}</p>
          {filteredView ? (
            <Link href={`${BLOG_BASE_PATH}#blog-feed`} scroll={false} onClick={() => setQ('')} className="btn btn-sm btn-primary">
              Show all articles
            </Link>
          ) : null}
        </div>
      )}

      {filtered.length > shown ? (
        <div className="blg-more">
          <button type="button" className="btn btn-ghost-dark" onClick={() => setShown((n) => n + pageSize)}>
            {c.loadMoreLabel || 'Load more'} <span className="blg-more-count">{filtered.length - shown}</span>
          </button>
        </div>
      ) : null}
    </LgShell>
  );
}

function useBlogHubWithFeatured() {
  const hub = useBlogHub();
  return { ...hub, featuredIds: new Set(hub.featuredIds) };
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

export function BlogCtaSection({ content, sectionKey }: SectionProps) {
  const c = withBlogDefaults<BlogCtaContent>('blog_cta', content);
  const align = c.align === 'left' ? 'left' : 'center';
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
