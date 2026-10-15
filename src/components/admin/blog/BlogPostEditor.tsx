'use client';

import dynamic from 'next/dynamic';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import MediaPicker from '@/components/admin/MediaPicker';
import SeoFieldsEditor from '@/components/admin/SeoFieldsEditor';
import { SelectInput, TextInput, ToggleCard } from '@/components/admin/form/controls';
import { StringListEditor } from '@/components/admin/section-kit';
import { useDirtyTracker } from '@/components/admin/unsaved-changes';
import { appHref } from '@/lib/base-path';
import {
  ACCENT_SWATCHES,
  ARTICLE_STYLE_OPTIONS,
  BLOG_ARTICLE_TEMPLATES,
  BLOG_POST_FORMATS,
  POST_DISPLAY_PARTS,
  articleStyleAttrs,
  postFormatLabel,
  resolveArticleTemplate,
  settingsForPost,
  type BlogSettings,
  type PostDisplay,
} from '@/lib/blog-design';
import {
  ARTICLE_STARTERS,
  bodyStats,
  checkScore,
  contentChecks,
  fillMissingAlt,
  firstBodyImage,
  guessFormat,
  suggestKeyPoints,
  suggestSummary,
  suggestTags,
  type CheckFix,
} from '@/lib/blog-writing';
import { publicMediaUrl } from '@/lib/media-url';
import { movedAddressNote, type MovedAddress } from '@/lib/moved-address';
import type { ResourcePost } from '@/lib/resources';
import { slugify } from '@/lib/types';

const BlogRichEditor = dynamic(() => import('./BlogRichEditor'), {
  ssr: false,
  loading: () => <div className="abl-rich-loading">Loading the editor…</div>,
});

type Draft = {
  title: string;
  slug: string;
  excerpt: string;
  body_html: string;
  cover_url: string;
  tags: string[];
  format: string;
  template: string;
  featured: boolean;
  author_name: string;
  author_role: string;
  author_avatar_url: string;
  key_points: string[];
  display: PostDisplay;
  status: 'draft' | 'published';
  /** datetime-local value */
  published_at: string;
  enabled: boolean;
  meta_title: string;
  meta_description: string;
};

/** ISO date → `YYYY-MM-DDTHH:mm` in the browser's time zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function toDraft(post: ResourcePost | null): Draft {
  return {
    title: post?.title || '',
    slug: post?.slug || '',
    excerpt: post?.excerpt || '',
    body_html: post?.body_html || '',
    cover_url: post?.cover_url || '',
    tags: post?.tags_json || [],
    format: post?.format || '',
    template: post?.template || '',
    featured: Boolean(post?.featured),
    author_name: post?.author_name || '',
    author_role: post?.author_role || '',
    author_avatar_url: post?.author_avatar_url || '',
    key_points: post?.key_points_json || [],
    display: post?.display_json || {},
    status: post?.status || 'draft',
    published_at: toLocalInput(post?.published_at || null),
    enabled: post ? Boolean(post.enabled) : true,
    meta_title: post?.meta_title || '',
    meta_description: post?.meta_description || '',
  };
}

function toPayload(d: Draft) {
  return {
    title: d.title.trim(),
    slug: d.slug || slugify(d.title),
    excerpt: d.excerpt.trim() || null,
    body_html: d.body_html || null,
    cover_url: d.cover_url || null,
    tags_json: d.tags,
    format: d.format,
    template: d.template,
    featured: d.featured,
    author_name: d.author_name.trim() || null,
    author_role: d.author_role.trim() || null,
    author_avatar_url: d.author_avatar_url || null,
    key_points_json: d.key_points,
    display_json: d.display,
    status: d.status,
    // Empty on a published post = stamp it now (server side).
    published_at: d.published_at ? new Date(d.published_at).toISOString() : d.status === 'published' ? undefined : null,
    enabled: d.enabled,
    meta_title: d.meta_title.trim() || null,
    meta_description: d.meta_description.trim() || null,
  };
}

/* ---------------------------------------------------------------- Local backup */

type Backup = { at: number; draft: Draft };
const backupKey = (post: ResourcePost | null) => `zigma.blog.backup.${post?.id ?? 'new'}`;

/** A browser copy newer than the saved post and different from it, if any. */
function readBackup(post: ResourcePost | null): Backup | null {
  if (typeof window === 'undefined') return null;
  try {
    const b = JSON.parse(window.localStorage.getItem(backupKey(post)) || 'null') as Backup | null;
    if (!b?.draft || typeof b.at !== 'number') return null;
    const merged = { ...toDraft(post), ...b.draft };
    if (JSON.stringify(merged) === JSON.stringify(toDraft(post))) return null;
    if (post?.updated_at && b.at < new Date(post.updated_at).getTime()) return null;
    return { at: b.at, draft: merged };
  } catch {
    return null;
  }
}

function clearBackups(post: ResourcePost | null) {
  try {
    window.localStorage.removeItem(backupKey(post));
    window.localStorage.removeItem(backupKey(null));
  } catch {
    /* storage unavailable */
  }
}

const timeLabel = (at: number) => new Date(at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/* ---------------------------------------------------------------- Small pieces */

function TagInput({ value, onChange, suggestions, detected }: { value: string[]; onChange: (tags: string[]) => void; suggestions: string[]; detected: string[] }) {
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '').trim();
    if (tag && !value.some((t) => t.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  const fresh = (list: string[]) => list.filter((s) => !value.some((t) => t.toLowerCase() === s.toLowerCase()));
  const found = fresh(detected);
  const others = fresh(suggestions).filter((s) => !found.includes(s)).slice(0, 10);
  return (
    <div className="admin-field">
      <label htmlFor="abl-tag-input">Tags (topics)</label>
      <div className="abl-tags">
        {value.map((t) => (
          <span key={t} className="abl-tag">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>
              ×
            </button>
          </span>
        ))}
        <input
          id="abl-tag-input"
          value={text}
          placeholder={value.length ? 'Add…' : 'UPS, Solar, Guide…'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => text.trim() && add(text)}
        />
      </div>
      {found.length ? (
        <div className="abl-tag-suggest is-detected">
          <span>In your text:</span>
          {found.map((s) => (
            <button key={s} type="button" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      ) : null}
      {others.length ? (
        <div className="abl-tag-suggest">
          {others.map((s) => (
            <button key={s} type="button" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      ) : null}
      <p className="az-admin-hint">Tags power the /blog topic filter and related articles. Enter or comma adds one.</p>
    </div>
  );
}

/** Blog default / on / off for one display part. */
function TriState({ label, value, inherited, onChange }: { label: string; value: boolean | undefined; inherited: boolean; onChange: (v: boolean | undefined) => void }) {
  const opts: Array<{ v: boolean | undefined; text: string }> = [
    { v: undefined, text: `Blog (${inherited ? 'on' : 'off'})` },
    { v: true, text: 'On' },
    { v: false, text: 'Off' },
  ];
  return (
    <div className="abl-tri">
      <span>{label}</span>
      <div className="abl-seg" role="radiogroup" aria-label={label}>
        {opts.map((o) => (
          <button key={o.text} type="button" role="radio" aria-checked={value === o.v} className={value === o.v ? 'is-on' : ''} onClick={() => onChange(o.v)}>
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const tone = score >= 85 ? 'good' : score >= 60 ? 'ok' : 'low';
  return (
    <svg className={`abl-score-ring is-${tone}`} viewBox="0 0 56 56" role="img" aria-label={`Readiness ${score}%`}>
      <circle cx="28" cy="28" r={r} className="abl-score-track" />
      <circle cx="28" cy="28" r={r} className="abl-score-fill" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      <text x="28" y="32" textAnchor="middle">
        {score}
      </text>
    </svg>
  );
}

type Props = {
  post: ResourcePost | null;
  settings: BlogSettings;
  tagSuggestions: string[];
  onBack: () => void;
  onSaved: (post: ResourcePost) => void;
  onDeleted: () => void;
};

/** Article editor: a visual writing canvas on the left; readiness, publishing and presentation on the right. */
export default function BlogPostEditor({ post: initial, settings, tagSuggestions, onBack, onSaved, onDeleted }: Props) {
  const [post, setPost] = useState(initial);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [slugEdited, setSlugEdited] = useState(Boolean(initial));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [autoStatus, setAutoStatus] = useState('');
  const [focus, setFocus] = useState(false);
  const [backup, setBackup] = useState<Backup | null>(() => readBackup(initial));
  const { dirty, markClean } = useDirtyTracker(draft);
  const [trackedInitial, setTrackedInitial] = useState(false);
  if (!trackedInitial) {
    setTrackedInitial(true);
    markClean();
  }

  const postRef = useRef(initial);
  const latestDraft = useRef(draft);
  const inflight = useRef<Promise<unknown> | null>(null);
  const autosaveRef = useRef<() => void>(() => {});
  const saveRef = useRef<() => void>(() => {});

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setTitle = (title: string) => set(slugEdited ? { title } : { title, slug: slugify(title) });
  const setDisplay = (patch: PostDisplay) =>
    setDraft((d) => {
      const next = { ...d.display, ...patch };
      for (const k of Object.keys(next) as Array<keyof PostDisplay>) if (next[k] === undefined) delete next[k];
      return { ...d, display: next };
    });

  const path = `/blog/${draft.slug || 'your-article'}`;
  const template = resolveArticleTemplate(draft.template, settings);
  const defaultLayout = BLOG_ARTICLE_TEMPLATES.find((t) => t.id === settings.articleTemplate)?.label || 'Technical brief';
  const livePost = post?.status === 'published' && post.enabled ? post : null;
  const effective = settingsForPost(settings, draft.display);
  const look = articleStyleAttrs(effective.style);

  const checked = useDeferredValue(draft);
  const detectedTags = useMemo(() => suggestTags(checked.title, checked.body_html, tagSuggestions, checked.tags), [checked.title, checked.body_html, checked.tags, tagSuggestions]);
  const checks = useMemo(() => contentChecks({ ...checked, suggestedTags: detectedTags }), [checked, detectedTags]);
  const score = checkScore(checks);
  const words = useMemo(() => bodyStats(checked.body_html).words, [checked.body_html]);
  const bodyImage = firstBodyImage(checked.body_html);
  const guessedFormat = draft.format ? null : guessFormat(checked.title, checked.body_html);

  /* ---------- Saving ---------- */

  async function send(next: Draft) {
    const current = postRef.current;
    const res = await fetch(current ? `/api/admin/resources/${current.id}` : '/api/admin/resources', {
      method: current ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(next)),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');
    const id = current?.id ?? data.id;
    const saved: ResourcePost =
      data.post ?? (await fetch(`/api/admin/resources/${id}`).then(async (r) => ((await r.json()) as { post: ResourcePost }).post));
    postRef.current = saved;
    setPost(saved);
    clearBackups(saved);
    onSaved(saved);
    return { saved, redirect: data.redirect as MovedAddress };
  }

  async function persist(next: Draft = draft): Promise<ResourcePost> {
    if (!next.title.trim()) throw new Error('Add a title first.');
    if (inflight.current) await inflight.current.catch(() => undefined);
    const { saved, redirect } = await send(next);
    setDraft(toDraft(saved));
    setSlugEdited(true);
    markClean();
    setAutoStatus('');
    setMessage(
      `${saved.status === 'published' ? (saved.enabled ? 'Published' : 'Saved (hidden from the site)') : 'Draft saved'}.${movedAddressNote(redirect)}`
    );
    return saved;
  }

  /** Quiet save of drafts while writing; never touches a published article. */
  function autosave() {
    if (inflight.current) return;
    const sent = draft;
    inflight.current = send(sent)
      .then(({ saved }) => {
        setSlugEdited(true);
        if (saved.slug !== sent.slug) setDraft((d) => (d.slug === sent.slug ? { ...d, slug: saved.slug } : d));
        if (JSON.stringify(latestDraft.current) === JSON.stringify(sent)) markClean();
        setAutoStatus(`Draft saved automatically · ${timeLabel(Date.now())}`);
      })
      .catch((e: Error) => setAutoStatus(`Autosave paused — ${e.message}`))
      .finally(() => {
        inflight.current = null;
      });
  }

  async function run(key: string, task: () => Promise<unknown>) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy('');
    }
  }

  const save = (status?: Draft['status']) =>
    run(status === 'published' && draft.status !== 'published' ? 'publish' : 'save', () => persist(status ? { ...draft, status } : draft));

  const canAutosave =
    dirty && !busy && !backup && draft.status === 'draft' && (!post || post.status === 'draft') && draft.title.trim().length > 2 && (Boolean(post) || words >= 15);

  useEffect(() => {
    latestDraft.current = draft;
    autosaveRef.current = autosave;
    saveRef.current = () => void save();
  });

  useEffect(() => {
    if (!canAutosave) return;
    const t = window.setTimeout(() => autosaveRef.current(), 4000);
    return () => window.clearTimeout(t);
  }, [canAutosave, draft]);

  // Browser copy of unsaved work, so a closed tab or crash loses nothing.
  useEffect(() => {
    if (backup) return;
    const key = backupKey(post);
    if (!dirty) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* storage unavailable */
      }
      return;
    }
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), draft } satisfies Backup));
      } catch {
        /* storage full or unavailable */
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [draft, dirty, post, backup]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      } else if (e.key === 'Escape' && focus && !document.querySelector('.abl-slash')) {
        setFocus(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focus]);

  function preview() {
    const tab = window.open('', '_blank');
    void run('preview', async () => {
      try {
        const saved = post && !dirty ? post : await persist();
        const res = await fetch(`/api/admin/resources/${saved.id}/preview`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not create a preview link');
        if (tab) tab.location.href = appHref(data.url);
        else window.location.href = appHref(data.url);
      } catch (e) {
        tab?.close();
        throw e;
      }
    });
  }

  function remove() {
    if (!post || !window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    void run('delete', async () => {
      const res = await fetch(`/api/admin/resources/${post.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      clearBackups(post);
      markClean();
      onDeleted();
    });
  }

  function applyFix(kind: CheckFix) {
    setError('');
    switch (kind) {
      case 'summary':
        set({ excerpt: suggestSummary(draft.body_html) });
        break;
      case 'cover':
        set({ cover_url: firstBodyImage(draft.body_html) || '' });
        break;
      case 'alt': {
        const { html, changed } = fillMissingAlt(draft.body_html);
        set({ body_html: html });
        setMessage(changed ? `Described ${changed} image${changed === 1 ? '' : 's'} — check the wording in the editor.` : 'Nothing to fill — add alt text on each image in the editor.');
        break;
      }
      case 'keyPoints':
        set({ key_points: suggestKeyPoints(draft.body_html) });
        break;
      case 'tags':
        set({ tags: [...draft.tags, ...detectedTags.slice(0, 3)] });
        break;
      case 'format':
        set({ format: guessFormat(draft.title, draft.body_html) || '' });
        break;
    }
  }

  const excerptLen = draft.excerpt.trim().length;
  const open = checks.filter((c) => !c.ok);

  return (
    <>
      <AdminFloatingActions status={busy ? (busy === 'preview' ? 'Opening preview…' : 'Saving…') : message || autoStatus || undefined}>
        <button type="button" className="admin-btn admin-btn-secondary" disabled={Boolean(busy)} onClick={preview}>
          Preview ↗
        </button>
        {draft.status === 'draft' ? (
          <>
            <button type="button" className="admin-btn admin-btn-secondary" disabled={Boolean(busy)} onClick={() => void save()} title="Ctrl+S">
              {busy === 'save' ? 'Saving…' : 'Save draft'}
            </button>
            <button type="button" className="admin-btn admin-btn-primary" disabled={Boolean(busy)} onClick={() => void save('published')}>
              {busy === 'publish' ? 'Publishing…' : 'Publish'}
            </button>
          </>
        ) : (
          <button type="button" className="admin-btn admin-btn-primary" disabled={Boolean(busy)} onClick={() => void save()} title="Ctrl+S">
            {busy === 'save' ? 'Saving…' : post?.status === 'published' ? 'Update' : 'Publish'}
          </button>
        )}
      </AdminFloatingActions>

      <div className="abl-edit-top">
        <button type="button" className="admin-btn admin-btn-secondary" onClick={onBack}>
          ← All articles
        </button>
        <span className={`admin-badge ${post?.status === 'published' ? 'published' : 'draft'}`}>
          {!post ? 'New' : post.status === 'published' ? (post.enabled ? 'Live' : 'Hidden') : 'Draft'}
        </span>
        {livePost ? (
          <a className="abl-edit-path" href={appHref(`/blog/${livePost.slug}`)} target="_blank" rel="noreferrer">
            /blog/{livePost.slug} ↗
          </a>
        ) : null}
        <span className={`abl-save-state${dirty ? ' is-dirty' : ''}`}>{dirty ? 'Unsaved changes' : autoStatus || (post ? 'All changes saved' : '')}</span>
      </div>

      {backup ? (
        <div className="abl-restore" role="alert">
          <span>
            Unsaved work from <strong>{timeLabel(backup.at)}</strong> was found in this browser.
          </span>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => {
              setDraft(backup.draft);
              setSlugEdited(true);
              setBackup(null);
            }}
          >
            Restore it
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              clearBackups(post);
              setBackup(null);
            }}
          >
            Discard
          </button>
        </div>
      ) : null}

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="abl-editor">
        <div className="abl-main">
          <div className={`admin-card abl-write${focus ? ' is-focus' : ''}`}>
            <textarea
              className="abl-title-input"
              rows={1}
              value={draft.title}
              placeholder="Article title"
              aria-label="Title"
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
            />
            <div className="abl-slug">
              <span>/blog/</span>
              <input
                value={draft.slug}
                aria-label="URL slug"
                placeholder="generated-from-the-title"
                onChange={(e) => {
                  setSlugEdited(true);
                  set({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') });
                }}
                onBlur={() => set({ slug: slugify(draft.slug) || slugify(draft.title) })}
              />
              {livePost && draft.slug !== livePost.slug ? <small>The old address will redirect here.</small> : null}
            </div>
            <div className="admin-field abl-summary">
              <div className="abl-label-row">
                <label htmlFor="abl-excerpt">Summary</label>
                {words > 40 ? (
                  <button type="button" className="abl-magic" onClick={() => applyFix('summary')} title="Uses the opening of the article">
                    ✨ {draft.excerpt.trim() ? 'Rewrite from the intro' : 'Write it from the intro'}
                  </button>
                ) : null}
              </div>
              <textarea
                id="abl-excerpt"
                className="admin-textarea"
                rows={3}
                value={draft.excerpt}
                placeholder="One or two sentences: what the reader will learn. Shown on cards, under the title and in Google."
                onChange={(e) => set({ excerpt: e.target.value })}
              />
              <p className={`az-admin-hint abl-count${excerptLen > 220 ? ' is-over' : ''}`}>{excerptLen} characters · aim for 120–200</p>
            </div>

            {!draft.body_html.trim() ? (
              <div className="abl-starters">
                <p className="abl-starters-title">Start from an outline — or just write below</p>
                <div className="abl-starters-grid">
                  {ARTICLE_STARTERS.filter((s) => s.body).map((s) => (
                    <button key={s.id} type="button" onClick={() => set({ body_html: s.body, format: draft.format || s.format })}>
                      <strong>{s.label}</strong>
                      <span>{s.summary}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <BlogRichEditor
              value={draft.body_html}
              onChange={(body_html) => set({ body_html })}
              canvasClass={`blg-article--${template}${look.className ? ` ${look.className}` : ''}`}
              canvasStyle={look.style}
              focus={focus}
              onFocusChange={setFocus}
            />
          </div>

          <div className="admin-card">
            <div className="abl-label-row">
              <h3 className="abl-card-title">{settings.labels.keyPoints || 'Key takeaways'}</h3>
              {bodyStats(checked.body_html).headings.some((h) => h.level === 2) ? (
                <button type="button" className="abl-magic" onClick={() => applyFix('keyPoints')}>
                  ✨ {draft.key_points.length ? 'Regenerate from sections' : 'Suggest from sections'}
                </button>
              ) : null}
            </div>
            <p className="admin-hint" style={{ marginTop: 0 }}>
              Three to five short bullets shown with the article — the skim-reader&rsquo;s summary. Empty = hidden.
            </p>
            <StringListEditor label="Takeaways" items={draft.key_points} onChange={(key_points) => set({ key_points })} />
          </div>

          <AdminCollapsible title="Search & sharing" description="Google title, description and preview">
            <SeoFieldsEditor
              value={{ title: draft.meta_title, description: draft.meta_description }}
              onChange={(next) => set({ meta_title: next.title, meta_description: next.description })}
              fallbackTitle={draft.title}
              fallbackDescription={draft.excerpt || draft.body_html}
              path={path}
            />
          </AdminCollapsible>
        </div>

        <aside className="abl-side">
          <section className="admin-card abl-side-card abl-ready">
            <div className="abl-ready-head">
              <ScoreRing score={score} />
              <div>
                <h3 className="abl-card-title">Readiness</h3>
                <p>{open.length ? `${open.length} thing${open.length === 1 ? '' : 's'} to polish` : 'Ready to publish'}</p>
              </div>
            </div>
            <ul className="abl-checks">
              {checks.map((c) => (
                <li key={c.id} className={c.ok ? 'is-ok' : 'is-todo'}>
                  <span className="abl-check-icon" aria-hidden>
                    {c.ok ? '✓' : '•'}
                  </span>
                  <div>
                    <strong>{c.label}</strong>
                    <small>{c.detail}</small>
                    {!c.ok && c.fix ? (
                      <button type="button" className="abl-magic" onClick={() => applyFix(c.fix!)}>
                        ✨ {c.fixLabel}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-card abl-side-card">
            <h3 className="abl-card-title">Publishing</h3>
            <div className="abl-seg abl-seg--full" role="radiogroup" aria-label="Status">
              {(['draft', 'published'] as const).map((st) => (
                <button key={st} type="button" role="radio" aria-checked={draft.status === st} className={draft.status === st ? 'is-on' : ''} onClick={() => set({ status: st })}>
                  {st === 'draft' ? 'Draft' : 'Published'}
                </button>
              ))}
            </div>
            <div className="admin-field">
              <label htmlFor="abl-date">Publish date</label>
              <input id="abl-date" type="datetime-local" className="admin-input" value={draft.published_at} onChange={(e) => set({ published_at: e.target.value })} />
              <p className="az-admin-hint">Empty = the moment it is published. Orders the blog, newest first.</p>
            </div>
            <ToggleCard id="abl-enabled" label="Visible on the site" hint="Off hides it everywhere, even when published" checked={draft.enabled} onChange={(enabled) => set({ enabled })} />
            <ToggleCard id="abl-featured" label="Featured" hint="Shown first in the /blog Featured section" checked={draft.featured} onChange={(featured) => set({ featured })} />
            <p className="az-admin-hint">Drafts save themselves while you write. Ctrl+S saves any time.</p>
          </section>

          <section className="admin-card abl-side-card">
            <h3 className="abl-card-title">Presentation</h3>
            <SelectInput
              label="Format (label on cards)"
              value={draft.format}
              options={[{ value: '', label: `Automatic (${postFormatLabel('', draft.tags)})` }, ...BLOG_POST_FORMATS]}
              onChange={(format) => set({ format })}
            />
            {guessedFormat ? (
              <p className="az-admin-hint">
                The title reads like a <strong>{postFormatLabel(guessedFormat)}</strong>.{' '}
                <button type="button" className="abl-linkish" onClick={() => set({ format: guessedFormat })}>
                  Use it
                </button>
              </p>
            ) : null}
            <SelectInput
              label="Article layout"
              value={draft.template}
              options={[{ value: '', label: `Blog default (${defaultLayout})` }, ...BLOG_ARTICLE_TEMPLATES.map((t) => ({ value: t.id, label: t.label }))]}
              onChange={(tpl) => set({ template: tpl })}
            />
            <MediaPicker label="Cover image" value={draft.cover_url} onChange={(cover_url) => set({ cover_url })} kinds={['image', 'svg']} allowUpload compact />
            {draft.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="abl-cover-preview" src={publicMediaUrl(draft.cover_url)} alt="" />
            ) : bodyImage ? (
              <div className="abl-cover-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="abl-cover-preview" src={publicMediaUrl(bodyImage)} alt="" />
                <p className="az-admin-hint">
                  Automatic: the first image in the article.{' '}
                  <button type="button" className="abl-linkish" onClick={() => set({ cover_url: bodyImage })}>
                    Pin it as the cover
                  </button>
                </p>
              </div>
            ) : (
              <p className="az-admin-hint">Landscape, at least 1600 px wide. Without one, the first article image is used, else a default photo.</p>
            )}
            <TagInput value={draft.tags} onChange={(tags) => set({ tags })} suggestions={tagSuggestions} detected={detectedTags} />
          </section>

          <section className="admin-card abl-side-card">
            <h3 className="abl-card-title">Author</h3>
            <TextInput label="Name" value={draft.author_name} onChange={(author_name) => set({ author_name })} placeholder={settings.author.name} hint="Empty = the default author (Blog → Design)" />
            <TextInput label="Role" value={draft.author_role} onChange={(author_role) => set({ author_role })} placeholder={settings.author.role} />
            <MediaPicker label="Photo" value={draft.author_avatar_url} onChange={(author_avatar_url) => set({ author_avatar_url })} kinds={['image', 'svg']} allowUpload compact />
          </section>

          <AdminCollapsible
            title="This article's look"
            description={Object.keys(draft.display).length ? `${Object.keys(draft.display).length} override${Object.keys(draft.display).length === 1 ? '' : 's'}` : 'Follows the blog design'}
          >
            <div className="abl-side-card">
              <div className="admin-field">
                <span className="abl-mini-label">Accent colour</span>
                <div className="abl-swatches">
                  <button type="button" className={`abl-swatch is-default${!draft.display.accent ? ' is-on' : ''}`} onClick={() => setDisplay({ accent: undefined })} title="Blog default">
                    Blog
                  </button>
                  {ACCENT_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`abl-swatch${draft.display.accent === c ? ' is-on' : ''}`}
                      style={{ background: c }}
                      onClick={() => setDisplay({ accent: c })}
                      aria-label={`Accent ${c}`}
                    />
                  ))}
                  <input type="color" aria-label="Custom accent" value={draft.display.accent || settings.style.accent || '#0284A8'} onChange={(e) => setDisplay({ accent: e.target.value })} />
                </div>
              </div>
              <SelectInput
                label="Text width"
                value={draft.display.width || ''}
                options={[{ value: '', label: 'Blog default' }, ...ARTICLE_STYLE_OPTIONS.width]}
                onChange={(w) => setDisplay({ width: (w || undefined) as PostDisplay['width'] })}
              />
              <TriState label="Drop cap" value={draft.display.dropCap} inherited={settings.style.dropCap === 'on' || (settings.style.dropCap === 'auto' && template === 'feature')} onChange={(dropCap) => setDisplay({ dropCap })} />
              {POST_DISPLAY_PARTS.map((p) => (
                <TriState
                  key={p.key}
                  label={p.label}
                  value={draft.display[p.key]}
                  inherited={p.key === 'related' ? settings.article.related > 0 : settings.article[p.key]}
                  onChange={(v) => setDisplay({ [p.key]: v })}
                />
              ))}
            </div>
          </AdminCollapsible>

          {post ? (
            <button type="button" className="admin-btn admin-btn-danger abl-delete" disabled={Boolean(busy)} onClick={remove}>
              {busy === 'delete' ? 'Deleting…' : 'Delete article'}
            </button>
          ) : null}
        </aside>
      </div>
    </>
  );
}
