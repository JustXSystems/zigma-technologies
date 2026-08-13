'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { trackEvent } from '@/lib/analytics';

type Props = { onClose: () => void };

export default function CallbackRequestModal({ onClose }: Props) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    trackEvent('callback_open');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const hp = new FormData(e.currentTarget).get(HONEYPOT_FIELD);
      const res = await fetch('/api/public/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          preferred_time: preferredTime,
          note,
          _hp: typeof hp === 'string' ? hp : '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      trackEvent('callback_submit');
      onClose();
      router.push('/thank-you?intent=callback');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="consult-modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className="consult-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Request a callback"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="consult-modal-head">
          <div className="consult-modal-title">
            <span className="consult-badge">Callback</span>
            <h2>Request a call from an engineer</h2>
            <p>Share a number and preferred window — we will call you back.</p>
          </div>
          <button type="button" className="consult-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="consult-modal-body">
          <form className="consult-form" onSubmit={onSubmit}>
            <HoneypotField />
            <div className="consult-field">
              <label htmlFor="cb-name">Name *</label>
              <input id="cb-name" value={name} onChange={(e) => setName(e.target.value)} required aria-required="true" />
            </div>
            <div className="consult-field">
              <label htmlFor="cb-phone">Phone *</label>
              <input id="cb-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required aria-required="true" />
            </div>
            <div className="consult-field">
              <label htmlFor="cb-time">Preferred time</label>
              <input id="cb-time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} placeholder="e.g. Tomorrow 11am" />
            </div>
            <div className="consult-field">
              <label htmlFor="cb-note">Note</label>
              <textarea id="cb-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {error ? <p className="consult-msg" role="alert">{error}</p> : null}
            <button type="submit" className="btn btn-primary consult-submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Request callback →'}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
