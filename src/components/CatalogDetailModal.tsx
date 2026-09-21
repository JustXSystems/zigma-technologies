'use client';

import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
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
    icon: 'shield' as const,
  },
  {
    title: 'Energy Efficient',
    blurb: 'Optimized lifetime cost',
    icon: 'bolt' as const,
  },
] as const;

type TrustIconName = (typeof TRUST_ITEMS)[number]['icon'];
type SpecIconName =
  | 'bolt'
  | 'chip'
  | 'gauge'
  | 'ruler'
  | 'layers'
  | 'thermometer'
  | 'weight'
  | 'clock'
  | 'drop'
  | 'wifi'
  | 'box'
  | 'cog';

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  'aria-hidden': true as const,
};

function IconShell({
  children,
  size = 22,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <svg
      {...ICON_PROPS}
      width={size}
      height={size}
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function TrustIcon({ name }: { name: TrustIconName }) {
  if (name === 'headset') {
    return (
      <IconShell>
        <path d="M4 14v-1.5a8 8 0 0 1 16 0V14" />
        <path d="M4 14a2.2 2.2 0 0 0 2.2 2.2H7.5V12H6.2A2.2 2.2 0 0 0 4 14.2Z" fill="currentColor" fillOpacity="0.14" />
        <path d="M20 14a2.2 2.2 0 0 1-2.2 2.2H16.5V12h1.3A2.2 2.2 0 0 1 20 14.2Z" fill="currentColor" fillOpacity="0.14" />
        <path d="M4 14a2.2 2.2 0 0 0 2.2 2.2H7.5V12H6.2A2.2 2.2 0 0 0 4 14.2ZM20 14a2.2 2.2 0 0 1-2.2 2.2H16.5V12h1.3A2.2 2.2 0 0 1 20 14.2Z" />
        <path d="M12 18.5a2 2 0 0 0 2 2h1.2" />
        <circle cx="15.5" cy="20.5" r="1.1" fill="currentColor" stroke="none" />
      </IconShell>
    );
  }
  if (name === 'bolt') {
    return (
      <IconShell>
        <path d="M13 2 4.8 13.2h6.4L11 22l8.2-11.2h-6.4L13 2Z" fill="currentColor" fillOpacity="0.14" />
        <path d="M13 2 4.8 13.2h6.4L11 22l8.2-11.2h-6.4L13 2Z" />
      </IconShell>
    );
  }
  return (
    <IconShell>
      <path
        d="M12 3.2 5.2 6.1v4.4c0 4.55 3.05 7.85 6.8 8.7 3.75-.85 6.8-4.15 6.8-8.7V6.1L12 3.2Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path d="M12 3.2 5.2 6.1v4.4c0 4.55 3.05 7.85 6.8 8.7 3.75-.85 6.8-4.15 6.8-8.7V6.1L12 3.2Z" />
      <path d="m9.1 12.1 1.9 1.9 3.9-3.9" />
    </IconShell>
  );
}

function MetricIcon({ kind }: { kind: 'investment' | 'highlight' }) {
  if (kind === 'investment') {
    return (
      <IconShell size={20}>
        <path d="M4 19V10.5" />
        <path d="M10 19V6" />
        <path d="M16 19v-5" />
        <path d="M3 19h18" />
        <circle cx="4" cy="10.5" r="1.35" fill="currentColor" stroke="none" />
        <circle cx="10" cy="6" r="1.35" fill="currentColor" stroke="none" />
        <circle cx="16" cy="14" r="1.35" fill="currentColor" stroke="none" />
        <path d="m14.2 8.2 3.3-3.3 2.3 2.3" />
        <path d="M17.5 4.9H20v2.5" />
      </IconShell>
    );
  }
  return (
    <IconShell size={20}>
      <path
        d="M12 3.2 5.2 6.1v4.4c0 4.55 3.05 7.85 6.8 8.7 3.75-.85 6.8-4.15 6.8-8.7V6.1L12 3.2Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="M12 3.2 5.2 6.1v4.4c0 4.55 3.05 7.85 6.8 8.7 3.75-.85 6.8-4.15 6.8-8.7V6.1L12 3.2Z" />
      <path d="m9.05 12.05 1.95 1.95 3.95-3.95" />
    </IconShell>
  );
}

function resolveSpecIcon(key: string, index: number): SpecIconName {
  const k = key.toLowerCase();
  if (/(power|watt|kw|kva|amp|volt|current|electr)/.test(k)) return 'bolt';
  if (/(temp|thermal|heat|cool|°|celsius|fahrenheit)/.test(k)) return 'thermometer';
  if (/(size|dimens|height|width|depth|mm|cm|inch|length)/.test(k)) return 'ruler';
  if (/(weight|mass|kg|lb)/.test(k)) return 'weight';
  if (/(efficien|uptime|perf|rating|ip\s?\d|class)/.test(k)) return 'gauge';
  if (/(cpu|chip|board|processor|memory|ram|storage)/.test(k)) return 'chip';
  if (/(time|lead|delivery|hour|week|day)/.test(k)) return 'clock';
  if (/(humid|water|fluid|oil|coolant)/.test(k)) return 'drop';
  if (/(network|wifi|wireless|connect|iot|ethernet)/.test(k)) return 'wifi';
  if (/(phase|layer|stage|tier|level)/.test(k)) return 'layers';
  if (/(pack|unit|model|sku|form|enclos)/.test(k)) return 'box';
  const cycle: SpecIconName[] = ['bolt', 'chip', 'gauge', 'ruler', 'layers', 'cog', 'box', 'clock'];
  return cycle[index % cycle.length];
}

function SpecIcon({ name }: { name: SpecIconName }) {
  const common = (
    <>
      {name === 'bolt' ? (
        <>
          <path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z" fill="currentColor" fillOpacity="0.12" />
          <path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z" />
        </>
      ) : null}
      {name === 'chip' ? (
        <>
          <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" fillOpacity="0.12" />
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
          <path d="M10.5 10.5h3v3h-3z" />
          <path d="M9 4v3M12 4v3M15 4v3M9 17v3M12 17v3M15 17v3M4 9h3M4 12h3M4 15h3M17 9h3M17 12h3M17 15h3" />
        </>
      ) : null}
      {name === 'gauge' ? (
        <>
          <path d="M5.5 16.5a7.5 7.5 0 1 1 13 0" fill="currentColor" fillOpacity="0.1" />
          <path d="M5.5 16.5a7.5 7.5 0 1 1 13 0" />
          <path d="M12 16.5 15.2 10.8" />
          <circle cx="12" cy="16.5" r="1.2" fill="currentColor" stroke="none" />
        </>
      ) : null}
      {name === 'ruler' ? (
        <>
          <path d="M4.5 15.5 15.5 4.5l4 4L8.5 19.5z" fill="currentColor" fillOpacity="0.1" />
          <path d="M4.5 15.5 15.5 4.5l4 4L8.5 19.5z" />
          <path d="m8 12 1.2-1.2M10.2 9.8 11.4 8.6M12.4 7.6 13.6 6.4" />
        </>
      ) : null}
      {name === 'layers' ? (
        <>
          <path d="m12 3.5 8 4.2-8 4.2-8-4.2 8-4.2Z" fill="currentColor" fillOpacity="0.12" />
          <path d="m12 3.5 8 4.2-8 4.2-8-4.2 8-4.2Z" />
          <path d="m4 12.2 8 4.2 8-4.2" />
          <path d="m4 16.2 8 4.2 8-4.2" />
        </>
      ) : null}
      {name === 'thermometer' ? (
        <>
          <path d="M10 14.2V6.5a2 2 0 1 1 4 0v7.7" />
          <circle cx="12" cy="17.2" r="3.2" fill="currentColor" fillOpacity="0.14" />
          <circle cx="12" cy="17.2" r="3.2" />
          <path d="M12 14.5v2" />
        </>
      ) : null}
      {name === 'weight' ? (
        <>
          <path d="M7.2 8.5h9.6l1.7 11H5.5l1.7-11Z" fill="currentColor" fillOpacity="0.12" />
          <path d="M7.2 8.5h9.6l1.7 11H5.5l1.7-11Z" />
          <path d="M10 8.5a2 2 0 0 1 4 0" />
        </>
      ) : null}
      {name === 'clock' ? (
        <>
          <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity="0.1" />
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4.5l3 1.8" />
        </>
      ) : null}
      {name === 'drop' ? (
        <>
          <path d="M12 3.5c3.5 4.2 5.5 7.1 5.5 9.6a5.5 5.5 0 1 1-11 0c0-2.5 2-5.4 5.5-9.6Z" fill="currentColor" fillOpacity="0.12" />
          <path d="M12 3.5c3.5 4.2 5.5 7.1 5.5 9.6a5.5 5.5 0 1 1-11 0c0-2.5 2-5.4 5.5-9.6Z" />
        </>
      ) : null}
      {name === 'wifi' ? (
        <>
          <path d="M5 9.2a10.5 10.5 0 0 1 14 0" />
          <path d="M7.8 12.2a6.6 6.6 0 0 1 8.4 0" />
          <path d="M10.5 15.1a3 3 0 0 1 3 0" />
          <circle cx="12" cy="18" r="1.15" fill="currentColor" stroke="none" />
        </>
      ) : null}
      {name === 'box' ? (
        <>
          <path d="M12 3.4 20 7.5v9L12 20.6 4 16.5v-9L12 3.4Z" fill="currentColor" fillOpacity="0.1" />
          <path d="M12 3.4 20 7.5v9L12 20.6 4 16.5v-9L12 3.4Z" />
          <path d="M12 12.1 20 7.5M12 12.1 4 7.5M12 12.1v8.5" />
        </>
      ) : null}
      {name === 'cog' ? (
        <>
          <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.14" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.2v2.1M12 18.7v2.1M4.8 7.1l1.8 1.1M17.4 15.8l1.8 1.1M4.8 16.9l1.8-1.1M17.4 8.2l1.8-1.1M3.2 12h2.1M18.7 12h2.1" />
        </>
      ) : null}
    </>
  );
  return <IconShell size={18}>{common}</IconShell>;
}

function CtaArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8.5 17H6.2A2.2 2.2 0 0 1 4 14.8V12a7 7 0 0 1 7-7h.5" />
      <path d="M19.5 17h-2.3A2.2 2.2 0 0 1 15 14.8V12a7 7 0 0 1 7-7h.5" />
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
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
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
              <CtaArrowIcon />
            </Link>
          ) : null}
          {has('cta_quote') ? (
            <button
              type="button"
              className="btn catalog-detail-showcase-secondary"
              onClick={() => setEnquiryOpen(true)}
            >
              <QuoteIcon />
              Request a quote
            </button>
          ) : null}
        </div>
        {has('cta_contact') ? (
          <Link href="/contact" className="catalog-detail-showcase-contact">
            Contact our team <CtaArrowIcon />
          </Link>
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
            <Link href="/contact" className="btn btn-ghost-dark">
              Contact us
            </Link>
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
            {specEntries.map(([k, v], idx) => {
              const iconName = resolveSpecIcon(k, idx);
              return (
                <div key={k} className="catalog-detail-spec-card">
                  <span className={`catalog-detail-spec-icon catalog-detail-spec-icon--${iconName}`}>
                    <SpecIcon name={iconName} />
                  </span>
                  <div>
                    <span className="catalog-detail-spec-key">{k}</span>
                    <span className="catalog-detail-spec-val">{v}</span>
                  </div>
                </div>
              );
            })}
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
            {isShowcase ? (
              <>
                {showMedia ? <div className="catalog-detail-media-stage">{gallery}</div> : null}
                {contentBody}
                {trustBlock}
                {showcaseCta}
              </>
            ) : (
              <>
                {showMedia ? (
                  <aside className="catalog-detail-media-col">
                    <div className="catalog-detail-media-stage">{gallery}</div>
                  </aside>
                ) : null}
                <div className="catalog-detail-content-col">{contentBody}</div>
              </>
            )}
          </div>
        </div>

        {detailFooter}
        {enquiryOverlay}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
