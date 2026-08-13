'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FormField } from '@/lib/types';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { trackEvent } from '@/lib/analytics';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@/lib/site-settings';

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
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const router = useRouter();

  const sideItems = (content.sideItems as SideItem[]) || [];
  const offices = (content.offices as Office[]) || [];
  const hours = (content.hours as HoursRow[]) || [];
  const emergencyNote = content.emergencyNote as { title?: string; body?: string; phone?: string } | undefined;

  useEffect(() => {
    fetch('/api/public/forms/enquiry')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) return;
        setFormId(data.form.id);
        setFields(data.form.fields || []);
      })
      .catch(() => undefined);
    fetch('/api/public/site-settings')
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) setSite(data.settings);
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
      const hp = new FormData(e.currentTarget).get(HONEYPOT_FIELD);
      const res = await fetch('/api/public/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          item_id: null,
          item_type: null,
          payload,
          _hp: typeof hp === 'string' ? hp : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      trackEvent('enquiry_submit', { source: 'contact_form', subject: payload.subject || '' });
      setSuccess(true);
      setPayload({});
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
          {content.title ? <h2>{String(content.title)}</h2> : null}
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
                <h3>{String(content.successTitle || 'Thank you — message received')}</h3>
                <p>
                  {String(
                    content.successBody ||
                      'A member of our engineering team will get back to you within one business day. For anything urgent, please call our 24×7 emergency line.'
                  )}
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} style={{ position: 'relative' }}>
                <HoneypotField />
                <h3>{String(content.formTitle || 'Send us a message')}</h3>
                <p>{String(content.formIntro || 'All fields marked with * are required.')}</p>

                {fields.length === 0 ? (
                  <p style={{ color: 'var(--graphite-500)' }}>Enquiry form fields are not configured yet.</p>
                ) : (
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
                  {submitting ? 'Sending…' : String(content.submitLabel || 'Submit Request →')}
                </button>
                {content.privacyNote ? <p className="cf-note">{String(content.privacyNote)}</p> : null}
                {submitMsg ? <p style={{ marginTop: '0.9rem', color: 'var(--orange-dim)' }}>{submitMsg}</p> : null}
              </form>
            )}
          </div>

          {sideItems.length || offices.length || hours.length || emergencyNote ? (
            <div className="cf-side">
              {sideItems.length ? (
                <div className="cf-side-block">
                  <h4>{String(content.sideTitle || 'Direct Contact')}</h4>
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
                  <h4>{String(content.hoursTitle || 'Business Hours')}</h4>
                  {hours.map((row) => (
                    <div className="cf-hours-row" key={row.label}>
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                  ))}
                  {site.officeHours ? <p className="contact-sla">Desk hours: {site.officeHours}</p> : null}
                  {site.responseSla ? <p className="contact-sla">Response SLA: {site.responseSla}</p> : null}
                </div>
              ) : (
                <div className="cf-side-block">
                  <h4>Response promise</h4>
                  {site.officeHours ? <p className="contact-sla">Desk hours: {site.officeHours}</p> : null}
                  <p className="contact-sla">We typically respond {site.responseSla || 'within 1 business day'}.</p>
                </div>
              )}

              {offices.length ? (
                <div className="cf-side-block">
                  <h4>{String(content.officesTitle || 'Office Locations')}</h4>
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
                  <strong>{emergencyNote.title || 'Need urgent help?'}</strong>
                  {emergencyNote.body ? <> {emergencyNote.body}</> : null}
                  {emergencyNote.phone ? (
                    <>
                      <br />
                      <a href={`tel:${emergencyNote.phone.replace(/\s/g, '')}`}>{emergencyNote.phone} →</a>
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
