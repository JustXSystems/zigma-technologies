'use client';

import { useEffect, useMemo, useState } from 'react';

type Asset = {
  id: number | null;
  path: string;
  mime: string | null;
  alt: string | null;
  tags_json?: string[] | null;
  created_at?: string | null;
  category?: string;
  source?: 'database' | 'filesystem' | 'legacy';
};

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function MediaPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Asset | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editTags, setEditTags] = useState('');

  async function load(q = query) {
    setLoading(true);
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    const res = await fetch(`/api/admin/media${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load media');
    setAssets(data.assets || []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((e) => {
      setError(e.message);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHint = useMemo(() => (query.trim() ? `Showing matches for “${query.trim()}”` : ''), [query]);

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setError('');
    setMessage('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Upload failed');
      return;
    }
    setMessage(`Uploaded: ${data.path}`);
    await load();
  }

  async function copyPath(path: string) {
    try {
      await navigator.clipboard.writeText(path);
      setMessage(`Copied ${path}`);
    } catch {
      setMessage(path);
    }
  }

  async function remove(asset: Asset) {
    if (!confirm(`Delete ${asset.path}?`)) return;
    setError('');
    const qs = asset.id ? `id=${asset.id}` : `path=${encodeURIComponent(asset.path)}`;
    const res = await fetch(`/api/admin/media?${qs}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Delete failed');
      return;
    }
    setMessage('Deleted');
    await load();
  }

  function openEdit(asset: Asset) {
    setEditing(asset);
    setEditAlt(asset.alt || '');
    setEditTags(parseTags(asset.tags_json).join(', '));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError('');
    const tags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await fetch('/api/admin/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing.id ?? undefined,
        path: editing.path,
        alt: editAlt || null,
        tags,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Update failed');
      return;
    }
    setMessage('Media metadata saved');
    setEditing(null);
    await load();
  }

  const isImage = (mime: string | null, path: string) =>
    (mime && mime.startsWith('image/')) || /\.(png|jpe?g|webp|gif|svg)$/i.test(path);

  return (
    <div>
      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Media library</h2>
        <p style={{ color: 'var(--admin-muted)' }}>
          Browse CMS assets from <code>/assets/images</code>, <code>/assets/svg</code>, and <code>/assets/video</code> (including seeded static files). Uploads are saved by type. Edit alt text and tags — metadata is stored in the database.
        </p>
        {error ? <div className="admin-error">{error}</div> : null}
        {message ? <div className="admin-success">{message}</div> : null}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="admin-btn admin-btn-primary" style={{ cursor: 'pointer' }}>
            Upload file
            <input
              type="file"
              accept="image/*,video/mp4,video/webm,.svg"
              hidden
              onChange={(e) => onUpload(e.target.files?.[0])}
            />
          </label>
          <input
            className="admin-input"
            style={{ maxWidth: 280 }}
            placeholder="Search path, alt, tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') load(query).catch((err) => setError(err.message));
            }}
          />
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => load(query).catch((e) => setError(e.message))}>
            Search
          </button>
        </div>
        {filteredHint ? <p style={{ color: 'var(--admin-muted)', fontSize: '0.85rem' }}>{filteredHint}</p> : null}
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0, fontSize: '0.98rem' }}>Library</h3>
        {loading ? <p style={{ color: 'var(--admin-muted)' }}>Loading…</p> : null}
        {!loading && assets.length === 0 ? (
          <p className="admin-empty">No files found under /assets/images, /assets/svg, or /assets/video.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '0.9rem',
            }}
          >
            {assets.map((asset) => (
              <div
                key={asset.id ?? asset.path}
                style={{
                  border: '1px solid var(--admin-border, #e5e7eb)',
                  borderRadius: 8,
                  padding: '0.7rem',
                  background: '#fff',
                }}
              >
                {isImage(asset.mime, asset.path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.path}
                    alt={asset.alt || ''}
                    style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6, background: '#f3f4f6' }}
                  />
                ) : (
                  <div
                    style={{
                      height: 110,
                      borderRadius: 6,
                      background: '#f3f4f6',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--admin-muted)',
                    }}
                  >
                    {asset.mime || 'file'}
                  </div>
                )}
                <code style={{ display: 'block', marginTop: '0.55rem', fontSize: '0.72rem', wordBreak: 'break-all' }}>
                  {asset.path}
                </code>
                {asset.source === 'filesystem' ? (
                  <div style={{ fontSize: '0.68rem', color: 'var(--admin-muted)', marginTop: '0.25rem' }}>On disk · not in DB yet</div>
                ) : null}
                {asset.alt ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-muted)', marginTop: '0.35rem' }}>{asset.alt}</div>
                ) : null}
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.55rem', flexWrap: 'wrap' }}>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => copyPath(asset.path)}>
                    Copy URL
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => openEdit(asset)}>
                    Edit
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => remove(asset)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing ? (
        <div className="admin-modal-backdrop" onClick={() => setEditing(null)}>
          <form className="admin-modal" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
            <h2>Edit media</h2>
            <p style={{ color: 'var(--admin-muted)', fontSize: '0.85rem' }}>
              <code>{editing.path}</code>
            </p>
            <div className="admin-form-grid">
              <div className="admin-field full">
                <label>Alt text</label>
                <input className="admin-input" value={editAlt} onChange={(e) => setEditAlt(e.target.value)} />
              </div>
              <div className="admin-field full">
                <label>Tags (comma-separated)</label>
                <input className="admin-input" value={editTags} onChange={(e) => setEditTags(e.target.value)} />
              </div>
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="admin-btn admin-btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
