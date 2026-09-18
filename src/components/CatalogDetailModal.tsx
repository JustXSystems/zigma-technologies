'use client';

import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type {
  CatalogDetailLayout,
  CatalogDetailTemplate,
  CatalogItem,
  CatalogItemType,
  CatalogShadowStyle,
  FormField,
} from '@/lib/types';
import {
  DEFAULT_DETAIL_ELEMENTS,
  DEFAULT_DETAIL_GALLERY_SHADOW,
  DEFAULT_DETAIL_LAYOUT,
  DEFAULT_DETAIL_TEMPLATE,
  isModernDetailTemplate,
  normalizeDetailLayout,
  normalizeDetailTemplate,
  normalizeShadowStyle,
} from '@/lib/types';
import { detailHasFromList } from '@/lib/catalog-page-elements';
import CatalogMediaGallery from '@/components/CatalogMediaGallery';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { catalogPublicPath, caseStudyLabel } from '@/lib/catalog-case-study';
import { useSiteCopy } from '@/lib/use-site-copy';
import SiteHeading from '@/components/SiteHeading';

const TYPE_LABEL: Record<CatalogItemType, string> = {
  project: 'Project',
  product: 'Product',
  service: 'Service',
};

const TRUST_ITEMS = [
  {
    title: 'Expert Support',
    blurb: 'Dedicated engineering guidance',
    icon: 'headset' as const,
  },
  {
    title: 'Reliable Performance',
    blurb: 'Built for critical uptime',
    icon: 'gear' as const,
  },
  {
    title: 'Energy Efficient',
    blurb: 'Optimized lifetime cost',
    icon: 'leaf' as const,
  },
] as const;

function TrustIcon({ name }: { name: 'headset' | 'gear' | 'leaf' }) {
  if (name === 'headset') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <path d="M4 14a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2zM17 11h1a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-1v-4z" />
      </svg>
    );
  }
  if (name === 'leaf') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M5 19c8 0 14-8 14-14-6 0-14 6-14 14z" />
        <path d="M5 19c3-3 7-5 11-6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </svg>
  );
}

function MetricIcon({ kind }: { kind: 'investment' | 'highlight' }) {
  if (kind === 'investment') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function SpecIcon({ index }: { index: number }) {
  if (index % 2 === 0) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M8 4h8l3 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8l3-4z" />
        <path d="M8 4v4h8V4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </svg>
  );
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
  /** @deprecated Prefer detailElements — kept for legacy callers */
  modalFields?: string[];
  detailElements?: string[] | null;
  onClose: () => void;
  mediaBgColor?: string | null;
  detailLayout?: CatalogDetailLayout | null;
  detailGalleryShadow?: CatalogShadowStyle | null;
  detailTemplate?: CatalogDetailTemplate | null;
};

export default function CatalogDetailModal({
  item,
  itemType,
  modalFields,
  detailElements,
  onClose,
  mediaBgColor = '#ffffff',
  detailLayout = DEFAULT_DETAIL_LAYOUT,
  detailGalleryShadow = DEFAULT_DETAIL_GALLERY_SHADOW,
  detailTemplate = DEFAULT_DETAIL_TEMPLATE,
}: Props) {
  const titleId = useId();
  const copy = useSiteCopy();
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

  const elements = useMemo(() => {
    if (detailElements?.length) return detailElements;
    if (modalFields?.length) {
      // Legacy modal_fields → element bridge
      const mapped = new Set<typeof DEFAULT_DETAIL_ELEMENTS[number]>(['close', 'trust']);
      const bridge: Record<string, typeof DEFAULT_DETAIL_ELEMENTS[number][]> = {
        title: ['title'],
        summary: ['tagline'],
        description: ['overview'],
        category: ['badge'],
        price_label: ['price'],
        tags: ['tags'],
        specs: ['specs', 'highlight'],
        media: ['media', 'gallery_dots'],
        enquiry: ['enquiry', 'cta_copy', 'cta_profile', 'cta_quote', 'cta_contact'],
      };
      for (const f of modalFields) for (const el of bridge[f] || []) mapped.add(el);
      return [...mapped];
    }
    return [...DEFAULT_DETAIL_ELEMENTS];
  }, [detailElements, modalFields]);

  const has = useCallback((name: string) => detailHasFromList(elements, name), [elements]);

  const showMedia = has('media');
  const showEnquiry = has('enquiry');
  const showAnyCta = has('cta_copy') || has('cta_profile') || has('cta_quote') || has('cta_contact');
  const tagline = item.summary?.trim() || '';
  const template = normalizeDetailTemplate(detailTemplate);
  const layout = normalizeDetailLayout(detailLayout);
  const galleryFrameShadow = normalizeShadowStyle(detailGalleryShadow ?? item.background_shading_style);
  const { highlight, rest: specEntries } = useMemo(() => splitSpecs(item.specs_json), [item.specs_json]);
  const isModern = isModernDetailTemplate(template);
  const showChromeBar = has('chrome') && !isModern;
  const showInlineMeta = !showChromeBar;

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

  const isShowcase = template === 'showcase';

  const gallery = showMedia ? (
    <CatalogMediaGallery
      media={item.media || []}
      title={item.title}
      variant="detail"
      backgroundImageUrl={item.background_image_url}
      backgroundShadingStyle={item.background_shading_style}
      frameShadowStyle={galleryFrameShadow}
      backgroundFitToSpace={item.background_fit_to_space}
      backgroundFitPercent={item.background_fit_percent}
      mediaFitToSpace={item.media_fit_to_space}
      mediaFitPercent={item.media_fit_percent}
      mediaBgColor={mediaBgColor}
      navStyle={isShowcase && has('gallery_dots') ? 'dots' : 'thumbs'}
      showThumbs={isShowcase ? has('gallery_dots') : true}
    />
  ) : null;

  const showClose = has('close');

  const actions = (
    <>
      {has('copy_link') && !isShowcase ? (
        <button type="button" className="catalog-detail-icon-btn" onClick={copyLink} aria-label={copy.a11y.copyLink}>
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
      ) : null}
      {showClose ? (
        <button
          ref={closeRef}
          type="button"
          className="catalog-detail-close"
          onClick={handleClose}
          aria-label={copy.a11y.close}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </>
  );

  const showcaseCta =
    showAnyCta || showEnquiry ? (
      <div className="catalog-detail-showcase-cta">
        {has('cta_copy') ? (
          <div className="catalog-detail-showcase-cta-copy">
            <strong>Interested in this {TYPE_LABEL[itemType].toLowerCase()}?</strong>
            <span>Speak with our engineering team for scope, timelines, and commercial details.</span>
          </div>
        ) : null}
        <div className="catalog-detail-showcase-cta-actions">
          {has('cta_profile') ? (
            <Link href={catalogPublicPath(itemType, item.slug)} className="btn btn-primary catalog-detail-showcase-primary">
              View full {caseStudyLabel(itemType).toLowerCase()}
              <span aria-hidden="true"> →</span>
            </Link>
          ) : null}
          {has('cta_quote') ? (
            <button
              type="button"
              className="btn catalog-detail-showcase-secondary"
              onClick={() => setEnquiryOpen(true)}
            >
              Request a quote
            </button>
          ) : null}
        </div>
        {has('cta_contact') ? (
          <a href="/contact" className="catalog-detail-showcase-contact">
            Contact our team <span aria-hidden="true">→</span>
          </a>
        ) : null}
      </div>
    ) : null;

  const detailFooter =
    isShowcase ? null : showAnyCta || showEnquiry ? (
      <footer className="catalog-detail-footer">
        {has('cta_copy') ? (
          <div className="catalog-detail-footer-copy">
            <strong>Interested in this {TYPE_LABEL[itemType].toLowerCase()}?</strong>
            <span>Speak with our engineering team for scope, timelines, and commercial details.</span>
          </div>
        ) : (
          <div />
        )}
        <div className="catalog-detail-footer-actions">
          {has('cta_profile') ? (
            <Link href={catalogPublicPath(itemType, item.slug)} className="btn btn-primary">
              View full {caseStudyLabel(itemType).toLowerCase()}
            </Link>
          ) : null}
          {has('cta_quote') ? (
            <button type="button" className="btn btn-ghost-dark" onClick={() => setEnquiryOpen(true)}>
              Request a quote
            </button>
          ) : null}
          {has('cta_contact') ? (
            <a href="/contact" className="btn btn-ghost-dark">
              Contact us
            </a>
          ) : null}
        </div>
      </footer>
    ) : (
      <footer className="catalog-detail-footer catalog-detail-footer--simple">
        <button type="button" className="btn btn-ghost-dark" onClick={handleClose}>
          Close
        </button>
      </footer>
    );

  const metricsBlock =
    (has('price') && item.price_label) || (has('highlight') && highlight) ? (
      <div className={`catalog-detail-metrics${isShowcase ? ' catalog-detail-metrics--cards' : ''}`}>
        {has('price') && item.price_label ? (
          <div className="catalog-detail-metric catalog-detail-metric--primary">
            {isShowcase ? (
              <span className="catalog-detail-metric-icon catalog-detail-metric-icon--orange">
                <MetricIcon kind="investment" />
              </span>
            ) : null}
            <div>
              <span className="catalog-detail-metric-label">Investment</span>
              <span className="catalog-detail-metric-value">{item.price_label}</span>
            </div>
          </div>
        ) : null}
        {has('highlight') && highlight ? (
          <div className="catalog-detail-metric catalog-detail-metric--highlight">
            {isShowcase ? (
              <span className="catalog-detail-metric-icon catalog-detail-metric-icon--blue">
                <MetricIcon kind="highlight" />
              </span>
            ) : null}
            <div>
              <span className="catalog-detail-metric-label">
                {isShowcase ? 'Highlight' : highlight.key}
              </span>
              <span className="catalog-detail-metric-value">{highlight.value}</span>
            </div>
          </div>
        ) : null}
      </div>
    ) : null;

  const overviewBlock = has('overview') ? (
    <div className="catalog-detail-section">
      <h3 className="catalog-detail-section-title">Overview</h3>
      <p className="catalog-detail-lead">{item.description || item.summary}</p>
    </div>
  ) : null;

  const tagsBlock =
    has('tags') && item.tags_json?.length ? (
      <div className="catalog-detail-tags">
        {item.tags_json.map((t) => (
          <span key={t} className="catalog-detail-tag">
            {t}
          </span>
        ))}
      </div>
    ) : null;

  const specsBlock =
    has('specs') && specEntries.length ? (
      <div className="catalog-detail-section">
        <h3 className="catalog-detail-section-title">Technical specifications</h3>
        {isShowcase ? (
          <div className="catalog-detail-spec-cards">
            {specEntries.map(([k, v], idx) => (
              <div key={k} className="catalog-detail-spec-card">
                <span className="catalog-detail-spec-icon">
                  <SpecIcon index={idx} />
                </span>
                <div>
                  <span className="catalog-detail-spec-key">{k}</span>
                  <span className="catalog-detail-spec-val">{v}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <dl className="catalog-detail-spec-list">
            {specEntries.map(([k, v]) => (
              <div key={k} className="catalog-detail-spec-row">
                <dt className="catalog-detail-spec-key">{k}</dt>
                <dd className="catalog-detail-spec-val">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    ) : null;

  const trustBlock = has('trust') ? (
    <div className={`catalog-detail-trust${isShowcase ? ' catalog-detail-trust--bar' : ''}`} aria-label="Assurances">
      {TRUST_ITEMS.map((t) => (
        <div key={t.title} className="catalog-detail-trust-item">
          {isShowcase ? (
            <span className="catalog-detail-trust-icon">
              <TrustIcon name={t.icon} />
            </span>
          ) : (
            <span className="catalog-detail-trust-mark" aria-hidden="true" />
          )}
          <div>
            <strong>{t.title}</strong>
            <span>{t.blurb}</span>
          </div>
        </div>
      ))}
    </div>
  ) : null;

  const enquiryOverlay =
    (showEnquiry || has('cta_quote')) && enquiryOpen ? (
      <div className="catalog-detail-enquiry-backdrop" onClick={() => setEnquiryOpen(false)} role="presentation">
        <aside className="catalog-detail-enquiry" onClick={(e) => e.stopPropagation()} aria-label="Enquiry form">
          <div className="catalog-detail-enquiry-head">
            <div>
              <p className="catalog-detail-enquiry-eyebrow">Enquiry</p>
              <h3>{item.title}</h3>
            </div>
            <button
              type="button"
              className="catalog-detail-icon-btn catalog-detail-icon-btn--dark"
              onClick={() => setEnquiryOpen(false)}
              aria-label={copy.a11y.closeEnquiry}
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
    ) : null;

  const contentBody = (
    <div className="catalog-detail-scroll">
      {showInlineMeta && !isShowcase && (has('badge') || has('ref')) ? (
        <div className="catalog-detail-eyebrow-row">
          {has('badge') ? (
            <span className="catalog-detail-badge catalog-detail-badge--ink">
              {item.category_name || TYPE_LABEL[itemType]}
            </span>
          ) : null}
          {has('ref') ? <span className="catalog-detail-ref catalog-detail-ref--ink">Ref · {item.slug}</span> : null}
        </div>
      ) : null}

      {has('title') ? (
        <SiteHeading role="section" id={titleId} className="catalog-detail-title">
          {item.title}
        </SiteHeading>
      ) : null}

      {has('tagline') && tagline ? <p className="catalog-detail-tagline">{tagline}</p> : null}

      {metricsBlock}
      {overviewBlock}
      {tagsBlock}
      {specsBlock}
      {!isShowcase ? trustBlock : null}
    </div>
  );

  const content = (
    <div className="catalog-detail-backdrop" onClick={handleClose} role="presentation">
      <div
        ref={panelRef}
        className={[
          'catalog-detail-panel',
          `catalog-detail-panel--${template}`,
          isModern ? 'catalog-detail-panel--media-stage' : `catalog-detail-panel--${layout}`,
          showMedia ? '' : 'catalog-detail-panel--no-media',
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {showChromeBar ? (
          <header className="catalog-detail-header">
            <div className="catalog-detail-header-meta">
              {has('badge') ? (
                <span className="catalog-detail-badge">{item.category_name || TYPE_LABEL[itemType]}</span>
              ) : null}
              {has('ref') ? <span className="catalog-detail-ref">Ref · {item.slug}</span> : null}
            </div>
            <div className="catalog-detail-header-actions">{actions}</div>
          </header>
        ) : null}

        {!showChromeBar && (showClose || (has('copy_link') && !isShowcase)) ? (
          <div className="catalog-detail-float-actions">{actions}</div>
        ) : null}

        <div className="catalog-detail-body">
          <div className={`catalog-detail-layout${showMedia ? '' : ' catalog-detail-layout--no-media'}`}>
            {showMedia ? (
              <aside className="catalog-detail-media-col">
                <div className="catalog-detail-media-stage">{gallery}</div>
                {isShowcase ? showcaseCta : null}
              </aside>
            ) : null}
            <div className="catalog-detail-content-col">
              {contentBody}
              {isShowcase ? trustBlock : null}
              {isShowcase && !showMedia ? showcaseCta : null}
            </div>
          </div>
        </div>

        {detailFooter}
        {enquiryOverlay}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
