'use client';

import { useEffect, useState } from 'react';
import {
  isImageMediaPath,
  isVideoMediaPath,
  isVisualMediaPath,
  publicMediaUrl,
  toStorageMediaPath,
} from '@/lib/media-url';
import {
  MEDIA_UPLOAD_ACCEPT,
  MEDIA_UPLOAD_MAX_BYTES,
  formatMediaBytes,
  validateMediaUploadFile,
} from '@/lib/media-upload-rules';

type Asset = { id: number | null; path: string; mime: string | null; alt: string | null };

export type MediaPickerKind = 'image' | 'video' | 'svg' | 'visual';

type Props = {
  value: string;
  onChange: (path: string) => void;
  label?: string;
  /** Hide thumbnail strip; denser row for studio layouts */
  compact?: boolean;
  /**
   * Which library assets can be chosen.
   * - image: raster (+ svg by extension/mime)
   * - visual: images, svg, and video (hero backgrounds)
   * - video / svg: filter to that kind only
   */
  kinds?: MediaPickerKind | MediaPickerKind[];
  /** Allow uploading into the media library from this picker. */
  allowUpload?: boolean;
  hint?: string;
};

function normalizeKinds(kinds?: MediaPickerKind | MediaPickerKind[]): MediaPickerKind[] {
  if (!kinds) return ['image', 'svg'];
  return Array.isArray(kinds) ? kinds : [kinds];
}

function assetAllowed(asset: Asset, kinds: MediaPickerKind[]): boolean {
  const mime = asset.mime;
  const path = asset.path;
  if (kinds.includes('visual')) return isVisualMediaPath(path, mime);
  if (kinds.includes('video') && isVideoMediaPath(path, mime)) return true;
  if (kinds.includes('svg') && (mime === 'image/svg+xml' || /\.svg(\?|$)/i.test(path))) return true;
  if (kinds.includes('image') && isImageMediaPath(path, mime)) return true;
  return false;
}

export default function MediaPicker({
  value,
  onChange,
  label = 'Image URL',
  compact = false,
  kinds,
  allowUpload = false,
  hint,
}: Props) {
  const kindList = normalizeKinds(kinds);
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadAssets() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/admin/media');
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to load media');
      setAssets(data.assets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadAssets();
  }, [open]);

  const previewIsVideo = value ? isVideoMediaPath(value) : false;
  const previewSrc = !compact && value && isImageMediaPath(value) ? publicMediaUrl(value) : '';

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setError('');
    setMessage('');
    const invalid = validateMediaUploadFile(file);
    if (invalid) {
      setError(invalid.message);
      return;
    }
    if (!assetAllowed({ id: null, path: file.name, mime: file.type, alt: null }, kindList)) {
      setError('That file type is not allowed for this field.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const path = toStorageMediaPath(String(data.path || ''));
      onChange(path);
      setMessage(`Uploaded ${path}`);
      await loadAssets();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const filtered = assets.filter((a) => assetAllowed(a, kindList));
  const acceptHint = kindList.includes('visual') || kindList.includes('video')
    ? 'Images, SVG, or video from the media library'
    : 'Images or SVG from the media library';

  return (
    <div className={`admin-field${compact ? ' admin-field--compact' : ''}`}>
      {label ? <label>{label}</label> : null}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="admin-input"
          style={{ flex: 1, minWidth: compact ? 140 : 180 }}
          value={value}
          onChange={(e) => onChange(toStorageMediaPath(e.target.value) || e.target.value)}
          placeholder="/assets/images/… · /assets/svg/… · /assets/video/…"
        />
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setOpen(true)}>
          Browse
        </button>
        {allowUpload ? (
          <label className="admin-btn admin-btn-secondary" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
            {uploading ? 'Uploading…' : 'Upload'}
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
        ) : null}
      </div>
      {hint || allowUpload ? (
        <p className="admin-hint">
          {hint || `${acceptHint}. Max ${formatMediaBytes(MEDIA_UPLOAD_MAX_BYTES)} per upload.`}
        </p>
      ) : null}
      {error ? <div className="admin-error" style={{ marginTop: '0.5rem', marginBottom: 0 }}>{error}</div> : null}
      {message ? <div className="admin-success" style={{ marginTop: '0.5rem', marginBottom: 0 }}>{message}</div> : null}
      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt=""
          style={{ marginTop: '0.55rem', maxHeight: 72, borderRadius: 6 }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.outline = '2px solid #c9540f';
          }}
        />
      ) : null}
      {previewIsVideo && value ? (
        <p className="admin-hint" style={{ marginTop: '0.45rem' }}>
          Video background: <code>{value}</code>
        </p>
      ) : null}

      {open ? (
        <div className="admin-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="admin-modal" style={{ width: 'min(860px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-toolbar" style={{ marginBottom: '0.8rem' }}>
              <h2 style={{ margin: 0 }}>Choose media</h2>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {allowUpload ? (
                  <label className="admin-btn admin-btn-primary" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
                    {uploading ? 'Uploading…' : 'Upload new'}
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
                ) : null}
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
            </div>
            <p className="admin-hint" style={{ marginTop: 0 }}>
              {acceptHint}. Successful media-library uploads appear here and can be assigned to hero slides.
            </p>
            {error ? <div className="admin-error">{error}</div> : null}
            {message ? <div className="admin-success">{message}</div> : null}
            {loading ? <p style={{ color: 'var(--admin-muted)' }}>Loading…</p> : null}
            {!loading && filtered.length === 0 ? (
              <p className="admin-empty">
                No matching files in the media library yet. Upload here or in Media library, then select a file.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '0.7rem',
                  maxHeight: 420,
                  overflow: 'auto',
                }}
              >
                {filtered.map((asset) => {
                  const storagePath = toStorageMediaPath(asset.path);
                  const video = isVideoMediaPath(storagePath, asset.mime);
                  return (
                    <button
                      key={asset.id ?? storagePath}
                      type="button"
                      onClick={() => {
                        onChange(storagePath);
                        setOpen(false);
                        setMessage('');
                        setError('');
                      }}
                      style={{
                        border:
                          value === storagePath || value === asset.path
                            ? '2px solid var(--orange, #FF6B1A)'
                            : '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: '0.45rem',
                        background: '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {video ? (
                        <div
                          style={{
                            width: '100%',
                            height: 88,
                            borderRadius: 6,
                            background: '#0f1f3d',
                            color: '#c7cfdc',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                          }}
                        >
                          VIDEO
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={publicMediaUrl(storagePath)}
                          alt={asset.alt || ''}
                          style={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 6 }}
                        />
                      )}
                      <code style={{ display: 'block', marginTop: 6, fontSize: '0.65rem', wordBreak: 'break-all' }}>
                        {storagePath}
                      </code>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
