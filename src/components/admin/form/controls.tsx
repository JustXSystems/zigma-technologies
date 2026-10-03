'use client';

import { useState, type ReactNode } from 'react';
import { DEFAULT_THEME_TOKENS, THEME_TOKEN_META } from '@/lib/theme-tokens';

/** Shared admin form controls — one look and behaviour for every settings screen and section editor. */

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

export function Field({
  label,
  children,
  full,
  hint,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
  hint?: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className={`admin-field${full ? ' full' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <p className="az-admin-hint">{hint}</p> : null}
    </div>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  full,
  hint,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
  hint?: string;
}) {
  return (
    <Field label={label} full={full} hint={hint}>
      <input
        className="admin-input"
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  hint,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <Field label={label} full hint={hint}>
      <textarea
        className="admin-textarea"
        rows={rows}
        style={{ minHeight: rows * 22 }}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
  full,
}: {
  label: string;
  value?: T | '';
  options: ReadonlyArray<{ value: T | ''; label: string }>;
  onChange: (v: T) => void;
  full?: boolean;
}) {
  return (
    <Field label={label} full={full}>
      <select className="admin-select" value={value || ''} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value || 'default'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Inline checkbox + label. */
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="az-admin-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/** Checkbox card with a title and a one-line explanation — for on/off settings. */
export function ToggleCard({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="admin-footer-office-toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  );
}

const THEME_COLOR_LIST_ID = 'az-theme-colors';

/** Default hex for `var(--token)` / `var(--token, #hex)` so theme colors get a swatch. */
function themeTokenHex(value?: string): string | undefined {
  const m = (value || '').trim().match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(#[0-9A-Fa-f]{6})\s*)?\)$/);
  if (!m) return undefined;
  return DEFAULT_THEME_TOKENS[m[1]] || m[2];
}

/** Theme Studio color tokens offered as suggestions in every ColorInput; render once per editor. */
export function ThemeColorDatalist() {
  return (
    <datalist id={THEME_COLOR_LIST_ID}>
      {THEME_TOKEN_META.filter((t) => t.type === 'color').map((t) => (
        <option key={t.key} value={`var(${t.key})`}>
          {t.label}
        </option>
      ))}
    </datalist>
  );
}

/**
 * Swatch + text box (+ Clear). Accepts hex, rgba(), var() and gradients, or only `#rrggbb`
 * with `hexOnly` (e.g. email, where CSS variables do not exist).
 */
export function ColorControl({
  label,
  value,
  onChange,
  fallback = '#000000',
  hexOnly,
  clearable = !hexOnly,
  placeholder,
}: {
  /** Accessible name for the swatch. */
  label: string;
  value?: string;
  onChange: (v: string) => void;
  fallback?: string;
  hexOnly?: boolean;
  clearable?: boolean;
  placeholder?: string;
}) {
  const v = value || '';
  const [draft, setDraft] = useState(v);
  const [synced, setSynced] = useState(v);
  if (v !== synced) {
    setSynced(v);
    setDraft(v);
  }
  const swatch = [v, themeTokenHex(v), fallback, themeTokenHex(fallback)].find((c) => c && HEX6.test(c)) || '#000000';

  function onText(next: string) {
    if (!hexOnly) return onChange(next);
    setDraft(next);
    if (HEX6.test(next.trim())) onChange(next.trim());
  }

  return (
    <div className="admin-color-field">
      <input type="color" aria-label={label} value={swatch} onChange={(e) => onChange(e.target.value)} />
      <input
        className="admin-input"
        list={hexOnly ? undefined : THEME_COLOR_LIST_ID}
        value={hexOnly ? draft : v}
        placeholder={placeholder ?? (fallback ? `default ${fallback}` : 'default')}
        aria-label={`${label} value`}
        aria-invalid={hexOnly && draft !== v ? true : undefined}
        onChange={(e) => onText(e.target.value)}
        onBlur={() => setDraft(v)}
      />
      {clearable && v ? (
        <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => onChange('')}>
          Clear
        </button>
      ) : null}
    </div>
  );
}

/** Labelled ColorControl. */
export function ColorInput({
  label,
  hint,
  full,
  ...control
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  fallback?: string;
  hint?: ReactNode;
  full?: boolean;
  hexOnly?: boolean;
  clearable?: boolean;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint} full={full}>
      <ColorControl label={label} {...control} />
    </Field>
  );
}
