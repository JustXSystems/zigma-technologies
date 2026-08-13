'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { FormField } from '@/lib/types';

export default function FormsPage() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [formId, setFormId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<FormField['field_type']>('text');
  const [required, setRequired] = useState(false);
  const [editing, setEditing] = useState<FormField | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPlaceholder, setEditPlaceholder] = useState('');
  const [editOptions, setEditOptions] = useState('');
  const [editRequired, setEditRequired] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/forms');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load form');
    setFormId(data.form.id);
    setFields(data.form.fields || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function addField(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/forms/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        form_id: formId,
        field_name: fieldName,
        label,
        field_type: fieldType,
        required,
        sort_order: fields.length + 1,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Create failed');
      return;
    }
    setLabel('');
    setFieldName('');
    setRequired(false);
    await load();
  }

  async function toggleField(field: FormField) {
    await fetch(`/api/admin/forms/fields/${field.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !field.enabled }),
    });
    await load();
  }

  async function removeField(field: FormField) {
    if (!confirm(`Remove field "${field.label}"?`)) return;
    await fetch(`/api/admin/forms/fields/${field.id}`, { method: 'DELETE' });
    await load();
  }

  async function move(field: FormField, dir: -1 | 1) {
    if (!formId) return;
    const idx = fields.findIndex((f) => f.id === field.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= fields.length) return;
    const next = [...fields];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setFields(next);
    await fetch('/api/admin/forms/fields/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form_id: formId, ordered_ids: next.map((f) => f.id) }),
    });
  }

  function openEdit(field: FormField) {
    setEditing(field);
    setEditLabel(field.label);
    setEditPlaceholder(field.placeholder || '');
    setEditOptions((field.options_json || []).join('\n'));
    setEditRequired(!!field.required);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const res = await fetch(`/api/admin/forms/fields/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: editLabel,
        placeholder: editPlaceholder,
        required: editRequired,
        options_json: editOptions
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
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

  return (
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Add enquiry field</h2>
        <form onSubmit={addField} className="admin-form-grid">
          <div className="admin-field">
            <label>Label</label>
            <input className="admin-input" value={label} onChange={(e) => setLabel(e.target.value)} required />
          </div>
          <div className="admin-field">
            <label>Field name (snake_case)</label>
            <input
              className="admin-input"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              required
            />
          </div>
          <div className="admin-field">
            <label>Type</label>
            <select
              className="admin-select"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FormField['field_type'])}
            >
              {['text', 'email', 'tel', 'textarea', 'select', 'number', 'checkbox'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field" style={{ display: 'flex', alignItems: 'end' }}>
            <label>
              <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Required
            </label>
          </div>
          <div className="full">
            <button type="submit" className="admin-btn admin-btn-primary">
              Add field
            </button>
          </div>
        </form>
      </div>

      <div className="admin-table-wrap admin-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Label</th>
              <th>Name</th>
              <th>Type</th>
              <th>Required</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field.id}>
                <td>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => move(field, -1)}>
                    ↑
                  </button>{' '}
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => move(field, 1)}>
                    ↓
                  </button>
                </td>
                <td>{field.label}</td>
                <td>
                  <code>{field.field_name}</code>
                </td>
                <td>{field.field_type}</td>
                <td>{field.required ? 'Yes' : 'No'}</td>
                <td>{field.enabled ? 'Yes' : 'No'}</td>
                <td>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => openEdit(field)}>
                    Edit
                  </button>{' '}
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => toggleField(field)}>
                    {field.enabled ? 'Disable' : 'Enable'}
                  </button>{' '}
                  <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeField(field)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="admin-modal-backdrop" onClick={() => setEditing(null)}>
          <form className="admin-modal" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
            <h2>Edit field · {editing.field_name}</h2>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label>Label</label>
                <input className="admin-input" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} required />
              </div>
              <div className="admin-field">
                <label>Placeholder</label>
                <input
                  className="admin-input"
                  value={editPlaceholder}
                  onChange={(e) => setEditPlaceholder(e.target.value)}
                />
              </div>
              <div className="admin-field full">
                <label>Options (select type — one per line)</label>
                <textarea
                  className="admin-textarea"
                  value={editOptions}
                  onChange={(e) => setEditOptions(e.target.value)}
                  placeholder="Solar EPC&#10;UPS&#10;BESS"
                />
              </div>
              <div className="admin-field">
                <label>
                  <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} />{' '}
                  Required
                </label>
              </div>
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="admin-btn admin-btn-primary">
                Save field
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
