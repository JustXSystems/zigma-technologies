'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUnsavedChangesState } from '@/components/admin/unsaved-changes';
import { appHref } from '@/lib/base-path';
import { DEFAULT_BLOG_SETTINGS, postFormatLabel, type BlogSettings } from '@/lib/blog-design';
import { bodyStats, firstBodyImage } from '@/lib/blog-writing';
import { publicMediaUrl } from '@/lib/media-url';
import type { ResourcePost } from '@/lib/resources';
import BlogPostEditor from './BlogPostEditor';

type Filter = 'all' | 'live' | 'draft' | 'hidden' | 'featured';

const FILTERS: ReadonlyArray<{ id: Filter; label: string; test: (p: ResourcePost) => boolean }> = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'live', label: 'Live', test: (p) => p.status === 'published' && Boolean(p.enabled) },
  { id: 'draft', label: 'Drafts', test: (p) => p.status === 'draft' },
  { id: 'hidden', label: 'Hidden', test: (p) => p.status === 'published' && !p.enabled },
  { id: 'featured', label: 'Featured', test: (p) => Boolean(p.featured) },
];

const dateLabel = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

type Loaded = { posts: ResourcePost[]; settings: BlogSettings | null };

async function fetchArticles(): Promise<Loaded> {
  const [postsRes, settingsRes] = await Promise.all([fetch('/api/admin/resources'), fetch('/api/admin/blog-settings')]);
  const postsData = await postsRes.json();
  if (!postsRes.ok) throw new Error(postsData.error || 'Failed to load articles');
  const settings = settingsRes.ok ? ((await settingsRes.json()) as { settings: BlogSettings }).settings : null;
  return { posts: postsData.posts || [], settings };
}

/** `?post=<id|new>` keeps the open article across reloads and makes it linkable. */
function setPostParam(value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set('post', value);
  else url.searchParams.delete('post');
  window.history.replaceState(null, '', url);
}

export default function BlogArticles({ initialPost }: { initialPost?: string }) {
  const { confirmDiscard } = useUnsavedChangesState();
  const [posts, setPosts] = useState<ResourcePost[]>([]);
  const [settings, setSettings] = useState<BlogSettings>(DEFAULT_BLOG_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<string | null>(initialPost || null);
  /** Editor instance; stays the same when a new article gets its id on first save. */
  const [session, setSession] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const apply = useCallback((data: Loaded) => {
    setPosts(data.posts);
    if (data.settings) setSettings(data.settings);
    setLoaded(true);
  }, []);
  const load = useCallback(async () => apply(await fetchArticles()), [apply]);

  useEffect(() => {
    let current = true;
    fetchArticles()
      .then((data) => {
        if (current) apply(data);
      })
      .catch((e: Error) => {
        if (!current) return;
        setError(e.message);
        setLoaded(true);
      });
    return () => {
      current = false;
    };
  }, [apply]);

  const tagSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) for (const t of p.tags_json || []) counts.set(t, (counts.get(t) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [posts]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, posts.filter(f.test).length])) as Record<Filter, number>, [posts]);

  const shown = useMemo(() => {
    const test = FILTERS.find((f) => f.id === filter)?.test ?? (() => true);
    const q = query.trim().toLowerCase();
    return posts.filter(
      (p) => test(p) && (!q || [p.title, p.slug, p.excerpt || '', ...(p.tags_json || [])].some((s) => s.toLowerCase().includes(q)))
    );
  }, [posts, filter, query]);

  function openPost(value: string | null) {
    if (value === open) return;
    if (open && !confirmDiscard()) return;
    setOpen(value);
    setSession((s) => s + 1);
    setPostParam(value);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function run(key: string, task: () => Promise<string>) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      setMessage(await task());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy('');
    }
  }

  const seed = () =>
    run('seed', async () => {
      const res = await fetch('/api/admin/resources/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add the samples');
      await load();
      return data.created ? `Added ${data.created} sample article${data.created === 1 ? '' : 's'}.` : 'The sample articles are already here.';
    });

  const quickToggle = (p: ResourcePost, patch: { featured?: boolean; enabled?: boolean }) =>
    run(`row-${p.id}`, async () => {
      const res = await fetch(`/api/admin/resources/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setPosts((list) => list.map((x) => (x.id === p.id ? data.post : x)));
      if (patch.featured !== undefined) return patch.featured ? `“${p.title}” is now featured.` : `“${p.title}” is no longer featured.`;
      return patch.enabled ? `“${p.title}” is visible again.` : `“${p.title}” is hidden from the site.`;
    });

  const duplicate = (p: ResourcePost) =>
    run(`row-${p.id}`, async () => {
      const taken = new Set(posts.map((x) => x.slug));
      let slug = `${p.slug}-copy`;
      for (let n = 2; taken.has(slug); n++) slug = `${p.slug}-copy-${n}`;
      const res = await fetch('/api/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title: `${p.title} (copy)`,
          excerpt: p.excerpt,
          body_html: p.body_html,
          cover_url: p.cover_url,
          tags_json: p.tags_json || [],
          format: p.format,
          template: p.template,
          author_name: p.author_name,
          author_role: p.author_role,
          author_avatar_url: p.author_avatar_url,
          key_points_json: p.key_points_json || [],
          display_json: p.display_json,
          status: 'draft',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not duplicate');
      await load();
      openPost(String(data.id));
      return '';
    });

  if (!loaded) return <div className="admin-card">Loading articles…</div>;

  if (open) {
    const post = open === 'new' ? null : posts.find((p) => String(p.id) === open);
    if (open !== 'new' && !post) {
      return (
        <div className="admin-card">
          <p>That article no longer exists.</p>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => openPost(null)}>
            ← All articles
          </button>
        </div>
      );
    }
    return (
      <BlogPostEditor
        key={session}
        post={post ?? null}
        settings={settings}
        tagSuggestions={tagSuggestions}
        onBack={() => openPost(null)}
        onSaved={(saved) => {
          setPosts((list) => (list.some((x) => x.id === saved.id) ? list.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...list]));
          if (open === 'new') {
            setOpen(String(saved.id));
            setPostParam(String(saved.id));
          }
        }}
        onDeleted={() => {
          setPosts((list) => list.filter((x) => String(x.id) !== open));
          setOpen(null);
          setPostParam(null);
          setMessage('Article deleted.');
        }}
      />
    );
  }

  return (
    <div className="admin-card">
      <div className="abl-list-tools">
        <div className="abl-seg" role="tablist" aria-label="Filter articles">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'is-on' : ''} onClick={() => setFilter(f.id)}>
              {f.label} <span>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <input className="admin-input abl-search" type="search" value={query} placeholder="Search title, slug or tag…" onChange={(e) => setQuery(e.target.value)} aria-label="Search articles" />
        <a className="admin-btn admin-btn-secondary" href={appHref('/blog')} target="_blank" rel="noreferrer">
          View /blog ↗
        </a>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => openPost('new')}>
          + New article
        </button>
      </div>

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      {!posts.length ? (
        <div className="abl-empty">
          <h3>No articles yet</h3>
          <p>Write your first one, or add three sample engineering guides to see every blog design with real content.</p>
          <div>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => openPost('new')}>
              + New article
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" disabled={Boolean(busy)} onClick={() => void seed()}>
              {busy === 'seed' ? 'Adding…' : 'Add sample articles'}
            </button>
          </div>
        </div>
      ) : !shown.length ? (
        <p className="admin-empty">No articles match.</p>
      ) : (
        <ul className="abl-rows">
          {shown.map((p) => {
            const live = p.status === 'published' && Boolean(p.enabled);
            return (
              <li key={p.id} className="abl-row">
                <button type="button" className="abl-row-main" onClick={() => openPost(String(p.id))}>
                  {p.cover_url || firstBodyImage(p.body_html) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="abl-row-thumb" src={publicMediaUrl(p.cover_url || firstBodyImage(p.body_html) || '')} alt="" loading="lazy" />
                  ) : (
                    <span className="abl-row-thumb" aria-hidden />
                  )}
                  <span className="abl-row-text">
                    <strong>{p.title}</strong>
                    <small>
                      /blog/{p.slug} · {postFormatLabel(p.format, p.tags_json || [])} · {bodyStats(p.body_html || '').minutes} min
                      {p.tags_json?.length ? ` · ${p.tags_json.slice(0, 3).join(', ')}` : ''}
                    </small>
                  </span>
                </button>
                <span className="abl-row-status">
                  <span className={`admin-badge ${live ? 'published' : 'draft'}`}>{live ? 'Live' : p.status === 'draft' ? 'Draft' : 'Hidden'}</span>
                  <small>{dateLabel(p.published_at || p.updated_at)}</small>
                </span>
                <span className="abl-row-actions">
                  <button
                    type="button"
                    className={`abl-star${p.featured ? ' is-on' : ''}`}
                    aria-pressed={Boolean(p.featured)}
                    title={p.featured ? 'Featured — click to unfeature' : 'Mark as featured'}
                    disabled={busy === `row-${p.id}`}
                    onClick={() => void quickToggle(p, { featured: !p.featured })}
                  >
                    ★
                  </button>
                  {p.status === 'published' ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      disabled={busy === `row-${p.id}`}
                      onClick={() => void quickToggle(p, { enabled: !p.enabled })}
                    >
                      {p.enabled ? 'Hide' : 'Show'}
                    </button>
                  ) : null}
                  {live ? (
                    <a className="admin-btn admin-btn-secondary" href={appHref(`/blog/${p.slug}`)} target="_blank" rel="noreferrer">
                      View ↗
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    title="Copy as a new draft — same layout, text and settings"
                    disabled={busy === `row-${p.id}`}
                    onClick={() => void duplicate(p)}
                  >
                    Duplicate
                  </button>
                  <button type="button" className="admin-btn admin-btn-primary" onClick={() => openPost(String(p.id))}>
                    Edit
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
