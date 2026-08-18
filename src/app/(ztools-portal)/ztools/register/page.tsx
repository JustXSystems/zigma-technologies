'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ZtoolsPortalBrand from '@/components/ztools/ZtoolsPortalBrand';
import ZtoolsShell from '@/components/ztools/ZtoolsShell';

type ToolOption = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};

export default function ZtoolsRegisterPage() {
  const router = useRouter();
  const [tools, setTools] = useState<ToolOption[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    phone: '',
    toolIds: [] as number[],
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/ztools/tools')
      .then((r) => r.json())
      .then((data) => setTools(data.tools || []))
      .catch(() => setError('Could not load tools catalog'));
  }, []);

  function toggleTool(id: number, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      toolIds: checked ? [...prev.toolIds, id] : prev.toolIds.filter((t) => t !== id),
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!form.toolIds.length) {
      setError('Select at least one tool');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/ztools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          company: form.company || undefined,
          phone: form.phone || undefined,
          requested_tool_ids: form.toolIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setMessage(data.message);
      setTimeout(() => router.replace('/ztools/login'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ZtoolsShell>
      <div className="container ztools-auth-card ztools-auth-card--wide">
        <ZtoolsPortalBrand layout="centered" />
        <h1>Register for ZTools</h1>
        <p className="ztools-lead">
          Create an account, choose the tools you need, and wait for admin approval before signing in.
        </p>
        {error ? <div className="admin-error">{error}</div> : null}
        {message ? <div className="admin-success">{message}</div> : null}
        <form onSubmit={onSubmit} className="calc-tool">
          <label>
            Full name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            Company
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Password (min 10 characters)
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={10}
            />
          </label>
          <fieldset className="ztools-tool-picker">
            <legend>Select tools to request</legend>
            {tools.map((tool) => (
              <label key={tool.id} className="ztools-tool-option">
                <input
                  type="checkbox"
                  checked={form.toolIds.includes(tool.id)}
                  onChange={(e) => toggleTool(tool.id, e.target.checked)}
                />
                <span>
                  <strong>{tool.name}</strong>
                  {tool.description ? <small>{tool.description}</small> : null}
                </span>
              </label>
            ))}
          </fieldset>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit registration'}
          </button>
        </form>
        <p className="ztools-auth-foot">
          Already registered? <Link href="/ztools/login">Sign in</Link>
        </p>
      </div>
    </ZtoolsShell>
  );
}
