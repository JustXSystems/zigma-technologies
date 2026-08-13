'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Enquiry } from '@/lib/types';

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Enquiry['status']>('all');
  const [q, setQ] = useState('');

  async function load(status = statusFilter) {
    const res = await fetch(`/api/admin/enquiries?status=${status}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setEnquiries(data.enquiries);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return enquiries;
    return enquiries.filter((e) => {
      const blob = JSON.stringify(e.payload_json).toLowerCase();
      return (
        blob.includes(term) ||
        String(e.item_title || '').toLowerCase().includes(term) ||
        String(e.admin_notes || '').toLowerCase().includes(term)
      );
    });
  }, [enquiries, q]);

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

  function exportCsv() {
    window.open(`/api/admin/enquiries?status=${statusFilter}&format=csv`, '_blank');
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
          <input
            className="admin-input"
            placeholder="Search payload…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div className="admin-table-wrap admin-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
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
                <td colSpan={5} className="admin-empty">
                  No enquiries match.
                </td>
              </tr>
            ) : (
              filtered.map((enq) => (
                <tr key={enq.id}>
                  <td>{new Date(enq.created_at).toLocaleString()}</td>
                  <td>{enq.item_title || enq.item_type || 'General'}</td>
                  <td>
                    {String(enq.payload_json.name || '—')}
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
    </div>
  );
}
