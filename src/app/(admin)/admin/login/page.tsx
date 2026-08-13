'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState('admin@zigma-technologies.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      router.replace(search.get('next') || '/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function seedAdmin() {
    setSeeding(true);
    setSeedMsg('');
    setError('');
    try {
      const res = await fetch('/api/admin/auth/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seed failed');
      setSeedMsg(data.message || 'Admin ready. Use the seeded credentials to sign in.');
      if (data.email) setEmail(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="admin-login-wrap">
      <form className="admin-login-card" onSubmit={onSubmit}>
        <h1>Admin Portal</h1>
        <p>Sign in to manage inventory, enquiries, and site content.</p>
        {error ? <div className="admin-error">{error}</div> : null}
        {seedMsg ? <div className="admin-success">{seedMsg}</div> : null}
        <div className="admin-field" style={{ marginBottom: '0.9rem' }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="admin-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%' }}
          />
        </div>
        <div className="admin-field" style={{ marginBottom: '1.2rem' }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="admin-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%' }}
          />
        </div>
        <button className="admin-btn admin-btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={seedAdmin}
          disabled={seeding}
          style={{ width: '100%', justifyContent: 'center', marginTop: '0.7rem' }}
        >
          {seeding ? 'Seeding…' : 'Seed default admin'}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="admin-login-wrap">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
