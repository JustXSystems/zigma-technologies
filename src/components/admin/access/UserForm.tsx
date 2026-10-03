'use client';

import { FormEvent, useState } from 'react';
import { AdminLink } from '@/components/admin/unsaved-changes';
import { screenLabel } from './PermissionMatrix';
import type { AccessRole } from './use-access-directory';

export type UserFormValues = {
  name: string;
  email: string;
  role: 'admin' | 'editor';
  role_id: string;
  password: string;
};

export const EMPTY_USER_FORM: UserFormValues = { name: '', email: '', role: 'editor', role_id: '', password: '' };

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?';

function generatePassword(length = 16) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join('');
}

/** 0–4: length plus character variety. */
function passwordScore(value: string) {
  if (!value) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  if (value.length < 10) return 1;
  return Math.min(4, (value.length >= 14 ? 2 : 1) + (variety >= 3 ? 2 : variety >= 2 ? 1 : 0));
}
const STRENGTH = ['', 'Too short', 'Fair', 'Good', 'Strong'];

type Props = {
  id: string;
  mode: 'create' | 'edit';
  values: UserFormValues;
  onChange: (next: UserFormValues) => void;
  roles: AccessRole[];
  /** Editing yourself: access stays as it is. */
  lockAccess?: boolean;
  onSubmit: () => void;
};

/** Add / edit an admin account — one form for both, so the rules stay identical. */
export default function UserForm({ id, mode, values, onChange, roles, lockAccess, onSubmit }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const roleOptions = roles.filter((r) => r.slug !== 'admin');
  const selectedRole = roleOptions.find((r) => String(r.id) === values.role_id);
  const set = (patch: Partial<UserFormValues>) => onChange({ ...values, ...patch });
  const isEdit = mode === 'edit';
  const score = passwordScore(values.password);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form id={id} onSubmit={submit} className="access-form">
      <section className="access-form-section">
        <h3>Profile</h3>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="user-name">Full name</label>
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
            <label htmlFor="user-email">Work email</label>
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
        </div>
      </section>

      <section className="access-form-section">
        <h3>Access</h3>
        {lockAccess ? <p className="access-lock-note">You cannot change your own access — ask another full admin.</p> : null}
        <div className="access-choice-row" role="radiogroup" aria-label="Access level">
          {(
            [
              ['editor', 'Role-based', 'Only the screens of the chosen role'],
              ['admin', 'Full admin', 'Every screen, including Users, Roles, Email and New Client'],
            ] as const
          ).map(([value, title, hint]) => (
            <label key={value} className={`access-choice${values.role === value ? ' is-on' : ''}`} htmlFor={`user-access-${value}`}>
              <input
                id={`user-access-${value}`}
                type="radio"
                name="user-access"
                value={value}
                checked={values.role === value}
                disabled={lockAccess}
                onChange={() => set({ role: value })}
              />
              <span>
                <strong>{title}</strong>
                <small>{hint}</small>
              </span>
            </label>
          ))}
        </div>

        {values.role === 'editor' ? (
          <div className="access-role-picker">
            <div className="access-role-picker-head">
              <span id="user-role-label">Role</span>
              <AdminLink href="/admin/roles" className="admin-link-btn">
                Manage roles
              </AdminLink>
            </div>
            <div className="access-role-options" role="radiogroup" aria-labelledby="user-role-label">
              {roleOptions.map((r, i) => (
                <label key={r.id} className={`access-role-option${String(r.id) === values.role_id ? ' is-on' : ''}`} htmlFor={`user-role-${r.id}`}>
                  <input
                    id={`user-role-${r.id}`}
                    type="radio"
                    name="user-role"
                    value={r.id}
                    checked={String(r.id) === values.role_id}
                    disabled={lockAccess}
                    required={i === 0}
                    onChange={() => set({ role_id: String(r.id) })}
                  />
                  <span className="access-role-option-text">
                    <strong>
                      {r.name}
                      {r.is_system ? <em>Built-in</em> : null}
                    </strong>
                    <small>{r.description || `${r.screens.length} screens`}</small>
                  </span>
                  <span className="access-role-option-count">{r.screens.length}</span>
                </label>
              ))}
            </div>
            {selectedRole ? (
              <div className="access-can-open">
                <span>Can open</span>
                <div className="access-chip-list">
                  {selectedRole.screens.map((key) => (
                    <span key={key} className="access-chip">
                      {screenLabel(key)}
                    </span>
                  ))}
                  <span className="access-chip is-muted">Account</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="access-form-section">
        <h3>{isEdit ? 'Reset password' : 'Sign-in'}</h3>
        <div className="admin-field">
          <label htmlFor="user-password">{isEdit ? 'New password (optional)' : 'Temporary password'}</label>
          <div className="access-password">
            <input
              id="user-password"
              className="admin-input"
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              onChange={(e) => set({ password: e.target.value })}
              required={!isEdit}
              minLength={10}
              maxLength={200}
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
          {values.password ? (
            <div className={`access-strength is-${score}`} aria-live="polite">
              <span className="access-strength-bar" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              {STRENGTH[score]}
            </div>
          ) : null}
          <p className="admin-hint">
            {isEdit
              ? 'A new password signs this user out everywhere. Share it with them securely.'
              : 'Share it securely; they can change it under Account after signing in.'}
          </p>
        </div>
      </section>
    </form>
  );
}
