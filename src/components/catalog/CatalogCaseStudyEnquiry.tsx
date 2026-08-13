'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogItem, CatalogItemType, FormField } from '@/lib/types';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { trackEvent } from '@/lib/analytics';

type Props = {
  item: CatalogItem;
  itemType: CatalogItemType;
};

export default function CatalogCaseStudyEnquiry({ item, itemType }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<FormField[]>([]);
  const [formId, setFormId] = useState<number | null>(null);
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  async function submitEnquiry(e: FormEvent<HTMLFormElement>) {
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
          item_id: item.id,
          item_type: itemType,
          payload,
          _hp: typeof hp === 'string' ? hp : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      trackEvent('enquiry_submit', { source: 'case_study', item_type: itemType, slug: item.slug });
      router.push('/thank-you?intent=enquiry');
      setSubmitMsg('Thank you. Our team will contact you shortly.');
      setPayload({});
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="case-study-enquiry" id="enquire">
      <div className="container">
        <div className="case-study-enquiry-grid">
          <div>
            <div className="eyebrow eyebrow-orange">Enquire</div>
            <h2>Discuss a similar scope for your facility</h2>
            <p>
              Share your requirements and our engineering team will respond with feasibility, timelines, and commercial
              options.
            </p>
          </div>
          <form className="case-study-enquiry-form" onSubmit={submitEnquiry}>
            <HoneypotField />
            {fields.map((field) => (
              <div key={field.id} className="case-study-field">
                <label htmlFor={`csf-${field.id}`}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
                {field.field_type === 'textarea' ? (
                  <textarea
                    id={`csf-${field.id}`}
                    required={!!field.required}
                    value={payload[field.field_name] || ''}
                    onChange={(e) => setPayload({ ...payload, [field.field_name]: e.target.value })}
                    placeholder={field.placeholder || ''}
                    rows={4}
                  />
                ) : field.field_type === 'select' ? (
                  <select
                    id={`csf-${field.id}`}
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
                    id={`csf-${field.id}`}
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
            ))}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit enquiry'}
            </button>
            {submitMsg ? <p className={`case-study-msg${submitMsg.startsWith('Thank') ? ' case-study-msg--ok' : ''}`}>{submitMsg}</p> : null}
          </form>
        </div>
      </div>
    </section>
  );
}
