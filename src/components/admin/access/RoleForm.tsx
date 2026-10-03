'use client';

import { FormEvent } from 'react';
import type { AdminScreenKey } from '@/lib/admin-screens';
import Avatar from './Avatar';
import PermissionMatrix from './PermissionMatrix';
import type { AccessUser } from './use-access-directory';

export type RoleFormValues = { name: string; description: string; screens: AdminScreenKey[] };

export const EMPTY_ROLE_FORM: RoleFormValues = { name: '', description: '', screens: [] };

/** Create / edit a role: name, description and its screens. Built-in roles keep their name. */
export default function RoleForm({
  id,
  values,
  onChange,
  builtIn,
  members,
  onSubmit,
}: {
  id: string;
  values: RoleFormValues;
  onChange: (next: RoleFormValues) => void;
  builtIn?: boolean;
  members: AccessUser[];
  onSubmit: () => void;
}) {
  const set = (patch: Partial<RoleFormValues>) => onChange({ ...values, ...patch });

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form id={id} onSubmit={submit} className="access-form">
      <section className="access-form-section">
        <h3>Details</h3>
        <div className="admin-form-grid">
          <div className="admin-field full">
            <label htmlFor="role-name">Role name</label>
            <input
              id="role-name"
              className="admin-input"
              value={values.name}
              onChange={(e) => set({ name: e.target.value })}
              required
              maxLength={120}
              disabled={builtIn}
              placeholder="e.g. Marketing team"
            />
            {builtIn ? <p className="admin-hint">Built-in roles keep their name; their screens can change.</p> : null}
          </div>
          <div className="admin-field full">
            <label htmlFor="role-description">Description</label>
            <input
              id="role-description"
              className="admin-input"
              value={values.description}
              onChange={(e) => set({ description: e.target.value })}
              maxLength={255}
              placeholder="What this team works on (optional)"
            />
          </div>
        </div>
      </section>

      <section className="access-form-section">
        <PermissionMatrix value={values.screens} onChange={(screens) => set({ screens })} />
      </section>

      {members.length ? (
        <section className="access-form-section">
          <h3>Members ({members.length})</h3>
          <p className="admin-hint" style={{ marginTop: 0 }}>
            Saving applies to these people on their next click.
          </p>
          <ul className="access-member-mini">
            {members.map((m) => (
              <li key={m.id}>
                <Avatar name={m.name} seed={m.email} size="sm" />
                <span>{m.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </form>
  );
}
