'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { buildFooterColumns } from '@/lib/nav-tree';

type NavRow = {
  id: number;
  location: 'header' | 'footer';
  label: string;
  href: string | null;
  parent_id: number | null;
  sort_order: number;
  enabled: number | boolean;
  meta_json?: Record<string, unknown>;
};

function isEnabled(item: NavRow) {
  return Number(item.enabled) === 1 || item.enabled === true;
}

/** Depth-first order (column → children) so header/footer trees are readable. */
function treeOrdered(items: NavRow[]): NavRow[] {
  const byParent = new Map<number | null, NavRow[]>();
  for (const item of items) {
    const key = item.parent_id ?? null;
    const list = byParent.get(key) || [];
    list.push(item);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }
  const out: NavRow[] = [];
  const walk = (parentId: number | null) => {
    for (const child of byParent.get(parentId) || []) {
      out.push(child);
      walk(child.id);
    }
  };
  walk(null);
  // Any rows whose parent is missing (orphans) — append so they stay visible
  const seen = new Set(out.map((i) => i.id));
  for (const item of items) {
    if (!seen.has(item.id)) out.push(item);
  }
  return out;
}

export default function NavAdminPage() {
  const [items, setItems] = useState<NavRow[]>([]);
  const [location, setLocation] = useState<'header' | 'footer'>('header');
  const [label, setLabel] = useState('');
  const [href, setHref] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<NavRow | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editHref, setEditHref] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [editKind, setEditKind] = useState('');
  const [editMegaClass, setEditMegaClass] = useState('');

  async function load() {
    const res = await fetch(`/api/admin/nav?location=${location}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setItems(data.items);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [location]);

  const orderedItems = useMemo(() => treeOrdered(items), [items]);

  const labelById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i.label])), [items]);

  const depthById = useMemo(() => {
    const map: Record<number, number> = {};
    function depth(id: number, seen = new Set<number>()): number {
      if (map[id] != null) return map[id];
      if (seen.has(id)) return 0;
      seen.add(id);
      const item = items.find((i) => i.id === id);
      if (!item?.parent_id) {
        map[id] = 0;
        return 0;
      }
      map[id] = depth(item.parent_id, seen) + 1;
      return map[id];
    }
    items.forEach((i) => depth(i.id));
    return map;
  }, [items]);

  const footerPreview = useMemo(() => {
    if (location !== 'footer') return null;
    return buildFooterColumns(
      items.map((i) => ({
        id: Number(i.id),
        label: i.label,
        href: i.href,
        parent_id: i.parent_id == null ? null : Number(i.parent_id),
        sort_order: Number(i.sort_order),
        enabled: isEnabled(i),
        meta_json: i.meta_json || {},
      }))
    );
  }, [items, location]);

  async function persistOrder(next: NavRow[]) {
    const ordered_ids = next.map((i) => i.id);
    setItems(next);
    const res = await fetch('/api/admin/nav/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, ordered_ids }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Reorder failed');
      await load();
      return;
    }
  }

  async function moveSibling(item: NavRow, direction: -1 | 1) {
    setError('');
    const tree = treeOrdered(items);
    const siblings = tree.filter((i) => (i.parent_id || null) === (item.parent_id || null));
    const idx = siblings.findIndex((i) => i.id === item.id);
    const swapWith = siblings[idx + direction];
    if (!swapWith) return;

    const a = tree.findIndex((i) => i.id === item.id);
    const b = tree.findIndex((i) => i.id === swapWith.id);
    const next = [...tree];
    const tmp = next[a];
    next[a] = next[b];
    next[b] = tmp;
    await persistOrder(next.map((row, i) => ({ ...row, sort_order: i })));
  }

  async function addItem(e: FormEvent) {
    e.preventDefault();
    setError('');
    const isTop = !parentId;
    const meta_json =
      location === 'footer'
        ? isTop
          ? { kind: 'column' }
          : { kind: 'link' }
        : parentId
          ? { kind: 'link' }
          : {};
    const res = await fetch('/api/admin/nav', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location,
        label,
        href: href || null,
        parent_id: parentId ? Number(parentId) : null,
        sort_order: items.length,
        enabled: true,
        meta_json,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Create failed');
      return;
    }
    setLabel('');
    setHref('');
    setParentId('');
    await load();
  }

  async function seedDefaults() {
    setMessage('');
    setError('');
    const res = await fetch('/api/admin/nav/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Seed failed');
      return;
    }
    setMessage(data.message);
    await load();
  }

  async function toggle(item: NavRow) {
    await fetch(`/api/admin/nav/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !isEnabled(item) }),
    });
    await load();
  }

  async function remove(item: NavRow) {
    if (!confirm(`Delete "${item.label}" and any nested children?`)) return;
    await fetch(`/api/admin/nav/${item.id}`, { method: 'DELETE' });
    await load();
  }

  async function clearAll() {
    if (!confirm(`Delete ALL ${location} nav items?`)) return;
    setError('');
    setMessage('');
    for (const item of [...items].sort((a, b) => (b.parent_id || 0) - (a.parent_id || 0))) {
      await fetch(`/api/admin/nav/${item.id}`, { method: 'DELETE' });
    }
    setMessage(`Cleared ${location} navigation.`);
    await load();
  }

  function openEdit(item: NavRow) {
    setEditing(item);
    setEditLabel(item.label);
    setEditHref(item.href || '');
    setEditParentId(item.parent_id ? String(item.parent_id) : '');
    setEditKind(String(item.meta_json?.kind || ''));
    setEditMegaClass(String(item.meta_json?.megaClass || ''));
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const meta_json: Record<string, unknown> = { ...(editing.meta_json || {}) };
    if (editKind) meta_json.kind = editKind;
    else delete meta_json.kind;
    if (editMegaClass) meta_json.megaClass = editMegaClass;
    else delete meta_json.megaClass;

    const res = await fetch(`/api/admin/nav/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: editLabel,
        href: editHref || null,
        parent_id: editParentId ? Number(editParentId) : null,
        meta_json,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Update failed');
      return;
    }
    setEditing(null);
    await load();
  }

  const enabledCount = items.filter(isEnabled).length;
  const previewLinkCount = footerPreview?.reduce((n, c) => n + c.links.length, 0) ?? 0;

  return (
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-toolbar">
        <div className="left">
          <button
            type="button"
            className={`admin-btn ${location === 'header' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
            onClick={() => setLocation('header')}
          >
            Header
          </button>
          <button
            type="button"
            className={`admin-btn ${location === 'footer' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
            onClick={() => setLocation('footer')}
          >
            Footer
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={seedDefaults}>
            Seed {location} tree
          </button>
          <button type="button" className="admin-btn admin-btn-danger" onClick={clearAll}>
            Clear {location}
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <p style={{ marginTop: 0, color: 'var(--admin-muted)', fontSize: '0.88rem' }}>
          Nested items: top-level mega parents → column children → link grandchildren. Footer: each{' '}
          <strong>top-level</strong> row is a column heading; every <strong>child</strong> (any depth) is a
          public link. Only <strong>Enabled</strong> rows publish. The site footer uses this list only — nothing
          else is merged in. To load the full seed defaults: Clear Footer → Seed footer tree.
        </p>
        <form onSubmit={addItem} className="admin-form-grid">
          <div className="admin-field">
            <label>Label</label>
            <input className="admin-input" value={label} onChange={(e) => setLabel(e.target.value)} required />
          </div>
          <div className="admin-field">
            <label>Href</label>
            <input
              className="admin-input"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="/projects or /#why"
            />
          </div>
          <div className="admin-field">
            <label>Parent</label>
            <select className="admin-select" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">Top level (footer = column)</option>
              {orderedItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {'—'.repeat(depthById[item.id] || 0)} {item.label} (#{item.id})
                </option>
              ))}
            </select>
          </div>
          <div className="full">
            <button type="submit" className="admin-btn admin-btn-primary">
              Add item
            </button>
          </div>
        </form>
      </div>

      {footerPreview ? (
        <div className="admin-card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Public footer preview (exact site output)</h3>
          <p style={{ color: 'var(--admin-muted)', fontSize: '0.85rem', marginTop: 0 }}>
            Admin rows: {items.length} total / {enabledCount} enabled → site publishes{' '}
            <strong>
              {footerPreview.length} columns, {previewLinkCount} links
            </strong>{' '}
            (column headings are not counted as links).
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
            }}
          >
            {footerPreview.map((col) => (
              <div key={col.id}>
                <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>
                  {col.heading}{' '}
                  <span style={{ color: 'var(--admin-muted)', fontWeight: 500 }}>({col.links.length})</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.88rem' }}>
                  {col.links.map((link) => (
                    <li key={link.id}>
                      {link.label}{' '}
                      <code style={{ fontSize: '0.75rem', color: 'var(--admin-muted)' }}>{link.href}</code>
                    </li>
                  ))}
                  {!col.links.length ? (
                    <li style={{ color: 'var(--admin-muted)' }}>(no enabled child links)</li>
                  ) : null}
                </ul>
              </div>
            ))}
            {!footerPreview.length ? (
              <p style={{ color: 'var(--admin-muted)' }}>No footer columns — add top-level items or Seed footer tree.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="admin-table-wrap admin-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Label</th>
              <th>Parent</th>
              <th>Href</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orderedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No {location} links. Seed the tree or add manually.
                </td>
              </tr>
            ) : (
              orderedItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        title="Move up among siblings"
                        onClick={() => moveSibling(item, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        title="Move down among siblings"
                        onClick={() => moveSibling(item, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td
                    style={{
                      fontWeight: 600,
                      paddingLeft: `${0.4 + (depthById[item.id] || 0) * 1.1}rem`,
                    }}
                  >
                    {(depthById[item.id] || 0) > 0 ? '↳ ' : ''}
                    {item.label}
                    {item.meta_json?.kind ? (
                      <div style={{ color: 'var(--admin-muted)', fontSize: '0.75rem' }}>
                        {String(item.meta_json.kind)}
                      </div>
                    ) : null}
                  </td>
                  <td>{item.parent_id ? labelById[item.parent_id] || `#${item.parent_id}` : '—'}</td>
                  <td>
                    <code>{item.href || '—'}</code>
                  </td>
                  <td>{isEnabled(item) ? 'Yes' : 'No'}</td>
                  <td>
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => openEdit(item)}>
                      Edit
                    </button>{' '}
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => toggle(item)}>
                      {isEnabled(item) ? 'Disable' : 'Enable'}
                    </button>{' '}
                    <button type="button" className="admin-btn admin-btn-danger" onClick={() => remove(item)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="admin-modal-backdrop" onClick={() => setEditing(null)}>
          <form className="admin-modal" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
            <h2>Edit nav item</h2>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label>Label</label>
                <input className="admin-input" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} required />
              </div>
              <div className="admin-field">
                <label>Href</label>
                <input className="admin-input" value={editHref} onChange={(e) => setEditHref(e.target.value)} />
              </div>
              <div className="admin-field">
                <label>Parent</label>
                <select className="admin-select" value={editParentId} onChange={(e) => setEditParentId(e.target.value)}>
                  <option value="">Top level</option>
                  {orderedItems
                    .filter((i) => i.id !== editing.id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label} (#{item.id})
                      </option>
                    ))}
                </select>
              </div>
              <div className="admin-field">
                <label>Kind (meta)</label>
                <select className="admin-select" value={editKind} onChange={(e) => setEditKind(e.target.value)}>
                  <option value="">(none / link)</option>
                  <option value="mega">mega</option>
                  <option value="column">column</option>
                  <option value="link">link</option>
                </select>
              </div>
              <div className="admin-field">
                <label>Mega class</label>
                <input
                  className="admin-input"
                  value={editMegaClass}
                  onChange={(e) => setEditMegaClass(e.target.value)}
                  placeholder="mega-2x2"
                />
              </div>
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="admin-btn admin-btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
