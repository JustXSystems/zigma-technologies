'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [source, setSource] = useState<'local-api' | 'canvas' | 'catalog' | 'loading'>('loading');
  const [query, setQuery] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [error, setError] = useState('');

  async function loadFonts() {
    setSource('loading');
    setError('');
    try {
      const result = await detectAvailableFonts();
      setFonts(result.fonts);
      setSource(result.source);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not list fonts');
      setSource('catalog');
    }
  }

  useEffect(() => {
    void loadFonts();
  }, []);

  useEffect(() => {
    if (!fonts.length || !value.trim()) return;
    const matched = findFontEntry(value, fonts);
    setCustomMode(!matched);
  }, [fonts, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fonts;
    return fonts.filter(
      (f) => f.family.toLowerCase().includes(q) || f.css.toLowerCase().includes(q)
    );
  }, [fonts, query]);

  const matched = findFontEntry(value, fonts);
  const previewCss = resolveLogoFontCss(value, 'var(--font-display)');
  const selectValue = matched?.css || '';

  const sourceLabel =
    source === 'loading'
      ? 'Detecting installed fonts…'
      : source === 'local-api'
        ? `${fonts.filter((f) => !f.siteToken).length} fonts from this PC`
        : source === 'canvas'
          ? `${fonts.filter((f) => !f.siteToken).length} fonts available on this PC`
          : `${fonts.filter((f) => !f.siteToken).length} common fonts`;

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
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void loadFonts()}>
            Refresh fonts
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
        <div className="logo-font-windows">
          <input
            className="admin-input logo-font-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fonts…"
            aria-label={`Search ${label}`}
          />
          <select
            id={id}
            className="admin-input logo-font-select"
            size={12}
            value={selectValue}
            disabled={source === 'loading'}
            onChange={(e) => {
              const next = e.target.value;
              if (next) onChange(next);
            }}
            style={{ fontFamily: previewCss }}
          >
            {!matched && value.trim() ? (
              <option value="">Current: {value} (not in list — pick one or use Custom CSS)</option>
            ) : null}
            {filtered.map((font) => (
              <option
                key={`${font.siteToken ? 'token' : 'face'}-${font.family}-${font.css}`}
                value={font.css}
                style={{ fontFamily: font.siteToken ? resolveLogoFontCss(font.css, font.css) : font.css }}
              >
                {font.siteToken ? `${font.family} (${font.css})` : font.family}
              </option>
            ))}
          </select>
          <div className="logo-font-live-sample" style={{ fontFamily: previewCss }}>
            <span className="logo-font-live-label">Sample</span>
            <span className="logo-font-live-text">
              {matched?.family || primaryLabel(value) || 'Font'} — The quick brown fox jumps over the lazy dog 0123456789
            </span>
          </div>
        </div>
      )}

      <small style={{ color: 'var(--admin-muted)' }}>
        {hint ? `${hint} · ` : null}
        {sourceLabel}
        {matched ? ` · ${matched.family}` : value?.trim() ? ` · ${value}` : null}
        {error ? ` · ${error}` : null}
      </small>
    </div>
  );
}

function primaryLabel(css: string): string {
  const m = css.trim().match(/^'([^']+)'|^"([^"]+)"|^([a-zA-Z][\w-]*)|^var\(--([^)]+)\)/);
  if (!m) return css;
  if (m[4]) return `var(--${m[4]})`;
  return m[1] || m[2] || m[3] || css;
}
