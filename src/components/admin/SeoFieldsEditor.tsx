'use client';

import { useId } from 'react';
import MediaPicker from '@/components/admin/MediaPicker';
import { Field, ToggleCard } from '@/components/admin/form/controls';
import { SITE_NAME, clampDescription, siteOrigin } from '@/lib/seo';

/** `image` and `noindex` render only when present — leave them out for records that do not store them. */
export type SeoFieldsValue = {
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
};

type Props = {
  value: SeoFieldsValue;
  onChange: (next: SeoFieldsValue) => void;
  /** Public path, e.g. `/projects/my-slug`. */
  path: string;
  /** What the site uses when a field is empty; omit when that text is generated automatically. */
  fallbackTitle?: string;
  fallbackDescription?: string;
  imageHint?: string;
};

type Limit = { good: [number, number]; warn: number; target: number };
const TITLE_LIMIT: Limit = { good: [30, 60], warn: 65, target: 60 };
const DESCRIPTION_LIMIT: Limit = { good: [120, 160], warn: 180, target: 160 };

function lengthState(length: number, { good, warn }: Limit) {
  if (length === 0) return 'empty';
  if (length >= good[0] && length <= good[1]) return 'good';
  return length <= warn ? 'warn' : 'over';
}

function Counter({ text, limit, note }: { text: string; limit: Limit; note?: string }) {
  const length = text.trim().length;
  return (
    <span className="admin-seo-count" data-state={lengthState(length, limit)}>
      {length}/{limit.target}
      {note ? ` — ${note}` : ''}
    </span>
  );
}

/** Mirrors `pageTitle()` and the root "%s | brand" title template. */
function serpTitle(title: string) {
  return title.toLowerCase().includes(SITE_NAME.toLowerCase()) ? title : `${title} | ${SITE_NAME}`;
}

/** Meta title / description (+ share image and noindex where stored) with a live Google preview. */
export default function SeoFieldsEditor({ value, onChange, path, fallbackTitle, fallbackDescription, imageHint }: Props) {
  const id = useId();
  const set = (patch: Partial<SeoFieldsValue>) => onChange({ ...value, ...patch });

  const title = value.title.trim() || fallbackTitle?.trim() || '';
  const description = clampDescription(value.description.trim() || fallbackDescription);
  const host = siteOrigin().replace(/^https?:\/\//, '');

  return (
    <div className="admin-form-grid">
      <Field
        label="Meta title"
        full
        htmlFor={`${id}-title`}
        hint={<Counter text={value.title} limit={TITLE_LIMIT} note="the brand is added automatically" />}
      >
        <input
          id={`${id}-title`}
          className="admin-input"
          value={value.title}
          maxLength={255}
          placeholder={fallbackTitle || 'Automatic title'}
          onChange={(e) => set({ title: e.target.value })}
        />
      </Field>
      <Field
        label="Meta description"
        full
        htmlFor={`${id}-description`}
        hint={<Counter text={value.description} limit={DESCRIPTION_LIMIT} />}
      >
        <textarea
          id={`${id}-description`}
          className="admin-textarea"
          value={value.description}
          maxLength={320}
          placeholder={fallbackDescription ? clampDescription(fallbackDescription) : 'What the page offers, proof, and a call to action'}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
      {value.image !== undefined ? (
        <div className="full">
          <MediaPicker
            id={`${id}-image`}
            label="Social share image"
            hint={imageHint ?? '1200×630 recommended.'}
            value={value.image}
            onChange={(image) => set({ image })}
            compact
          />
        </div>
      ) : null}
      {value.noindex !== undefined ? (
        <div className="full">
          <ToggleCard
            id={`${id}-noindex`}
            label="Hide from search engines"
            hint="Adds noindex and leaves this page out of the sitemap."
            checked={value.noindex}
            onChange={(noindex) => set({ noindex })}
          />
        </div>
      ) : null}
      <div className="admin-field full">
        <span className="admin-seo-preview-label">Google preview</span>
        <div className="admin-seo-preview" aria-label="Google preview">
          <div className="admin-seo-preview-url">
            {host}
            {path === '/' ? '' : path}
          </div>
          <div className="admin-seo-preview-title">{title ? serpTitle(title) : `Automatic title | ${SITE_NAME}`}</div>
          <div className="admin-seo-preview-desc">{description || 'Automatic description'}</div>
        </div>
        {value.noindex ? <p className="admin-seo-noindex">This page will not appear in search results.</p> : null}
      </div>
    </div>
  );
}
