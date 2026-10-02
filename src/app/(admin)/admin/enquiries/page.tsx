'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import EnquiryExportCentre, { type ExportScope } from '@/components/admin/EnquiryExportCentre';
import type { Enquiry } from '@/lib/types';

type EnquiryKind = 'enquiry' | 'careers' | 'callback' | 'brochure';

const KIND_LABEL: Record<EnquiryKind, string> = {
  enquiry: 'Enquiry',
  careers: 'Careers',
  callback: 'Callback',
  brochure: 'Brochure',
};

function enquiryKind(e: Enquiry): EnquiryKind {
  switch (String(e.payload_json?.source || '')) {
    case 'careers_apply':
      return 'careers';
    case 'callback_request':
      return 'callback';
    case 'brochure_download':
      return 'brochure';
    default:
      return 'enquiry';
  }
}

function hasAttachment(e: Enquiry) {
  return Object.entries(e.payload_json || {}).some(([k, v]) => (/_file$/.test(k) || k === 'resume_url') && typeof v === 'string' && v !== '');
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Enquiry['status']>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | EnquiryKind>('all');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [exportScope, setExportScope] = useState<ExportScope | null>(null);
  const [exportIds, setExportIds] = useState<number[]>([]);
  const deepLinked = useRef(false);

  async function load(status = statusFilter) {
    const res = await fetch(`/api/admin/enquiries?status=${status}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setEnquiries(data.enquiries);
    if (!deepLinked.current) {
      deepLinked.current = true;
      const id = Number(new URLSearchParams(window.location.search).get('id'));
      const hit = id ? (data.enquiries as Enquiry[]).find((e) => e.id === id) : undefined;
      if (hit) {
        setSelected(hit);
        setNotes(hit.admin_notes || '');
      }
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return enquiries.filter((e) => {
      if (typeFilter !== 'all' && enquiryKind(e) !== typeFilter) return false;
      if (!term) return true;
      const blob = JSON.stringify(e.payload_json).toLowerCase();
      return (
        blob.includes(term) ||
        String(e.item_title || '').toLowerCase().includes(term) ||
        String(e.admin_notes || '').toLowerCase().includes(term)
      );
    });
  }, [enquiries, q, typeFilter]);

  const pickedIds = useMemo(() => filtered.filter((e) => picked.has(e.id)).map((e) => e.id), [filtered, picked]);
  const allPicked = filtered.length > 0 && pickedIds.length === filtered.length;

  function togglePick(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openExport(scope: ExportScope, ids: number[] = pickedIds) {
    setExportIds(ids);
    setExportScope(scope);
  }

  const viewLabel = [
    statusFilter === 'all' ? 'Any status' : statusFilter.replace('_', ' '),
    typeFilter === 'all' ? 'all types' : KIND_LABEL[typeFilter].toLowerCase(),
    q.trim() ? `“${q.trim()}”` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  async function setStatus(id: number, status: Enquiry['status']) {
    const res = await fetch(`/api/admin/enquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Update failed');
      return;
    }
    await load();
    if (selected?.id === id) setSelected({ ...selected, status });
  }

  async function saveNotes() {
    if (!selected) return;
    setError('');
    setMessage('');
    const res = await fetch(`/api/admin/enquiries/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_notes: notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Save notes failed');
      return;
    }
    setMessage('Notes saved.');
    setSelected({ ...selected, admin_notes: notes });
    await load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this enquiry permanently?')) return;
    const res = await fetch(`/api/admin/enquiries/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Delete failed');
      return;
    }
    setSelected(null);
    await load();
  }

  return (
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-toolbar">
        <div className="left" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['all', 'new', 'in_progress', 'closed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`admin-btn ${statusFilter === s ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
          <select
            className="admin-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | EnquiryKind)}
            aria-label="Type"
          >
            <option value="all">All types</option>
            <option value="enquiry">Enquiries</option>
            <option value="careers">Careers</option>
            <option value="callback">Callbacks</option>
            <option value="brochure">Brochure requests</option>
          </select>
          <input
            className="admin-input"
            placeholder="Search payload…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="button" className="admin-btn admin-btn-primary enq-export-btn" onClick={() => openExport('view')}>
          <span aria-hidden>⇩</span> Export…
        </button>
      </div>

      {pickedIds.length ? (
        <div className="enq-selbar">
          <strong>{pickedIds.length} selected</strong>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => openExport('selected')}>
            Export selected with attachments
          </button>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setPicked(new Set())}>
            Clear
          </button>
        </div>
      ) : null}

      <div className="admin-table-wrap admin-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th className="enq-check">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allPicked}
                  onChange={() => setPicked(allPicked ? new Set() : new Set(filtered.map((e) => e.id)))}
                />
              </th>
              <th>When</th>
              <th>Item</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No enquiries match.
                </td>
              </tr>
            ) : (
              filtered.map((enq) => (
                <tr key={enq.id} className={picked.has(enq.id) ? 'admin-table-row--highlight' : undefined}>
                  <td className="enq-check">
                    <input
                      type="checkbox"
                      aria-label={`Select enquiry ${enq.id}`}
                      checked={picked.has(enq.id)}
                      onChange={() => togglePick(enq.id)}
                    />
                  </td>
                  <td>{new Date(enq.created_at).toLocaleString()}</td>
                  <td>
                    {enq.item_title || enq.item_type || 'General'}
                    {enquiryKind(enq) !== 'enquiry' && enquiryKind(enq) !== 'careers' ? (
                      <div className="enq-kind">{KIND_LABEL[enquiryKind(enq)]}</div>
                    ) : null}
                  </td>
                  <td>
                    {String(enq.payload_json.name || '—')}
                    {hasAttachment(enq) ? (
                      <span className="enq-clip" title="Has attachment">
                        📎
                      </span>
                    ) : null}
                    <div style={{ color: 'var(--admin-muted)', fontSize: '0.8rem' }}>
                      {String(enq.payload_json.email || '')}
                    </div>
                    {enq.payload_json.source === 'careers_apply' ? (
                      <div style={{ marginTop: '0.25rem' }}>
                        <span className="admin-badge draft">Careers</span>
                        {enq.payload_json.role ? (
                          <span style={{ marginLeft: '0.4rem', fontSize: '0.78rem' }}>
                            {String(enq.payload_json.role)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${enq.status === 'new' ? 'new' : enq.status === 'closed' ? 'closed' : 'draft'}`}
                    >
                      {enq.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => {
                        setSelected(enq);
                        setNotes(enq.admin_notes || '');
                        setMessage('');
                      }}
                    >
                      View
                    </button>{' '}
                    <select
                      className="admin-select"
                      value={enq.status}
                      onChange={(e) => setStatus(enq.id, e.target.value as Enquiry['status'])}
                    >
                      <option value="new">new</option>
                      <option value="in_progress">in_progress</option>
                      <option value="closed">closed</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="admin-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Enquiry #{selected.id}</h2>
            <p style={{ color: 'var(--admin-muted)', marginTop: 0 }}>
              {selected.item_title || selected.item_type || 'General'} · {new Date(selected.created_at).toLocaleString()}
            </p>
            <div className="admin-form-grid" style={{ marginBottom: '1rem' }}>
              {Object.entries(selected.payload_json || {}).map(([key, value]) => {
                if (key === 'resume_file' || key === 'resume_mime' || key === 'resume_url') return null;
                if (key === 'resume_name') {
                  if (!(selected.payload_json.resume_file || selected.payload_json.resume_url)) return null;
                  return (
                    <div key={key} className="admin-field">
                      <label>resume</label>
                      <div style={{ fontSize: '0.92rem' }}>
                        <a href={`/api/admin/enquiries/${selected.id}/resume`} target="_blank" rel="noopener noreferrer">
                          Download {String(value || 'resume')}
                        </a>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={key} className="admin-field">
                    <label>{key}</label>
                    <div style={{ fontSize: '0.92rem' }}>{String(value ?? '—')}</div>
                  </div>
                );
              })}
              {!selected.payload_json.resume_name &&
              (selected.payload_json.resume_file || selected.payload_json.resume_url) ? (
                <div className="admin-field">
                  <label>resume</label>
                  <div style={{ fontSize: '0.92rem' }}>
                    <a href={`/api/admin/enquiries/${selected.id}/resume`} target="_blank" rel="noopener noreferrer">
                      Download resume
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="admin-field">
              <label>Admin notes</label>
              <textarea className="admin-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-danger" onClick={() => remove(selected.id)}>
                Delete
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  const id = selected.id;
                  setSelected(null);
                  openExport('selected', [id]);
                }}
              >
                Export this enquiry
              </button>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={saveNotes}>
                Save notes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exportScope ? (
        <EnquiryExportCentre
          open
          initialScope={exportScope}
          view={{ status: statusFilter, type: typeFilter, q, label: viewLabel }}
          selectedIds={exportIds}
          onClose={() => setExportScope(null)}
          onExported={(marked) => {
            if (marked) load().catch(() => undefined);
          }}
        />
      ) : null}
    </div>
  );
}
