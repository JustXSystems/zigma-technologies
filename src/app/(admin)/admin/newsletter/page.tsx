'use client';

import { useEffect, useState } from 'react';

type Sub = {
  id: number;
  email: string;
  source: string | null;
  created_at: string;
};

export default function NewsletterAdminPage() {
  const [rows, setRows] = useState<Sub[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const res = await fetch('/api/admin/newsletter');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setRows(data.subscribers || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function remove(id: number) {
    if (!confirm('Remove this subscriber?')) return;
    setError('');
    const res = await fetch('/api/admin/newsletter', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Delete failed');
      return;
    }
    setMessage('Removed');
    await load();
  }

  function exportCsv() {
    const header = 'email,source,created_at\n';
    const body = rows
      .map((r) => `"${r.email}","${r.source || ''}","${r.created_at}"`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newsletter-subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="admin-card">
      <div className="admin-toolbar" style={{ marginBottom: '0.8rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Newsletter</h2>
          <p style={{ color: 'var(--admin-muted)', margin: '0.35rem 0 0' }}>
            Footer subscriptions. Run <code>scripts/migrate-newsletter.sql</code> if the table is missing.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={exportCsv} disabled={!rows.length}>
          Export CSV
        </button>
      </div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Source</th>
              <th>Joined</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-empty">
                  No subscribers yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td>{r.source || '—'}</td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>
                    <button type="button" className="admin-btn admin-btn-danger" onClick={() => remove(r.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
