'use client';

import { FormEvent, useState } from 'react';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { trackEvent } from '@/lib/analytics';

type Props = {
  brochureUrl: string;
  itemTitle: string;
  itemId?: number;
  itemType?: string;
};

export default function BrochureDownloadGate({ brochureUrl, itemTitle, itemId, itemType }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [readyUrl, setReadyUrl] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      const hp = new FormData(e.currentTarget).get(HONEYPOT_FIELD);
      const res = await fetch('/api/public/brochure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brochure_url: brochureUrl,
          item_id: itemId ?? null,
          item_type: itemType || 'general',
          item_title: itemTitle,
          name,
          email,
          phone,
          company,
          _hp: typeof hp === 'string' ? hp : '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      trackEvent('brochure_download', { title: itemTitle, item_type: itemType || '' });
      setReadyUrl(typeof data.download_url === 'string' ? data.download_url : brochureUrl);
      setMsg('Thanks — your brochure is ready.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="brochure-gate">
      {!open && !readyUrl ? (
        <button type="button" className="btn btn-ghost-dark" onClick={() => setOpen(true)}>
          Download brochure / specs
        </button>
      ) : null}

      {readyUrl ? (
        <a className="btn btn-primary" href={readyUrl} target="_blank" rel="noopener noreferrer">
          Open brochure PDF →
        </a>
      ) : null}

      {open && !readyUrl ? (
        <form className="brochure-gate-form" onSubmit={onSubmit}>
          <p className="brochure-gate-lead">Share your details to unlock the brochure for {itemTitle}.</p>
          <HoneypotField />
          <label>
            Name *
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Work email *
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Phone
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Company
            <input value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
          <div className="brochure-gate-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Get brochure →'}
            </button>
            <button type="button" className="btn btn-ghost-dark" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          {msg ? <p className="brochure-gate-msg">{msg}</p> : null}
        </form>
      ) : null}

      {msg && readyUrl ? <p className="brochure-gate-msg brochure-gate-msg--ok">{msg}</p> : null}
    </div>
  );
}
