'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

export default function NewClientAdminPage() {
  const [companyName, setCompanyName] = useState('');
  const [tagline, setTagline] = useState('POWER & ENERGY ENGINEERING');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [footerBlurb, setFooterBlurb] = useState('');
  const [seedDemoContent, setSeedDemoContent] = useState(true);
  const [resetThemeTokens, setResetThemeTokens] = useState(false);
  const [resetSiteCopy, setResetSiteCopy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [seedResults, setSeedResults] = useState<Array<{ action: string; ok: boolean; message: string }>>([]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    setSeedResults([]);
    try {
      const res = await fetch('/api/admin/new-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          tagline,
          phone: phone || undefined,
          emergencyPhone: emergencyPhone || undefined,
          email: email || undefined,
          whatsapp: whatsapp || undefined,
          footerBlurb: footerBlurb || undefined,
          seedDemoContent,
          resetThemeTokens,
          resetSiteCopy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bootstrap failed');
      setMessage(data.message || 'Done');
      setSeedResults(data.seedResults || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bootstrap failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>New Client bootstrap</h2>
        <p style={{ color: 'var(--admin-muted)' }}>
          Brand this deployment for another industrial / power-energy client. Applies Site Settings, resets Site Copy with
          the company name, optionally seeds demo pages/nav, then continue in Theme Studio.
        </p>
        <p style={{ color: 'var(--admin-muted)', fontSize: '0.88rem' }}>
          Tip: export your finished Zigma site with <code>npm run db:export</code>, import on a fresh DB, then run this
          wizard — or start empty and seed demo content here.
        </p>
      </div>

      <form className="admin-card" onSubmit={submit}>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label>Company name *</label>
            <input className="admin-input" style={{ width: '100%' }} required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Tagline</label>
            <input className="admin-input" style={{ width: '100%' }} value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Phone</label>
            <input className="admin-input" style={{ width: '100%' }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
          </div>
          <div className="admin-field">
            <label>Emergency phone</label>
            <input className="admin-input" style={{ width: '100%' }} value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Email</label>
            <input className="admin-input" style={{ width: '100%' }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="admin-field">
            <label>WhatsApp (digits)</label>
            <input className="admin-input" style={{ width: '100%' }} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="91…" />
          </div>
          <div className="admin-field full">
            <label>Footer blurb</label>
            <textarea className="admin-textarea" style={{ width: '100%' }} value={footerBlurb} onChange={(e) => setFooterBlurb(e.target.value)} placeholder="Optional — defaults to a short engineering blurb" />
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <label>
            <input type="checkbox" checked={resetSiteCopy} onChange={(e) => setResetSiteCopy(e.target.checked)} /> Reset
            Site Copy (chrome / hubs) with company branding
          </label>
          <label>
            <input type="checkbox" checked={seedDemoContent} onChange={(e) => setSeedDemoContent(e.target.checked)} /> Seed
            demo pages + nav (home, contact, careers, header/footer)
          </label>
          <label>
            <input type="checkbox" checked={resetThemeTokens} onChange={(e) => setResetThemeTokens(e.target.checked)} /> Reset
            theme tokens to platform defaults
          </label>
        </div>

        <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || !companyName.trim()}>
            {saving ? 'Applying…' : 'Apply brand'}
          </button>
          <Link href="/admin/site-copy" className="admin-btn admin-btn-secondary">
            Edit Site Copy
          </Link>
          <Link href="/admin/theme" className="admin-btn admin-btn-secondary">
            Theme Studio
          </Link>
          <Link href="/admin/site-settings" className="admin-btn admin-btn-secondary">
            Site Settings
          </Link>
        </div>
      </form>

      {seedResults.length ? (
        <div className="admin-card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Seed results</h3>
          <ul>
            {seedResults.map((r) => (
              <li key={r.action} style={{ color: r.ok ? 'var(--admin-text)' : '#ff8f6b' }}>
                {r.action}: {r.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
