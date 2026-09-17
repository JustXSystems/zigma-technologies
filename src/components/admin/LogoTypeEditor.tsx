'use client';

import type { SiteSettings } from '@/lib/site-settings';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';
import {
  LOGO_STYLE_OPTIONS,
  LOGO_WEIGHT_OPTIONS,
} from '@/lib/logo-fonts';
import LogoFontPicker from '@/components/admin/LogoFontPicker';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
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

export default function LogoTypeEditor({ settings, onChange }: Props) {
  const set = (key: keyof SiteSettings, value: string) => onChange({ [key]: value });

  return (
    <div className="admin-page-stack logo-type-editor">
      <div className="admin-form-grid">
        <SizeField
          id="logoChipHeight"
          label="Logo chip height (desktop)"
          hint="Image height inside .logo-chip"
          value={settings.logoChipHeight}
          placeholder={DEFAULT_SITE_SETTINGS.logoChipHeight}
          onChange={(v) => set('logoChipHeight', v)}
        />
        <SizeField
          id="logoChipHeightMobile"
          label="Logo chip height (mobile)"
          hint="Applied at max-width 760px"
          value={settings.logoChipHeightMobile}
          placeholder={DEFAULT_SITE_SETTINGS.logoChipHeightMobile}
          onChange={(v) => set('logoChipHeightMobile', v)}
        />
      </div>

      <div className="logo-type-block">
        <h3 className="logo-type-block-title">Company name</h3>
        <div className="admin-form-grid">
          <LogoFontPicker
            id="logoWordFont"
            label="Font"
            value={settings.logoWordFont}
            onChange={(v) => set('logoWordFont', v)}
            hint="Site tokens use theme fonts; Browse loads Google Fonts for preview"
          />
          <SizeField
            id="logoWordSize"
            label="Size (desktop)"
            value={settings.logoWordSize}
            placeholder={DEFAULT_SITE_SETTINGS.logoWordSize}
            onChange={(v) => set('logoWordSize', v)}
          />
          <SizeField
            id="logoWordSizeMobile"
            label="Size (mobile)"
            value={settings.logoWordSizeMobile}
            placeholder={DEFAULT_SITE_SETTINGS.logoWordSizeMobile}
            onChange={(v) => set('logoWordSizeMobile', v)}
          />
          <SelectField
            id="logoWordWeight"
            label="Weight"
            value={settings.logoWordWeight}
            options={LOGO_WEIGHT_OPTIONS}
            onChange={(v) => set('logoWordWeight', v)}
          />
          <SelectField
            id="logoWordStyle"
            label="Style"
            value={settings.logoWordStyle}
            options={LOGO_STYLE_OPTIONS}
            onChange={(v) => set('logoWordStyle', v)}
          />
        </div>
      </div>

      <div className="logo-type-block">
        <h3 className="logo-type-block-title">Tagline</h3>
        <div className="admin-form-grid">
          <LogoFontPicker
            id="logoTaglineFont"
            label="Font"
            value={settings.logoTaglineFont}
            onChange={(v) => set('logoTaglineFont', v)}
            hint="Often a mono or condensed face under the company name"
          />
          <SizeField
            id="logoTaglineSize"
            label="Size (desktop)"
            hint="Often relative to company name (e.g. 0.6em)"
            value={settings.logoTaglineSize}
            placeholder={DEFAULT_SITE_SETTINGS.logoTaglineSize}
            onChange={(v) => set('logoTaglineSize', v)}
          />
          <SizeField
            id="logoTaglineSizeMobile"
            label="Size (mobile)"
            value={settings.logoTaglineSizeMobile}
            placeholder={DEFAULT_SITE_SETTINGS.logoTaglineSizeMobile}
            onChange={(v) => set('logoTaglineSizeMobile', v)}
          />
          <SelectField
            id="logoTaglineWeight"
            label="Weight"
            value={settings.logoTaglineWeight}
            options={LOGO_WEIGHT_OPTIONS}
            onChange={(v) => set('logoTaglineWeight', v)}
          />
          <SelectField
            id="logoTaglineStyle"
            label="Style"
            value={settings.logoTaglineStyle}
            options={LOGO_STYLE_OPTIONS}
            onChange={(v) => set('logoTaglineStyle', v)}
          />
        </div>
      </div>
    </div>
  );
}
