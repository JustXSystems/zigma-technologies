'use client';

import { FormEvent, useEffect, useState } from 'react';

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body_html: string | null;
  source_name: string | null;
  source_url: string | null;
  status: 'draft' | 'published';
  enabled: number;
};

const empty = {
  id: 0,
  slug: '',
  title: '',
  excerpt: '',
  body_html: '',
  source_name: '',
  source_url: '',
  status: 'draft' as 'draft' | 'published',
  enabled: true,
};

export default function PressAdminPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editor, setEditor] = useState(empty);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/press');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setPosts(data.posts || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function seed() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/press/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seed failed');
      setMessage(data.skipped ? 'Already seeded' : `Inserted ${data.inserted}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seed failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        slug: editor.slug.trim(),
        title: editor.title.trim(),
        excerpt: editor.excerpt || null,
        body_html: editor.body_html || null,
        source_name: editor.source_name || null,
        source_url: editor.source_url || null,
        status: editor.status,
        enabled: editor.enabled,
      };
      const res = await fetch(editor.id ? `/api/admin/press/${editor.id}` : '/api/admin/press', {
        method: editor.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessage('Saved');
      setEditor(empty);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <button type="button" className="admin-btn" onClick={seed} disabled={busy}>
          Seed samples
        </button>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="admin-success">{message}</p> : null}
      <div className="admin-split">
        <form className="admin-card" onSubmit={onSubmit}>
          <h2>{editor.id ? 'Edit press post' : 'New press post'}</h2>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label>Title</label>
              <input className="admin-input" value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} required />
            </div>
            <div className="admin-field">
              <label>Slug</label>
              <input className="admin-input" value={editor.slug} onChange={(e) => setEditor({ ...editor, slug: e.target.value })} required />
            </div>
            <div className="admin-field full">
              <label>Excerpt</label>
              <textarea className="admin-textarea" value={editor.excerpt} onChange={(e) => setEditor({ ...editor, excerpt: e.target.value })} />
            </div>
            <div className="admin-field full">
              <label>Body HTML</label>
              <textarea className="admin-textarea" value={editor.body_html} onChange={(e) => setEditor({ ...editor, body_html: e.target.value })} />
            </div>
            <div className="admin-field">
              <label>Source name</label>
              <input className="admin-input" value={editor.source_name} onChange={(e) => setEditor({ ...editor, source_name: e.target.value })} />
            </div>
            <div className="admin-field">
              <label>Source URL</label>
              <input className="admin-input" value={editor.source_url} onChange={(e) => setEditor({ ...editor, source_url: e.target.value })} />
            </div>
            <div className="admin-field">
              <label>Status</label>
              <select className="admin-select" value={editor.status} onChange={(e) => setEditor({ ...editor, status: e.target.value as 'draft' | 'published' })}>
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
            </div>
          </div>
          <button type="submit" className="admin-btn" disabled={busy}>
            Save
          </button>
        </form>
        <div className="admin-card">
          <h2>Posts</h2>
          <ul className="admin-list">
            {posts.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="admin-linkish"
                  onClick={() =>
                    setEditor({
                      id: p.id,
                      slug: p.slug,
                      title: p.title,
                      excerpt: p.excerpt || '',
                      body_html: p.body_html || '',
                      source_name: p.source_name || '',
                      source_url: p.source_url || '',
                      status: p.status,
                      enabled: !!p.enabled,
                    })
                  }
                >
                  {p.title}
                </button>
                <span className="meta">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
