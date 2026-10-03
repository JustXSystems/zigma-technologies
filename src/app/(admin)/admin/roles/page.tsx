'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ADMIN_SCREEN_DEFS,
  type AdminScreenKey,
} from '@/lib/admin-screens';
import { ToggleCard } from '@/components/admin/form/controls';

type AdminRole = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  screens: AdminScreenKey[];
  is_system: boolean;
  userCount: number;
};

const ASSIGNABLE_SCREENS = ADMIN_SCREEN_DEFS.filter((s) => !s.superAdminOnly);

/** `null` when the signed-in user may not manage roles. */
async function fetchRoles(): Promise<AdminRole[] | null> {
  const res = await fetch('/api/admin/roles');
  if (res.status === 403) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load roles');
  return data.roles || [];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    screens: [] as AdminScreenKey[],
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const apply = useCallback((loaded: AdminRole[] | null) => {
    if (loaded) setRoles(loaded);
    else setForbidden(true);
  }, []);

  const load = useCallback(async () => {
    setError('');
    apply(await fetchRoles());
  }, [apply]);

  useEffect(() => {
    fetchRoles()
      .then(apply)
      .catch((e: Error) => setError(e.message));
  }, [apply]);

  const groupedScreens = useMemo(() => {
    const map = new Map<string, typeof ASSIGNABLE_SCREENS>();
    for (const screen of ASSIGNABLE_SCREENS) {
      const list = map.get(screen.group) || [];
      list.push(screen);
      map.set(screen.group, list);
    }
    return Array.from(map.entries());
  }, []);

  function toggleScreen(key: AdminScreenKey, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      screens: checked ? [...prev.screens, key] : prev.screens.filter((k) => k !== key),
    }));
  }

  function startEdit(role: AdminRole) {
    if (role.is_system) return;
    setEditingId(role.id);
    setForm({
      name: role.name,
      description: role.description || '',
      screens: [...role.screens],
    });
    setMessage('');
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ name: '', description: '', screens: [] });
  }

  async function saveRole(e: FormEvent) {
    e.preventDefault();
    if (!form.screens.length) {
      setError('Select at least one screen');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        screens: form.screens,
        ...(editingId ? { id: editingId } : {}),
      };
      const res = await fetch('/api/admin/roles', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessage(data.message || 'Saved');
      cancelEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function removeRole(id: number) {
    if (!window.confirm('Delete this role? Users must be reassigned first.')) return;
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/roles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Delete failed');
      return;
    }
    setMessage('Role deleted');
    await load();
  }

  if (forbidden) {
    return (
      <div className="admin-card">
        <h2 style={{ marginTop: 0 }}>Roles</h2>
        <p style={{ color: 'var(--admin-muted)' }}>Only full admins can manage roles.</p>
      </div>
    );
  }

  return (
    <div className="admin-page-stack">
      <div className="admin-card">
        <h2 style={{ marginTop: 0 }}>Admin roles</h2>
        <p style={{ color: 'var(--admin-muted)' }}>
          Create roles with specific screen access, then assign them to users on the Users page.
          Full admins always have access to every screen.
        </p>
        {error ? <div className="admin-error">{error}</div> : null}
        {message ? <div className="admin-success">{message}</div> : null}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Screens</th>
                <th>Users</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>
                    <strong>{role.name}</strong>
                    {role.is_system ? (
                      <span style={{ marginLeft: 8, color: 'var(--admin-muted)', fontSize: '0.85rem' }}>
                        system
                      </span>
                    ) : null}
                    {role.description ? (
                      <div style={{ color: 'var(--admin-muted)', fontSize: '0.88rem', marginTop: 4 }}>
                        {role.description}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ maxWidth: 420 }}>
                    <span style={{ fontSize: '0.88rem', color: 'var(--admin-muted)' }}>
                      {role.slug === 'admin' ? 'All screens' : `${role.screens.length} screen(s)`}
                    </span>
                  </td>
                  <td>{role.userCount}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {!role.is_system ? (
                      <>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => startEdit(role)}
                        >
                          Edit
                        </button>{' '}
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          disabled={role.userCount > 0}
                          onClick={() => removeRole(role.id)}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <span style={{ color: 'var(--admin-muted)', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card" style={{ maxWidth: 720 }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit role' : 'Create role'}</h3>
        <form onSubmit={saveRole} className="admin-form-grid">
          <div className="admin-field full">
            <label>Role name</label>
            <input
              className="admin-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="admin-field full">
            <label>Description (optional)</label>
            <input
              className="admin-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <fieldset className="full admin-role-screens">
            <legend>Screen access</legend>
            {groupedScreens.map(([group, screens]) => (
              <div key={group}>
                <h4>{group}</h4>
                <div className="admin-footer-office-toggles">
                  {screens.map((screen) => (
                    <ToggleCard
                      key={screen.key}
                      id={`role-screen-${screen.key}`}
                      label={screen.accessLabel ?? screen.label}
                      checked={form.screens.includes(screen.key)}
                      onChange={(on) => toggleScreen(screen.key, on)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
          <div className="full" style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update role' : 'Create role'}
            </button>
            {editingId ? (
              <button type="button" className="admin-btn admin-btn-secondary" onClick={cancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
