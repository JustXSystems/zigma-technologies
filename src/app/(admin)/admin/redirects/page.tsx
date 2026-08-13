'use client';

import { FormEvent, useEffect, useState } from 'react';

type Redirect = {
  id: number;
  from_path: string;
  to_path: string;
  status_code: number;
  enabled: number;
};

export default function RedirectsPage() {
  const [rows, setRows] = useState<Redirect[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fromPath, setFromPath] = useState('');
  const [toPath, setToPath] = useState('');
  const [statusCode, setStatusCode] = useState(301);

  async function load() {
    const res = await fetch('/api/admin/redirects');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setRows(data.redirects || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_path: fromPath, to_path: toPath, status_code: statusCode, enabled: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Create failed');
      return;
    }
    setFromPath('');
    setToPath('');
    setMessage('Redirect created');
    await load();
  }

  async function toggle(row: Redirect) {
    await fetch('/api/admin/redirects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, enabled: !row.enabled }),
    });
    await load();
  }

  async function remove(row: Redirect) {
    if (!confirm(`Delete redirect ${row.from_path}?`)) return;
    await fetch('/api/admin/redirects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id }),
    });
    setMessage('Deleted');
    await load();
  }

  return (
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>URL redirects</h2>
        <p style={{ color: 'var(--admin-muted)' }}>
          301/302 redirects applied in proxy before page render. Use for slug changes and legacy paths.
          Run <code>scripts/migrate-redirects.sql</code> if the table is missing.
        </p>
        <form onSubmit={add} className="admin-form-grid">
          <div className="admin-field">
            <label>From path</label>
            <input
              className="admin-input"
              value={fromPath}
              onChange={(e) => setFromPath(e.target.value)}
              placeholder="/old-page"
              required
            />
          </div>
          <div className="admin-field">
            <label>To path or URL</label>
            <input
              className="admin-input"
              value={toPath}
              onChange={(e) => setToPath(e.target.value)}
              placeholder="/new-page or https://…"
              required
            />
          </div>
          <div className="admin-field">
            <label>Status</label>
            <select
              className="admin-select"
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value))}
            >
              <option value={301}>301 permanent</option>
              <option value={302}>302 temporary</option>
              <option value={307}>307</option>
              <option value={308}>308</option>
            </select>
          </div>
          <div className="full">
            <button type="submit" className="admin-btn admin-btn-primary">
              Add redirect
            </button>
          </div>
        </form>
      </div>

      <div className="admin-table-wrap admin-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Code</th>
              <th>Enabled</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty">
                  No redirects yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code>{row.from_path}</code>
                  </td>
                  <td>
                    <code>{row.to_path}</code>
                  </td>
                  <td>{row.status_code}</td>
                  <td>{row.enabled ? 'Yes' : 'No'}</td>
                  <td>
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => toggle(row)}>
                      {row.enabled ? 'Disable' : 'Enable'}
                    </button>{' '}
                    <button type="button" className="admin-btn admin-btn-danger" onClick={() => remove(row)}>
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
