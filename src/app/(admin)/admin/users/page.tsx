'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAdminUser } from '@/components/admin/admin-session';
import { useUnsavedChanges } from '@/components/admin/unsaved-changes';
import UserForm, { EMPTY_USER_FORM, type AdminRoleOption, type UserFormValues } from '@/components/admin/users/UserForm';

type AdminUserRow = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  role_id: number | null;
  role_name: string | null;
  last_login: string | null;
  created_at: string;
};

type UsersData = { users: AdminUserRow[]; roles: AdminRoleOption[] } | null;

/** `null` when the signed-in user may not manage users. */
async function fetchUsers(): Promise<UsersData> {
  const res = await fetch('/api/admin/users');
  if (res.status === 403) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load users');
  return { users: data.users || [], roles: data.roles || [] };
}

async function send(method: 'POST' | 'PATCH' | 'DELETE', body: object) {
  const res = await fetch('/api/admin/users', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function formFor(user: AdminUserRow, roles: AdminRoleOption[]): UserFormValues {
  const editorRole = roles.find((r) => r.slug === 'editor');
  const roleId = user.role === 'editor' ? (user.role_id ?? editorRole?.id ?? null) : null;
  return { name: user.name, email: user.email, role: user.role, role_id: roleId ? String(roleId) : '', password: '' };
}

function accessLabel(user: AdminUserRow, roles: AdminRoleOption[]) {
  if (user.role === 'admin') return { text: 'Full admin', detail: 'All screens' };
  const role = roles.find((r) => r.id === user.role_id);
  if (!role) return { text: 'Editor', detail: 'Default role' };
  return { text: role.name, detail: `${role.screens.length} screen${role.screens.length === 1 ? '' : 's'}` };
}

export default function UsersPage() {
  const me = useAdminUser();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<AdminRoleOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormValues>(EMPTY_USER_FORM);
  const [initialForm, setInitialForm] = useState<UserFormValues>(EMPTY_USER_FORM);
  const formRef = useRef<HTMLDivElement>(null);
  useUnsavedChanges(JSON.stringify(form) !== JSON.stringify(initialForm));

  const editing = users.find((u) => u.id === editingId) ?? null;

  const apply = useCallback((data: UsersData) => {
    setLoaded(true);
    if (!data) {
      setForbidden(true);
      return;
    }
    setUsers(data.users);
    setRoles(data.roles);
  }, []);

  const load = useCallback(async () => apply(await fetchUsers()), [apply]);

  useEffect(() => {
    fetchUsers()
      .then(apply)
      .catch((e: Error) => setError(e.message));
  }, [apply]);

  function openForm(values: UserFormValues, id: number | null) {
    setEditingId(id);
    setForm(values);
    setInitialForm(values);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }

  function startEdit(user: AdminUserRow) {
    if (JSON.stringify(form) !== JSON.stringify(initialForm) && !window.confirm('Discard the unsaved changes in the form?')) return;
    setError('');
    setMessage('');
    openForm(formFor(user, roles), user.id);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_USER_FORM);
    setInitialForm(EMPTY_USER_FORM);
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const access =
        editing && editing.id === me?.id
          ? {}
          : { role: form.role, role_id: form.role === 'editor' && form.role_id ? Number(form.role_id) : null };
      const details = { name: form.name, email: form.email, ...access, ...(form.password ? { password: form.password } : {}) };
      if (editing) await send('PATCH', { id: editing.id, ...details });
      else await send('POST', details);
      resetForm();
      await load();
      setMessage(
        !editing
          ? `${form.name} created. Share the temporary password securely.`
          : form.password
            ? `${form.name} updated and signed out of other sessions. Share the new password securely.`
            : `${form.name} updated. Changes apply on their next click.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(user: AdminUserRow) {
    if (!window.confirm(`Delete ${user.name} (${user.email})? They are signed out immediately.`)) return;
    setError('');
    setMessage('');
    try {
      await send('DELETE', { id: user.id });
      if (editingId === user.id) resetForm();
      await load();
      setMessage(`${user.name} deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
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
    <div className="admin-page-stack">
      <div className="admin-card admin-page-intro">
        <h2>Admin users</h2>
        <p>
          Full admins see every screen; role-based users see only the screens of their role (define roles on the{' '}
          <Link href="/admin/roles">Roles</Link> page). Access and password changes apply straight away, and deleted users
          are signed out at once.
        </p>
      </div>

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-table-wrap">
        <table className="admin-table admin-users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Access</th>
              <th>Last sign-in</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const access = accessLabel(u, roles);
              const isMe = u.id === me?.id;
              return (
                <tr key={u.id} className={u.id === editingId ? 'is-editing' : undefined}>
                  <td>
                    <strong>{u.name}</strong>
                    {isMe ? <span className="admin-badge new admin-users-you">You</span> : null}
                  </td>
                  <td className="admin-users-email">{u.email}</td>
                  <td>
                    <span className={`admin-badge ${u.role === 'admin' ? 'new' : 'draft'}`}>{access.text}</span>
                    <small className="admin-users-detail">{access.detail}</small>
                  </td>
                  <td>{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                  <td className="admin-users-actions">
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => startEdit(u)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      disabled={isMe}
                      title={isMe ? 'You cannot delete your own account' : undefined}
                      onClick={() => void remove(u)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {loaded && !users.length ? (
              <tr>
                <td colSpan={5}>No users yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="admin-card admin-user-card" ref={formRef}>
        <h3 style={{ marginTop: 0 }}>{editing ? `Edit ${editing.name}` : 'Add user'}</h3>
        <UserForm
          key={editingId ?? 'new'}
          mode={editing ? 'edit' : 'create'}
          values={form}
          onChange={setForm}
          roles={roles}
          saving={saving}
          lockAccess={!!editing && editing.id === me?.id}
          onSubmit={() => void save()}
          onCancel={editing ? resetForm : undefined}
        />
      </div>
    </div>
  );
}
