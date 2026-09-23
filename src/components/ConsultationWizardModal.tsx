'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import HoneypotField from '@/components/HoneypotField';
import TurnstileField from '@/components/TurnstileField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { trackEvent } from '@/lib/analytics';
import { useSiteCopy } from '@/lib/use-site-copy';
import type { FormField } from '@/lib/types';
import SiteHeading from '@/components/SiteHeading';

type Props = {
  preselectedSubject?: string | null;
  onClose: () => void;
};

function fieldTypeToInputType(fieldType: string) {
  if (fieldType === 'number') return 'number';
  if (fieldType === 'email') return 'email';
  if (fieldType === 'tel') return 'tel';
  return 'text';
}

export default function ConsultationWizardModal({ preselectedSubject, onClose }: Props) {
  const router = useRouter();
  const copy = useSiteCopy();
  const c = copy.consultation;
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const [mounted, setMounted] = useState(false);

  const [formId, setFormId] = useState<number | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [payload, setPayload] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  useEffect(() => {
    setMounted(true);
    trackEvent('consultation_open', { subject: preselectedSubject || '' });
    void fetch('/api/public/forms/enquiry')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) return;
        setFormId(data.form.id);
        setFields(data.form.fields || []);
      })
      .catch(() => undefined);
  }, [preselectedSubject]);

  useEffect(() => {
    if (!fields.length || !preselectedSubject) return;
    if (!fields.some((f) => f.field_name === 'subject')) return;
    setPayload((prev) => ({ ...prev, subject: String(preselectedSubject) }));
  }, [fields, preselectedSubject]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      previouslyFocused.current?.focus?.();
    };
  }, []);

  function renderField(field: FormField) {
    const lockedSubject = field.field_name === 'subject' && Boolean(preselectedSubject);
    if (field.field_type === 'textarea') {
      return (
        <div key={field.id} className="consult-field">
          <label htmlFor={`consult-${field.field_name}`}>
            {field.label}
            {field.required ? ' *' : ''}
          </label>
          <textarea
            id={`consult-${field.field_name}`}
            value={payload[field.field_name] || ''}
            disabled={lockedSubject}
            required={!!field.required}
            rows={5}
            onChange={(e) => setPayload({ ...payload, [field.field_name]: e.target.value })}
            placeholder={field.placeholder || ''}
          />
        </div>
      );
    }

    if (field.field_type === 'select') {
      return (
        <div key={field.id} className="consult-field">
          <label htmlFor={`consult-${field.field_name}`}>
            {field.label}
            {field.required ? ' *' : ''}
          </label>
          <select
            id={`consult-${field.field_name}`}
            value={payload[field.field_name] || ''}
            disabled={lockedSubject}
            required={!!field.required}
            onChange={(e) => setPayload({ ...payload, [field.field_name]: e.target.value })}
          >
            <option value="">{field.placeholder || 'Select…'}</option>
            {(field.options_json || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    const isCheckbox = field.field_type === 'checkbox';
    return (
      <div key={field.id} className="consult-field">
        <label htmlFor={`consult-${field.field_name}`}>
          {field.label}
          {field.required ? ' *' : ''}
        </label>
        {isCheckbox ? (
          <input
            id={`consult-${field.field_name}`}
            type="checkbox"
            checked={payload[field.field_name] === '1'}
            onChange={(e) =>
              setPayload({ ...payload, [field.field_name]: e.target.checked ? '1' : '0' })
            }
            disabled={lockedSubject}
          />
        ) : (
          <input
            id={`consult-${field.field_name}`}
            type={fieldTypeToInputType(field.field_type)}
            value={payload[field.field_name] || ''}
            disabled={lockedSubject}
            required={!!field.required}
            onChange={(e) => setPayload({ ...payload, [field.field_name]: e.target.value })}
            placeholder={field.placeholder || ''}
          />
        )}
      </div>
    );
  }

  async function submitEnquiry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg('');
    try {
      const hp = new FormData(e.currentTarget).get(HONEYPOT_FIELD);
      if (!formId) throw new Error('Form not configured');

      const res = await fetch('/api/public/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          item_id: null,
          item_type: null,
          payload,
          _hp: typeof hp === 'string' ? hp : '',
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Submit failed');

      trackEvent('enquiry_submit', { source: 'consultation', subject: payload.subject || '' });
      onClose();
      router.push('/thank-you?intent=enquiry');
      setSuccess(true);
      setSubmitMsg(c.successMsg);
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  const content = (
    <div className="consult-modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className="consult-modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={c.ariaLabel}
      >
        <div className="consult-modal-head">
          <div className="consult-modal-title">
            <span className="consult-badge">{c.badge}</span>
            <SiteHeading role="section">{c.title}</SiteHeading>
            <p>{c.step2Lead}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="consult-close"
            onClick={onClose}
            aria-label={copy.a11y.closeConsultation}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form className="consult-modal-body consult-form-shell" onSubmit={submitEnquiry}>
          <div className="consult-form">
            <HoneypotField />
            <TurnstileField onToken={setTurnstileToken} />
            {fields.length ? fields.map((f) => renderField(f)) : <p className="consult-loading">{c.loadingForm}</p>}
          </div>

          <div className="consult-form-actions">
            {submitMsg ? (
              <p className={`consult-msg${success ? ' consult-msg--ok' : ''}`}>{submitMsg}</p>
            ) : null}
            <button type="submit" className="btn btn-primary consult-submit" disabled={submitting || !fields.length}>
              {submitting ? c.submittingLabel : c.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
