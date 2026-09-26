'use client';

import MediaPicker from '@/components/admin/MediaPicker';

export type SeoFieldsValue = {
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  seo_noindex: boolean;
};

type Props = {
  value: SeoFieldsValue;
  onChange: (next: SeoFieldsValue) => void;
  /** Shown in the preview when the override is empty. */
  fallbackTitle: string;
  fallbackDescription: string;
  /** Public path, e.g. `/projects/my-slug`. */
  path: string;
};

const BRAND = 'Zigma Technologies';

function counterColor(length: number, good: [number, number], warnMax: number) {
  if (length === 0) return 'var(--admin-muted, #6b7280)';
  if (length >= good[0] && length <= good[1]) return '#12B76A';
  if (length <= warnMax) return '#d97706';
  return '#EF4444';
}

export default function SeoFieldsEditor({ value, onChange, fallbackTitle, fallbackDescription, path }: Props) {
  const title = value.meta_title.trim() || fallbackTitle;
  const previewTitle = title.toLowerCase().includes(BRAND.toLowerCase()) ? title : `${title} | ${BRAND}`;
  const previewDescription = (value.meta_description.trim() || fallbackDescription || '').replace(/<[^>]*>/g, ' ');
  const titleLen = value.meta_title.trim().length;
  const descLen = value.meta_description.trim().length;

  return (
    <div className="admin-form-grid">
      <div className="admin-field full">
        <label>
          Meta title{' '}
          <small style={{ color: counterColor(titleLen, [30, 60], 65) }}>
            {titleLen}/60 — brand is appended automatically
          </small>
        </label>
        <input
          className="admin-input"
          value={value.meta_title}
          maxLength={255}
          onChange={(e) => onChange({ ...value, meta_title: e.target.value })}
          placeholder={fallbackTitle}
        />
      </div>
      <div className="admin-field full">
        <label>
          Meta description{' '}
          <small style={{ color: counterColor(descLen, [120, 160], 180) }}>{descLen}/160</small>
        </label>
        <textarea
          className="admin-textarea"
          value={value.meta_description}
          maxLength={320}
          onChange={(e) => onChange({ ...value, meta_description: e.target.value })}
          placeholder={fallbackDescription ? fallbackDescription.slice(0, 160) : 'What the page offers + proof + call to action'}
        />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <MediaPicker
          value={value.og_image_url}
          onChange={(url) => onChange({ ...value, og_image_url: url })}
          label="Social share image (1200×630 recommended; defaults to the primary image)"
          compact
        />
      </div>
      <div className="admin-field full">
        <label>
          <input
            type="checkbox"
            checked={value.seo_noindex}
            onChange={(e) => onChange({ ...value, seo_noindex: e.target.checked })}
          />{' '}
          Hide from search engines (noindex) and the sitemap
        </label>
      </div>
      <div className="admin-field full">
        <label>Google preview</label>
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '12px 14px',
            background: '#fff',
            fontFamily: 'Arial, sans-serif',
            maxWidth: 620,
          }}
        >
          <div style={{ fontSize: 12, color: '#202124' }}>zigma-technologies.com{path}</div>
          <div
            style={{
              fontSize: 19,
              color: '#1a0dab',
              lineHeight: 1.3,
              margin: '2px 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {previewTitle}
          </div>
          <div style={{ fontSize: 13, color: '#4d5156', lineHeight: 1.5 }}>
            {previewDescription.length > 160 ? `${previewDescription.slice(0, 157)}…` : previewDescription}
          </div>
        </div>
        {value.seo_noindex ? (
          <small style={{ color: '#EF4444' }}>This page will not appear in search results.</small>
        ) : null}
      </div>
    </div>
  );
}
