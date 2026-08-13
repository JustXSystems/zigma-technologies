'use client';

import { useEffect, useState } from 'react';

type Asset = { id: number | null; path: string; mime: string | null; alt: string | null };

type Props = {
  value: string;
  onChange: (path: string) => void;
  label?: string;
};

export default function MediaPicker({ value, onChange, label = 'Image URL' }: Props) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    fetch('/api/admin/media')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load media');
        setAssets(data.assets || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open]);

  const isImage = (mime: string | null, path: string) =>
    (mime && mime.startsWith('image/')) || /\.(png|jpe?g|webp|gif|svg)$/i.test(path);

  return (
    <div className="admin-field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
        <input
          className="admin-input"
          style={{ flex: 1, minWidth: 180 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/assets/images/… or /assets/svg/…"
        />
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setOpen(true)}>
          Browse media
        </button>
      </div>
      {value && isImage(null, value) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" style={{ marginTop: '0.55rem', maxHeight: 72, borderRadius: 6 }} />
      ) : null}

      {open ? (
        <div className="admin-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="admin-modal" style={{ width: 'min(860px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-toolbar" style={{ marginBottom: '0.8rem' }}>
              <h2 style={{ margin: 0 }}>Choose media</h2>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            {error ? <div className="admin-error">{error}</div> : null}
            {loading ? <p style={{ color: 'var(--admin-muted)' }}>Loading…</p> : null}
            {!loading && assets.length === 0 ? (
              <p className="admin-empty">No uploads yet. Add files in Media library first.</p>
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
                {assets
                  .filter((a) => isImage(a.mime, a.path))
                  .map((asset) => (
                    <button
                      key={asset.id ?? asset.path}
                      type="button"
                      onClick={() => {
                        onChange(asset.path);
                        setOpen(false);
                      }}
                      style={{
                        border: value === asset.path ? '2px solid var(--orange, #FF6B1A)' : '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: '0.45rem',
                        background: '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.path}
                        alt={asset.alt || ''}
                        style={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 6 }}
                      />
                      <code style={{ display: 'block', marginTop: 6, fontSize: '0.65rem', wordBreak: 'break-all' }}>
                        {asset.path}
                      </code>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
