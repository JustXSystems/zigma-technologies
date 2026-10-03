'use client';

import { FormEvent, useState } from 'react';
import { ADMIN_SCREEN_DEFS, type AdminScreenKey } from '@/lib/admin-screens';

export type AdminRoleOption = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  screens: AdminScreenKey[];
};

export type UserFormValues = {
  name: string;
  email: string;
  role: 'admin' | 'editor';
  role_id: string;
  password: string;
};

export const EMPTY_USER_FORM: UserFormValues = { name: '', email: '', role: 'editor', role_id: '', password: '' };

const SCREEN_LABELS = new Map(ADMIN_SCREEN_DEFS.filter((s) => !s.alwaysOpen).map((s) => [s.key, s.label]));
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?';

function generatePassword(length = 16) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join('');
}

type Props = {
  mode: 'create' | 'edit';
  values: UserFormValues;
  onChange: (next: UserFormValues) => void;
  roles: AdminRoleOption[];
  saving: boolean;
  /** Editing yourself: access stays as it is. */
  lockAccess?: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
};

/** Add / edit an admin account — one form for both, so the rules stay identical. */
export default function UserForm({ mode, values, onChange, roles, saving, lockAccess, onSubmit, onCancel }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const editorRoles = roles.filter((r) => r.slug !== 'admin');
  const selectedRole = editorRoles.find((r) => String(r.id) === values.role_id);
  const set = (patch: Partial<UserFormValues>) => onChange({ ...values, ...patch });
  const isEdit = mode === 'edit';

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={submit} className="admin-form-grid admin-user-form">
      <div className="admin-field">
        <label htmlFor="user-name">Name</label>
        <input
          id="user-name"
          className="admin-input"
          value={values.name}
          onChange={(e) => set({ name: e.target.value })}
          required
          maxLength={120}
          autoComplete="off"
        />
      </div>
      <div className="admin-field">
        <label htmlFor="user-email">Email</label>
        <input
          id="user-email"
          className="admin-input"
          type="email"
          value={values.email}
          onChange={(e) => set({ email: e.target.value })}
          required
          autoComplete="off"
        />
      </div>

      <div className="admin-field">
        <label htmlFor="user-access">Access level</label>
        <select
          id="user-access"
          className="admin-input"
          value={values.role}
          disabled={lockAccess}
          onChange={(e) => set({ role: e.target.value as UserFormValues['role'] })}
        >
          <option value="editor">Role-based</option>
          <option value="admin">Full admin</option>
        </select>
      </div>
      {values.role === 'editor' ? (
        <div className="admin-field">
          <label htmlFor="user-role">Role</label>
          <select
            id="user-role"
            className="admin-input"
            value={values.role_id}
            disabled={lockAccess}
            onChange={(e) => set({ role_id: e.target.value })}
            required
          >
            <option value="" disabled>
              Select role…
            </option>
            {editorRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="admin-field admin-user-access-note">
          <p className="admin-hint">Every screen, including Users, Roles, Email and New Client.</p>
        </div>
      )}
      {lockAccess ? <p className="admin-hint full">You cannot change your own access.</p> : null}

      {values.role === 'editor' && selectedRole ? (
        <div className="full admin-user-screens">
          <span>Can open</span>
          <div className="admin-user-screen-list">
            {selectedRole.screens
              .filter((key) => SCREEN_LABELS.has(key))
              .map((key) => (
                <span key={key} className="admin-badge draft">
                  {SCREEN_LABELS.get(key)}
                </span>
              ))}
            <span className="admin-badge draft">Account</span>
          </div>
          {selectedRole.description ? <p className="admin-hint">{selectedRole.description}</p> : null}
        </div>
      ) : null}

      <div className="admin-field full">
        <label htmlFor="user-password">{isEdit ? 'New password (optional)' : 'Temporary password'}</label>
        <div className="admin-user-password">
          <input
            id="user-password"
            className="admin-input"
            type={showPassword ? 'text' : 'password'}
            value={values.password}
            onChange={(e) => set({ password: e.target.value })}
            required={!isEdit}
            minLength={10}
            autoComplete="new-password"
            placeholder={isEdit ? 'Leave blank to keep the current password' : 'At least 10 characters'}
          />
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              set({ password: generatePassword() });
              setShowPassword(true);
            }}
          >
            Generate
          </button>
        </div>
        <p className="admin-hint">
          {isEdit
            ? 'Setting a new password signs this user out everywhere. Share it with them securely.'
            : 'Share it with the user securely; they can change it under Account after signing in.'}
        </p>
      </div>

      <div className="full admin-user-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
        </button>
        {onCancel ? (
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
