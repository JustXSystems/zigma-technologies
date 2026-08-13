'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  last_login: string | null;
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor' as 'admin' | 'editor',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    const [meRes, listRes] = await Promise.all([
      fetch('/api/admin/auth/me'),
      fetch('/api/admin/users'),
    ]);
    const meData = await meRes.json();
    if (meRes.ok) setMeId(meData.user?.id ?? null);
    if (listRes.status === 403) {
      setForbidden(true);
      return;
    }
    const listData = await listRes.json();
    if (!listRes.ok) throw new Error(listData.error || 'Failed to load users');
    setUsers(listData.users || []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setMessage(data.message || 'User created');
      setForm({ name: '', email: '', password: '', role: 'editor' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  async function setRole(id: number, role: 'admin' | 'editor') {
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Update failed');
      return;
    }
    setMessage('Role updated');
    await load();
  }

  async function resetPassword(id: number) {
    const password = window.prompt('New password (min 10 characters):');
    if (!password) return;
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Reset failed');
      return;
    }
    setMessage('Password reset');
  }

  async function removeUser(id: number) {
    if (!window.confirm('Delete this admin user?')) return;
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Delete failed');
      return;
    }
    setMessage('User deleted');
    await load();
  }

  if (forbidden) {
    return (
      <div className="admin-card">
        <h2 style={{ marginTop: 0 }}>Users</h2>
        <p style={{ color: 'var(--admin-muted)' }}>Only full admins can manage user accounts.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="admin-card">
        <h2 style={{ marginTop: 0 }}>Admin users</h2>
        <p style={{ color: 'var(--admin-muted)' }}>
          Create editors or additional admins. Editors can use the portal; only admins manage users.
        </p>
        {error ? <div className="admin-error">{error}</div> : null}
        {message ? <div className="admin-success">{message}</div> : null}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last login</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.name}
                    {u.id === meId ? ' (you)' : ''}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="admin-input"
                      value={u.role}
                      disabled={u.id === meId}
                      onChange={(e) => setRole(u.id, e.target.value as 'admin' | 'editor')}
                      style={{ width: 'auto', minWidth: 110 }}
                    >
                      <option value="admin">admin</option>
                      <option value="editor">editor</option>
                    </select>
                  </td>
                  <td>{u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => resetPassword(u.id)}>
                      Reset password
                    </button>{' '}
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      disabled={u.id === meId}
                      onClick={() => removeUser(u.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card" style={{ maxWidth: 560 }}>
        <h3 style={{ marginTop: 0 }}>Add user</h3>
        <form onSubmit={createUser} className="admin-form-grid">
          <div className="admin-field">
            <label>Name</label>
            <input
              className="admin-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="admin-field">
            <label>Role</label>
            <select
              className="admin-input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'editor' })}
            >
              <option value="editor">editor</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="admin-field full">
            <label>Email</label>
            <input
              className="admin-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="admin-field full">
            <label>Temporary password</label>
            <input
              className="admin-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </div>
          <div className="full">
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
