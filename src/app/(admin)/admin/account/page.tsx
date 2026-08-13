'use client';

import { FormEvent, useState } from 'react';

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirm) {
      setError('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setMessage(data.message || 'Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: 560 }}>
      <div className="admin-card">
        <h2 style={{ marginTop: 0 }}>Account</h2>
        <p style={{ color: 'var(--admin-muted)' }}>Change your admin password. Minimum 10 characters.</p>
        {error ? <div className="admin-error">{error}</div> : null}
        {message ? <div className="admin-success">{message}</div> : null}
        <form onSubmit={onSubmit} className="admin-form-grid">
          <div className="admin-field full">
            <label>Current password</label>
            <input
              className="admin-input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="admin-field full">
            <label>New password</label>
            <input
              className="admin-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </div>
          <div className="admin-field full">
            <label>Confirm new password</label>
            <input
              className="admin-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </div>
          <div className="full">
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
      <div className="admin-card">
        <p style={{ margin: 0, color: 'var(--admin-muted)' }}>
          Manage additional admins and editors under{' '}
          <a href="/admin/users" style={{ color: 'var(--admin-accent)' }}>
            Users
          </a>
          .
        </p>
      </div>
    </div>
  );
}
