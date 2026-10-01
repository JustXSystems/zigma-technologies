'use client';

import { useMemo, useState } from 'react';
import { SECTION_TYPES } from '@/lib/cms-types';
import {
  CATALOG_BUILTIN_SECTIONS,
  CATALOG_SECTIONS_MAX,
  catalogBuiltinMeta,
  defaultCatalogSections,
  newCatalogSectionId,
  type CatalogSectionEntry,
} from '@/lib/catalog-sections';
import { defaultCmsSectionContent } from '@/lib/cms-section-defaults';

type Props = {
  value: CatalogSectionEntry[];
  onChange: (next: CatalogSectionEntry[]) => void;
  /** Open the content editor for a CMS section. */
  onEdit: (id: string) => void;
  /** Jump to the settings tab that styles a built-in section. */
  onConfigure?: (key: string) => void;
  pagePath: string;
};

const TYPE_LABEL = Object.fromEntries(SECTION_TYPES.map((t) => [t.type, t.label])) as Record<string, string>;
const CONFIGURABLE: Record<string, string> = { hero: 'Hero tab', listing: 'Listing tab' };

function entryName(entry: CatalogSectionEntry) {
  if (entry.kind === 'builtin') return catalogBuiltinMeta(entry.type)?.label || entry.type;
  return entry.title?.trim() || TYPE_LABEL[entry.type] || entry.type;
}

function entryDetail(entry: CatalogSectionEntry) {
  if (entry.kind === 'builtin') return catalogBuiltinMeta(entry.type)?.description || '';
  const parts = [TYPE_LABEL[entry.type] || entry.type];
  if (entry.section_key) parts.push(`#${entry.section_key}`);
  return parts.join(' · ');
}

export default function CatalogSectionsEditor({ value, onChange, onEdit, onConfigure, pagePath }: Props) {
  const [addType, setAddType] = useState('cms:cta');
  const [insertAt, setInsertAt] = useState<number | 'end'>('end');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const missingBuiltins = useMemo(
    () => CATALOG_BUILTIN_SECTIONS.filter((b) => !value.some((s) => s.kind === 'builtin' && s.type === b.key)),
    [value]
  );
  const listing = value.find((s) => s.kind === 'builtin' && s.type === 'listing');
  const visibleCount = value.filter((s) => s.enabled).length;
  const atLimit = value.length >= CATALOG_SECTIONS_MAX;
  const selectedAdd = addType.startsWith('builtin:') && !missingBuiltins.some((b) => `builtin:${b.key}` === addType)
    ? 'cms:cta'
    : addType;

  function patch(id: string, next: Partial<CatalogSectionEntry>) {
    onChange(value.map((s) => (s.id === id ? { ...s, ...next } : s)));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = [...value];
    const from = next.findIndex((s) => s.id === dragId);
    const [moved] = next.splice(from, 1);
    next.splice(next.findIndex((s) => s.id === targetId), 0, moved);
    onChange(next);
  }

  function duplicate(index: number) {
    const source = value[index];
    const copy: CatalogSectionEntry = {
      ...source,
      id: newCatalogSectionId(),
      title: `${entryName(source)} (copy)`,
      section_key: source.section_key ? `${source.section_key}-copy` : null,
      content_json: structuredClone(source.content_json || {}),
      style_json: structuredClone(source.style_json || {}),
      enabled: false,
    };
    const next = [...value];
    next.splice(index + 1, 0, copy);
    onChange(next);
  }

  function remove(entry: CatalogSectionEntry) {
    const note = entry.kind === 'builtin' ? ' You can add it back from “Add section”.' : '';
    if (!confirm(`Remove “${entryName(entry)}” from ${pagePath}?${note}`)) return;
    onChange(value.filter((s) => s.id !== entry.id));
  }

  function add() {
    if (atLimit) return;
    const [kind, type] = selectedAdd.split(':') as ['builtin' | 'cms', string];
    const entry: CatalogSectionEntry =
      kind === 'builtin'
        ? { id: type, kind, type, enabled: true }
        : {
            id: newCatalogSectionId(),
            kind,
            type,
            enabled: true,
            title: TYPE_LABEL[type] || type,
            section_key: null,
            content_json: defaultCmsSectionContent(type),
            style_json: {},
          };
    const next = [...value];
    next.splice(insertAt === 'end' ? next.length : insertAt, 0, entry);
    onChange(next);
    setInsertAt('end');
  }

  return (
    <div className="cse">
      <div className="cse-head">
        <p>
          <strong>{visibleCount}</strong> of {value.length} sections visible on <code>{pagePath}</code>. Drag rows or use
          ↑ ↓ to reorder. Hidden sections keep their content.
        </p>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={() => {
            if (confirm('Reset to the default sections (Hero, Catalogue listing, Trusted partners)? Added content sections will be removed.')) {
              onChange(defaultCatalogSections());
            }
          }}
        >
          Reset to default
        </button>
      </div>

      {!listing || !listing.enabled ? (
        <div className="cse-warn" role="status">
          The catalogue listing is {listing ? 'hidden' : 'removed'}, so visitors will not see any {pagePath.slice(1)} on
          this page.
        </div>
      ) : null}

      {value.length === 0 ? (
        <p className="admin-empty">No sections — the page will be empty. Add one below or reset to default.</p>
      ) : (
        <ol className="cse-list">
          {value.map((entry, index) => {
            const configureLabel = entry.kind === 'builtin' ? CONFIGURABLE[entry.type] : undefined;
            return (
              <li
                key={entry.id}
                className={[
                  'cse-row',
                  entry.enabled ? '' : 'is-hidden',
                  dragId === entry.id ? 'is-dragging' : '',
                  overId === entry.id && dragId !== entry.id ? 'is-over' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                draggable
                onDragStart={(e) => {
                  setDragId(entry.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverId(entry.id);
                }}
                onDragLeave={() => setOverId((cur) => (cur === entry.id ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  dropOn(entry.id);
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
              >
                <span className="cse-grip" aria-hidden>
                  ⋮⋮
                </span>
                <span className="cse-num">{index + 1}</span>
                <div className="cse-main">
                  <div className="cse-name">
                    {entryName(entry)}
                    <span className={`cse-kind cse-kind--${entry.kind}`}>{entry.kind === 'builtin' ? 'Built-in' : 'Content'}</span>
                  </div>
                  <div className="cse-detail">{entryDetail(entry)}</div>
                </div>
                <label className="cse-switch" title={entry.enabled ? 'Hide on the public page' : 'Show on the public page'}>
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={(e) => patch(entry.id, { enabled: e.target.checked })}
                  />
                  <span>{entry.enabled ? 'Visible' : 'Hidden'}</span>
                </label>
                <div className="cse-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    aria-label="Move down"
                    disabled={index === value.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                  {entry.kind === 'cms' ? (
                    <>
                      <button type="button" className="admin-btn admin-btn-secondary" onClick={() => onEdit(entry.id)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={atLimit}
                        onClick={() => duplicate(index)}
                      >
                        Duplicate
                      </button>
                    </>
                  ) : configureLabel && onConfigure ? (
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => onConfigure(entry.type)}>
                      {configureLabel} →
                    </button>
                  ) : null}
                  <button type="button" className="admin-btn admin-btn-danger" onClick={() => remove(entry)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="cse-add">
        <div className="admin-field">
          <label htmlFor="cse-add-type">Add section</label>
          <select id="cse-add-type" className="admin-select" value={selectedAdd} onChange={(e) => setAddType(e.target.value)}>
            {missingBuiltins.length ? (
              <optgroup label="Catalog sections">
                {missingBuiltins.map((b) => (
                  <option key={b.key} value={`builtin:${b.key}`}>
                    {b.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="Content sections (same as /admin/pages)">
              {SECTION_TYPES.map((t) => (
                <option key={t.type} value={`cms:${t.type}`}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="cse-add-at">Position</label>
          <select
            id="cse-add-at"
            className="admin-select"
            value={String(insertAt)}
            onChange={(e) => setInsertAt(e.target.value === 'end' ? 'end' : Number(e.target.value))}
          >
            <option value="end">At the end</option>
            <option value="0">At the top</option>
            {value.slice(0, -1).map((entry, index) => (
              <option key={entry.id} value={index + 1}>
                After {index + 1}. {entryName(entry)}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" disabled={atLimit} onClick={add}>
          Add section
        </button>
      </div>
      {atLimit ? <p className="admin-hint">Limit of {CATALOG_SECTIONS_MAX} sections reached.</p> : null}
    </div>
  );
}
