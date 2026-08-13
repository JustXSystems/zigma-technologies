'use client';

import { FormEvent, useEffect, useState } from 'react';

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body_html: string | null;
  cover_url: string | null;
  tags_json: string[] | null;
  status: 'draft' | 'published';
  meta_title: string | null;
  meta_description: string | null;
  enabled: number;
};

const empty = {
  slug: '',
  title: '',
  excerpt: '',
  body_html: '',
  cover_url: '',
  tags: '',
  status: 'draft' as 'draft' | 'published',
  meta_title: '',
  meta_description: '',
  enabled: true,
};

export default function ResourcesAdminPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editor, setEditor] = useState({ ...empty, id: 0 });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/resources');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setPosts(data.posts || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  function edit(post: Post) {
    setEditor({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      body_html: post.body_html || '',
      cover_url: post.cover_url || '',
      tags: (post.tags_json || []).join(', '),
      status: post.status,
      meta_title: post.meta_title || '',
      meta_description: post.meta_description || '',
      enabled: !!post.enabled,
    });
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
        cover_url: editor.cover_url || null,
        tags_json: editor.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        status: editor.status,
        meta_title: editor.meta_title || null,
        meta_description: editor.meta_description || null,
        enabled: editor.enabled,
      };
      const res = await fetch(editor.id ? `/api/admin/resources/${editor.id}` : '/api/admin/resources', {
        method: editor.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessage(editor.id ? 'Updated' : 'Created');
      setEditor({ ...empty, id: 0 });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function seed() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/resources/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seed failed');
      setMessage(`Seeded ${data.created} of ${data.total} guides`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this resource post?')) return;
    const res = await fetch(`/api/admin/resources/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Delete failed');
      return;
    }
    setMessage('Deleted');
    await load();
  }

  return (
    <div className="admin-card">
      <div className="admin-toolbar" style={{ marginBottom: '0.8rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Resources / Blog</h2>
          <p style={{ color: 'var(--admin-muted)', margin: '0.35rem 0 0' }}>
            Public at <code>/resources</code>. Run <code>scripts/migrate-resource-posts.sql</code> once.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={seed} disabled={busy}>
          Seed sample guides
        </button>
      </div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <form className="admin-form-grid" onSubmit={onSubmit} style={{ marginBottom: '1.5rem' }}>
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
          <textarea className="admin-textarea" rows={8} value={editor.body_html} onChange={(e) => setEditor({ ...editor, body_html: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Cover URL</label>
          <input className="admin-input" value={editor.cover_url} onChange={(e) => setEditor({ ...editor, cover_url: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Tags (comma)</label>
          <input className="admin-input" value={editor.tags} onChange={(e) => setEditor({ ...editor, tags: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Status</label>
          <select className="admin-select" value={editor.status} onChange={(e) => setEditor({ ...editor, status: e.target.value as 'draft' | 'published' })}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </div>
        <div className="admin-field">
          <label>Meta title</label>
          <input className="admin-input" value={editor.meta_title} onChange={(e) => setEditor({ ...editor, meta_title: e.target.value })} />
        </div>
        <div className="admin-field full">
          <label>Meta description</label>
          <input className="admin-input" value={editor.meta_description} onChange={(e) => setEditor({ ...editor, meta_description: e.target.value })} />
        </div>
        <div className="admin-field full" style={{ display: 'flex', gap: '0.6rem' }}>
          <button type="submit" className="admin-btn" disabled={busy}>
            {editor.id ? 'Update post' : 'Create post'}
          </button>
          {editor.id ? (
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditor({ ...empty, id: 0 })}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Tags</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.title}</strong>
                  <div style={{ color: 'var(--admin-muted)', fontSize: '0.85rem' }}>/resources/{p.slug}</div>
                </td>
                <td>{p.status}</td>
                <td>{(p.tags_json || []).join(', ')}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => edit(p)}>
                    Edit
                  </button>{' '}
                  <button type="button" className="admin-btn admin-btn-danger" onClick={() => remove(p.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
