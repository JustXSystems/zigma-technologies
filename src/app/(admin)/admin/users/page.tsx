'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type AdminRole = {
  id: number;
  name: string;
  slug: string;
  is_system: boolean;
};

type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  role_id: number | null;
  role_name: string | null;
  last_login: string | null;
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor' as 'admin' | 'editor',
    role_id: '' as string,
  });
  const [saving, setSaving] = useState(false);

  const editorRoles = roles.filter((r) => r.slug !== 'admin');

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
    setRoles(listData.roles || []);
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
        body: JSON.stringify({
          ...form,
          role_id: form.role === 'editor' && form.role_id ? Number(form.role_id) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setMessage(data.message || 'User created');
      setForm({ name: '', email: '', password: '', role: 'editor', role_id: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  async function setRole(id: number, role: 'admin' | 'editor', role_id: number | null) {
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role, role_id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Update failed');
      return;
    }
    setMessage('User updated — they must sign in again for screen changes to apply.');
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
          Assign a role to control which admin screens each user can access. Full admins always see every screen.
          Manage role definitions on the <a href="/admin/roles">Roles</a> page.
        </p>
        {error ? <div className="admin-error">{error}</div> : null}
        {message ? <div className="admin-success">{message}</div> : null}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Access</th>
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <select
                        className="admin-input"
                        value={u.role}
                        disabled={u.id === meId}
                        onChange={(e) => {
                          const role = e.target.value as 'admin' | 'editor';
                          const role_id =
                            role === 'admin'
                              ? roles.find((r) => r.slug === 'admin')?.id ?? null
                              : u.role_id;
                          void setRole(u.id, role, role_id);
                        }}
                        style={{ width: 'auto', minWidth: 100 }}
                      >
                        <option value="admin">Full admin</option>
                        <option value="editor">Role-based</option>
                      </select>
                      {u.role === 'editor' ? (
                        <select
                          className="admin-input"
                          value={u.role_id ?? ''}
                          disabled={u.id === meId}
                          onChange={(e) => {
                            const role_id = e.target.value ? Number(e.target.value) : null;
                            void setRole(u.id, 'editor', role_id);
                          }}
                          style={{ width: 'auto', minWidth: 160 }}
                        >
                          <option value="">Select role…</option>
                          {editorRoles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ color: 'var(--admin-muted)', fontSize: '0.88rem', alignSelf: 'center' }}>
                          All screens
                        </span>
                      )}
                    </div>
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
            <label>Access level</label>
            <select
              className="admin-input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'editor', role_id: '' })}
            >
              <option value="editor">Role-based</option>
              <option value="admin">Full admin</option>
            </select>
          </div>
          {form.role === 'editor' ? (
            <div className="admin-field full">
              <label>Role</label>
              <select
                className="admin-input"
                value={form.role_id}
                onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                required
              >
                <option value="">Select role…</option>
                {editorRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
