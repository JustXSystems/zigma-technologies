'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ZtoolsPortalBrand from '@/components/ztools/ZtoolsPortalBrand';
import ZtoolsShell from '@/components/ztools/ZtoolsShell';

export default function ZtoolsLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ztools/auth')
      .then((r) => {
        if (r.ok) router.replace('/ztools/dashboard');
      })
      .catch(() => undefined);
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/ztools/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Login failed');
      return;
    }
    router.replace('/ztools/dashboard');
  }

  return (
    <ZtoolsShell>
      <div className="container ztools-auth-card">
        <ZtoolsPortalBrand layout="centered" />
        <h1>Sign in to ZTools</h1>
        <p className="ztools-lead">
          Access quotation, ROI, and engineering calculators assigned to your account.
        </p>
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
          <button type="submit" className="btn btn-primary">Sign in</button>
        </form>
        <p className="ztools-auth-foot">
          New user? <Link href="/ztools/register">Register and request tool access</Link>
        </p>
      </div>
    </ZtoolsShell>
  );
}
