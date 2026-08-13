'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/partner/auth')
      .then((r) => {
        if (r.ok) router.replace('/partner');
      })
      .catch(() => undefined);
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/partner/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Login failed');
      return;
    }
    router.replace('/partner');
  }

  return (
    <main id="main-content" className="section section-light" style={{ paddingTop: '8rem', minHeight: '70vh' }}>
      <div className="container" style={{ maxWidth: 420 }}>
        <h1>Partner portal</h1>
        <p className="lead">Sign in for price lists and channel documents.</p>
        <form onSubmit={onSubmit} className="calc-tool">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error ? <p className="admin-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
