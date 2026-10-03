'use client';

import { useState } from 'react';
import { useUnsavedChanges } from '@/components/admin/unsaved-changes';
import AdminDrawer from '@/components/admin/AdminDrawer';
import AccessShell from '@/components/admin/access/AccessShell';
import Avatar from '@/components/admin/access/Avatar';
import ConfirmDialog from '@/components/admin/access/ConfirmDialog';
import { ASSIGNABLE_COUNT, screenLabel } from '@/components/admin/access/PermissionMatrix';
import RoleForm, { EMPTY_ROLE_FORM, type RoleFormValues } from '@/components/admin/access/RoleForm';
import {
  sendAccess,
  useAccessDirectory,
  type AccessRole,
  type AccessUser,
} from '@/components/admin/access/use-access-directory';

const CHIP_LIMIT = 6;

type Editing = { id: number | null; builtIn: boolean; initial: RoleFormValues };

function membersOf(role: AccessRole, users: AccessUser[]) {
  if (role.slug === 'admin') return users.filter((u) => u.role === 'admin');
  return users.filter((u) => u.role === 'editor' && (u.role_id === role.id || (u.role_id == null && role.slug === 'editor')));
}

function uniqueCopyName(name: string, roles: AccessRole[]) {
  const taken = new Set(roles.map((r) => r.name.toLowerCase()));
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? `${name} copy` : `${name} copy ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

export default function RolesPage() {
  const { users, roles, loaded, forbidden, loadError, reload } = useAccessDirectory();
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [form, setForm] = useState<RoleFormValues>(EMPTY_ROLE_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState<AccessRole | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const dirty = !!editing && JSON.stringify(form) !== JSON.stringify(editing.initial);
  useUnsavedChanges(dirty);

  const editingRole = editing?.id != null ? (roles.find((r) => r.id === editing.id) ?? null) : null;

  function open(next: Editing) {
    setMessage('');
    setFormError('');
    setEditing(next);
    setForm(next.initial);
  }

  function close() {
    if (dirty && !window.confirm('Discard the changes to this role?')) return;
    setEditing(null);
  }

  async function save() {
    if (!editing) return;
    if (!form.screens.length) {
      setFormError('Select at least one screen');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...(editing.builtIn ? {} : { name: form.name }),
        description: form.description.trim() || null,
        screens: form.screens,
      };
      if (editing.id != null) await sendAccess('/api/admin/roles', 'PATCH', { id: editing.id, ...payload });
      else await sendAccess('/api/admin/roles', 'POST', payload);
      await reload();
      setEditing(null);
      setMessage(
        editing.id == null
          ? `Role "${form.name}" created. Assign it on the Users tab.`
          : `Role "${form.name}" updated. Members see the change on their next click.`
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
      await sendAccess('/api/admin/roles', 'DELETE', { id: deleting.id, reassign_to: reassignTo ? Number(reassignTo) : null });
      await reload();
      setMessage(`Role "${deleting.name}" deleted.`);
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
        <h2 style={{ marginTop: 0 }}>Roles</h2>
        <p style={{ color: 'var(--admin-muted)' }}>Only full admins can manage roles.</p>
      </div>
    );
  }

  const deletingMembers = deleting ? membersOf(deleting, users) : [];
  const reassignOptions = deleting ? roles.filter((r) => r.slug !== 'admin' && r.id !== deleting.id) : [];

  return (
    <AccessShell
      active="roles"
      users={users}
      roles={roles}
      loaded={loaded}
      actions={
        <button
          type="button"
          className="admin-btn access-btn-glow"
          disabled={!loaded}
          onClick={() => open({ id: null, builtIn: false, initial: EMPTY_ROLE_FORM })}
        >
          <span aria-hidden="true">+</span> New role
        </button>
      }
    >
      {loadError ? <div className="admin-error">{loadError}</div> : null}
      {message ? (
        <div className="admin-success access-toast" role="status">
          {message}
        </div>
      ) : null}

      <div className="access-role-grid">
        {!loaded ? <div className="access-panel access-empty">Loading roles…</div> : null}
        {roles.map((role) => {
          const isAdmin = role.slug === 'admin';
          const members = membersOf(role, users);
          const coverage = isAdmin ? 100 : Math.round((role.screens.length / ASSIGNABLE_COUNT) * 100);
          const values: RoleFormValues = { name: role.name, description: role.description ?? '', screens: role.screens };
          return (
            <article key={role.id} className={`access-role-card${isAdmin ? ' is-admin' : ''}`} data-role={role.slug}>
              <div className="access-role-head">
                <Avatar name={role.name} seed={role.slug} size="lg" />
                <div>
                  <h3>
                    {role.name}
                    <span className={`access-tag${role.is_system ? ' is-system' : ''}`}>{role.is_system ? 'Built-in' : 'Custom'}</span>
                  </h3>
                  <p>{role.description || 'No description'}</p>
                </div>
              </div>

              <div className="access-coverage">
                <div className="access-coverage-label">
                  <span>Screen coverage</span>
                  <strong>{isAdmin ? 'All screens' : `${role.screens.length} / ${ASSIGNABLE_COUNT}`}</strong>
                </div>
                <div className="access-coverage-bar" aria-hidden="true">
                  <span style={{ width: `${coverage}%` }} />
                </div>
              </div>

              <div className="access-chip-list">
                {isAdmin ? (
                  <span className="access-chip is-accent">Everything, including Users, Roles, Email &amp; New Client</span>
                ) : (
                  <>
                    {role.screens.slice(0, CHIP_LIMIT).map((key) => (
                      <span key={key} className="access-chip">
                        {screenLabel(key)}
                      </span>
                    ))}
                    {role.screens.length > CHIP_LIMIT ? (
                      <span className="access-chip is-muted" title={role.screens.slice(CHIP_LIMIT).map(screenLabel).join(', ')}>
                        +{role.screens.length - CHIP_LIMIT} more
                      </span>
                    ) : null}
                  </>
                )}
              </div>

              <div className="access-role-foot">
                <div className="access-stack" title={members.map((m) => m.name).join(', ') || undefined}>
                  {members.slice(0, 4).map((m) => (
                    <Avatar key={m.id} name={m.name} seed={m.email} size="sm" />
                  ))}
                  <span className="access-stack-label">
                    {members.length ? `${members.length} member${members.length === 1 ? '' : 's'}` : 'No members'}
                  </span>
                </div>
                <div className="access-role-actions">
                  {isAdmin ? (
                    <span className="access-locked">Locked</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        aria-label={`Edit ${role.name}`}
                        onClick={() => open({ id: role.id, builtIn: role.is_system, initial: values })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        aria-label={`Duplicate ${role.name}`}
                        onClick={() =>
                          open({ id: null, builtIn: false, initial: { ...values, name: uniqueCopyName(role.name, roles) } })
                        }
                      >
                        Duplicate
                      </button>
                      {!role.is_system ? (
                        <button
                          type="button"
                          className="admin-btn access-btn-danger-ghost"
                          aria-label={`Delete ${role.name}`}
                          onClick={() => {
                            setDeleteError('');
                            setReassignTo('');
                            setDeleting(role);
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <AdminDrawer
        open={!!editing}
        title={editing?.id == null ? 'New role' : `Edit ${editingRole?.name ?? 'role'}`}
        subtitle={
          editing?.id == null
            ? 'Pick the screens this team needs — nothing more.'
            : editing.builtIn
              ? 'Built-in role: screens and description can change.'
              : 'Changes apply to every member on their next click.'
        }
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
            <button type="submit" form="access-role-form" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing?.id == null ? 'Create role' : 'Save role'}
            </button>
          </>
        }
      >
        {editing ? (
          <RoleForm
            key={editing.id ?? 'new'}
            id="access-role-form"
            values={form}
            onChange={setForm}
            builtIn={editing.builtIn}
            members={editingRole ? membersOf(editingRole, users) : []}
            onSubmit={() => void save()}
          />
        ) : null}
      </AdminDrawer>

      {deleting ? (
        <ConfirmDialog
          title={`Delete role "${deleting.name}"?`}
          confirmLabel={deletingMembers.length ? 'Move members & delete' : 'Delete role'}
          busy={deleteBusy}
          disabled={deletingMembers.length > 0 && !reassignTo}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        >
          {deletingMembers.length ? (
            <div className="admin-field">
              <p style={{ marginTop: 0 }}>
                {deletingMembers.length} member{deletingMembers.length === 1 ? '' : 's'} ({deletingMembers.map((m) => m.name).join(', ')}) hold
                this role. Choose where they move:
              </p>
              <label htmlFor="role-reassign">Move members to</label>
              <select id="role-reassign" className="admin-input" value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
                <option value="">Select a role…</option>
                {reassignOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.screens.length} screens)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p style={{ margin: 0 }}>No one holds this role. It is removed permanently.</p>
          )}
        </ConfirmDialog>
      ) : null}
    </AccessShell>
  );
}
