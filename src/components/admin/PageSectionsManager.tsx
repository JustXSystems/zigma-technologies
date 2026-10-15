'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { sectionTypeGroups, sectionTypeMeta, type CmsSection, type SectionTypeMeta } from '@/lib/cms-types';
import { defaultCmsSectionContent } from '@/lib/cms-section-defaults';
import SectionEditor from '@/components/admin/SectionEditor';

type Props = {
  pageId: number;
  pageSlug: string;
  sections: CmsSection[];
  /** Re-fetch the page; called after every change. */
  reload: () => Promise<void>;
  /** Section types offered first in "Add section" (e.g. the page's own design). */
  preferred?: { label: string; types: string[] };
  /** Extra buttons beside "Add section". */
  actions?: ReactNode;
  emptyText?: string;
};

type AddGroup = { group: string; types: SectionTypeMeta[] };

/** Add-section choices: preferred types, then the page groups already used here, then everything else. */
function addGroups(sections: CmsSection[], preferred?: Props['preferred']): AddGroup[] {
  const preferredSet = new Set(preferred?.types);
  const used = new Set(sections.map((s) => sectionTypeMeta(s.type).group));
  const rest = sectionTypeGroups()
    .map(({ group, types }) => ({ group, types: types.filter((t) => !preferredSet.has(t.type)) }))
    .filter((g) => g.types.length);
  return [
    ...(preferred ? [{ group: preferred.label, types: preferred.types.map(sectionTypeMeta) }] : []),
    ...rest.filter((g) => used.has(g.group)),
    ...rest.filter((g) => !used.has(g.group)),
  ];
}

async function request(url: string, init: RequestInit, failure: string) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('Your session expired. Sign in again, then retry.');
  if (!res.ok) throw new Error((data as { error?: string }).error || failure);
  return data;
}

/** Ordered list of a CMS page's sections with add, edit, reorder, show/hide, duplicate and delete. */
export default function PageSectionsManager({ pageId, pageSlug, sections, reload, preferred, actions, emptyText }: Props) {
  const groups = useMemo(() => addGroups(sections, preferred), [sections, preferred]);
  const [addType, setAddType] = useState(() => groups[0]?.types[0]?.type || 'why');
  const [editing, setEditing] = useState<CmsSection | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reordered, setReordered] = useState<{ base: CmsSection[]; next: CmsSection[] } | null>(null);
  const list = reordered && reordered.base === sections ? reordered.next : sections;
  const addMeta = sectionTypeMeta(addType);

  async function run(key: string, task: () => Promise<string | void>) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      const note = await task();
      if (note) setMessage(note);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy('');
    }
  }

  const saveOrder = (next: CmsSection[]) =>
    request('/api/admin/sections/reorder', { method: 'POST', body: JSON.stringify({ page_id: pageId, ordered_ids: next.map((s) => s.id) }) }, 'Reorder failed');

  function move(index: number, dir: -1 | 1) {
    const swap = index + dir;
    if (swap < 0 || swap >= list.length) return;
    const next = [...list];
    [next[index], next[swap]] = [next[swap], next[index]];
    setReordered({ base: sections, next });
    void run('order', async () => {
      try {
        await saveOrder(next);
      } catch (e) {
        setReordered(null);
        throw e;
      }
    });
  }

  const add = () =>
    run('add', async () => {
      const data = await request(
        '/api/admin/sections',
        {
          method: 'POST',
          body: JSON.stringify({
            page_id: pageId,
            type: addType,
            title: addMeta.title,
            section_key: addType === 'industry_category' ? 'cat-infra' : undefined,
            content_json: defaultCmsSectionContent(addType, pageSlug),
          }),
        },
        'Add failed'
      );
      await reload();
      if (data.section) setEditing(data.section as CmsSection);
      return `${addMeta.title} added at the bottom of the page. Use ↑ / ↓ to move it.`;
    });

  const duplicate = (section: CmsSection, index: number) =>
    run(`s-${section.id}`, async () => {
      const data = await request(
        '/api/admin/sections',
        {
          method: 'POST',
          body: JSON.stringify({
            page_id: pageId,
            type: section.type,
            title: `${section.title || sectionTypeMeta(section.type).title} (copy)`,
            section_key: section.section_key ? `${section.section_key}-copy` : null,
            content_json: section.content_json || {},
            style_json: section.style_json || {},
            enabled: false,
          }),
        },
        'Duplicate failed'
      );
      const copy = data.section as CmsSection | undefined;
      if (copy) await saveOrder([...list.slice(0, index + 1), copy, ...list.slice(index + 1)]);
      await reload();
      return 'Copy added below the original. It is hidden until you switch it on.';
    });

  const setVisible = (section: CmsSection, enabled: boolean) =>
    run(`s-${section.id}`, async () => {
      await request(`/api/admin/sections/${section.id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }, 'Update failed');
      await reload();
    });

  function remove(section: CmsSection) {
    const name = section.title || sectionTypeMeta(section.type).title;
    if (!window.confirm(`Delete section "${name}"? This cannot be undone.`)) return;
    void run(`s-${section.id}`, async () => {
      await request(`/api/admin/sections/${section.id}`, { method: 'DELETE' }, 'Delete failed');
      await reload();
      return `Deleted "${name}".`;
    });
  }

  return (
    <div className="admin-section-manager">
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      {list.length === 0 ? (
        <p className="admin-empty">{emptyText || 'No sections yet. Add one below.'}</p>
      ) : (
        <ol className="admin-section-list">
          {list.map((section, i) => {
            const meta = sectionTypeMeta(section.type);
            const rowBusy = busy === `s-${section.id}`;
            return (
              <li key={section.id} className={`admin-section-row${section.enabled ? '' : ' is-hidden'}`}>
                <div className="admin-section-row-order">
                  <span className="admin-section-row-index">{i + 1}</span>
                  <button type="button" className="admin-section-move" aria-label="Move up" disabled={i === 0 || Boolean(busy)} onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className="admin-section-move"
                    aria-label="Move down"
                    disabled={i === list.length - 1 || Boolean(busy)}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </button>
                </div>
                <button type="button" className="admin-section-row-main" onClick={() => setEditing(section)} title="Edit this section">
                  <strong>{section.title || meta.title}</strong>
                  <span>
                    {meta.group} · {meta.title}
                    {section.section_key ? <code>#{section.section_key}</code> : null}
                  </span>
                </button>
                <label className="az-admin-toggle admin-section-row-visible">
                  <input
                    type="checkbox"
                    checked={Boolean(section.enabled)}
                    disabled={Boolean(busy)}
                    onChange={(e) => void setVisible(section, e.target.checked)}
                  />
                  <span>{section.enabled ? 'Shown' : 'Hidden'}</span>
                </label>
                <div className="admin-section-row-actions">
                  <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditing(section)}>
                    Edit
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary" disabled={Boolean(busy)} onClick={() => void duplicate(section, i)}>
                    {rowBusy ? '…' : 'Duplicate'}
                  </button>
                  <button type="button" className="admin-btn admin-btn-danger" disabled={Boolean(busy)} onClick={() => remove(section)}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="admin-section-add">
        <label className="admin-section-add-label" htmlFor={`add-section-${pageId}`}>
          Add a section
        </label>
        <div className="admin-section-add-row">
          <select id={`add-section-${pageId}`} className="admin-select" value={addType} onChange={(e) => setAddType(e.target.value)}>
            {groups.map(({ group, types }) => (
              <optgroup key={group} label={group}>
                {types.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button type="button" className="admin-btn admin-btn-primary" disabled={Boolean(busy)} onClick={() => void add()}>
            {busy === 'add' ? 'Adding…' : 'Add section'}
          </button>
          {actions}
        </div>
        <p className="admin-hint">
          <strong>
            {addMeta.group} · {addMeta.title}
          </strong>
          {addMeta.hint ? ` — ${addMeta.hint}` : ''}. It is added at the bottom and opens in the editor.
        </p>
      </div>

      {editing ? (
        <SectionEditor
          key={editing.id}
          section={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void run('reload', async () => {
              await reload();
              return 'Section saved. The public page updates on next load.';
            });
          }}
        />
      ) : null}
    </div>
  );
}
