'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FormField } from '@/lib/types';
import HoneypotField from '@/components/HoneypotField';
import TurnstileField from '@/components/TurnstileField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { trackEvent } from '@/lib/analytics';
import { isTurnstileClientEnabled } from '@/lib/turnstile';
import SiteHeading from '@/components/SiteHeading';

type SideItem = { label: string; value: string; href?: string | null; icon?: string };
type Office = { title: string; lines: string };
type HoursRow = { label: string; value: string };

export default function EnquiryFormSection({
  content,
  sectionKey,
}: {
  content: Record<string, unknown>;
  sectionKey?: string | null;
}) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [formId, setFormId] = useState<number | null>(null);
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const router = useRouter();

  const text = (key: string) => String(content[key] ?? '').trim();
  const sideItems = (content.sideItems as SideItem[]) || [];
  const offices = (content.offices as Office[]) || [];
  const hours = (content.hours as HoursRow[]) || [];
  const rawNote = content.emergencyNote as { title?: string; body?: string; phone?: string } | undefined;
  const emergencyNote =
    rawNote && (rawNote.title?.trim() || rawNote.body?.trim() || rawNote.phone?.trim()) ? rawNote : undefined;

  useEffect(() => {
    fetch('/api/public/forms/enquiry')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) return;
        setFormId(data.form.id);
        setFields(data.form.fields || []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !fields.length) return;
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    if (subject && fields.some((f) => f.field_name === 'subject')) {
      setPayload((prev) => ({ ...prev, subject }));
    }
  }, [fields]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg('');
    try {
      if (isTurnstileClientEnabled() && !turnstileToken.trim()) {
        throw new Error('Please complete the captcha before submitting.');
      }
      const hp = new FormData(e.currentTarget).get(HONEYPOT_FIELD);
      const res = await fetch('/api/public/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          item_id: null,
          item_type: 'general',
          payload,
          _hp: typeof hp === 'string' ? hp : '',
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      trackEvent('enquiry_submit', { source: 'contact_form', subject: payload.subject || '' });
      setSuccess(true);
      setPayload({});
      setTurnstileToken('');
      setSubmitMsg('');
      router.push('/thank-you?intent=enquiry');
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  const textFields = fields.filter((f) => f.field_type !== 'textarea' && f.field_type !== 'select');
  const selectFields = fields.filter((f) => f.field_type === 'select');
  const areaFields = fields.filter((f) => f.field_type === 'textarea');

  function renderField(field: FormField, full = false) {
    return (
      <div key={field.id} className={`cf-field${full ? ' full' : ''}`}>
        <label>
          {field.label}
          {field.required ? ' *' : ''}
        </label>
        {field.field_type === 'textarea' ? (
          <textarea
            name={field.field_name}
            required={!!field.required}
            rows={5}
            value={payload[field.field_name] || ''}
            onChange={(e) => setPayload({ ...payload, [field.field_name]: e.target.value })}
            placeholder={field.placeholder || ''}
          />
        ) : field.field_type === 'select' ? (
          <select
            name={field.field_name}
            data-field={field.field_name}
            required={!!field.required}
            value={payload[field.field_name] || ''}
            onChange={(e) => setPayload({ ...payload, [field.field_name]: e.target.value })}
          >
            <option value="">{field.placeholder || 'Select…'}</option>
            {(field.options_json || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            name={field.field_name}
            type={
              field.field_type === 'number'
                ? 'number'
                : field.field_type === 'email'
                  ? 'email'
                  : field.field_type === 'tel'
                    ? 'tel'
                    : 'text'
            }
            required={!!field.required}
            value={payload[field.field_name] || ''}
            onChange={(e) => setPayload({ ...payload, [field.field_name]: e.target.value })}
            placeholder={field.placeholder || ''}
          />
        )}
      </div>
    );
  }

  const pairs: FormField[][] = [];
  for (let i = 0; i < textFields.length; i += 2) {
    pairs.push(textFields.slice(i, i + 2));
  }

  return (
    <section className="section contact-form-section" id={sectionKey || 'contact-form'}>
      <div className="container">
        <div className="section-head center reveal">
          {content.eyebrow ? <div className="eyebrow eyebrow-orange">{String(content.eyebrow)}</div> : null}
          {content.title ? <SiteHeading role="section">{String(content.title)}</SiteHeading> : null}
          {content.body ? <p>{String(content.body)}</p> : null}
        </div>

        <div className="cf-grid reveal">
          <div className="cf-form">
            {success ? (
              <div className="cf-success" style={{ display: 'block' }}>
                <div className="cf-success-icon" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                {text('successTitle') ? <h3>{text('successTitle')}</h3> : null}
                {text('successBody') ? <p>{text('successBody')}</p> : null}
              </div>
            ) : (
              <form onSubmit={onSubmit} style={{ position: 'relative' }}>
                <HoneypotField />
                <TurnstileField onToken={setTurnstileToken} />
                {text('formTitle') ? <h3>{text('formTitle')}</h3> : null}
                {text('formIntro') ? <p>{text('formIntro')}</p> : null}

                {fields.length === 0 ? null : (
                  <>
                    {pairs.map((pair, idx) => (
                      <div className="cf-row" key={`row-${idx}`}>
                        {pair.map((field) => renderField(field))}
                      </div>
                    ))}
                    {selectFields.map((field) => (
                      <div className="cf-row" key={field.id}>
                        {renderField(field, true)}
                      </div>
                    ))}
                    {areaFields.map((field) => (
                      <div className="cf-row" key={field.id}>
                        {renderField(field, true)}
                      </div>
                    ))}
                  </>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-hover-lift"
                  disabled={submitting || !fields.length}
                >
                  {submitting ? 'Sending…' : text('submitLabel')}
                </button>
                {text('privacyNote') ? <p className="cf-note">{text('privacyNote')}</p> : null}
                {submitMsg ? <p style={{ marginTop: '0.9rem', color: 'var(--orange-dim)' }}>{submitMsg}</p> : null}
              </form>
            )}
          </div>

          {sideItems.length || offices.length || hours.length || emergencyNote ? (
            <div className="cf-side">
              {sideItems.length ? (
                <div className="cf-side-block">
                  {text('sideTitle') ? <h4>{text('sideTitle')}</h4> : null}
                  {sideItems.map((item) => (
                    <div className="cf-side-item" key={item.label}>
                      {item.icon ? (
                        <div
                          className="csi-icon"
                          aria-hidden="true"
                          dangerouslySetInnerHTML={{
                            __html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${item.icon}</svg>`,
                          }}
                        />
                      ) : null}
                      <div>
                        <div className="csi-label">{item.label}</div>
                        {item.href ? (
                          <a href={item.href} className="csi-value">
                            {item.value}
                          </a>
                        ) : (
                          <span className="csi-value">{item.value}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {sideItems.length && (hours.length || offices.length) ? <div className="cf-side-divider"></div> : null}

              {hours.length ? (
                <div className="cf-side-block">
                  {text('hoursTitle') ? <h4>{text('hoursTitle')}</h4> : null}
                  {hours.map((row) => (
                    <div className="cf-hours-row" key={row.label}>
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {offices.length ? (
                <div className="cf-side-block">
                  {text('officesTitle') ? <h4>{text('officesTitle')}</h4> : null}
                  <ul>
                    {offices.map((office) => (
                      <li key={office.title}>
                        <div>
                          <strong>{office.title}</strong>
                          <br />
                          {office.lines}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {emergencyNote ? (
                <div className="emergency-note">
                  {emergencyNote.title ? <strong>{emergencyNote.title}</strong> : null}
                  {emergencyNote.body ? <> {emergencyNote.body}</> : null}
                  {emergencyNote.phone ? (
                    <>
                      <br />
                      <a href={`tel:${emergencyNote.phone.replace(/\s/g, '')}`}>{emergencyNote.phone}</a>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
