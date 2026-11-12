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
import {
  MEDIA_COMPRESS_MAX_IMAGES,
  MEDIA_COMPRESS_MAX_VIDEOS,
  isCompressibleMedia,
  mediaCompressUiKind,
} from '@/lib/media-compress-shared';

type Asset = {
  id: number | null;
  path: string;
  mime: string | null;
  alt: string | null;
  original_name?: string | null;
  size_bytes?: number | null;
  tags_json?: string[] | null;
  created_at?: string | null;
  category?: string;
  source?: 'database' | 'filesystem' | 'legacy';
  /** True when the scanner found no CMS/DB or runtime-default references. */
  unused?: boolean;
};

type UsageSummary = {
  unusedCount: number;
  usedCount: number;
  scannedAt: string;
  dbRefCount: number;
  codeRefCount: number;
  available: boolean;
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

type CompressApiResult = ApiErrorBody & {
  message?: string;
  created?: number;
  skipped?: number;
  failed?: number;
  savedBytes?: number;
  results?: Array<{
    sourcePath: string;
    kind?: string;
    ok: boolean;
    skipped?: boolean;
    reason?: string;
    path?: string;
  }>;
};

export default function MediaPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState('');
  const [stripAudio, setStripAudio] = useState(false);
  const [query, setQuery] = useState('');
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Asset | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editTags, setEditTags] = useState('');

  async function load(q = query) {
    setLoading(true);
    try {
      const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      const res = await fetch(`/api/admin/media${qs}`);
      let data: { error?: string; assets?: Asset[]; usage?: UsageSummary } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(res.ok ? 'Failed to load media' : `Failed to load media (HTTP ${res.status})`);
      }
      if (!res.ok) throw new Error(formatApiError(data, 'Failed to load media', res.status));
      setAssets(data.assets || []);
      setUsage(data.usage || null);
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

  const visibleAssets = useMemo(
    () => (unusedOnly ? assets.filter((a) => a.unused) : assets),
    [assets, unusedOnly]
  );

  const selectableAssets = useMemo(
    () => visibleAssets.filter((a) => isCompressibleMedia(a.mime, a.path)),
    [visibleAssets]
  );

  const selectedAssets = useMemo(
    () => selectableAssets.filter((a) => selected[a.path]),
    [selectableAssets, selected]
  );

  const selectedImages = useMemo(
    () => selectedAssets.filter((a) => mediaCompressUiKind(a.mime, a.path) === 'image'),
    [selectedAssets]
  );
  const selectedVideos = useMemo(
    () => selectedAssets.filter((a) => mediaCompressUiKind(a.mime, a.path) === 'video'),
    [selectedAssets]
  );

  function toggleSelected(path: string, next?: boolean) {
    setSelected((prev) => {
      const on = next ?? !prev[path];
      if (!on) {
        const { [path]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [path]: true };
    });
  }

  function selectAllCompressible() {
    const next: Record<string, boolean> = {};
    for (const asset of selectableAssets) next[asset.path] = true;
    setSelected(next);
  }

  function clearSelection() {
    setSelected({});
  }

  async function postCompress(items: Asset[], label: string): Promise<CompressApiResult> {
    setCompressProgress(label);
    const res = await fetch('/api/admin/media/compress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((asset) => ({ id: asset.id, path: asset.path })),
        stripAudio,
      }),
    });
    let data: CompressApiResult = {};
    try {
      data = await res.json();
    } catch {
      throw new Error(res.ok ? 'Compress failed' : `Compress failed (HTTP ${res.status})`);
    }
    if (!res.ok) {
      throw new Error(formatApiError(data, 'Compress failed', res.status));
    }
    return data;
  }

  async function compressSelected() {
    if (!selectedAssets.length) {
      setError('Select one or more images (JPEG/PNG/WebP/GIF) or videos (MP4/WebM) to compress.');
      return;
    }

    const images = selectedImages.slice(0, MEDIA_COMPRESS_MAX_IMAGES);
    const videos = selectedVideos.slice(0, MEDIA_COMPRESS_MAX_VIDEOS);
    if (selectedVideos.length > MEDIA_COMPRESS_MAX_VIDEOS) {
      setError(
        `Select at most ${MEDIA_COMPRESS_MAX_VIDEOS} videos at a time (encoding is slow). Images can go up to ${MEDIA_COMPRESS_MAX_IMAGES}.`
      );
      return;
    }

    setError('');
    setMessage('');
    setCompressing(true);
    setCompressProgress('Starting…');

    const failures: string[] = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    try {
      // Images in one batch; videos one-by-one to avoid request timeouts on long encodes.
      if (images.length) {
        const data = await postCompress(
          images,
          `Compressing ${images.length} image${images.length === 1 ? '' : 's'}…`
        );
        created += data.created || 0;
        skipped += data.skipped || 0;
        failed += data.failed || 0;
        for (const r of data.results || []) {
          if (!r.ok && !r.skipped) failures.push(`${r.sourcePath}: ${r.reason || 'failed'}`);
        }
      }

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const data = await postCompress(
          [video],
          `Compressing video ${i + 1}/${videos.length} (${video.original_name || video.path})…`
        );
        created += data.created || 0;
        skipped += data.skipped || 0;
        failed += data.failed || 0;
        for (const r of data.results || []) {
          if (!r.ok && !r.skipped) failures.push(`${r.sourcePath}: ${r.reason || 'failed'}`);
        }
      }

      const summary = [
        created ? `Created ${created}` : 'No new copies',
        skipped ? `${skipped} skipped` : null,
        failed ? `${failed} failed` : null,
        'Originals unchanged',
      ]
        .filter(Boolean)
        .join(' · ');
      const detail =
        failures.length > 0
          ? ` · ${failures.slice(0, 3).join('; ')}${failures.length > 3 ? '…' : ''}`
          : '';
      setMessage(`${summary}${detail}`);
      clearSelection();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compress failed');
      // Still refresh if some batches succeeded before the failure.
      await load().catch(() => undefined);
    } finally {
      setCompressing(false);
      setCompressProgress('');
    }
  }

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
    const warning = asset.unused
      ? `Delete ${asset.path}?\n\nThis file is not referenced in the CMS or site defaults.\nDeletion is permanent and cannot be undone.`
      : `Delete ${asset.path}?\n\nDeletion is permanent and cannot be undone.`;
    if (!confirm(warning)) return;
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
          <label className="admin-media-unused-filter">
            <input
              type="checkbox"
              checked={unusedOnly}
              onChange={(e) => setUnusedOnly(e.target.checked)}
              disabled={!usage?.available}
            />
            Unused only
            {usage?.available ? (
              <span className="admin-media-unused-count">{usage.unusedCount}</span>
            ) : null}
          </label>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            disabled={!selectableAssets.length || compressing}
            onClick={selectAllCompressible}
          >
            Select compressible
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            disabled={!selectedAssets.length || compressing}
            onClick={clearSelection}
          >
            Clear selection
          </button>
          <label
            className="admin-media-unused-filter"
            title="For hero/background loops. Leave unchecked to keep soundtrack."
          >
            <input
              type="checkbox"
              checked={stripAudio}
              onChange={(e) => setStripAudio(e.target.checked)}
              disabled={compressing || !selectedVideos.length}
            />
            Strip video audio
          </label>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={!selectedAssets.length || compressing || uploading}
            onClick={() => void compressSelected()}
            title="Creates a smaller copy (WebP for images, H.264 MP4 for video). Originals and CMS references stay unchanged."
          >
            {compressing
              ? compressProgress || 'Compressing…'
              : selectedAssets.length
                ? `Compress selected (${selectedImages.length} img · ${selectedVideos.length} vid)`
                : 'Compress selected'}
          </button>
        </div>
        <p className="admin-hint" style={{ marginTop: '0.65rem' }}>
          Max {formatMediaBytes(MEDIA_UPLOAD_MAX_BYTES)} · JPEG, PNG, WebP, GIF, SVG, MP4, WebM
        </p>
        <p className="admin-hint" style={{ marginTop: '0.35rem' }}>
          Compress adds a new library file and leaves the original unchanged. Images → WebP (sharp). Videos → H.264 MP4
          (ffmpeg, needs ffmpeg on the server; up to {MEDIA_COMPRESS_MAX_VIDEOS} videos / {MEDIA_COMPRESS_MAX_IMAGES}{' '}
          images per run). Verify quality, update references, then delete unused originals manually. SVG is not
          compressible here.
        </p>
        {compressing && compressProgress ? (
          <p className="admin-hint" style={{ marginTop: '0.35rem' }} role="status">
            {compressProgress}
          </p>
        ) : null}
        {usage?.available ? (
          <p className="admin-media-unused-legend" role="note">
            <span className="admin-media-unused-dot" aria-hidden="true" />
            Red dot beside Delete = not referenced in any CMS database field or site runtime default.
            Review carefully — deleted files cannot be recovered.
            {usage.unusedCount > 0 ? ` · ${usage.unusedCount} unused` : ' · none unused'}
          </p>
        ) : null}
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
        ) : null}
        {!loading && assets.length > 0 && visibleAssets.length === 0 ? (
          <p className="admin-empty">No unused files in this view. Clear “Unused only” to see the full library.</p>
        ) : null}
        {!loading && visibleAssets.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '0.9rem',
            }}
          >
            {visibleAssets.map((asset) => {
              const kind = mediaCompressUiKind(asset.mime, asset.path);
              const compressible = kind != null;
              const isSelected = !!selected[asset.path];
              return (
              <div
                key={asset.id ?? asset.path}
                style={{
                  border: isSelected ? '1px solid var(--admin-accent, #2563eb)' : '1px solid var(--admin-border, #e5e7eb)',
                  borderRadius: 8,
                  padding: '0.7rem',
                  background: isSelected ? 'color-mix(in srgb, var(--admin-accent, #2563eb) 6%, #fff)' : '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.45rem' }}>
                  {compressible ? (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={compressing}
                        onChange={(e) => toggleSelected(asset.path, e.target.checked)}
                      />
                      Compress{kind === 'video' ? ' (video)' : ''}
                    </label>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--admin-muted)' }}>Not compressible</span>
                  )}
                </div>
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
                {asset.original_name ? (
                  <div
                    title="Original file name — use this in catalog import sheets"
                    style={{ marginTop: '0.55rem', fontSize: '0.8rem', fontWeight: 600, wordBreak: 'break-all' }}
                  >
                    {asset.original_name}
                    {asset.size_bytes ? (
                      <span style={{ marginLeft: '0.35rem', fontWeight: 400, color: 'var(--admin-muted)', fontSize: '0.7rem' }}>
                        {formatMediaBytes(asset.size_bytes)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <code style={{ display: 'block', marginTop: asset.original_name ? '0.2rem' : '0.55rem', fontSize: '0.72rem', wordBreak: 'break-all' }}>
                  {asset.path}
                </code>
                {asset.source === 'filesystem' ? (
                  <div style={{ fontSize: '0.68rem', color: 'var(--admin-muted)', marginTop: '0.25rem' }}>On disk · not in DB yet</div>
                ) : null}
                {asset.alt ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-muted)', marginTop: '0.35rem' }}>{asset.alt}</div>
                ) : null}
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.55rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => copyPath(asset.path)}>
                    Copy URL
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => openEdit(asset)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary admin-media-delete-btn"
                    onClick={() => remove(asset)}
                    title={
                      asset.unused
                        ? 'Not referenced in the CMS or site defaults — deletion is permanent'
                        : 'Delete permanently'
                    }
                  >
                    Delete
                    {asset.unused ? (
                      <span
                        className="admin-media-unused-dot"
                        aria-label="Not in use"
                        title="Not referenced in the CMS or site defaults"
                      />
                    ) : null}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        ) : null}
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
