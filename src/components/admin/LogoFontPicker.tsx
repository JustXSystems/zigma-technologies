'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LOGO_FONT_CATEGORIES,
  LOGO_FONT_OPTIONS,
  ensureGoogleFontsLoaded,
  findLogoFontOption,
  type LogoFontCategory,
} from '@/lib/logo-fonts';

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (css: string) => void;
  hint?: string;
};

export default function LogoFontPicker({ id, label, value, onChange, hint }: Props) {
  const matched = findLogoFontOption(value);
  const [category, setCategory] = useState<LogoFontCategory>(matched?.category || 'site');
  const [customMode, setCustomMode] = useState(!matched && Boolean(value?.trim()));
  const [query, setQuery] = useState('');

  useEffect(() => {
    const families = LOGO_FONT_OPTIONS.filter((o) => o.category === category)
      .map((o) => o.googleFamily)
      .filter(Boolean) as string[];
    const selected = findLogoFontOption(value)?.googleFamily;
    ensureGoogleFontsLoaded([...families, selected]);
  }, [category, value]);

  useEffect(() => {
    const next = findLogoFontOption(value);
    if (next) {
      setCustomMode(false);
      setCategory(next.category);
    } else if (value?.trim()) {
      setCustomMode(true);
    }
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LOGO_FONT_OPTIONS.filter((o) => {
      if (o.category !== category) return false;
      if (!q) return true;
      return o.label.toLowerCase().includes(q) || o.css.toLowerCase().includes(q);
    });
  }, [category, query]);

  return (
    <div className="admin-field full logo-font-picker">
      <div className="logo-font-picker-head">
        <label htmlFor={id}>{label}</label>
        <div className="logo-font-picker-mode">
          <button
            type="button"
            className={`admin-btn admin-btn-secondary${customMode ? '' : ' is-active'}`}
            onClick={() => setCustomMode(false)}
          >
            Browse
          </button>
          <button
            type="button"
            className={`admin-btn admin-btn-secondary${customMode ? ' is-active' : ''}`}
            onClick={() => setCustomMode(true)}
          >
            Custom CSS
          </button>
        </div>
      </div>

      {customMode ? (
        <input
          id={id}
          className="admin-input"
          value={value}
          placeholder="e.g. var(--font-display) or 'Outfit', sans-serif"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <>
          <div className="logo-font-picker-toolbar">
            <div className="logo-font-cats" role="tablist" aria-label={`${label} categories`}>
              {LOGO_FONT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={category === cat.id}
                  className={`logo-font-cat${category === cat.id ? ' is-active' : ''}`}
                  onClick={() => setCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <input
              className="admin-input logo-font-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fonts…"
              aria-label={`Search ${label}`}
            />
          </div>
          <div className="logo-font-grid" role="listbox" aria-label={label}>
            {filtered.map((opt) => {
              const selected = value.trim() === opt.css;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`logo-font-option${selected ? ' is-selected' : ''}`}
                  onClick={() => onChange(opt.css)}
                  title={opt.css}
                >
                  <span className="logo-font-option-label">{opt.label}</span>
                  <span className="logo-font-option-sample" style={{ fontFamily: opt.googleFamily ? `'${opt.googleFamily}', ${opt.category === 'mono' ? 'monospace' : opt.category === 'serif' ? 'serif' : 'sans-serif'}` : opt.css }}>
                    {opt.sample || 'Aa Bb Cc'}
                  </span>
                </button>
              );
            })}
            {!filtered.length ? <p className="logo-font-empty">No fonts match.</p> : null}
          </div>
        </>
      )}

      {hint ? (
        <small style={{ color: 'var(--admin-muted)' }}>
          {hint}
          {matched ? ` · ${matched.label}` : value?.trim() ? ` · ${value}` : null}
        </small>
      ) : null}
    </div>
  );
}
