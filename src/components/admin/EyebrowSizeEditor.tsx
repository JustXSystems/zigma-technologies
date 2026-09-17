'use client';

import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@/lib/site-settings';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

const FIELDS: Array<{
  key: 'eyebrowSize' | 'eyebrowSizeMd' | 'eyebrowSizeLg';
  label: string;
  hint: string;
  previewClass: string;
  sample: string;
}> = [
  {
    key: 'eyebrowSize',
    label: 'Base eyebrow',
    hint: 'Default .eyebrow size across the site',
    previewClass: 'eyebrow',
    sample: 'SECTION LABEL',
  },
  {
    key: 'eyebrowSizeMd',
    label: 'Medium eyebrow',
    hint: 'Page heroes, partners band, and similar mid-scale labels',
    previewClass: 'eyebrow',
    sample: 'PAGE HERO LABEL',
  },
  {
    key: 'eyebrowSizeLg',
    label: 'Large eyebrow',
    hint: 'Section heads that use .eyebrow-lg (why, split, careers, contact)',
    previewClass: 'eyebrow eyebrow-lg',
    sample: 'SECTION HEAD LABEL',
  },
];

export default function EyebrowSizeEditor({ settings, onChange }: Props) {
  return (
    <div className="admin-page-stack">
      <p className="admin-muted" style={{ marginTop: 0, marginBottom: '1rem', maxWidth: 640 }}>
        Control public eyebrow (uppercase mono label) font sizes. Values must be CSS lengths such as{' '}
        <code>0.9rem</code> or <code>14px</code>.
      </p>
      <div className="admin-form-grid" style={{ gap: '1.25rem' }}>
        {FIELDS.map((field) => {
          const value = settings[field.key];
          const placeholder = DEFAULT_SITE_SETTINGS[field.key];
          const previewSize =
            field.key === 'eyebrowSizeLg'
              ? settings.eyebrowSizeLg || placeholder
              : field.key === 'eyebrowSizeMd'
                ? settings.eyebrowSizeMd || placeholder
                : settings.eyebrowSize || placeholder;
          return (
            <div key={field.key} className="admin-field">
              <label htmlFor={field.key}>{field.label}</label>
              <input
                id={field.key}
                className="admin-input"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange({ [field.key]: e.target.value })}
              />
              <small style={{ color: 'var(--admin-muted)' }}>
                {field.hint} · default {placeholder}
              </small>
              <div
                aria-hidden
                style={{
                  marginTop: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 8,
                  border: '1px solid var(--admin-border, #e2e8f0)',
                  background: 'var(--admin-surface-2, #f8fafc)',
                }}
              >
                <div
                  className={field.previewClass}
                  style={{
                    fontFamily: 'var(--font-mono, IBM Plex Mono, monospace)',
                    fontSize: previewSize,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    color: 'var(--orange, #FF6B1A)',
                  }}
                >
                  {field.sample}
                </div>
                <small style={{ color: 'var(--admin-muted)' }}>Preview · {previewSize}</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
