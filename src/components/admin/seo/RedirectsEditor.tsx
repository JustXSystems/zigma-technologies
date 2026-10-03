'use client';

import { FormEvent, useEffect, useId, useState } from 'react';

type Redirect = {
  id: number;
  from_path: string;
  to_path: string;
  status_code: number;
  enabled: number;
};

export default function RedirectsEditor() {
  const id = useId();
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
    <div className="admin-page-stack">
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Add a redirect</h3>
        <p className="theme-help" style={{ marginTop: 0 }}>
          Applied before the page renders. Renaming the address of a published page, resource, press post or catalog
          item adds its redirect automatically — use this for legacy paths and external moves. Run{' '}
          <code>scripts/migrate-redirects.sql</code> if the table is missing.
        </p>
        <form onSubmit={add} className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor={`${id}-from`}>From path</label>
            <input
              id={`${id}-from`}
              className="admin-input"
              value={fromPath}
              onChange={(e) => setFromPath(e.target.value)}
              placeholder="/old-page"
              required
            />
          </div>
          <div className="admin-field">
            <label htmlFor={`${id}-to`}>To path or URL</label>
            <input
              id={`${id}-to`}
              className="admin-input"
              value={toPath}
              onChange={(e) => setToPath(e.target.value)}
              placeholder="/new-page or https://…"
              required
            />
          </div>
          <div className="admin-field">
            <label htmlFor={`${id}-status`}>Status</label>
            <select
              id={`${id}-status`}
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
