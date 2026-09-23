'use client';

import type { SiteSettings } from '@/lib/site-settings';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';
import {
  LOGO_STYLE_OPTIONS,
  LOGO_WEIGHT_OPTIONS,
} from '@/lib/logo-fonts';
import LogoFontPicker from '@/components/admin/LogoFontPicker';

export type LogoTypeScope = 'header' | 'footer';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
  /** header = Logo chip & word type; footer = Footer brand custom type (same UI). */
  scope?: LogoTypeScope;
};

type FieldMap = {
  chipHeight: keyof SiteSettings;
  chipHeightMobile: keyof SiteSettings;
  wordFont: keyof SiteSettings;
  wordSize: keyof SiteSettings;
  wordSizeMobile: keyof SiteSettings;
  wordWeight: keyof SiteSettings;
  wordStyle: keyof SiteSettings;
  wordLetterSpacing: keyof SiteSettings;
  taglineFont: keyof SiteSettings;
  taglineSize: keyof SiteSettings;
  taglineSizeMobile: keyof SiteSettings;
  taglineWeight: keyof SiteSettings;
  taglineStyle: keyof SiteSettings;
  taglineLetterSpacing: keyof SiteSettings;
};

const HEADER_FIELDS: FieldMap = {
  chipHeight: 'logoChipHeight',
  chipHeightMobile: 'logoChipHeightMobile',
  wordFont: 'logoWordFont',
  wordSize: 'logoWordSize',
  wordSizeMobile: 'logoWordSizeMobile',
  wordWeight: 'logoWordWeight',
  wordStyle: 'logoWordStyle',
  wordLetterSpacing: 'logoWordLetterSpacing',
  taglineFont: 'logoTaglineFont',
  taglineSize: 'logoTaglineSize',
  taglineSizeMobile: 'logoTaglineSizeMobile',
  taglineWeight: 'logoTaglineWeight',
  taglineStyle: 'logoTaglineStyle',
  taglineLetterSpacing: 'logoTaglineLetterSpacing',
};

const FOOTER_FIELDS: FieldMap = {
  chipHeight: 'footerLogoChipHeight',
  chipHeightMobile: 'footerLogoChipHeightMobile',
  wordFont: 'footerLogoWordFont',
  wordSize: 'footerLogoWordSize',
  wordSizeMobile: 'footerLogoWordSizeMobile',
  wordWeight: 'footerLogoWordWeight',
  wordStyle: 'footerLogoWordStyle',
  wordLetterSpacing: 'footerLogoWordLetterSpacing',
  taglineFont: 'footerLogoTaglineFont',
  taglineSize: 'footerLogoTaglineSize',
  taglineSizeMobile: 'footerLogoTaglineSizeMobile',
  taglineWeight: 'footerLogoTaglineWeight',
  taglineStyle: 'footerLogoTaglineStyle',
  taglineLetterSpacing: 'footerLogoTaglineLetterSpacing',
};

function SizeField({
  id,
  label,
  hint,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="admin-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? (
        <small style={{ color: 'var(--admin-muted)' }}>
          {hint} · default {placeholder}
        </small>
      ) : (
        <small style={{ color: 'var(--admin-muted)' }}>Default: {placeholder}</small>
      )}
    </div>
  );
}

function SelectField({
  id,
  label,
  hint,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  const known = options.some((o) => o.value === value);
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="admin-input"
        value={known ? value : '__custom__'}
        onChange={(e) => {
          if (e.target.value === '__custom__') return;
          onChange(e.target.value);
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {!known && value ? <option value="__custom__">{value} (custom)</option> : null}
      </select>
      {!known && value ? (
        <input
          className="admin-input"
          style={{ marginTop: 6 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} custom value`}
        />
      ) : null}
      {hint ? <small style={{ color: 'var(--admin-muted)' }}>{hint}</small> : null}
    </div>
  );
}

export default function LogoTypeEditor({ settings, onChange, scope = 'header' }: Props) {
  const fields = scope === 'footer' ? FOOTER_FIELDS : HEADER_FIELDS;
  const idPrefix = scope === 'footer' ? 'footer-' : '';
  const set = (key: keyof SiteSettings, value: string) => onChange({ [key]: value });
  const val = (key: keyof SiteSettings) => settings[key] ?? '';
  const ph = (key: keyof SiteSettings) => DEFAULT_SITE_SETTINGS[key] || '';

  return (
    <div className="admin-page-stack logo-type-editor">
      <div className="admin-form-grid">
        <SizeField
          id={`${idPrefix}logoChipHeight`}
          label="Logo chip height (desktop)"
          hint="Image height inside .logo-chip"
          value={val(fields.chipHeight)}
          placeholder={ph(fields.chipHeight)}
          onChange={(v) => set(fields.chipHeight, v)}
        />
        <SizeField
          id={`${idPrefix}logoChipHeightMobile`}
          label="Logo chip height (mobile)"
          hint="Applied at max-width 760px"
          value={val(fields.chipHeightMobile)}
          placeholder={ph(fields.chipHeightMobile)}
          onChange={(v) => set(fields.chipHeightMobile, v)}
        />
      </div>

      <div className="logo-type-block">
        <h3 className="logo-type-block-title">Company name</h3>
        <div className="admin-form-grid">
          <LogoFontPicker
            id={`${idPrefix}logoWordFont`}
            label="Font"
            value={val(fields.wordFont)}
            onChange={(v) => set(fields.wordFont, v)}
            hint="Fonts installed on this PC — changes update the preview above"
          />
          <SizeField
            id={`${idPrefix}logoWordSize`}
            label="Size (desktop)"
            value={val(fields.wordSize)}
            placeholder={ph(fields.wordSize)}
            onChange={(v) => set(fields.wordSize, v)}
          />
          <SizeField
            id={`${idPrefix}logoWordSizeMobile`}
            label="Size (mobile)"
            value={val(fields.wordSizeMobile)}
            placeholder={ph(fields.wordSizeMobile)}
            onChange={(v) => set(fields.wordSizeMobile, v)}
          />
          <SelectField
            id={`${idPrefix}logoWordWeight`}
            label="Weight"
            value={val(fields.wordWeight)}
            options={LOGO_WEIGHT_OPTIONS}
            onChange={(v) => set(fields.wordWeight, v)}
          />
          <SelectField
            id={`${idPrefix}logoWordStyle`}
            label="Style"
            value={val(fields.wordStyle)}
            options={LOGO_STYLE_OPTIONS}
            onChange={(v) => set(fields.wordStyle, v)}
          />
          <SizeField
            id={`${idPrefix}logoWordLetterSpacing`}
            label="Letter spacing"
            hint="e.g. 0, 0.02em, 1px"
            value={val(fields.wordLetterSpacing)}
            placeholder={ph(fields.wordLetterSpacing)}
            onChange={(v) => set(fields.wordLetterSpacing, v)}
          />
        </div>
      </div>

      <div className="logo-type-block">
        <h3 className="logo-type-block-title">Tagline</h3>
        <div className="admin-form-grid">
          <LogoFontPicker
            id={`${idPrefix}logoTaglineFont`}
            label="Font"
            value={val(fields.taglineFont)}
            onChange={(v) => set(fields.taglineFont, v)}
            hint="Same local font list as company name"
          />
          <SizeField
            id={`${idPrefix}logoTaglineSize`}
            label="Size (desktop)"
            hint="Often relative to company name (e.g. 0.6em)"
            value={val(fields.taglineSize)}
            placeholder={ph(fields.taglineSize)}
            onChange={(v) => set(fields.taglineSize, v)}
          />
          <SizeField
            id={`${idPrefix}logoTaglineSizeMobile`}
            label="Size (mobile)"
            value={val(fields.taglineSizeMobile)}
            placeholder={ph(fields.taglineSizeMobile)}
            onChange={(v) => set(fields.taglineSizeMobile, v)}
          />
          <SelectField
            id={`${idPrefix}logoTaglineWeight`}
            label="Weight"
            value={val(fields.taglineWeight)}
            options={LOGO_WEIGHT_OPTIONS}
            onChange={(v) => set(fields.taglineWeight, v)}
          />
          <SelectField
            id={`${idPrefix}logoTaglineStyle`}
            label="Style"
            value={val(fields.taglineStyle)}
            options={LOGO_STYLE_OPTIONS}
            onChange={(v) => set(fields.taglineStyle, v)}
          />
          <SizeField
            id={`${idPrefix}logoTaglineLetterSpacing`}
            label="Letter spacing"
            hint="e.g. 0.1em, 2px"
            value={val(fields.taglineLetterSpacing)}
            placeholder={ph(fields.taglineLetterSpacing)}
            onChange={(v) => set(fields.taglineLetterSpacing, v)}
          />
        </div>
      </div>
    </div>
  );
}

/** Keys reset by “Reset footer logo type”. */
export const FOOTER_LOGO_TYPE_KEYS = Object.values(FOOTER_FIELDS);
