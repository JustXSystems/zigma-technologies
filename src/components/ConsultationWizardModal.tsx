'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import HoneypotField from '@/components/HoneypotField';
import TurnstileField from '@/components/TurnstileField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { trackEvent } from '@/lib/analytics';
import { useSiteCopy } from '@/lib/use-site-copy';
import type { FormField } from '@/lib/types';

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
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [formId, setFormId] = useState<number | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [capacity, setCapacity] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [urgency, setUrgency] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const subjectField = useMemo(() => fields.find((f) => f.field_name === 'subject') || null, [fields]);
  const selectedInterest = useMemo(() => {
    if (!preselectedSubject) return null;
    return c.interestOptions.find((o) => o.subject === preselectedSubject) || null;
  }, [preselectedSubject, c.interestOptions]);

  const isQuotePath =
    (payload.subject || preselectedSubject || '') === 'Request a Quote' ||
    Boolean(capacity || siteLocation || urgency);

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
    if (!fields.length) return;
    if (!preselectedSubject) return;
    if (!subjectField) return;

    setPayload((prev) => ({ ...prev, subject: String(preselectedSubject) }));
    setStep(preselectedSubject === 'Request a Quote' ? 1 : 2);
  }, [fields.length, preselectedSubject, subjectField]);

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
    const disabled = subjectField?.id === field.id;
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
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
          />
        ) : (
          <input
            id={`consult-${field.field_name}`}
            type={fieldTypeToInputType(field.field_type)}
            value={payload[field.field_name] || ''}
            disabled={disabled}
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

      const quoteBits = [
        capacity ? `Capacity: ${capacity}` : '',
        siteLocation ? `Location: ${siteLocation}` : '',
        urgency ? `Urgency: ${urgency}` : '',
      ].filter(Boolean);
      const messageExtra = quoteBits.length ? `\n\n— Quote details —\n${quoteBits.join('\n')}` : '';
      const nextPayload = {
        ...payload,
        capacity: capacity || undefined,
        site_location: siteLocation || undefined,
        urgency: urgency || undefined,
        message: `${payload.message || ''}${messageExtra}`.trim(),
      };

      const res = await fetch('/api/public/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          item_id: null,
          item_type: null,
          payload: nextPayload,
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
            <h2>{c.title}</h2>
            <p>
              {step === 0 ? c.step0Lead : step === 1 ? c.step1Lead : c.step2Lead}
            </p>
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

        {step === 0 ? (
          <div className="consult-modal-body">
            <div className="consult-proof-strip">
              {c.proofStrip.map((line) => (
                <div key={line} className="consult-proof-item">
                  <span className="consult-proof-dot consult-proof-dot--orange" />
                  <span>{line}</span>
                </div>
              ))}
            </div>

            <div className="consult-options">
              {c.interestOptions.map((opt) => {
                const checked = payload.subject === opt.subject || selectedInterest?.subject === opt.subject;
                return (
                  <button
                    key={opt.subject}
                    type="button"
                    className={`consult-option${checked ? ' is-selected' : ''}`}
                    onClick={() => {
                      setPayload((prev) => ({ ...prev, subject: opt.subject }));
                      setStep(opt.subject === 'Request a Quote' || opt.title.includes('Quote') ? 1 : 1);
                    }}
                  >
                    <div className="consult-option-title">{opt.title}</div>
                    <div className="consult-option-subtitle">{opt.subtitle}</div>
                    <div className="consult-option-cta">Continue →</div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="consult-modal-body">
            <div className="consult-form-head">
              <button type="button" className="consult-back" onClick={() => setStep(0)}>
                {c.backLabel}
              </button>
              <div className="consult-form-head-right">
                <span className="consult-step-label">{c.step2Label}</span>
              </div>
            </div>
            <div className="consult-form">
              <div className="consult-field">
                <label htmlFor="consult-capacity">{c.capacityLabel}</label>
                <select
                  id="consult-capacity"
                  value={capacity}
                  required
                  onChange={(e) => setCapacity(e.target.value)}
                >
                  <option value="">Select…</option>
                  {c.capacityOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="consult-field">
                <label htmlFor="consult-location">{c.locationLabel}</label>
                <input
                  id="consult-location"
                  value={siteLocation}
                  onChange={(e) => setSiteLocation(e.target.value)}
                  placeholder={c.locationPlaceholder}
                />
              </div>
              <div className="consult-field">
                <label htmlFor="consult-urgency">{c.urgencyLabel}</label>
                <select id="consult-urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <option value="">Select…</option>
                  {c.urgencyOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn-primary consult-submit"
                disabled={!capacity}
                onClick={() => setStep(2)}
              >
                {c.continueQuote}
              </button>
              {!isQuotePath ? (
                <button type="button" className="consult-back" style={{ marginTop: '0.75rem' }} onClick={() => setStep(2)}>
                  {c.skipQuote}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="consult-modal-body">
            <div className="consult-form-head">
              <button type="button" className="consult-back" onClick={() => setStep(1)}>
                {c.backLabel}
              </button>
              <div className="consult-form-head-right">
                <span className="consult-step-label">{c.step3Label}</span>
              </div>
            </div>

            <form className="consult-form" onSubmit={submitEnquiry}>
              <HoneypotField />
              <TurnstileField onToken={setTurnstileToken} />
              {fields.length ? fields.map((f) => renderField(f)) : <p className="consult-loading">{c.loadingForm}</p>}

              <button type="submit" className="btn btn-primary consult-submit" disabled={submitting || !fields.length}>
                {submitting ? c.submittingLabel : c.submitLabel}
              </button>

              {submitMsg ? (
                <p className={`consult-msg${success ? ' consult-msg--ok' : ''}`}>{submitMsg}</p>
              ) : null}
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
