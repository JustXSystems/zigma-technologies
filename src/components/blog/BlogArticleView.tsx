import Link from 'next/link';
import type { ReactNode } from 'react';
import InnerCtaBand from '@/components/InnerCtaBand';
import SiteHeading from '@/components/SiteHeading';
import { ArticleToc, CopyLinkButton, ReadingProgress } from '@/components/blog/ArticleReader';
import { appHref } from '@/lib/base-path';
import { enrichArticleHtml, postCover, readingMinutes } from '@/lib/blog';
import { articleStyleAttrs, postFormatLabel, settingsForPost, type BlogArticleTemplate, type BlogSettings } from '@/lib/blog-design';
import { BLOG_BASE_PATH, blogPostPath, blogTagPath, type BlogCardPost } from '@/lib/blog-sections';
import type { ResourcePost } from '@/lib/resources';
import { absoluteUrl } from '@/lib/seo';

type Props = {
  post: ResourcePost;
  template: BlogArticleTemplate;
  settings: BlogSettings;
  related: BlogCardPost[];
  /** Older and newer neighbours in publish order */
  prev: BlogCardPost | null;
  next: BlogCardPost | null;
  preview?: boolean;
};

type Author = BlogSettings['author'];

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isoOf(value: string | null | undefined) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** The post's own byline, else the blog default author. */
function articleAuthor(post: ResourcePost, settings: BlogSettings): Author {
  if (!post.author_name?.trim()) return settings.author;
  return { name: post.author_name.trim(), role: post.author_role || '', avatar: post.author_avatar_url || '', bio: '' };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function Avatar({ author, size = 40 }: { author: Author; size?: number }) {
  return (
    <span className="blg-avatar" style={{ width: size, height: size }} aria-hidden="true">
      {author.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={appHref(author.avatar)} alt="" />
      ) : (
        initials(author.name)
      )}
    </span>
  );
}

function Byline({ author, published, minutes, showAuthor }: { author: Author; published: string | null; minutes: number; showAuthor: boolean }) {
  const date = formatDate(published);
  return (
    <div className="blg-byline">
      {showAuthor ? (
        <>
          <Avatar author={author} />
          <span className="blg-byline-who">
            <strong>{author.name}</strong>
            {author.role ? <span>{author.role}</span> : null}
          </span>
        </>
      ) : null}
      <span className="blg-byline-facts">
        {date ? <time dateTime={isoOf(published)}>{date}</time> : null}
        <span>{minutes} min read</span>
      </span>
    </div>
  );
}

const SHARE_ICONS: Record<string, ReactNode> = {
  linkedin: <path d="M6.5 9.5v8M6.5 6.5v.01M10.5 17.5v-4.5a2.5 2.5 0 0 1 5 0v4.5M10.5 9.5v8" />,
  x: <path d="m5 5 14 14M19 5 5 19" />,
  whatsapp: <path d="M4.5 19.5 6 15.6A7.5 7.5 0 1 1 8.6 18zM9.5 9.5c.3 1.9 2.6 4.4 5 5" />,
  email: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
};

function ShareLinks({ url, title, layout }: { url: string; title: string; layout: 'rail' | 'row' }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { key: 'linkedin', label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { key: 'x', label: 'Share on X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { key: 'whatsapp', label: 'Share on WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
    { key: 'email', label: 'Share by email', href: `mailto:?subject=${t}&body=${u}` },
  ];
  return (
    <div className={`blg-share blg-share--${layout}`}>
      <span className="blg-share-label">Share</span>
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href}
          className="blg-share-btn"
          aria-label={l.label}
          title={l.label}
          {...(l.key === 'email' ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {SHARE_ICONS[l.key]}
          </svg>
        </a>
      ))}
      <CopyLinkButton url={url} className="blg-share-btn" />
    </div>
  );
}

function KeyPoints({ points, label }: { points: string[]; label: string }) {
  if (!points.length) return null;
  return (
    <aside className="blg-keypoints" aria-label={label}>
      <p className="blg-keypoints-label">{label}</p>
      <ul>
        {points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </aside>
  );
}

function AuthorCard({ author }: { author: Author }) {
  return (
    <section className="blg-author" aria-label="About the author">
      <Avatar author={author} size={56} />
      <div>
        <p className="blg-author-kicker">Written by</p>
        <p className="blg-author-name">{author.name}</p>
        {author.role ? <p className="blg-author-role">{author.role}</p> : null}
        {author.bio ? <p className="blg-author-bio">{author.bio}</p> : null}
      </div>
    </section>
  );
}

function PrevNext({ prev, next }: { prev: BlogCardPost | null; next: BlogCardPost | null }) {
  if (!prev && !next) return null;
  return (
    <nav className="blg-prevnext" aria-label="More articles">
      {prev ? (
        <Link href={blogPostPath(prev.slug)} className="blg-prevnext-link">
          <span className="blg-prevnext-dir">← Previous</span>
          <span className="blg-prevnext-title">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={blogPostPath(next.slug)} className="blg-prevnext-link blg-prevnext-link--next">
          <span className="blg-prevnext-dir">Next →</span>
          <span className="blg-prevnext-title">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}

function TagRow({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div className="blg-tagrow">
      {tags.map((tag) => (
        <Link key={tag} href={blogTagPath(tag)} className="blg-tag">
          {tag}
        </Link>
      ))}
    </div>
  );
}

function Related({ posts, settings }: { posts: BlogCardPost[]; settings: BlogSettings }) {
  if (!posts.length) return null;
  return (
    <section className="blg-related">
      <div className="container">
        <div className="blg-related-head">
          <SiteHeading role="section">{settings.labels.related}</SiteHeading>
          {settings.labels.relatedLead ? <p>{settings.labels.relatedLead}</p> : null}
        </div>
        <div className="blg-related-grid">
          {posts.map((p) => (
            <Link key={p.id} href={blogPostPath(p.slug)} className="blg-related-card">
              <span className="blg-related-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={appHref(p.cover)} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="blg-related-body">
                <span className="blg-related-kicker">
                  {p.format} · {p.readMinutes} min
                </span>
                <span className="blg-related-title">{p.title}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function SideCta({ cta }: { cta: BlogSettings['cta'] }) {
  if (!cta.title.trim()) return null;
  return (
    <div className="blg-sidecta">
      {cta.eyebrow ? <p className="blg-sidecta-eyebrow">{cta.eyebrow}</p> : null}
      <p className="blg-sidecta-title">{cta.title}</p>
      {cta.body ? <p className="blg-sidecta-body">{cta.body}</p> : null}
      {cta.primaryLabel && cta.primaryHref ? (
        <Link href={cta.primaryHref} className="btn btn-primary btn-sm">
          {cta.primaryLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default function BlogArticleView({ post, template, settings: blogSettings, related, prev, next, preview }: Props) {
  const settings = settingsForPost(blogSettings, post.display_json);
  const a = settings.article;
  const look = articleStyleAttrs(settings.style);
  const shell = (name: string) => `blg-article blg-article--${name}${look.className ? ` ${look.className}` : ''}`;
  const tags = post.tags_json || [];
  const format = postFormatLabel(post.format, tags);
  const minutes = readingMinutes(post.body_html);
  const author = articleAuthor(post, settings);
  const cover = postCover(post);
  const url = absoluteUrl(blogPostPath(post.slug));
  const { html, headings } = enrichArticleHtml(post.body_html || '<p>Content coming soon.</p>');
  const points = a.keyPoints ? (post.key_points_json || []).filter((p) => p.trim()) : [];
  const tocHeadings = a.toc ? headings : [];
  const updated = post.updated_at && post.published_at && new Date(post.updated_at).getTime() - new Date(post.published_at).getTime() > 86400000;

  const crumbs = (
    <nav aria-label="Breadcrumb" className="blg-crumbs">
      <Link href="/">Home</Link>
      <span aria-hidden="true">/</span>
      <Link href={BLOG_BASE_PATH}>Blog</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{format}</span>
    </nav>
  );
  const prose = <div className="blg-prose" data-article-body="" dangerouslySetInnerHTML={{ __html: html }} />;
  const after = (
    <>
      <div className="blg-article-foot">
        <TagRow tags={tags} />
        {a.share ? <ShareLinks url={url} title={post.title} layout="row" /> : null}
      </div>
      {a.author ? <AuthorCard author={author} /> : null}
      {a.prevNext ? <PrevNext prev={prev} next={next} /> : null}
    </>
  );
  const ending = (
    <>
      {a.related > 0 ? <Related posts={related} settings={settings} /> : null}
      {a.ctaBand && settings.cta.title.trim() ? (
        <InnerCtaBand
          eyebrow={settings.cta.eyebrow}
          title={settings.cta.title}
          lead={settings.cta.body}
          primaryHref={settings.cta.primaryHref}
          primaryLabel={settings.cta.primaryLabel}
          secondaryHref={settings.cta.secondaryHref || undefined}
          secondaryLabel={settings.cta.secondaryLabel || undefined}
        />
      ) : null}
    </>
  );
  const banner = preview ? (
    <div className="blg-preview-banner" role="status">
      Draft preview — visitors cannot see this until it is published.
    </div>
  ) : null;

  if (template === 'focus') {
    return (
      <main id="main-content" className={shell('focus')} style={look.style}>
        {banner}
        {a.progressBar ? <ReadingProgress /> : null}
        <header className="blg-af-head">
          <div className="blg-af-col">
            <p className="blg-af-kicker">
              <Link href={BLOG_BASE_PATH}>Blog</Link>
              <span aria-hidden="true"> / </span>
              {format}
            </p>
            <h1 className="blg-title">{post.title}</h1>
            {post.excerpt ? <p className="blg-lead">{post.excerpt}</p> : null}
            <Byline author={author} published={post.published_at} minutes={minutes} showAuthor={a.author} />
          </div>
        </header>
        <figure className="blg-af-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={appHref(cover)} alt="" fetchPriority="high" />
        </figure>
        <div className="blg-af-col blg-af-body">
          <KeyPoints points={points} label={settings.labels.keyPoints} />
          {prose}
          {after}
        </div>
        {ending}
        <ArticleToc headings={tocHeadings} label={settings.labels.toc} minutes={minutes} mode="float" />
      </main>
    );
  }

  if (template === 'feature') {
    return (
      <main id="main-content" className={shell('feature')} style={look.style}>
        {banner}
        {a.progressBar ? <ReadingProgress /> : null}
        <header className="blg-afe-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="blg-afe-cover" src={appHref(cover)} alt="" fetchPriority="high" />
          <div className="container blg-afe-copy">
            {crumbs}
            <p className="blg-afe-kicker">{format}</p>
            <h1 className="blg-title">{post.title}</h1>
            {post.excerpt ? <p className="blg-lead">{post.excerpt}</p> : null}
            <Byline author={author} published={post.published_at} minutes={minutes} showAuthor={a.author} />
          </div>
          <a href="#article-start" className="blg-afe-cue">
            Scroll to read <span aria-hidden="true">↓</span>
          </a>
        </header>
        <div id="article-start" className="blg-afe-col">
          {prose}
          <KeyPoints points={points} label={settings.labels.keyPoints} />
          {after}
        </div>
        {ending}
        <ArticleToc headings={tocHeadings} label={settings.labels.toc} minutes={minutes} mode="float" />
      </main>
    );
  }

  return (
    <main id="main-content" className={shell('technical')} style={look.style}>
      {banner}
      {a.progressBar ? <ReadingProgress /> : null}
      <header className="blg-at-head">
        <div className="container blg-at-head-inner">
          {crumbs}
          <div className="blg-at-badges">
            <span className="blg-at-format">{format}</span>
            {tags.slice(0, 3).map((tag) => (
              <Link key={tag} href={blogTagPath(tag)} className="blg-at-tag">
                {tag}
              </Link>
            ))}
          </div>
          <h1 className="blg-title">{post.title}</h1>
          {post.excerpt ? <p className="blg-lead">{post.excerpt}</p> : null}
          <dl className="blg-at-specs">
            {a.author ? (
              <div className="blg-at-spec-author">
                <dt>Author</dt>
                <dd>
                  <Avatar author={author} size={28} />
                  {author.name}
                </dd>
              </div>
            ) : null}
            {post.published_at ? (
              <div>
                <dt>Published</dt>
                <dd>
                  <time dateTime={isoOf(post.published_at)}>{formatDate(post.published_at)}</time>
                </dd>
              </div>
            ) : null}
            {updated ? (
              <div>
                <dt>Updated</dt>
                <dd>
                  <time dateTime={isoOf(post.updated_at)}>{formatDate(post.updated_at)}</time>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Reading time</dt>
              <dd>{minutes} min</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className={`container blg-at-grid${a.share ? '' : ' no-share'}`}>
        {a.share ? (
          <aside className="blg-at-rail">
            <ShareLinks url={url} title={post.title} layout="rail" />
          </aside>
        ) : null}
        <div className="blg-at-main">
          <figure className="blg-at-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={appHref(cover)} alt="" fetchPriority="high" />
          </figure>
          <KeyPoints points={points} label={settings.labels.keyPoints} />
          {prose}
          {after}
        </div>
        <aside className="blg-at-side">
          <ArticleToc headings={tocHeadings} label={settings.labels.toc} minutes={minutes} mode="rail" />
          {a.sideCta ? <SideCta cta={settings.cta} /> : null}
        </aside>
      </div>
      {ending}
    </main>
  );
}
