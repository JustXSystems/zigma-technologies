'use client';

import { useMemo, useState } from 'react';
import {
  DEFAULT_FOOTER_OFFICE_LAYOUT,
  FOOTER_OFFICE_FIELDS,
  FOOTER_OFFICE_LAYOUT_PRESETS,
  parseFooterOfficeLayout,
  renderFooterOfficeLines,
  stringifyFooterOfficeLayout,
  type FooterOfficeFieldId,
  type FooterOfficeLayout,
  type FooterOfficeLine,
  type FooterOfficeLinePart,
} from '@/lib/footer-office-layout';
import type { SiteSettings } from '@/lib/site-settings';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

function cloneLayout(layout: FooterOfficeLayout): FooterOfficeLayout {
  return JSON.parse(JSON.stringify(layout)) as FooterOfficeLayout;
}

function fieldLabel(id: FooterOfficeFieldId) {
  return FOOTER_OFFICE_FIELDS.find((f) => f.id === id)?.label || id;
}

/** Visual line builder for footer office address — presets + JSON under the hood. */
export default function FooterOfficeLayoutEditor({ settings, onChange }: Props) {
  const [showJson, setShowJson] = useState(false);
  const [jsonError, setJsonError] = useState('');

  const layout = useMemo(
    () => parseFooterOfficeLayout(settings.footerOfficeLayoutJson),
    [settings.footerOfficeLayoutJson]
  );

  const preview = useMemo(
    () => renderFooterOfficeLines(settings, settings.footerOfficeLayoutJson),
    [settings]
  );

  function commit(next: FooterOfficeLayout) {
    setJsonError('');
    onChange({ footerOfficeLayoutJson: stringifyFooterOfficeLayout(next) });
  }

  function updateLine(index: number, patch: Partial<FooterOfficeLine>) {
    const next = cloneLayout(layout);
    next.lines[index] = { ...next.lines[index], ...patch };
    commit(next);
  }

  function moveLine(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= layout.lines.length) return;
    const next = cloneLayout(layout);
    const [row] = next.lines.splice(index, 1);
    next.lines.splice(target, 0, row);
    commit(next);
  }

  function removeLine(index: number) {
    if (layout.lines.length <= 1) return;
    const next = cloneLayout(layout);
    next.lines.splice(index, 1);
    commit(next);
  }

  function addLine() {
    const next = cloneLayout(layout);
    next.lines.push({ parts: [{ field: 'locality' }], join: ', ' });
    commit(next);
  }

  function addPart(lineIndex: number, field: FooterOfficeFieldId) {
    const next = cloneLayout(layout);
    const part: FooterOfficeLinePart =
      field === 'custom' ? { field: 'custom', text: '' } : { field };
    next.lines[lineIndex].parts.push(part);
    if (field === 'hours' || field === 'sla') next.lines[lineIndex].showLabel = true;
    commit(next);
  }

  function removePart(lineIndex: number, partIndex: number) {
    const next = cloneLayout(layout);
    const line = next.lines[lineIndex];
    if (line.parts.length <= 1) return;
    line.parts.splice(partIndex, 1);
    commit(next);
  }

  function movePart(lineIndex: number, partIndex: number, dir: -1 | 1) {
    const next = cloneLayout(layout);
    const parts = next.lines[lineIndex].parts;
    const target = partIndex + dir;
    if (target < 0 || target >= parts.length) return;
    const [item] = parts.splice(partIndex, 1);
    parts.splice(target, 0, item);
    commit(next);
  }

  function applyPreset(presetLayout: FooterOfficeLayout) {
    commit(cloneLayout(presetLayout));
  }

  function onJsonBlur(raw: string) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const sanitized = parseFooterOfficeLayout(parsed);
      // Ensure user didn't get silent default on nearly-valid input
      if (!sanitized.lines.length) throw new Error('Layout needs at least one line');
      setJsonError('');
      onChange({ footerOfficeLayoutJson: stringifyFooterOfficeLayout(sanitized) });
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }

  return (
    <div className="admin-footer-layout-editor">
      <div className="admin-footer-layout-head">
        <div>
          <strong>Address line layout</strong>
          <span>Pick fields per line (3 or 4 lines, or custom). Empty values are skipped when rendering.</span>
        </div>
      </div>

      <div className="admin-footer-layout-presets" role="group" aria-label="Layout presets">
        {FOOTER_OFFICE_LAYOUT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="admin-footer-layout-preset"
            onClick={() => applyPreset(preset.layout)}
          >
            <strong>{preset.label}</strong>
            <small>{preset.hint}</small>
          </button>
        ))}
      </div>

      <div className="admin-footer-layout-lines">
        {layout.lines.map((line, lineIndex) => (
          <div key={`line-${lineIndex}`} className="admin-footer-layout-line">
            <div className="admin-footer-layout-line-bar">
              <span className="admin-footer-layout-line-num">Line {lineIndex + 1}</span>
              <div className="admin-footer-layout-line-actions">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => moveLine(lineIndex, -1)} disabled={lineIndex === 0}>
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => moveLine(lineIndex, 1)}
                  disabled={lineIndex === layout.lines.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => removeLine(lineIndex)}
                  disabled={layout.lines.length <= 1}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="admin-footer-layout-parts">
              {line.parts.map((part, partIndex) => (
                <div key={`${part.field}-${partIndex}`} className="admin-footer-layout-part">
                  <span className="admin-footer-layout-chip">{fieldLabel(part.field)}</span>
                  {part.field === 'custom' ? (
                    <input
                      className="admin-input"
                      value={part.text || ''}
                      placeholder="Custom text"
                      onChange={(e) => {
                        const next = cloneLayout(layout);
                        next.lines[lineIndex].parts[partIndex] = { field: 'custom', text: e.target.value };
                        commit(next);
                      }}
                    />
                  ) : null}
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => movePart(lineIndex, partIndex, -1)} disabled={partIndex === 0} aria-label="Move field left">
                    ←
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => movePart(lineIndex, partIndex, 1)}
                    disabled={partIndex === line.parts.length - 1}
                    aria-label="Move field right"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => removePart(lineIndex, partIndex)}
                    disabled={line.parts.length <= 1}
                    aria-label="Remove field"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="admin-footer-layout-line-meta">
              <label>
                Add field
                <select
                  className="admin-input"
                  defaultValue=""
                  onChange={(e) => {
                    const value = e.target.value as FooterOfficeFieldId | '';
                    if (!value) return;
                    addPart(lineIndex, value);
                    e.target.value = '';
                  }}
                >
                  <option value="">Select…</option>
                  {FOOTER_OFFICE_FIELDS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Join
                <input
                  className="admin-input"
                  value={line.join ?? ', '}
                  onChange={(e) => updateLine(lineIndex, { join: e.target.value })}
                  placeholder=", "
                />
              </label>
              <label className="admin-footer-layout-check">
                <input
                  type="checkbox"
                  checked={Boolean(line.showLabel)}
                  onChange={(e) => updateLine(lineIndex, { showLabel: e.target.checked })}
                />
                Show label (hours / SLA)
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-footer-layout-toolbar">
        <button type="button" className="admin-btn admin-btn-secondary" onClick={addLine}>
          Add line
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={() => commit(cloneLayout(DEFAULT_FOOTER_OFFICE_LAYOUT))}
        >
          Reset to 3-line default
        </button>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowJson((v) => !v)}>
          {showJson ? 'Hide JSON' : 'Edit JSON'}
        </button>
      </div>

      {showJson ? (
        <div className="admin-field full">
          <label htmlFor="footerOfficeLayoutJson">Layout JSON</label>
          <textarea
            id="footerOfficeLayoutJson"
            className="admin-textarea"
            rows={12}
            defaultValue={stringifyFooterOfficeLayout(layout)}
            key={settings.footerOfficeLayoutJson || 'default-layout'}
            onBlur={(e) => onJsonBlur(e.target.value)}
          />
          {jsonError ? <small style={{ color: 'var(--admin-danger, #c0392b)' }}>{jsonError}</small> : (
            <small style={{ color: 'var(--admin-muted)' }}>
              Schema: {'{ lines: [{ parts: [{ field, text? }], join?, showLabel? }] }'} — fields: street,
              street2, locality, region, postal, country, hours, sla, custom
            </small>
          )}
        </div>
      ) : null}

      <div className="admin-footer-layout-preview" aria-live="polite">
        <strong>Live preview</strong>
        {preview.length ? (
          <div className="admin-footer-layout-preview-body">
            {preview.map((line) => (
              <div key={line.key} className={`is-${line.kind}`}>
                {line.showLabel ? <em>{line.kind === 'sla' ? 'Reply' : 'Hours'}</em> : null}
                {line.text}
              </div>
            ))}
          </div>
        ) : (
          <p>Nothing to show yet — fill Address &amp; office fields below, or adjust the layout.</p>
        )}
      </div>
    </div>
  );
}
