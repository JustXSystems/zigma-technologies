'use client';

import { useMemo, useState } from 'react';
import { useAdminUser } from '@/components/admin/admin-session';
import { useUnsavedChanges } from '@/components/admin/unsaved-changes';
import AdminDrawer from '@/components/admin/AdminDrawer';
import AccessShell from '@/components/admin/access/AccessShell';
import Avatar from '@/components/admin/access/Avatar';
import ConfirmDialog from '@/components/admin/access/ConfirmDialog';
import UserForm, { EMPTY_USER_FORM, type UserFormValues } from '@/components/admin/access/UserForm';
import {
  sendAccess,
  timeAgo,
  useAccessDirectory,
  type AccessRole,
  type AccessUser,
} from '@/components/admin/access/use-access-directory';

type Filter = 'all' | 'admin' | 'editor';
type Editing = { id: number | null; initial: UserFormValues };

function formFor(user: AccessUser, roles: AccessRole[]): UserFormValues {
  const fallback = roles.find((r) => r.slug === 'editor');
  const roleId = user.role === 'editor' ? (user.role_id ?? fallback?.id ?? null) : null;
  return { name: user.name, email: user.email, role: user.role, role_id: roleId ? String(roleId) : '', password: '' };
}

function accessOf(user: AccessUser, roles: AccessRole[]) {
  if (user.role === 'admin') return { label: 'Full admin', detail: 'All screens' };
  const role = roles.find((r) => r.id === user.role_id) ?? roles.find((r) => r.slug === 'editor');
  if (!role) return { label: 'Editor', detail: 'Default role' };
  return { label: role.name, detail: `${role.screens.length} screen${role.screens.length === 1 ? '' : 's'}` };
}

export default function UsersPage() {
  const me = useAdminUser();
  const { users, roles, loaded, forbidden, loadError, reload } = useAccessDirectory();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [roleFilter, setRoleFilter] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [form, setForm] = useState<UserFormValues>(EMPTY_USER_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState<AccessUser | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const dirty = !!editing && JSON.stringify(form) !== JSON.stringify(editing.initial);
  useUnsavedChanges(dirty);

  const editingUser = editing?.id != null ? (users.find((u) => u.id === editing.id) ?? null) : null;
  const editingSelf = !!editingUser && editingUser.id === me?.id;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (filter === 'all' || u.role === filter) &&
        (!roleFilter || (u.role === 'editor' && String(u.role_id) === roleFilter)) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [users, query, filter, roleFilter]);

  const counts = { all: users.length, admin: users.filter((u) => u.role === 'admin').length, editor: 0 };
  counts.editor = counts.all - counts.admin;

  function open(id: number | null, initial: UserFormValues) {
    setError('');
    setMessage('');
    setFormError('');
    setEditing({ id, initial });
    setForm(initial);
  }

  function close() {
    if (dirty && !window.confirm('Discard the changes to this user?')) return;
    setEditing(null);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setFormError('');
    try {
      const access = editingSelf
        ? {}
        : { role: form.role, role_id: form.role === 'editor' && form.role_id ? Number(form.role_id) : null };
      const details = { name: form.name, email: form.email, ...access, ...(form.password ? { password: form.password } : {}) };
      if (editing.id != null) await sendAccess('/api/admin/users', 'PATCH', { id: editing.id, ...details });
      else await sendAccess('/api/admin/users', 'POST', details);
      await reload();
      setEditing(null);
      setMessage(
        editing.id == null
          ? `${form.name} added. Share the temporary password securely.`
          : form.password
            ? `${form.name} updated and signed out of other sessions. Share the new password securely.`
            : `${form.name} updated. Changes apply on their next click.`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await sendAccess('/api/admin/users', 'DELETE', { id: deleting.id });
      await reload();
      setMessage(`${deleting.name} removed and signed out.`);
      setDeleting(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteBusy(false);
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

  const customRoles = roles.filter((r) => r.slug !== 'admin');

  return (
    <AccessShell
      active="users"
      users={users}
      roles={roles}
      loaded={loaded}
      actions={
        <button type="button" className="admin-btn access-btn-glow" onClick={() => open(null, EMPTY_USER_FORM)} disabled={!loaded}>
          <span aria-hidden="true">+</span> Add user
        </button>
      }
    >
      {loadError || error ? <div className="admin-error">{loadError || error}</div> : null}
      {message ? (
        <div className="admin-success access-toast" role="status">
          {message}
        </div>
      ) : null}

      <section className="access-panel">
        <div className="access-toolbar">
          <div className="access-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="access-search"
              type="search"
              placeholder="Search name or email"
              aria-label="Search users"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="access-segment" role="group" aria-label="Filter by access">
            {(
              [
                ['all', 'All'],
                ['admin', 'Full admins'],
                ['editor', 'Role-based'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={filter === id ? 'is-active' : undefined}
                aria-pressed={filter === id}
                onClick={() => {
                  setFilter(id);
                  if (id === 'admin') setRoleFilter('');
                }}
              >
                {label} <span>{counts[id]}</span>
              </button>
            ))}
          </div>
          <select
            className="admin-input access-role-filter"
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              if (e.target.value) setFilter('editor');
            }}
          >
            <option value="">Any role</option>
            {customRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="access-list" role="table" aria-label="Admin users">
          <div className="access-list-head" role="row">
            <span role="columnheader">Member</span>
            <span role="columnheader">Access</span>
            <span role="columnheader">Last sign-in</span>
            <span role="columnheader" className="admin-sr-only">
              Actions
            </span>
          </div>
          {!loaded ? (
            <div className="access-empty">Loading team…</div>
          ) : visible.length ? (
            visible.map((u) => {
              const access = accessOf(u, roles);
              const isMe = u.id === me?.id;
              return (
                <div key={u.id} role="row" className={`access-row${editing?.id === u.id ? ' is-editing' : ''}`} data-email={u.email}>
                  <div role="cell" className="access-member">
                    <Avatar name={u.name} seed={u.email} />
                    <span className="access-member-text">
                      <strong>
                        {u.name}
                        {isMe ? <span className="access-you">You</span> : null}
                      </strong>
                      <span className="access-member-email">{u.email}</span>
                    </span>
                  </div>
                  <div role="cell" className="access-access">
                    <span className={`access-pill${u.role === 'admin' ? ' is-admin' : ''}`}>{access.label}</span>
                    <small>{access.detail}</small>
                  </div>
                  <div role="cell" className="access-seen">
                    <span className={`access-dot${u.last_login ? '' : ' is-idle'}`} aria-hidden="true" />
                    <span title={u.last_login ? new Date(u.last_login).toLocaleString() : undefined}>
                      {timeAgo(u.last_login, 'Never signed in')}
                    </span>
                  </div>
                  <div role="cell" className="access-actions">
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => open(u.id, formFor(u, roles))} aria-label={`Edit ${u.name}`}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn access-btn-danger-ghost"
                      disabled={isMe}
                      title={isMe ? 'You cannot remove your own account' : undefined}
                      aria-label={`Remove ${u.name}`}
                      onClick={() => {
                        setDeleteError('');
                        setDeleting(u);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="access-empty">
              {users.length ? 'No one matches these filters.' : 'No users yet — add the first teammate.'}
            </div>
          )}
        </div>
      </section>

      <AdminDrawer
        open={!!editing}
        title={editing?.id == null ? 'Add user' : `Edit ${editingUser?.name ?? 'user'}`}
        subtitle={editing?.id == null ? 'They sign in at /admin/login with this email.' : editingUser?.email}
        onClose={close}
        footer={
          <>
            {formError ? (
              <div className="admin-error access-drawer-error" role="alert">
                {formError}
              </div>
            ) : null}
            <button type="button" className="admin-btn admin-btn-secondary" onClick={close} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="access-user-form" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing?.id == null ? 'Create user' : 'Save changes'}
            </button>
          </>
        }
      >
        {editing ? (
          <UserForm
            key={editing.id ?? 'new'}
            id="access-user-form"
            mode={editing.id == null ? 'create' : 'edit'}
            values={form}
            onChange={setForm}
            roles={roles}
            lockAccess={editingSelf}
            onSubmit={() => void save()}
          />
        ) : null}
      </AdminDrawer>

      {deleting ? (
        <ConfirmDialog
          title={`Remove ${deleting.name}?`}
          confirmLabel="Remove user"
          busy={deleteBusy}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        >
          <p style={{ margin: 0 }}>
            <strong>{deleting.email}</strong> loses access immediately and is signed out of every session. This cannot be undone.
          </p>
        </ConfirmDialog>
      ) : null}
    </AccessShell>
  );
}
