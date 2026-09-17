'use client';

import { useEffect, useState } from 'react';
import {
  detectAvailableFonts,
  findFontEntry,
  resolveLogoFontCss,
  type LogoFontEntry,
} from '@/lib/logo-fonts';

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (css: string) => void;
  hint?: string;
};

export default function LogoFontPicker({ id, label, value, onChange, hint }: Props) {
  const [fonts, setFonts] = useState<LogoFontEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void detectAvailableFonts().then((result) => {
      if (cancelled) return;
      setFonts(result.fonts);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fonts.length || !value.trim()) return;
    setCustomMode(!findFontEntry(value, fonts));
  }, [fonts, value]);

  const matched = findFontEntry(value, fonts);
  const selectValue = matched?.css || '';
  const previewCss = resolveLogoFontCss(value, 'var(--font-display)');

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
            Font list
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
          placeholder="e.g. 'Segoe UI', sans-serif or var(--font-display)"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <select
          id={id}
          className="admin-input logo-font-select"
          value={selectValue}
          disabled={loading}
          onChange={(e) => {
            const next = e.target.value;
            if (next) onChange(next);
          }}
          style={{ fontFamily: previewCss }}
        >
          {loading ? <option value="">Loading fonts…</option> : null}
          {!loading && !matched && value.trim() ? (
            <option value="">Current: {value} (pick a listed font or use Custom CSS)</option>
          ) : null}
          {fonts.map((font) => (
            <option
              key={`${font.siteToken ? 'token' : 'face'}-${font.family}-${font.css}`}
              value={font.css}
              style={{ fontFamily: font.siteToken ? resolveLogoFontCss(font.css, font.css) : font.css }}
            >
              {font.siteToken ? `${font.family}` : font.family}
            </option>
          ))}
        </select>
      )}

      {hint ? (
        <small style={{ color: 'var(--admin-muted)' }}>
          {hint}
          {matched ? ` · ${matched.family}` : value?.trim() ? ` · ${value}` : null}
        </small>
      ) : null}
    </div>
  );
}
