'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MEDIA_UPLOAD_ACCEPT,
  MEDIA_UPLOAD_MAX_BYTES,
  MEDIA_UPLOAD_RESTRICTIONS,
  MEDIA_UPLOAD_TYPE_INFO,
  formatMediaBytes,
  validateMediaUploadFile,
} from '@/lib/media-upload-rules';

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

type ApiErrorBody = {
  error?: string;
  code?: string;
  detail?: string;
  receivedType?: string | null;
  receivedBytes?: number;
  maxBytes?: number;
  fileName?: string | null;
  allowedTypes?: string[];
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

function formatApiError(data: ApiErrorBody, fallback: string, status?: number): string {
  const parts: string[] = [];
  if (data.error) parts.push(data.error);
  else parts.push(fallback);
  if (data.code && !parts[0].includes(data.code)) {
    parts.push(`Code: ${data.code}`);
  }
  if (typeof data.receivedBytes === 'number' && typeof data.maxBytes === 'number') {
    parts.push(
      `Received ${formatMediaBytes(data.receivedBytes)} / limit ${formatMediaBytes(data.maxBytes)}.`
    );
  }
  if (data.receivedType != null && data.code === 'UNSUPPORTED_TYPE') {
    parts.push(`Reported type: ${data.receivedType || '(none)'}.`);
  }
  if (status && status >= 500 && data.detail && data.detail !== data.error) {
    parts.push(data.detail);
  }
  if (status && !data.error) {
    parts.push(`HTTP ${status}`);
  }
  return parts.filter(Boolean).join(' ');
}

export default function MediaPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Asset | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editTags, setEditTags] = useState('');

  async function load(q = query) {
    setLoading(true);
    try {
      const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      const res = await fetch(`/api/admin/media${qs}`);
      let data: { error?: string; assets?: Asset[] } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(res.ok ? 'Failed to load media' : `Failed to load media (HTTP ${res.status})`);
      }
      if (!res.ok) throw new Error(formatApiError(data, 'Failed to load media', res.status));
      setAssets(data.assets || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load media');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHint = useMemo(() => (query.trim() ? `Showing matches for “${query.trim()}”` : ''), [query]);

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setError('');
    setMessage('');

    const invalid = validateMediaUploadFile(file);
    if (invalid) {
      setError(invalid.message);
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
      let data: ApiErrorBody & { path?: string } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(
          res.ok
            ? 'Upload failed — server returned an empty response.'
            : `Upload failed (HTTP ${res.status}). The server may have rejected a large body before validation.`
        );
      }
      if (!res.ok) {
        setError(formatApiError(data, 'Upload failed', res.status));
        return;
      }
      setMessage(`Uploaded: ${data.path}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
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
    let data: ApiErrorBody = {};
    try {
      data = await res.json();
    } catch {
      setError(`Delete failed (HTTP ${res.status})`);
      return;
    }
    if (!res.ok) {
      setError(formatApiError(data, 'Delete failed', res.status));
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
    let data: ApiErrorBody = {};
    try {
      data = await res.json();
    } catch {
      setError(`Update failed (HTTP ${res.status})`);
      return;
    }
    if (!res.ok) {
      setError(formatApiError(data, 'Update failed', res.status));
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
          Browse CMS assets from <code>/assets/images</code>, <code>/assets/svg</code>, and <code>/assets/video</code>{' '}
          (including seeded static files). Uploads are saved by type. Edit alt text and tags — metadata is stored in the
          database.
        </p>
        {error ? (
          <div className="admin-error" role="alert">
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Something went wrong</strong>
            {error}
          </div>
        ) : null}
        {message ? <div className="admin-success">{message}</div> : null}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label
            className={`admin-btn admin-btn-primary${uploading ? ' is-disabled' : ''}`}
            style={{ cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}
          >
            {uploading ? 'Uploading…' : 'Upload file'}
            <input
              type="file"
              accept={MEDIA_UPLOAD_ACCEPT}
              hidden
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                void onUpload(file).finally(() => {
                  e.target.value = '';
                });
              }}
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
        <p className="admin-hint" style={{ marginTop: '0.65rem' }}>
          Max {formatMediaBytes(MEDIA_UPLOAD_MAX_BYTES)} · JPEG, PNG, WebP, GIF, SVG, MP4, WebM
        </p>
        {filteredHint ? <p style={{ color: 'var(--admin-muted)', fontSize: '0.85rem' }}>{filteredHint}</p> : null}
      </div>

      <div className="admin-card admin-media-rules" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '0.98rem' }}>Supported files &amp; restrictions</h3>
        <p className="admin-hint" style={{ marginTop: 0, marginBottom: '0.85rem' }}>
          These rules are enforced by the upload API. Invalid files are rejected before they are saved.
        </p>
        <div className="admin-media-rules-grid">
          <div>
            <h4 className="admin-media-rules-title">Supported types</h4>
            <table className="admin-media-rules-table">
              <thead>
                <tr>
                  <th>Format</th>
                  <th>Extensions</th>
                  <th>MIME type</th>
                  <th>Saved under</th>
                </tr>
              </thead>
              <tbody>
                {MEDIA_UPLOAD_TYPE_INFO.map((row) => (
                  <tr key={row.mime}>
                    <td>{row.label}</td>
                    <td>
                      <code>{row.extensions}</code>
                    </td>
                    <td>
                      <code>{row.mime}</code>
                    </td>
                    <td>
                      <code>{row.folder}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="admin-media-rules-title">Current restrictions</h4>
            <ul className="admin-media-rules-list">
              {MEDIA_UPLOAD_RESTRICTIONS.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
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
