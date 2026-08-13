'use client';

import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { CatalogItem, CatalogItemType, FormField } from '@/lib/types';
import CatalogMediaGallery from '@/components/CatalogMediaGallery';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { catalogPublicPath, caseStudyLabel } from '@/lib/catalog-case-study';

const DEFAULT_MODAL = ['title', 'description', 'specs', 'media', 'enquiry'];

const TYPE_LABEL: Record<CatalogItemType, string> = {
  project: 'Project',
  product: 'Product',
  service: 'Service',
};

function hasField(fields: string[] | null | undefined, name: string, fallback = DEFAULT_MODAL) {
  const list = fields?.length ? fields : fallback;
  return list.includes(name);
}

function splitSpecs(specs: Record<string, string> | null | undefined) {
  if (!specs) return { highlight: null as { key: string; value: string } | null, rest: [] as [string, string][] };
  const entries = Object.entries(specs);
  const highlightEntry = entries.find(([k]) => k.toLowerCase() === 'highlight') || entries[0];
  const rest = entries.filter(([k]) => k !== highlightEntry?.[0]);
  return {
    highlight: highlightEntry ? { key: highlightEntry[0], value: highlightEntry[1] } : null,
    rest,
  };
}

type Props = {
  item: CatalogItem;
  itemType: CatalogItemType;
  modalFields: string[];
  onClose: () => void;
};

export default function CatalogDetailModal({ item, itemType, modalFields, onClose }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formId, setFormId] = useState<number | null>(null);
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { highlight, rest: specEntries } = useMemo(() => splitSpecs(item.specs_json), [item.specs_json]);
  const showMedia = hasField(modalFields, 'media', DEFAULT_MODAL);
  const showEnquiry = hasField(modalFields, 'enquiry', DEFAULT_MODAL);

  const handleClose = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('item');
    window.history.replaceState({}, '', url);
    onClose();
  }, [onClose]);

  useEffect(() => {
    setMounted(true);
    const url = new URL(window.location.href);
    url.searchParams.set('item', item.slug);
    window.history.replaceState({}, '', url);
  }, [item.slug]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (enquiryOpen) setEnquiryOpen(false);
        else handleClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enquiryOpen, handleClose]);

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
      setSubmitMsg('Thank you. Our team will contact you shortly.');
      setPayload({});
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (!mounted) return null;

  const content = (
    <div className="catalog-detail-backdrop" onClick={handleClose} role="presentation">
      <div
        ref={panelRef}
        className="catalog-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="catalog-detail-header">
          <div className="catalog-detail-header-meta">
            {hasField(modalFields, 'category', [...DEFAULT_MODAL, 'category']) ? (
              <span className="catalog-detail-badge">{item.category_name || TYPE_LABEL[itemType]}</span>
            ) : (
              <span className="catalog-detail-badge">{TYPE_LABEL[itemType]}</span>
            )}
            <span className="catalog-detail-ref">Ref · {item.slug}</span>
          </div>
          <div className="catalog-detail-header-actions">
            <button type="button" className="catalog-detail-icon-btn" onClick={copyLink} aria-label="Copy link">
              {copied ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              )}
            </button>
            <button
              ref={closeRef}
              type="button"
              className="catalog-detail-close"
              onClick={handleClose}
              aria-label="Close details"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="catalog-detail-body">
          <div className={`catalog-detail-layout${showMedia ? '' : ' catalog-detail-layout--no-media'}`}>
            {showMedia ? (
              <aside className="catalog-detail-media-col">
                <CatalogMediaGallery media={item.media || []} title={item.title} variant="detail" />
              </aside>
            ) : null}

            <div className="catalog-detail-content-col">
              <div className="catalog-detail-scroll">
                {hasField(modalFields, 'title', DEFAULT_MODAL) ? (
                  <h2 id={titleId} className="catalog-detail-title">
                    {item.title}
                  </h2>
                ) : null}

                {(hasField(modalFields, 'price_label', DEFAULT_MODAL) && item.price_label) || highlight ? (
                  <div className="catalog-detail-metrics">
                    {hasField(modalFields, 'price_label', DEFAULT_MODAL) && item.price_label ? (
                      <div className="catalog-detail-metric catalog-detail-metric--primary">
                        <span className="catalog-detail-metric-label">Investment</span>
                        <span className="catalog-detail-metric-value">{item.price_label}</span>
                      </div>
                    ) : null}
                    {highlight ? (
                      <div className="catalog-detail-metric">
                        <span className="catalog-detail-metric-label">{highlight.key}</span>
                        <span className="catalog-detail-metric-value">{highlight.value}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {hasField(modalFields, 'description', DEFAULT_MODAL) ? (
                  <div className="catalog-detail-section">
                    <h3 className="catalog-detail-section-title">Overview</h3>
                    <p className="catalog-detail-lead">{item.description || item.summary}</p>
                  </div>
                ) : hasField(modalFields, 'summary', DEFAULT_MODAL) ? (
                  <div className="catalog-detail-section">
                    <h3 className="catalog-detail-section-title">Overview</h3>
                    <p className="catalog-detail-lead">{item.summary}</p>
                  </div>
                ) : null}

                {hasField(modalFields, 'tags', DEFAULT_MODAL) && item.tags_json?.length ? (
                  <div className="catalog-detail-tags">
                    {item.tags_json.map((t) => (
                      <span key={t} className="catalog-detail-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}

                {hasField(modalFields, 'specs', DEFAULT_MODAL) && specEntries.length ? (
                  <div className="catalog-detail-section">
                    <h3 className="catalog-detail-section-title">Technical specifications</h3>
                    <div className="catalog-detail-spec-grid">
                      {specEntries.map(([k, v]) => (
                        <div key={k} className="catalog-detail-spec-card">
                          <span className="catalog-detail-spec-key">{k}</span>
                          <span className="catalog-detail-spec-val">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {showEnquiry ? (
                <footer className="catalog-detail-footer">
                  <div className="catalog-detail-footer-copy">
                    <strong>Interested in this {TYPE_LABEL[itemType].toLowerCase()}?</strong>
                    <span>Speak with our engineering team for scope, timelines, and commercial details.</span>
                  </div>
                  <div className="catalog-detail-footer-actions">
                    <Link href={catalogPublicPath(itemType, item.slug)} className="btn btn-primary">
                      View full {caseStudyLabel(itemType).toLowerCase()}
                    </Link>
                    <button type="button" className="btn btn-ghost-dark" onClick={() => setEnquiryOpen(true)}>
                      Request a quote
                    </button>
                    <a href="/contact" className="btn btn-ghost-dark">
                      Contact us
                    </a>
                  </div>
                </footer>
              ) : (
                <footer className="catalog-detail-footer catalog-detail-footer--simple">
                  <button type="button" className="btn btn-ghost-dark" onClick={handleClose}>
                    Close
                  </button>
                </footer>
              )}
            </div>
          </div>
        </div>

        {showEnquiry && enquiryOpen ? (
          <div className="catalog-detail-enquiry-backdrop" onClick={() => setEnquiryOpen(false)} role="presentation">
            <aside
              className="catalog-detail-enquiry"
              onClick={(e) => e.stopPropagation()}
              aria-label="Enquiry form"
            >
              <div className="catalog-detail-enquiry-head">
                <div>
                  <p className="catalog-detail-enquiry-eyebrow">Enquiry</p>
                  <h3>{item.title}</h3>
                </div>
                <button
                  type="button"
                  className="catalog-detail-icon-btn catalog-detail-icon-btn--dark"
                  onClick={() => setEnquiryOpen(false)}
                  aria-label="Close enquiry form"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form className="catalog-detail-enquiry-form" onSubmit={submitEnquiry}>
                <HoneypotField />
                {fields.map((field) => (
                  <div key={field.id} className="catalog-detail-field">
                    <label htmlFor={`cdf-${field.id}`}>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </label>
                    {field.field_type === 'textarea' ? (
                      <textarea
                        id={`cdf-${field.id}`}
                        required={!!field.required}
                        value={payload[field.field_name] || ''}
                        onChange={(e) => setPayload({ ...payload, [field.field_name]: e.target.value })}
                        placeholder={field.placeholder || ''}
                        rows={4}
                      />
                    ) : field.field_type === 'select' ? (
                      <select
                        id={`cdf-${field.id}`}
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
                        id={`cdf-${field.id}`}
                        type={
                          field.field_type === 'number'
                            ? 'number'
                            : field.field_type === 'checkbox'
                              ? 'checkbox'
                              : field.field_type === 'email'
                                ? 'email'
                                : field.field_type === 'tel'
                                  ? 'tel'
                                  : 'text'
                        }
                        required={!!field.required}
                        value={field.field_type === 'checkbox' ? undefined : payload[field.field_name] || ''}
                        checked={field.field_type === 'checkbox' ? payload[field.field_name] === '1' : undefined}
                        placeholder={field.field_type === 'checkbox' ? undefined : field.placeholder || ''}
                        onChange={(e) =>
                          setPayload({
                            ...payload,
                            [field.field_name]:
                              field.field_type === 'checkbox' ? (e.target.checked ? '1' : '0') : e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                ))}
                <button type="submit" className="btn btn-primary catalog-detail-submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit enquiry'}
                </button>
                {submitMsg ? (
                  <p className={`catalog-detail-msg${submitMsg.startsWith('Thank') ? ' catalog-detail-msg--ok' : ''}`}>
                    {submitMsg}
                  </p>
                ) : null}
              </form>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
