'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { lineOffsetToIndex, parseCssSections, type CssSection } from '@/lib/site-css-parse';

type Props = {
  value: string;
  notes: string;
  onChange: (css: string) => void;
  onNotesChange: (notes: string) => void;
  onLoadFromRepo: () => void;
  onDownload: () => void;
  loadingRepo?: boolean;
};

export default function SiteCssEditor({
  value,
  notes,
  onChange,
  onNotesChange,
  onLoadFromRepo,
  onDownload,
  loadingRepo,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState('preamble');

  const sections = useMemo(() => parseCssSections(value || ''), [value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s) => s.title.toLowerCase().includes(q));
  }, [sections, query]);

  const stats = useMemo(() => {
    const bytes =
      typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(value || '').length : (value || '').length;
    const lines = (value || '').split(/\r?\n/).length;
    return { bytes, lines, kb: (bytes / 1024).toFixed(1) };
  }, [value]);

  function jumpTo(section: CssSection) {
    setActiveId(section.id);
    const el = textareaRef.current;
    if (!el) return;
    const index = lineOffsetToIndex(value, section.startLine);
    el.focus();
    el.setSelectionRange(index, index);
    // Approximate scroll: line height ~18px in monospace editor
    const lineHeight = 18;
    el.scrollTop = Math.max(0, section.startLine * lineHeight - 40);
  }

  useEffect(() => {
    if (!sections.some((s) => s.id === activeId) && sections[0]) {
      setActiveId(sections[0].id);
    }
  }, [sections, activeId]);

  return (
    <div className="theme-css-editor">
      <p className="theme-help">
        Full site stylesheet (the body of <code>globals.css</code>). Load from the repo, edit by section, then
        draft → publish. Published CSS is served on the live site via <code>/api/public/theme.css</code> and
        synced to disk when the filesystem allows.
      </p>

      <div className="theme-css-toolbar">
        <button type="button" className="admin-btn admin-btn-secondary" onClick={onLoadFromRepo} disabled={loadingRepo}>
          {loadingRepo ? 'Loading…' : 'Load from globals.css'}
        </button>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={onDownload} disabled={!value}>
          Download .css
        </button>
        <span className="theme-css-stats">
          {stats.lines.toLocaleString()} lines · {stats.kb} KB · {sections.length} sections
        </span>
      </div>

      <div className="admin-field" style={{ marginBottom: '0.75rem' }}>
        <label htmlFor="theme-css-notes">Version notes</label>
        <input
          id="theme-css-notes"
          className="admin-input"
          style={{ width: '100%' }}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. Full site CSS — footer + hero polish"
        />
      </div>

      <div className="theme-css-workspace">
        <aside className="theme-css-sections">
          <input
            className="admin-input"
            placeholder="Filter sections…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter CSS sections"
          />
          <nav>
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                className={activeId === s.id ? 'is-active' : ''}
                onClick={() => jumpTo(s)}
              >
                {s.title}
              </button>
            ))}
          </nav>
        </aside>
        <textarea
          ref={textareaRef}
          className="admin-textarea theme-css-textarea theme-css-textarea--full"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder="Load from globals.css to start editing the full site stylesheet…"
          aria-label="Full site CSS"
        />
      </div>
    </div>
  );
}
