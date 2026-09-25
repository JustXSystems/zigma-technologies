'use client';

import { FormEvent, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CmsSection } from '@/lib/cms-types';
import MediaPicker from '@/components/admin/MediaPicker';
import {
  createIndustryCategoryCard,
  INDUSTRY_CATEGORY_COLOR_PRESETS,
  INDUSTRY_CATEGORY_FONT_OPTIONS,
  normalizeIndustryCategoryCards,
  type IndustryCategoryCard,
} from '@/lib/industry-category';
import {
  createLocationOfficeCard,
  LOCATIONS_SECTION_EYEBROW_PRESETS,
  LOCATIONS_SECTION_FONT_OPTIONS,
  normalizeLocationOfficeCards,
  type LocationOfficeCard,
} from '@/lib/locations-section';

type Props = {
  section: CmsSection;
  onClose: () => void;
  onSaved: () => void;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

function ColorPickerField({
  label,
  value,
  fallback,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (next: string) => void;
  hint?: string;
}) {
  const pickerValue = HEX6.test(value) ? value : fallback;
  return (
    <Field label={label}>
      <div className="admin-color-field">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
        <input
          className="admin-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
          style={{ minWidth: 0, flex: '1 1 8rem' }}
        />
        {value ? (
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => onChange('')}
            title="Clear to use tone preset"
            style={{ padding: '0.35rem 0.65rem', whiteSpace: 'nowrap', flex: '0 0 auto' }}
          >
            Clear
          </button>
        ) : null}
      </div>
      {hint ? (
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--admin-muted)' }}>{hint}</p>
      ) : null}
    </Field>
  );
}

type TimelineCta = { label: string; href: string; position?: string; color?: string };

function migrateTimelineContent(raw: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(raw.ctas)) return raw;
  const { cta, ctaHref, ctaAlign, ...rest } = raw;
  if (cta) {
    return {
      ...rest,
      ctas: [
        {
          label: String(cta),
          href: String(ctaHref || '#'),
          position: String(ctaAlign || 'left'),
          color: '',
        } satisfies TimelineCta,
      ],
    };
  }
  return { ...raw, ctas: [] };
}

type SplitCta = { label: string; href: string; position?: string; type?: 'primary' | 'secondary' };

type FeatureGridCard = {
  title: string;
  body: string;
  badge?: string;
  badgeColor?: string;
  icon?: string;
  variant?: string;
  linkLabel?: string;
  linkHref?: string;
  subject?: string;
  /** Optional per-card background; empty uses tone / variant CSS. */
  bg?: string;
};

function featureCardBgFallback(card: FeatureGridCard): string {
  if (card.variant === 'pastel-green') return '#EAF7EF';
  if (card.variant === 'emergency') return '#FFF7F2';
  return '#EAF2FC';
}

type WhyCard = {
  index: string;
  title: string;
  desc: string;
  tint: string;
  /** Optional per-card background; empty uses tint CSS class. */
  bg?: string;
};

const WHY_TINT_FALLBACKS: Record<string, string> = {
  'tint-1': '#FFF7F2',
  'tint-2': '#F1FAF4',
  'tint-3': '#F1FAFC',
  'tint-4': '#FFFCF3',
  'tint-5': '#F8F5FD',
  'tint-6': '#F5F8FE',
};

function whyCardBgFallback(card: WhyCard): string {
  return WHY_TINT_FALLBACKS[card.tint] || '#FFFFFF';
}

type JobCard = {
  title: string;
  department?: string;
  location?: string;
  type?: string;
  /** Optional per-card background; empty uses default white. */
  bg?: string;
};

function migrateSplitContent(raw: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(raw.ctas)) return raw;
  const { cta, ctaHref, ...rest } = raw;
  if (cta) {
    return {
      ...rest,
      ctas: [
        {
          label: String(cta),
          href: String(ctaHref || '#'),
          position: 'left',
          type: 'primary',
        } satisfies SplitCta,
      ],
    };
  }
  return { ...rest, ctas: [] };
}

export default function SectionEditor({ section, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(section.title || '');
  const [sectionKey, setSectionKey] = useState(section.section_key || '');
  const [content, setContent] = useState<Record<string, unknown>>(() => {
    const raw = { ...(section.content_json || {}) };
    if (section.type === 'timeline') return migrateTimelineContent(raw);
    if (section.type === 'split') return migrateSplitContent(raw);
    return raw;
  });
  const [extraClass, setExtraClass] = useState(String((section.style_json as { className?: string })?.className || ''));
  const [customCss, setCustomCss] = useState(String((section.style_json as { css?: string })?.css || ''));
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(() => {
    const raw = { ...(section.content_json || {}) };
    const migrated =
      section.type === 'timeline'
        ? migrateTimelineContent(raw)
        : section.type === 'split'
          ? migrateSplitContent(raw)
          : raw;
    return JSON.stringify(migrated, null, 2);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(key: string, value: unknown) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let content_json = content;
      if (jsonMode) {
        content_json = JSON.parse(jsonText || '{}');
      }
      if (section.type === 'timeline') {
        content_json = migrateTimelineContent(content_json);
      }
      if (section.type === 'split') {
        content_json = migrateSplitContent(content_json);
      }
      const res = await fetch(`/api/admin/sections/${section.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          section_key: sectionKey || null,
          content_json,
          style_json: {
            className: extraClass || undefined,
            css: customCss || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const features = (content.features as Array<{ title: string; body: string; icon?: string }>) || [];
  const whyCards = section.type === 'why' ? ((content.cards as WhyCard[]) || []) : [];
  const featureCards =
    section.type === 'feature_grid' ? ((content.cards as FeatureGridCard[]) || []) : [];
  const jobCards = section.type === 'job_list' ? ((content.jobs as JobCard[]) || []) : [];
  const slides = (content.slides as Array<Record<string, unknown>>) || [];
  const ctaFields = content as Record<string, string>;
  const timelineCtas = (Array.isArray(content.ctas) ? content.ctas : []) as TimelineCta[];
  const splitCtas = (Array.isArray(content.ctas) ? content.ctas : []) as SplitCta[];
  const industryCards =
    section.type === 'industry_category'
      ? normalizeIndustryCategoryCards(content.cards)
      : [];
  const locationCards =
    section.type === 'locations' ? normalizeLocationOfficeCards(content.locations) : [];

  function setWhyCards(next: WhyCard[]) {
    setField('cards', next);
  }

  function patchWhyCard(idx: number, patch: Partial<WhyCard>) {
    setWhyCards(whyCards.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function moveWhyCard(idx: number, dir: -1 | 1) {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= whyCards.length) return;
    const next = [...whyCards];
    const [item] = next.splice(idx, 1);
    next.splice(nextIdx, 0, item);
    setWhyCards(next);
  }

  function setFeatureCards(next: FeatureGridCard[]) {
    setField('cards', next);
  }

  function patchFeatureCard(idx: number, patch: Partial<FeatureGridCard>) {
    setFeatureCards(featureCards.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function moveFeatureCard(idx: number, dir: -1 | 1) {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= featureCards.length) return;
    const next = [...featureCards];
    const [item] = next.splice(idx, 1);
    next.splice(nextIdx, 0, item);
    setFeatureCards(next);
  }

  function setJobCards(next: JobCard[]) {
    setField('jobs', next);
  }

  function patchJobCard(idx: number, patch: Partial<JobCard>) {
    setJobCards(jobCards.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function moveJobCard(idx: number, dir: -1 | 1) {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= jobCards.length) return;
    const next = [...jobCards];
    const [item] = next.splice(idx, 1);
    next.splice(nextIdx, 0, item);
    setJobCards(next);
  }

  function setTimelineCtas(next: TimelineCta[]) {
    setContent((prev) => {
      const { cta: _cta, ctaHref: _ctaHref, ctaAlign: _ctaAlign, ...rest } = prev;
      return { ...rest, ctas: next };
    });
  }

  function setSplitCtas(next: SplitCta[]) {
    setContent((prev) => {
      const { cta: _cta, ctaHref: _ctaHref, ...rest } = prev;
      return { ...rest, ctas: next };
    });
  }

  function setIndustryCards(next: IndustryCategoryCard[]) {
    setField('cards', next);
  }

  function patchIndustryCard(id: string, patch: Partial<IndustryCategoryCard>) {
    setIndustryCards(industryCards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function moveIndustryCard(id: string, dir: -1 | 1) {
    const idx = industryCards.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= industryCards.length) return;
    const next = [...industryCards];
    const [item] = next.splice(idx, 1);
    next.splice(nextIdx, 0, item);
    setIndustryCards(next);
  }

  function setLocationCards(next: LocationOfficeCard[]) {
    setField('locations', next);
  }

  function patchLocationCard(id: string, patch: Partial<LocationOfficeCard>) {
    setLocationCards(
      locationCards.map((c) => {
        if (c.id !== id) {
          // Only one default map source at a time
          if (patch.isDefault === true) return { ...c, isDefault: false };
          return c;
        }
        return { ...c, ...patch };
      })
    );
  }

  function moveLocationCard(id: string, dir: -1 | 1) {
    const idx = locationCards.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= locationCards.length) return;
    const next = [...locationCards];
    const [item] = next.splice(idx, 1);
    next.splice(nextIdx, 0, item);
    setLocationCards(next);
  }

  return createPortal(
    <div className="admin-modal-backdrop" onClick={onClose}>
      <form className="admin-modal" style={{ width: 'min(920px, 100%)' }} onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="admin-toolbar" style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>Edit · {section.type}</h2>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              if (!jsonMode) setJsonText(JSON.stringify(content, null, 2));
              else {
                try {
                  setContent(JSON.parse(jsonText || '{}'));
                } catch {
                  setError('Invalid JSON');
                  return;
                }
              }
              setJsonMode(!jsonMode);
            }}
          >
            {jsonMode ? 'Form mode' : 'JSON mode'}
          </button>
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save section'}
          </button>
        </div>
        {error ? <div className="admin-error">{error}</div> : null}

        <div className="admin-form-grid">
          <Field label="Title">
            <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Section key (anchor id)">
            <input className="admin-input" value={sectionKey} onChange={(e) => setSectionKey(e.target.value)} />
          </Field>
          <Field label="Extra CSS class (style_json)">
            <input className="admin-input" value={extraClass} onChange={(e) => setExtraClass(e.target.value)} placeholder="e.g. my-section" />
          </Field>
          <Field label="Scoped CSS override">
            <input className="admin-input" value={customCss} onChange={(e) => setCustomCss(e.target.value)} placeholder=".my-section h2{color:red}" />
          </Field>
        </div>

        {jsonMode ? (
          <div className="admin-field" style={{ marginTop: '1rem' }}>
            <label>content_json</label>
            <textarea
              className="admin-textarea"
              style={{ minHeight: 320, fontFamily: 'var(--admin-mono)' }}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            {(section.type === 'cta' ||
              section.type === 'eco' ||
              section.type === 'why' ||
              section.type === 'timeline' ||
              section.type === 'projects_teaser' ||
              section.type === 'industries' ||
              section.type === 'industry_hub' ||
              section.type === 'industry_category' ||
              section.type === 'split' ||
              section.type === 'rich_text' ||
              section.type === 'enquiry_form' ||
              section.type === 'page_hero' ||
              section.type === 'cert_hero' ||
              section.type === 'cert_teaser' ||
              section.type === 'cert_cta' ||
              section.type === 'testimonials' ||
              section.type === 'partners' ||
              section.type === 'feature_grid' ||
              section.type === 'logo_marquee' ||
              section.type === 'locations' ||
              section.type === 'job_list' ||
              section.type === 'internship' ||
              section.type === 'careers_apply' ||
              section.type === 'comparison_table') && (
              <div className="admin-form-grid">
                {section.type !== 'cta' && section.type !== 'logo_marquee' && section.type !== 'cert_cta' ? (
                  <Field label="Eyebrow">
                    <input className="admin-input" value={String(content.eyebrow || '')} onChange={(e) => setField('eyebrow', e.target.value)} />
                  </Field>
                ) : null}
                {section.type !== 'logo_marquee' && section.type !== 'cert_cta' ? (
                  <Field label={section.type === 'cta' ? 'Headline' : 'Heading'}>
                    <input
                      className="admin-input"
                      value={String(content.title || '')}
                      onChange={(e) => setField('title', e.target.value)}
                    />
                  </Field>
                ) : null}
                {section.type !== 'logo_marquee' &&
                section.type !== 'testimonials' &&
                section.type !== 'cert_cta' &&
                section.type !== 'timeline' ? (
                  <div className="admin-field full">
                    <label>
                      {section.type === 'page_hero' || section.type === 'cert_hero' ? 'Lead' : 'Body'}
                    </label>
                    <textarea
                      className="admin-textarea"
                      value={String(
                        section.type === 'page_hero' || section.type === 'cert_hero'
                          ? content.lead || content.body || ''
                          : content.body || ''
                      )}
                      onChange={(e) =>
                        setField(
                          section.type === 'page_hero' || section.type === 'cert_hero' ? 'lead' : 'body',
                          e.target.value
                        )
                      }
                    />
                  </div>
                ) : null}
              </div>
            )}

            {section.type === 'page_hero' ? (
              <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                <Field label="Breadcrumb label">
                  <input className="admin-input" value={String(content.breadcrumb || '')} onChange={(e) => setField('breadcrumb', e.target.value)} />
                </Field>
                <div className="full">
                  <MediaPicker
                    value={String(content.image || '')}
                    onChange={(path) => setField('image', path)}
                    label="Background media (desktop)"
                    kinds="visual"
                    allowUpload
                    hint="Pick any successful media-library upload (image, SVG, or video). Used full-bleed on desktop and as the mobile fallback."
                  />
                </div>
                <div className="full">
                  <MediaPicker
                    value={String(content.imageMobile || '')}
                    onChange={(path) => setField('imageMobile', path)}
                    label="Background media (mobile, optional)"
                    kinds="visual"
                    allowUpload
                    hint="Optional ≤760px override. Leave blank to reuse the desktop media."
                  />
                </div>
                <Field label="Body class">
                  <input className="admin-input" value={String(content.bodyClass || '')} onChange={(e) => setField('bodyClass', e.target.value)} placeholder="contact-page" />
                </Field>
                <Field label="Primary CTA label">
                  <input className="admin-input" value={String(content.primaryCta || '')} onChange={(e) => setField('primaryCta', e.target.value)} />
                </Field>
                <Field label="Primary CTA href">
                  <input className="admin-input" value={String(content.primaryHref || '')} onChange={(e) => setField('primaryHref', e.target.value)} />
                </Field>
                <Field label="Secondary CTA label">
                  <input className="admin-input" value={String(content.secondaryCta || '')} onChange={(e) => setField('secondaryCta', e.target.value)} />
                </Field>
                <Field label="Secondary CTA href">
                  <input className="admin-input" value={String(content.secondaryHref || '')} onChange={(e) => setField('secondaryHref', e.target.value)} />
                </Field>
                <div className="admin-field full">
                  <label>Proof rail (one per line)</label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 100 }}
                    value={((content.proofRail as string[]) || []).join('\n')}
                    onChange={(e) =>
                      setField(
                        'proofRail',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                </div>
              </div>
            ) : null}

            {section.type === 'cert_hero' ? (
              <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                <Field label="Tagline">
                  <input className="admin-input" value={String(content.tagline || '')} onChange={(e) => setField('tagline', e.target.value)} />
                </Field>
                <div className="full">
                  <MediaPicker
                    value={String(content.image || '')}
                    onChange={(path) => setField('image', path)}
                    label="Background media"
                    kinds="visual"
                    allowUpload
                    hint="Optional full-bleed background from the media library (image, SVG, or video)."
                  />
                </div>
                <div className="full">
                  <MediaPicker
                    value={String(content.imageMobile || '')}
                    onChange={(path) => setField('imageMobile', path)}
                    label="Background media (mobile, optional)"
                    kinds="visual"
                    allowUpload
                  />
                </div>
              </div>
            ) : null}

            {section.type === 'cert_teaser' || section.type === 'cert_cta' ? (
              <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                <Field label="CTA label">
                  <input className="admin-input" value={String(content.cta || '')} onChange={(e) => setField('cta', e.target.value)} />
                </Field>
                <Field label="CTA href">
                  <input className="admin-input" value={String(content.ctaHref || '')} onChange={(e) => setField('ctaHref', e.target.value)} />
                </Field>
              </div>
            ) : null}

            {section.type === 'cta' ? (
              <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                <Field label="Layout variant">
                  <select
                    className="admin-input"
                    value={String(content.variant || '') === 'inner' ? 'inner' : 'band'}
                    onChange={(e) => setField('variant', e.target.value === 'inner' ? 'inner' : '')}
                  >
                    <option value="band">Classic CTA band</option>
                    <option value="inner">Inner page CTA</option>
                  </select>
                </Field>
                <Field label="Eyebrow (inner)">
                  <input className="admin-input" value={String(content.eyebrow || '')} onChange={(e) => setField('eyebrow', e.target.value)} placeholder="Next step" />
                </Field>
                <Field label="Primary CTA label">
                  <input className="admin-input" value={ctaFields.primaryCta || ''} onChange={(e) => setField('primaryCta', e.target.value)} />
                </Field>
                <Field label="Primary CTA href">
                  <input className="admin-input" value={ctaFields.primaryHref || ''} onChange={(e) => setField('primaryHref', e.target.value)} />
                </Field>
                <Field label="Secondary CTA label">
                  <input className="admin-input" value={ctaFields.secondaryCta || ''} onChange={(e) => setField('secondaryCta', e.target.value)} />
                </Field>
                <Field label="Secondary CTA href">
                  <input className="admin-input" value={ctaFields.secondaryHref || ''} onChange={(e) => setField('secondaryHref', e.target.value)} />
                </Field>
              </div>
            ) : null}

            {section.type === 'split' ? (
              <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                <div className="full">
                  <MediaPicker value={String(content.image || '')} onChange={(path) => setField('image', path)} />
                </div>
                <Field label="Image position">
                  <select className="admin-select" value={String(content.imagePosition || 'left')} onChange={(e) => setField('imagePosition', e.target.value)}>
                    <option value="left">left</option>
                    <option value="right">right</option>
                  </select>
                </Field>
                <Field label="Tone">
                  <select className="admin-select" value={String(content.tone || 'light')} onChange={(e) => setField('tone', e.target.value)}>
                    <option value="light">light</option>
                    <option value="gray">gray</option>
                    <option value="ice">ice</option>
                  </select>
                </Field>
                <ColorPickerField
                  label="Section background"
                  value={String(content.sectionBg || '')}
                  fallback={
                    content.tone === 'gray' ? '#F4F6F9' : content.tone === 'ice' ? '#F0F8FC' : '#FFFFFF'
                  }
                  onChange={(next) => setField('sectionBg', next)}
                  hint="Overrides Tone when set. Clear to use the Tone preset."
                />
                <ColorPickerField
                  label="Feature card background"
                  value={String(content.featCardBg || '')}
                  fallback="#FFFFFF"
                  onChange={(next) => setField('featCardBg', next)}
                  hint="Applies to all feature cards in this split block."
                />
                <Field label="Eyebrow class">
                  <input className="admin-input" value={String(content.eyebrowClass || 'eyebrow-orange')} onChange={(e) => setField('eyebrowClass', e.target.value)} />
                </Field>
                <div
                  className="full"
                  style={{
                    border: '1px solid var(--admin-border, #e5e7eb)',
                    borderRadius: 10,
                    padding: '0.9rem',
                    background: 'var(--admin-muted-bg, #f8fafc)',
                  }}
                >
                  <div className="admin-toolbar" style={{ marginBottom: '0.6rem' }}>
                    <div>
                      <strong>CTA buttons</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--admin-muted)', marginTop: 2 }}>
                        One line with left / center / right slots. Each button&apos;s Position places it in that slot.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() =>
                        setSplitCtas([
                          ...splitCtas,
                          { label: 'Learn more →', href: '/contact', position: 'left', type: 'primary' },
                        ])
                      }
                    >
                      Add CTA
                    </button>
                  </div>
                  {splitCtas.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-muted)' }}>
                      No CTA buttons yet. Add one to show a call-to-action under the feature cards.
                    </p>
                  ) : null}
                  {splitCtas.map((cta, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: '1px solid var(--admin-border, #e5e7eb)',
                        borderRadius: 8,
                        padding: '0.8rem',
                        marginBottom: '0.7rem',
                        background: '#fff',
                      }}
                    >
                      <div className="admin-toolbar" style={{ marginBottom: '0.5rem' }}>
                        <strong>CTA {idx + 1}</strong>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          onClick={() => setSplitCtas(splitCtas.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="admin-form-grid">
                        <Field label="Label">
                          <input
                            className="admin-input"
                            value={cta.label || ''}
                            onChange={(e) => {
                              const next = [...splitCtas];
                              next[idx] = { ...next[idx], label: e.target.value };
                              setSplitCtas(next);
                            }}
                          />
                        </Field>
                        <Field label="Href">
                          <input
                            className="admin-input"
                            value={cta.href || ''}
                            onChange={(e) => {
                              const next = [...splitCtas];
                              next[idx] = { ...next[idx], href: e.target.value };
                              setSplitCtas(next);
                            }}
                            placeholder="/contact"
                          />
                        </Field>
                        <Field label="Position">
                          <select
                            className="admin-select"
                            value={cta.position === 'center' || cta.position === 'right' ? cta.position : 'left'}
                            onChange={(e) => {
                              const next = [...splitCtas];
                              next[idx] = { ...next[idx], position: e.target.value };
                              setSplitCtas(next);
                            }}
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </Field>
                        <Field label="Type">
                          <select
                            className="admin-select"
                            value={cta.type === 'secondary' ? 'secondary' : 'primary'}
                            onChange={(e) => {
                              const next = [...splitCtas];
                              next[idx] = {
                                ...next[idx],
                                type: e.target.value === 'secondary' ? 'secondary' : 'primary',
                              };
                              setSplitCtas(next);
                            }}
                          >
                            <option value="primary">Primary</option>
                            <option value="secondary">Secondary</option>
                          </select>
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="admin-field full">
                  <label>Features (one per line: Title | Body)</label>
                  <textarea
                    className="admin-textarea"
                    value={features.map((f) => `${f.title} | ${f.body}`).join('\n')}
                    onChange={(e) =>
                      setField(
                        'features',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line, idx) => {
                            const [t, ...rest] = line.split('|');
                            const title = t.trim();
                            const body = rest.join('|').trim();
                            const prev =
                              features.find((f) => f.title === title) || features[idx];
                            return { title, body, icon: prev?.icon };
                          })
                      )
                    }
                  />
                  <small style={{ color: 'var(--admin-muted)' }}>
                    Card icons come from seed/CMS JSON; editing titles preserves matching icons when possible.
                  </small>
                </div>
              </div>
            ) : null}

            {section.type === 'industry_category' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-form-grid">
                  <Field label="Tone (background preset)">
                    <select
                      className="admin-select"
                      value={String(content.tone || 'light')}
                      onChange={(e) => setField('tone', e.target.value)}
                    >
                      <option value="light">Light (white) — cat-infra / industrial</option>
                      <option value="gray">Gray — cat-commercial / energy</option>
                    </select>
                  </Field>
                  <ColorPickerField
                    label="Section background override"
                    value={String(content.sectionBg || '')}
                    fallback={content.tone === 'gray' ? '#F4F6F9' : '#FFFFFF'}
                    onChange={(next) => setField('sectionBg', next)}
                    hint="Overrides Tone when set. Clear to use the Tone preset."
                  />
                  <ColorPickerField
                    label="Category accent (--cat-color)"
                    value={String(content.catColor || '')}
                    fallback="#00D4FF"
                    onChange={(next) => setField('catColor', next)}
                    hint="Icon tint, card hover bar, and title hover. Infra=cyan, commercial=orange, industrial=green, energy=purple."
                  />
                  <Field label="Accent presets">
                    <select
                      className="admin-select"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) setField('catColor', e.target.value);
                      }}
                    >
                      <option value="">Apply preset…</option>
                      {INDUSTRY_CATEGORY_COLOR_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Eyebrow class">
                    <input
                      className="admin-input"
                      value={String(content.eyebrowClass || 'eyebrow-orange')}
                      onChange={(e) => setField('eyebrowClass', e.target.value)}
                      placeholder="eyebrow-orange"
                    />
                  </Field>
                  <Field label="Section padding (block)">
                    <input
                      className="admin-input"
                      value={String(content.sectionPadding || '')}
                      onChange={(e) => setField('sectionPadding', e.target.value)}
                      placeholder="4rem"
                    />
                  </Field>
                  <Field label="Head margin bottom">
                    <input
                      className="admin-input"
                      value={String(content.headMarginBottom || '')}
                      onChange={(e) => setField('headMarginBottom', e.target.value)}
                      placeholder="2.2rem"
                    />
                  </Field>
                  <Field label="Grid columns">
                    <input
                      className="admin-input"
                      type="number"
                      min={1}
                      max={6}
                      value={Number(content.gridColumns) || 3}
                      onChange={(e) => setField('gridColumns', Number(e.target.value) || 3)}
                    />
                  </Field>
                  <Field label="Grid gap">
                    <input
                      className="admin-input"
                      value={String(content.gridGap || '')}
                      onChange={(e) => setField('gridGap', e.target.value)}
                      placeholder="1.5rem"
                    />
                  </Field>
                </div>

                <div
                  style={{
                    marginTop: '1rem',
                    border: '1px solid var(--admin-border, #e5e7eb)',
                    borderRadius: 10,
                    padding: '0.9rem',
                    background: 'var(--admin-muted-bg, #f8fafc)',
                  }}
                >
                  <strong>Typography &amp; colors</strong>
                  <div className="admin-form-grid" style={{ marginTop: '0.7rem' }}>
                    <ColorPickerField
                      label="Eyebrow color"
                      value={String(content.eyebrowColor || '')}
                      fallback="#FF6B1A"
                      onChange={(next) => setField('eyebrowColor', next)}
                    />
                    <Field label="Eyebrow font">
                      <select
                        className="admin-select"
                        value={String(content.eyebrowFont || '')}
                        onChange={(e) => setField('eyebrowFont', e.target.value)}
                      >
                        <option value="">Default (mono)</option>
                        {INDUSTRY_CATEGORY_FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Eyebrow size">
                      <input
                        className="admin-input"
                        value={String(content.eyebrowSize || '')}
                        onChange={(e) => setField('eyebrowSize', e.target.value)}
                        placeholder="0.72rem"
                      />
                    </Field>
                    <Field label="Eyebrow weight">
                      <input
                        className="admin-input"
                        value={String(content.eyebrowWeight || '')}
                        onChange={(e) => setField('eyebrowWeight', e.target.value)}
                        placeholder="600"
                      />
                    </Field>
                    <Field label="Eyebrow letter-spacing">
                      <input
                        className="admin-input"
                        value={String(content.eyebrowLetterSpacing || '')}
                        onChange={(e) => setField('eyebrowLetterSpacing', e.target.value)}
                        placeholder="0.14em"
                      />
                    </Field>
                    <Field label="Eyebrow text-transform">
                      <select
                        className="admin-select"
                        value={String(content.eyebrowTransform || '')}
                        onChange={(e) => setField('eyebrowTransform', e.target.value)}
                      >
                        <option value="">Default (uppercase)</option>
                        <option value="uppercase">uppercase</option>
                        <option value="none">none</option>
                        <option value="capitalize">capitalize</option>
                      </select>
                    </Field>
                    <ColorPickerField
                      label="Title color"
                      value={String(content.titleColor || '')}
                      fallback="#1E2530"
                      onChange={(next) => setField('titleColor', next)}
                    />
                    <Field label="Title font">
                      <select
                        className="admin-select"
                        value={String(content.titleFont || '')}
                        onChange={(e) => setField('titleFont', e.target.value)}
                      >
                        <option value="">Default (display)</option>
                        {INDUSTRY_CATEGORY_FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Title size">
                      <input
                        className="admin-input"
                        value={String(content.titleSize || '')}
                        onChange={(e) => setField('titleSize', e.target.value)}
                        placeholder="clamp(1.7rem,2.8vw,2.2rem)"
                      />
                    </Field>
                    <Field label="Title weight">
                      <input
                        className="admin-input"
                        value={String(content.titleWeight || '')}
                        onChange={(e) => setField('titleWeight', e.target.value)}
                        placeholder="700"
                      />
                    </Field>
                    <ColorPickerField
                      label="Body color"
                      value={String(content.bodyColor || '')}
                      fallback="#5B6472"
                      onChange={(next) => setField('bodyColor', next)}
                    />
                    <Field label="Body font">
                      <select
                        className="admin-select"
                        value={String(content.bodyFont || '')}
                        onChange={(e) => setField('bodyFont', e.target.value)}
                      >
                        <option value="">Default (body)</option>
                        {INDUSTRY_CATEGORY_FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Body size">
                      <input
                        className="admin-input"
                        value={String(content.bodySize || '')}
                        onChange={(e) => setField('bodySize', e.target.value)}
                        placeholder="0.96rem"
                      />
                    </Field>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '1rem',
                    border: '1px solid var(--admin-border, #e5e7eb)',
                    borderRadius: 10,
                    padding: '0.9rem',
                    background: 'var(--admin-muted-bg, #f8fafc)',
                  }}
                >
                  <strong>Accent bar &amp; cards chrome</strong>
                  <div className="admin-form-grid" style={{ marginTop: '0.7rem' }}>
                    <Field label="Show accent bar">
                      <select
                        className="admin-select"
                        value={content.showAccentBar === false ? '0' : '1'}
                        onChange={(e) => setField('showAccentBar', e.target.value === '1')}
                      >
                        <option value="1">Yes</option>
                        <option value="0">No</option>
                      </select>
                    </Field>
                    <ColorPickerField
                      label="Accent bar color"
                      value={String(content.accentBarColor || '')}
                      fallback={String(content.catColor || '#00D4FF')}
                      onChange={(next) => setField('accentBarColor', next)}
                      hint="Defaults to category accent when cleared."
                    />
                    <Field label="Accent bar width">
                      <input
                        className="admin-input"
                        value={String(content.accentBarWidth || '')}
                        onChange={(e) => setField('accentBarWidth', e.target.value)}
                        placeholder="56px"
                      />
                    </Field>
                    <Field label="Accent bar height">
                      <input
                        className="admin-input"
                        value={String(content.accentBarHeight || '')}
                        onChange={(e) => setField('accentBarHeight', e.target.value)}
                        placeholder="4px"
                      />
                    </Field>
                    <ColorPickerField
                      label="Card background"
                      value={String(content.cardBg || '')}
                      fallback="#FFFFFF"
                      onChange={(next) => setField('cardBg', next)}
                    />
                    <ColorPickerField
                      label="Card border color"
                      value={String(content.cardBorderColor || '')}
                      fallback="#E7EBF1"
                      onChange={(next) => setField('cardBorderColor', next)}
                    />
                    <Field label="Card border radius">
                      <input
                        className="admin-input"
                        value={String(content.cardBorderRadius || '')}
                        onChange={(e) => setField('cardBorderRadius', e.target.value)}
                        placeholder="12px"
                      />
                    </Field>
                    <Field label="Card padding">
                      <input
                        className="admin-input"
                        value={String(content.cardPadding || '')}
                        onChange={(e) => setField('cardPadding', e.target.value)}
                        placeholder="1.9rem"
                      />
                    </Field>
                    <Field label="Icon circle size">
                      <input
                        className="admin-input"
                        value={String(content.iconSize || '')}
                        onChange={(e) => setField('iconSize', e.target.value)}
                        placeholder="48px"
                      />
                    </Field>
                    <ColorPickerField
                      label="Card title color"
                      value={String(content.cardTitleColor || '')}
                      fallback="#1E2530"
                      onChange={(next) => setField('cardTitleColor', next)}
                    />
                    <Field label="Card title font">
                      <select
                        className="admin-select"
                        value={String(content.cardTitleFont || '')}
                        onChange={(e) => setField('cardTitleFont', e.target.value)}
                      >
                        <option value="">Default (display)</option>
                        {INDUSTRY_CATEGORY_FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Card title size">
                      <input
                        className="admin-input"
                        value={String(content.cardTitleSize || '')}
                        onChange={(e) => setField('cardTitleSize', e.target.value)}
                        placeholder="1.04rem"
                      />
                    </Field>
                    <ColorPickerField
                      label="Card body color"
                      value={String(content.cardBodyColor || '')}
                      fallback="#5B6472"
                      onChange={(next) => setField('cardBodyColor', next)}
                    />
                    <Field label="Card body font">
                      <select
                        className="admin-select"
                        value={String(content.cardBodyFont || '')}
                        onChange={(e) => setField('cardBodyFont', e.target.value)}
                      >
                        <option value="">Default (body)</option>
                        {INDUSTRY_CATEGORY_FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Card body size">
                      <input
                        className="admin-input"
                        value={String(content.cardBodySize || '')}
                        onChange={(e) => setField('cardBodySize', e.target.value)}
                        placeholder="0.86rem"
                      />
                    </Field>
                  </div>
                </div>

                <div
                  className="full"
                  style={{
                    marginTop: '1rem',
                    border: '1px solid var(--admin-border, #e5e7eb)',
                    borderRadius: 10,
                    padding: '0.9rem',
                    background: 'var(--admin-muted-bg, #f8fafc)',
                  }}
                >
                  <div className="admin-toolbar" style={{ marginBottom: '0.6rem' }}>
                    <div>
                      <strong>Industry detail cards</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--admin-muted)', marginTop: 2 }}>
                        Add, edit, delete, reorder (↑↓), and show/hide any number of idetail-cards.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => setIndustryCards([...industryCards, createIndustryCategoryCard()])}
                    >
                      Add card
                    </button>
                  </div>
                  {industryCards.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-muted)' }}>
                      No cards yet. Add one to populate the idetail-grid.
                    </p>
                  ) : null}
                  {industryCards.map((card, idx) => (
                    <div
                      key={card.id}
                      style={{
                        border: '1px solid var(--admin-border, #e5e7eb)',
                        borderRadius: 8,
                        padding: '0.8rem',
                        marginBottom: '0.7rem',
                        background: card.enabled === false ? '#f1f5f9' : '#fff',
                        opacity: card.enabled === false ? 0.72 : 1,
                      }}
                    >
                      <div className="admin-toolbar" style={{ marginBottom: '0.5rem' }}>
                        <strong>
                          #{idx + 1} · {card.title || 'Untitled'}
                          {card.enabled === false ? ' (hidden)' : ''}
                        </strong>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => moveIndustryCard(card.id, -1)}
                            disabled={idx === 0}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => moveIndustryCard(card.id, 1)}
                            disabled={idx === industryCards.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() =>
                              patchIndustryCard(card.id, { enabled: card.enabled === false })
                            }
                          >
                            {card.enabled === false ? 'Show' : 'Hide'}
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            onClick={() =>
                              setIndustryCards(industryCards.filter((c) => c.id !== card.id))
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="admin-form-grid">
                        <Field label="Title">
                          <input
                            className="admin-input"
                            value={card.title}
                            onChange={(e) => patchIndustryCard(card.id, { title: e.target.value })}
                          />
                        </Field>
                        <div className="admin-field full">
                          <label>Body</label>
                          <textarea
                            className="admin-textarea"
                            style={{ minHeight: 72 }}
                            value={card.body}
                            onChange={(e) => patchIndustryCard(card.id, { body: e.target.value })}
                          />
                        </div>
                        <div className="admin-field full">
                          <label>Icon SVG (inner markup for 24×24 viewBox)</label>
                          <textarea
                            className="admin-textarea"
                            style={{ minHeight: 64, fontFamily: 'var(--admin-mono)' }}
                            value={card.icon || ''}
                            onChange={(e) => patchIndustryCard(card.id, { icon: e.target.value })}
                            placeholder='<path d="M3 21h18…" />'
                          />
                          <small style={{ color: 'var(--admin-muted)' }}>
                            Paths/circles only — the renderer wraps them in an SVG. Leave blank to use a title-matched fallback.
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {section.type === 'why' ? (
              <div
                style={{
                  marginTop: '0.8rem',
                  border: '1px solid var(--admin-border, #e5e7eb)',
                  borderRadius: 10,
                  padding: '0.9rem',
                  background: 'var(--admin-muted-bg, #f8fafc)',
                }}
              >
                <div className="admin-toolbar" style={{ marginBottom: '0.6rem' }}>
                  <div>
                    <strong>Why cards</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--admin-muted)', marginTop: 2 }}>
                      Edit each card and set its background color. Clear uses the tint preset.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => {
                      const i = whyCards.length;
                      setWhyCards([
                        ...whyCards,
                        {
                          index: String(i + 1).padStart(2, '0'),
                          title: 'New reason',
                          desc: 'Describe this differentiator.',
                          tint: `tint-${(i % 6) + 1}`,
                        },
                      ]);
                    }}
                  >
                    Add card
                  </button>
                </div>
                {whyCards.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-muted)' }}>
                    No cards yet. Add one to populate the why-grid.
                  </p>
                ) : null}
                {whyCards.map((card, idx) => (
                  <div
                    key={`why-${idx}-${card.index}`}
                    style={{
                      border: '1px solid var(--admin-border, #e5e7eb)',
                      borderRadius: 8,
                      padding: '0.8rem',
                      marginBottom: '0.7rem',
                      background: '#fff',
                    }}
                  >
                    <div className="admin-toolbar" style={{ marginBottom: '0.5rem' }}>
                      <strong>
                        #{idx + 1} · {card.title || 'Untitled'}
                      </strong>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => moveWhyCard(idx, -1)}
                          disabled={idx === 0}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => moveWhyCard(idx, 1)}
                          disabled={idx === whyCards.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          onClick={() => setWhyCards(whyCards.filter((_, i) => i !== idx))}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <Field label="Index">
                        <input
                          className="admin-input"
                          value={card.index}
                          onChange={(e) => patchWhyCard(idx, { index: e.target.value })}
                        />
                      </Field>
                      <Field label="Title">
                        <input
                          className="admin-input"
                          value={card.title}
                          onChange={(e) => patchWhyCard(idx, { title: e.target.value })}
                        />
                      </Field>
                      <Field label="Tint preset">
                        <select
                          className="admin-select"
                          value={card.tint || 'tint-1'}
                          onChange={(e) => patchWhyCard(idx, { tint: e.target.value })}
                        >
                          <option value="tint-1">tint-1</option>
                          <option value="tint-2">tint-2</option>
                          <option value="tint-3">tint-3</option>
                          <option value="tint-4">tint-4</option>
                          <option value="tint-5">tint-5</option>
                          <option value="tint-6">tint-6</option>
                        </select>
                      </Field>
                      <ColorPickerField
                        label="Card background"
                        value={String(card.bg || '')}
                        fallback={whyCardBgFallback(card)}
                        onChange={(next) => patchWhyCard(idx, { bg: next || undefined })}
                        hint="Overrides tint preset when set."
                      />
                      <div className="admin-field full">
                        <label>Description</label>
                        <textarea
                          className="admin-textarea"
                          style={{ minHeight: 72 }}
                          value={card.desc}
                          onChange={(e) => patchWhyCard(idx, { desc: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {section.type === 'hero' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-toolbar" style={{ marginBottom: '0.6rem' }}>
                  <strong>Hero slides</strong>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() =>
                      setField('slides', [
                        ...slides,
                        {
                          theme: 'theme-legacy',
                          eyebrow: '',
                          title: 'New slide',
                          lead: '',
                          cta: 'Learn more →',
                          ctaHref: '#',
                          tags: [],
                          image: '/assets/images/zigma-technologies-engineers-monitoring-.jpg',
                          imageMobile: '',
                          durationMs: 6000,
                        },
                      ])
                    }
                  >
                    Add slide
                  </button>
                </div>
                {slides.map((slide, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--admin-border, #e5e7eb)',
                      borderRadius: 8,
                      padding: '0.8rem',
                      marginBottom: '0.7rem',
                    }}
                  >
                    <div className="admin-toolbar" style={{ marginBottom: '0.5rem' }}>
                      <strong>Slide {idx + 1}</strong>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() => setField('slides', slides.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="admin-form-grid">
                      <Field label="Theme">
                        <select
                          className="admin-select"
                          value={String(slide.theme || 'theme-legacy')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], theme: e.target.value };
                            setField('slides', next);
                          }}
                        >
                          {['theme-legacy', 'theme-ups', 'theme-solar', 'theme-eng', 'theme-future'].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Eyebrow">
                        <input
                          className="admin-input"
                          value={String(slide.eyebrow || '')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], eyebrow: e.target.value };
                            setField('slides', next);
                          }}
                        />
                      </Field>
                      <Field label="Title">
                        <input
                          className="admin-input"
                          value={String(slide.title || '')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], title: e.target.value };
                            setField('slides', next);
                          }}
                        />
                      </Field>
                      <Field label="CTA label">
                        <input
                          className="admin-input"
                          value={String(slide.cta || '')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], cta: e.target.value };
                            setField('slides', next);
                          }}
                        />
                      </Field>
                      <Field label="CTA href">
                        <input
                          className="admin-input"
                          value={String(slide.ctaHref || '')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], ctaHref: e.target.value };
                            setField('slides', next);
                          }}
                        />
                      </Field>
                      <Field label="Numeral">
                        <input
                          className="admin-input"
                          value={String(slide.numeral || '')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], numeral: e.target.value };
                            setField('slides', next);
                          }}
                        />
                      </Field>
                      <Field label="Duration (ms)">
                        <input
                          className="admin-input"
                          type="number"
                          min={2500}
                          max={30000}
                          step={500}
                          value={Number(slide.durationMs ?? 6000)}
                          onChange={(e) => {
                            const next = [...slides];
                            const raw = Number(e.target.value);
                            const durationMs = Number.isFinite(raw)
                              ? Math.min(30000, Math.max(2500, Math.round(raw)))
                              : 6000;
                            next[idx] = { ...next[idx], durationMs };
                            setField('slides', next);
                          }}
                        />
                      </Field>
                      <div className="admin-field full">
                        <label>Lead</label>
                        <textarea
                          className="admin-textarea"
                          value={String(slide.lead || '')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], lead: e.target.value };
                            setField('slides', next);
                          }}
                        />
                      </div>
                      <div className="full">
                        <MediaPicker
                          value={String(slide.image || '')}
                          onChange={(path) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], image: path };
                            setField('slides', next);
                          }}
                          label="Slide media (desktop)"
                          kinds="visual"
                          allowUpload
                          hint="Any successful media-library upload (image, SVG, or video). Renders full-bleed on desktop and mobile."
                        />
                      </div>
                      <div className="full">
                        <MediaPicker
                          value={String(slide.imageMobile || '')}
                          onChange={(path) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], imageMobile: path };
                            setField('slides', next);
                          }}
                          label="Slide media (mobile, optional)"
                          kinds="visual"
                          allowUpload
                          hint="Optional ≤760px override for tighter crops on phones."
                        />
                      </div>
                      <div className="admin-field full">
                        <label>Tags (comma separated)</label>
                        <input
                          className="admin-input"
                          value={Array.isArray(slide.tags) ? (slide.tags as string[]).join(', ') : ''}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = {
                              ...next[idx],
                              tags: e.target.value
                                .split(',')
                                .map((t) => t.trim())
                                .filter(Boolean),
                            };
                            setField('slides', next);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {section.type === 'industries' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-form-grid">
                  <Field label="Display layout">
                    <select
                      className="admin-input"
                      value={String(content.layout || 'marquee') === 'grid' ? 'grid' : 'marquee'}
                      onChange={(e) => setField('layout', e.target.value)}
                    >
                      <option value="marquee">Rotating marquee</option>
                      <option value="grid">Tabular grid</option>
                    </select>
                  </Field>
                  <Field label="Hub link label">
                    <input
                      className="admin-input"
                      value={String(content.linkLabel || '')}
                      onChange={(e) => setField('linkLabel', e.target.value)}
                      placeholder="See All Industries We Serve →"
                    />
                  </Field>
                  <Field label="Hub link URL">
                    <input
                      className="admin-input"
                      value={String(content.linkHref || '')}
                      onChange={(e) => setField('linkHref', e.target.value)}
                      placeholder="/industries"
                    />
                  </Field>
                </div>
                <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                  <label>Industry labels (one per line)</label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 200 }}
                    value={((content.items as string[]) || []).join('\n')}
                    onChange={(e) =>
                      setField(
                        'items',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                  <small style={{ color: 'var(--admin-muted)' }}>
                    Single-line marquee pauses on hover/keyboard focus and respects reduced-motion.
                  </small>
                </div>
              </div>
            ) : null}

            {section.type === 'industry_hub' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-form-grid">
                  <Field label="Eyebrow class">
                    <input
                      className="admin-input"
                      value={String(content.eyebrowClass || 'eyebrow-cyan')}
                      onChange={(e) => setField('eyebrowClass', e.target.value)}
                    />
                  </Field>
                  <Field label="Show visit tailor bar">
                    <select
                      className="admin-input"
                      value={content.showVisitTailor === false ? 'no' : 'yes'}
                      onChange={(e) => setField('showVisitTailor', e.target.value === 'yes')}
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </Field>
                </div>
                <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                  <label>Industry cards (one per line: key | eyebrow | name | lead | image | href)</label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 220, fontFamily: 'var(--admin-mono)' }}
                    value={((content.cards as Array<Record<string, string>>) || [])
                      .map((c) =>
                        [c.key, c.eyebrow, c.name, c.lead, c.image, c.href]
                          .map((p) => String(p || ''))
                          .join(' | ')
                      )
                      .join('\n')}
                    onChange={(e) =>
                      setField(
                        'cards',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [key, eyebrow, name, lead, image, href] = line
                              .split('|')
                              .map((p) => p.trim());
                            return {
                              key: key || '',
                              eyebrow: eyebrow || '',
                              name: name || key || '',
                              lead: lead || '',
                              image: image || '',
                              href: href || (key ? `/industries/${key}` : '/industries'),
                            };
                          })
                      )
                    }
                  />
                  <small style={{ color: 'var(--admin-muted)' }}>
                    Leave cards empty to fall back to live industry definitions from Site Copy.
                  </small>
                </div>
              </div>
            ) : null}

            {section.type === 'logo_marquee' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>Certificates / brands (one per line: Name | Image URL)</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 220 }}
                  value={((content.items as Array<string | { name: string; image?: string }>) || [])
                    .map((item) =>
                      typeof item === 'string'
                        ? item
                        : item.image
                          ? `${item.name} | ${item.image}`
                          : item.name
                    )
                    .join('\n')}
                  onChange={(e) =>
                    setField(
                      'items',
                      e.target.value
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [name, ...rest] = line.split('|').map((p) => p.trim());
                          const image = rest.join('|').trim();
                          return image ? { name, image } : { name };
                        })
                    )
                  }
                />
                <small style={{ color: 'var(--admin-muted)' }}>
                  Image URL enables click-to-enlarge lightbox on the public page.
                </small>
              </div>
            ) : null}

            {section.type === 'testimonials' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>Testimonials (one per line: Quote | Name | Role)</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 200 }}
                  value={((content.items as Array<{ quote: string; name: string; role?: string }>) || [])
                    .map((t) => `${t.quote} | ${t.name} | ${t.role || ''}`)
                    .join('\n')}
                  onChange={(e) =>
                    setField(
                      'items',
                      e.target.value
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const parts = line.split('|').map((p) => p.trim());
                          return { quote: parts[0] || '', name: parts[1] || '', role: parts[2] || '' };
                        })
                    )
                  }
                />
              </div>
            ) : null}

            {section.type === 'partners' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-field full">
                  <label>Partner note</label>
                  <textarea
                    className="admin-textarea"
                    value={String(content.note || '')}
                    onChange={(e) => setField('note', e.target.value)}
                  />
                </div>
                <div className="admin-field full">
                  <label>Logos (one per line: /path | Alt text)</label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 180 }}
                    value={((content.logos as Array<{ src: string; alt?: string }>) || [])
                      .map((l) => `${l.src} | ${l.alt || ''}`)
                      .join('\n')}
                    onChange={(e) =>
                      setField(
                        'logos',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [src, ...rest] = line.split('|');
                            return { src: src.trim(), alt: rest.join('|').trim() };
                          })
                      )
                    }
                  />
                </div>
              </div>
            ) : null}

            {section.type === 'feature_grid' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-form-grid">
                  <Field label="Tone">
                    <select className="admin-select" value={String(content.tone || 'light')} onChange={(e) => setField('tone', e.target.value)}>
                      <option value="light">light</option>
                      <option value="gray">gray</option>
                      <option value="dark">dark</option>
                    </select>
                  </Field>
                  <Field label="Dark cards">
                    <select
                      className="admin-select"
                      value={content.darkCards ? '1' : '0'}
                      onChange={(e) => setField('darkCards', e.target.value === '1')}
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </Field>
                </div>
                <div
                  className="full"
                  style={{
                    marginTop: '0.9rem',
                    border: '1px solid var(--admin-border, #e5e7eb)',
                    borderRadius: 10,
                    padding: '0.9rem',
                    background: 'var(--admin-muted-bg, #f8fafc)',
                  }}
                >
                  <div className="admin-toolbar" style={{ marginBottom: '0.6rem' }}>
                    <div>
                      <strong>Feature cards</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--admin-muted)', marginTop: 2 }}>
                        Edit each card and set its background color. Clear uses the variant / CSS default.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() =>
                        setFeatureCards([
                          ...featureCards,
                          { title: 'New card', body: 'Describe this feature or request type.' },
                        ])
                      }
                    >
                      Add card
                    </button>
                  </div>
                  {featureCards.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-muted)' }}>
                      No cards yet. Add one to populate the feature grid.
                    </p>
                  ) : null}
                  {featureCards.map((card, idx) => (
                    <div
                      key={`feat-${idx}-${card.title}`}
                      style={{
                        border: '1px solid var(--admin-border, #e5e7eb)',
                        borderRadius: 8,
                        padding: '0.8rem',
                        marginBottom: '0.7rem',
                        background: '#fff',
                      }}
                    >
                      <div className="admin-toolbar" style={{ marginBottom: '0.5rem' }}>
                        <strong>
                          #{idx + 1} · {card.title || 'Untitled'}
                        </strong>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => moveFeatureCard(idx, -1)}
                            disabled={idx === 0}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => moveFeatureCard(idx, 1)}
                            disabled={idx === featureCards.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            onClick={() =>
                              setFeatureCards(featureCards.filter((_, i) => i !== idx))
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="admin-form-grid">
                        <Field label="Title">
                          <input
                            className="admin-input"
                            value={card.title}
                            onChange={(e) => patchFeatureCard(idx, { title: e.target.value })}
                          />
                        </Field>
                        <ColorPickerField
                          label="Card background"
                          value={String(card.bg || '')}
                          fallback={featureCardBgFallback(card)}
                          onChange={(next) => patchFeatureCard(idx, { bg: next || undefined })}
                          hint="Overrides variant tint when set."
                        />
                        <div className="admin-field full">
                          <label>Body</label>
                          <textarea
                            className="admin-textarea"
                            style={{ minHeight: 72 }}
                            value={card.body}
                            onChange={(e) => patchFeatureCard(idx, { body: e.target.value })}
                          />
                        </div>
                        <Field label="Badge (optional)">
                          <input
                            className="admin-input"
                            value={card.badge || ''}
                            onChange={(e) =>
                              patchFeatureCard(idx, { badge: e.target.value || undefined })
                            }
                          />
                        </Field>
                        <Field label="Variant">
                          <select
                            className="admin-select"
                            value={card.variant || ''}
                            onChange={(e) =>
                              patchFeatureCard(idx, { variant: e.target.value || undefined })
                            }
                          >
                            <option value="">default</option>
                            <option value="pastel-green">pastel-green</option>
                            <option value="emergency">emergency</option>
                          </select>
                        </Field>
                        <Field label="Link label">
                          <input
                            className="admin-input"
                            value={card.linkLabel || ''}
                            onChange={(e) =>
                              patchFeatureCard(idx, { linkLabel: e.target.value || undefined })
                            }
                            placeholder="Ask About Solar →"
                          />
                        </Field>
                        <Field label="Link href (or leave blank for subject)">
                          <input
                            className="admin-input"
                            value={card.linkHref || ''}
                            onChange={(e) =>
                              patchFeatureCard(idx, { linkHref: e.target.value || undefined })
                            }
                            placeholder="tel:+91… or /contact"
                          />
                        </Field>
                        <Field label="Contact subject">
                          <input
                            className="admin-input"
                            value={card.subject || ''}
                            onChange={(e) =>
                              patchFeatureCard(idx, { subject: e.target.value || undefined })
                            }
                          />
                        </Field>
                        <div className="admin-field full">
                          <label>Icon SVG (inner markup for 24×24 viewBox)</label>
                          <textarea
                            className="admin-textarea"
                            style={{ minHeight: 64, fontFamily: 'var(--admin-mono)' }}
                            value={card.icon || ''}
                            onChange={(e) =>
                              patchFeatureCard(idx, { icon: e.target.value || undefined })
                            }
                            placeholder='<path d="M3 21h18…" />'
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {section.type === 'rich_text' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>HTML</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 220, fontFamily: 'var(--admin-mono)' }}
                  value={String(content.html || '')}
                  onChange={(e) => setField('html', e.target.value)}
                />
              </div>
            ) : null}

            {section.type === 'comparison_table' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-form-grid">
                  <Field label="Feature column label">
                    <input
                      className="admin-input"
                      value={String(content.featureLabel || 'Capability')}
                      onChange={(e) => setField('featureLabel', e.target.value)}
                    />
                  </Field>
                  <Field label="Tone">
                    <select
                      className="admin-select"
                      value={String(content.tone || 'light')}
                      onChange={(e) => setField('tone', e.target.value)}
                    >
                      <option value="light">Light</option>
                      <option value="gray">Gray</option>
                      <option value="dark">Dark</option>
                    </select>
                  </Field>
                  <Field label="CTA label">
                    <input className="admin-input" value={String(content.cta || '')} onChange={(e) => setField('cta', e.target.value)} />
                  </Field>
                  <Field label="CTA link">
                    <input className="admin-input" value={String(content.ctaHref || '')} onChange={(e) => setField('ctaHref', e.target.value)} />
                  </Field>
                  <div className="admin-field full">
                    <label>CTA note (below button)</label>
                    <input className="admin-input" value={String(content.ctaNote || '')} onChange={(e) => setField('ctaNote', e.target.value)} />
                  </div>
                </div>
                <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                  <label>Columns (one per line: Label | Sub-label | highlight?)</label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 120 }}
                    value={((content.columns as Array<{ label: string; sub?: string; highlight?: boolean }>) || [])
                      .map((c) => `${c.label} | ${c.sub || ''} | ${c.highlight ? 'highlight' : ''}`)
                      .join('\n')}
                    onChange={(e) => {
                      setField(
                        'columns',
                        e.target.value
                          .split('\n')
                          .filter((l) => l.trim())
                          .map((l) => {
                            const [label, sub, hl] = l.split('|').map((s) => s.trim());
                            return { label: label || '', sub: sub || undefined, highlight: hl?.toLowerCase().includes('highlight') };
                          })
                      );
                    }}
                  />
                  <small style={{ color: 'var(--admin-muted)' }}>e.g. "UPS / Power | Protect | highlight"</small>
                </div>
                <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                  <label>Rows (one per line: Group | Feature | val1 | val2 | …) — use "true" / "false" for ✓/✗, or text</label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 240 }}
                    value={((content.rows as Array<{ group?: string; feature: string; values: unknown[] }>) || [])
                      .map((r) => `${r.group || ''} | ${r.feature} | ${(r.values || []).join(' | ')}`)
                      .join('\n')}
                    onChange={(e) => {
                      setField(
                        'rows',
                        e.target.value
                          .split('\n')
                          .filter((l) => l.trim())
                          .map((l) => {
                            const parts = l.split('|').map((s) => s.trim());
                            const group = parts[0] || undefined;
                            const feature = parts[1] || '';
                            const values = parts.slice(2).map((v) => {
                              if (v.toLowerCase() === 'true') return true;
                              if (v.toLowerCase() === 'false') return false;
                              return v || null;
                            });
                            return { group, feature, values };
                          })
                      );
                    }}
                  />
                  <small style={{ color: 'var(--admin-muted)' }}>e.g. "Delivery | Annual Maintenance | true | true | false | true | true"</small>
                </div>
              </div>
            ) : null}

            {section.type === 'projects_teaser' ? (
              <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                <Field label="Limit">
                  <input
                    className="admin-input"
                    type="number"
                    value={Number(content.limit || 3)}
                    onChange={(e) => setField('limit', Number(e.target.value))}
                  />
                </Field>
                <Field label="Featured only">
                  <select
                    className="admin-select"
                    value={content.featuredOnly === false ? '0' : '1'}
                    onChange={(e) => setField('featuredOnly', e.target.value === '1')}
                  >
                    <option value="1">Yes (fallback to latest)</option>
                    <option value="0">No — latest items</option>
                  </select>
                </Field>
                <Field label="CTA label">
                  <input className="admin-input" value={String(content.cta || '')} onChange={(e) => setField('cta', e.target.value)} />
                </Field>
                <Field label="CTA href">
                  <input className="admin-input" value={String(content.ctaHref || '/projects')} onChange={(e) => setField('ctaHref', e.target.value)} />
                </Field>
              </div>
            ) : null}

            {section.type === 'timeline' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div
                  style={{
                    border: '1px solid var(--admin-border, #e5e7eb)',
                    borderRadius: 10,
                    padding: '0.9rem',
                    marginBottom: '1rem',
                    background: 'var(--admin-muted-bg, #f8fafc)',
                  }}
                >
                  <div className="admin-toolbar" style={{ marginBottom: '0.6rem' }}>
                    <div>
                      <strong>CTA buttons</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--admin-muted)', marginTop: 2 }}>
                        One line with left / center / right slots. Each button’s Position places it in that slot.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() =>
                        setTimelineCtas([
                          ...timelineCtas,
                          { label: 'Learn more →', href: '#', position: 'left', color: '' },
                        ])
                      }
                    >
                      Add CTA
                    </button>
                  </div>
                  {timelineCtas.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-muted)' }}>
                      No CTA buttons yet. Add one to show a call-to-action under the timeline.
                    </p>
                  ) : null}
                  {timelineCtas.map((cta, idx) => {
                    const colorValue = /^#[0-9A-Fa-f]{6}$/.test(cta.color || '') ? cta.color! : '#ea580c';
                    return (
                      <div
                        key={idx}
                        style={{
                          border: '1px solid var(--admin-border, #e5e7eb)',
                          borderRadius: 8,
                          padding: '0.8rem',
                          marginBottom: '0.7rem',
                          background: '#fff',
                        }}
                      >
                        <div className="admin-toolbar" style={{ marginBottom: '0.5rem' }}>
                          <strong>CTA {idx + 1}</strong>
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            onClick={() => setTimelineCtas(timelineCtas.filter((_, i) => i !== idx))}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="admin-form-grid">
                          <Field label="Label">
                            <input
                              className="admin-input"
                              value={cta.label || ''}
                              onChange={(e) => {
                                const next = [...timelineCtas];
                                next[idx] = { ...next[idx], label: e.target.value };
                                setTimelineCtas(next);
                              }}
                            />
                          </Field>
                          <Field label="Href">
                            <input
                              className="admin-input"
                              value={cta.href || ''}
                              onChange={(e) => {
                                const next = [...timelineCtas];
                                next[idx] = { ...next[idx], href: e.target.value };
                                setTimelineCtas(next);
                              }}
                              placeholder="/contact"
                            />
                          </Field>
                          <Field label="Position">
                            <select
                              className="admin-select"
                              value={cta.position === 'center' || cta.position === 'right' ? cta.position : 'left'}
                              onChange={(e) => {
                                const next = [...timelineCtas];
                                next[idx] = { ...next[idx], position: e.target.value };
                                setTimelineCtas(next);
                              }}
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </Field>
                          <Field label="Button color">
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input
                                type="color"
                                value={colorValue}
                                onChange={(e) => {
                                  const next = [...timelineCtas];
                                  next[idx] = { ...next[idx], color: e.target.value };
                                  setTimelineCtas(next);
                                }}
                                aria-label={`CTA ${idx + 1} button color`}
                                style={{
                                  width: 44,
                                  height: 34,
                                  padding: 0,
                                  border: '1px solid var(--admin-border)',
                                  borderRadius: 6,
                                  background: 'transparent',
                                }}
                              />
                              <input
                                className="admin-input"
                                value={cta.color || ''}
                                onChange={(e) => {
                                  const next = [...timelineCtas];
                                  next[idx] = { ...next[idx], color: e.target.value };
                                  setTimelineCtas(next);
                                }}
                                placeholder="Theme default (empty)"
                              />
                            </div>
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="admin-field full">
                  <label>Timeline items (one per line: Year | Title | Body | now?)</label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 140 }}
                    value={((content.items as Array<{ year: string; title: string; body: string; now?: boolean; next?: boolean }>) || [])
                      .map((i) => `${i.year} | ${i.title} | ${i.body}${i.now ? ' | now' : i.next ? ' | next' : ''}`)
                      .join('\n')}
                    onChange={(e) =>
                      setField(
                        'items',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const parts = line.split('|').map((p) => p.trim());
                            const flag = (parts[3] || '').toLowerCase();
                            return {
                              year: parts[0] || '',
                              title: parts[1] || '',
                              body: parts[2] || '',
                              now: flag === 'now',
                              next: flag === 'next',
                            };
                          })
                      )
                    }
                  />
                </div>
              </div>
            ) : null}

            {section.type === 'eco' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>Capability groups (block per group: className|dot then items as bullet lines)</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 200, fontFamily: 'var(--admin-mono)' }}
                  value={((content.groups as Array<{ className: string; items: string[]; dot: string }>) || [])
                    .map((g) => `${g.className}|${g.dot}\n${(g.items || []).map((i) => `- ${i}`).join('\n')}`)
                    .join('\n\n')}
                  onChange={(e) => {
                    const blocks = e.target.value.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
                    setField(
                      'groups',
                      blocks.map((block) => {
                        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
                        const [className, dot] = (lines[0] || 'cap-group-orange|dot-orange').split('|');
                        const items = lines
                          .slice(1)
                          .map((l) => l.replace(/^[-*]\s*/, '').trim())
                          .filter(Boolean);
                        return { className: className.trim(), dot: (dot || 'dot-orange').trim(), items };
                      })
                    );
                  }}
                />
              </div>
            ) : null}

            {section.type === 'quick_contact' || section.type === 'culture_stats' || section.type === 'stats' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>
                  {section.type === 'quick_contact'
                    ? 'Items (one per line: Label | Value | href | emergency?)'
                    : section.type === 'stats'
                      ? 'Stats (one per line: Value | Label | optionalSuffix)'
                      : 'Items (one per line: Value | Label)'}
                </label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 160 }}
                  value={
                    section.type === 'quick_contact'
                      ? ((content.items as Array<{ label: string; value: string; href?: string | null; emergency?: boolean }>) || [])
                          .map((i) => `${i.label} | ${i.value} | ${i.href || ''} | ${i.emergency ? 'emergency' : ''}`)
                          .join('\n')
                      : section.type === 'stats'
                        ? ((content.stats as Array<{ value: number | string; label: string; suffix?: string }>) || [])
                            .map((s) => `${s.value} | ${s.label} | ${s.suffix || ''}`)
                            .join('\n')
                        : ((content.items as Array<{ value?: string; label: string }>) || [])
                            .map((i) => `${i.value || ''} | ${i.label || ''}`)
                            .join('\n')
                  }
                  onChange={(e) => {
                    if (section.type === 'quick_contact') {
                      setField(
                        'items',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const parts = line.split('|').map((p) => p.trim());
                            return {
                              label: parts[0] || '',
                              value: parts[1] || '',
                              href: parts[2] || null,
                              emergency: (parts[3] || '').toLowerCase().includes('emergency'),
                            };
                          })
                      );
                    } else if (section.type === 'stats') {
                      setField(
                        'stats',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const parts = line.split('|').map((p) => p.trim());
                            const num = Number(parts[0]);
                            return {
                              value: Number.isFinite(num) ? num : parts[0] || 0,
                              label: parts[1] || '',
                              suffix: parts[2] || undefined,
                            };
                          })
                      );
                    } else {
                      setField(
                        'items',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const parts = line.split('|').map((p) => p.trim());
                            return { value: parts[0] || '', label: parts[1] || '' };
                          })
                      );
                    }
                  }}
                />
              </div>
            ) : null}

            {section.type === 'locations' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div
                  style={{
                    border: '1px solid var(--admin-border, #e5e7eb)',
                    borderRadius: 10,
                    padding: '0.9rem',
                    background: 'var(--admin-muted-bg, #f8fafc)',
                    marginBottom: '0.9rem',
                  }}
                >
                  <strong>Section &amp; map layout</strong>
                  <div className="admin-form-grid" style={{ marginTop: '0.7rem' }}>
                    <Field label="Tone">
                      <select
                        className="admin-select"
                        value={String(content.tone || 'gray')}
                        onChange={(e) => setField('tone', e.target.value)}
                      >
                        <option value="gray">Gray</option>
                        <option value="light">Light</option>
                      </select>
                    </Field>
                    <ColorPickerField
                      label="Section background"
                      value={String(content.sectionBg || '')}
                      fallback={content.tone === 'light' ? '#FFFFFF' : '#F4F6F9'}
                      onChange={(next) => setField('sectionBg', next)}
                      hint="Overrides Tone when set."
                    />
                    <Field label="Layout">
                      <select
                        className="admin-select"
                        value={String(content.layout || 'img-right')}
                        onChange={(e) => setField('layout', e.target.value)}
                      >
                        <option value="img-right">Cards left · Map right</option>
                        <option value="img-left">Map left · Cards right</option>
                      </select>
                    </Field>
                    <Field label="Show map">
                      <select
                        className="admin-select"
                        value={content.showMap === false ? '0' : '1'}
                        onChange={(e) => setField('showMap', e.target.value === '1')}
                      >
                        <option value="1">Show</option>
                        <option value="0">Hide</option>
                      </select>
                    </Field>
                    <Field label="Eyebrow class">
                      <select
                        className="admin-select"
                        value={String(content.eyebrowClass || 'eyebrow-orange')}
                        onChange={(e) => setField('eyebrowClass', e.target.value)}
                      >
                        {LOCATIONS_SECTION_EYEBROW_PRESETS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Section padding (block)">
                      <input
                        className="admin-input"
                        value={String(content.sectionPadding || '')}
                        onChange={(e) => setField('sectionPadding', e.target.value)}
                        placeholder="9rem"
                      />
                    </Field>
                    <Field label="Default map embed URL">
                      <input
                        className="admin-input"
                        value={String(content.mapEmbedUrl || '')}
                        onChange={(e) => setField('mapEmbedUrl', e.target.value)}
                        placeholder="https://www.google.com/maps?q=…&output=embed"
                      />
                    </Field>
                    <Field label="Default map title">
                      <input
                        className="admin-input"
                        value={String(content.mapTitle || '')}
                        onChange={(e) => setField('mapTitle', e.target.value)}
                      />
                    </Field>
                    <Field label="Map min height">
                      <input
                        className="admin-input"
                        value={String(content.mapMinHeight || '')}
                        onChange={(e) => setField('mapMinHeight', e.target.value)}
                        placeholder="460px"
                      />
                    </Field>
                    <Field label="Card list gap">
                      <input
                        className="admin-input"
                        value={String(content.locGridGap || '')}
                        onChange={(e) => setField('locGridGap', e.target.value)}
                        placeholder="1.25rem"
                      />
                    </Field>
                    <Field label="Default directions label">
                      <input
                        className="admin-input"
                        value={String(content.directionsLabel || '')}
                        onChange={(e) => setField('directionsLabel', e.target.value)}
                        placeholder="Get Directions →"
                      />
                    </Field>
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid var(--admin-border, #e5e7eb)',
                    borderRadius: 10,
                    padding: '0.9rem',
                    background: 'var(--admin-muted-bg, #f8fafc)',
                    marginBottom: '0.9rem',
                  }}
                >
                  <strong>Typography &amp; colors</strong>
                  <div className="admin-form-grid" style={{ marginTop: '0.7rem' }}>
                    <ColorPickerField
                      label="Eyebrow color"
                      value={String(content.eyebrowColor || '')}
                      fallback="#FF6B1A"
                      onChange={(next) => setField('eyebrowColor', next)}
                    />
                    <Field label="Eyebrow font">
                      <select
                        className="admin-select"
                        value={String(content.eyebrowFont || '')}
                        onChange={(e) => setField('eyebrowFont', e.target.value)}
                      >
                        <option value="">Default (mono)</option>
                        {LOCATIONS_SECTION_FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Eyebrow size">
                      <input
                        className="admin-input"
                        value={String(content.eyebrowSize || '')}
                        onChange={(e) => setField('eyebrowSize', e.target.value)}
                        placeholder="0.72rem"
                      />
                    </Field>
                    <ColorPickerField
                      label="Title color"
                      value={String(content.titleColor || '')}
                      fallback="#1E2530"
                      onChange={(next) => setField('titleColor', next)}
                    />
                    <Field label="Title font">
                      <select
                        className="admin-select"
                        value={String(content.titleFont || '')}
                        onChange={(e) => setField('titleFont', e.target.value)}
                      >
                        <option value="">Default (display)</option>
                        {LOCATIONS_SECTION_FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Title size">
                      <input
                        className="admin-input"
                        value={String(content.titleSize || '')}
                        onChange={(e) => setField('titleSize', e.target.value)}
                        placeholder="clamp(2.6rem,5vw,4.2rem)"
                      />
                    </Field>
                    <ColorPickerField
                      label="Body color"
                      value={String(content.bodyColor || '')}
                      fallback="#5B6472"
                      onChange={(next) => setField('bodyColor', next)}
                    />
                    <Field label="Body font">
                      <select
                        className="admin-select"
                        value={String(content.bodyFont || '')}
                        onChange={(e) => setField('bodyFont', e.target.value)}
                      >
                        <option value="">Default (body)</option>
                        {LOCATIONS_SECTION_FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Body size">
                      <input
                        className="admin-input"
                        value={String(content.bodySize || '')}
                        onChange={(e) => setField('bodySize', e.target.value)}
                        placeholder="1.02rem"
                      />
                    </Field>
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid var(--admin-border, #e5e7eb)',
                    borderRadius: 10,
                    padding: '0.9rem',
                    background: 'var(--admin-muted-bg, #f8fafc)',
                    marginBottom: '0.9rem',
                  }}
                >
                  <strong>Loc-card style</strong>
                  <div className="admin-form-grid" style={{ marginTop: '0.7rem' }}>
                    <ColorPickerField
                      label="Card background"
                      value={String(content.cardBg || '')}
                      fallback="#FFFFFF"
                      onChange={(next) => setField('cardBg', next)}
                    />
                    <ColorPickerField
                      label="Card border"
                      value={String(content.cardBorderColor || '')}
                      fallback="#E7EBF1"
                      onChange={(next) => setField('cardBorderColor', next)}
                    />
                    <ColorPickerField
                      label="Active / hover border"
                      value={String(content.cardActiveBorderColor || '')}
                      fallback="#FF6B1A"
                      onChange={(next) => setField('cardActiveBorderColor', next)}
                      hint="Matches HTML .loc-card:hover / .map-active orange border."
                    />
                    <Field label="Card radius">
                      <input
                        className="admin-input"
                        value={String(content.cardBorderRadius || '')}
                        onChange={(e) => setField('cardBorderRadius', e.target.value)}
                        placeholder="10px"
                      />
                    </Field>
                    <Field label="Card padding">
                      <input
                        className="admin-input"
                        value={String(content.cardPadding || '')}
                        onChange={(e) => setField('cardPadding', e.target.value)}
                        placeholder="1.6rem 1.7rem"
                      />
                    </Field>
                    <ColorPickerField
                      label="Icon background"
                      value={String(content.iconBg || '')}
                      fallback="#0A1628"
                      onChange={(next) => setField('iconBg', next)}
                    />
                    <ColorPickerField
                      label="Icon color"
                      value={String(content.iconColor || '')}
                      fallback="#00D4FF"
                      onChange={(next) => setField('iconColor', next)}
                    />
                    <Field label="Icon size">
                      <input
                        className="admin-input"
                        value={String(content.iconSize || '')}
                        onChange={(e) => setField('iconSize', e.target.value)}
                        placeholder="40px"
                      />
                    </Field>
                    <ColorPickerField
                      label="Tag color"
                      value={String(content.tagColor || '')}
                      fallback="#FF6B1A"
                      onChange={(next) => setField('tagColor', next)}
                    />
                    <ColorPickerField
                      label="Tag border"
                      value={String(content.tagBorderColor || '')}
                      fallback="#FFB48A"
                      onChange={(next) => setField('tagBorderColor', next)}
                    />
                  </div>
                </div>

                <div
                  className="full"
                  style={{
                    border: '1px solid var(--admin-border, #e5e7eb)',
                    borderRadius: 10,
                    padding: '0.9rem',
                    background: 'var(--admin-muted-bg, #f8fafc)',
                  }}
                >
                  <div className="admin-toolbar" style={{ marginBottom: '0.6rem' }}>
                    <div>
                      <strong>Office location cards</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--admin-muted)', marginTop: 2 }}>
                        Add, edit, delete, reorder (↑↓), and show/hide. Hovering a card with a map URL
                        previews that pin on the map (HTML parity).
                      </div>
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => setLocationCards([...locationCards, createLocationOfficeCard()])}
                    >
                      Add location
                    </button>
                  </div>
                  {locationCards.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-muted)' }}>
                      No locations yet. Add one to populate the loc-grid.
                    </p>
                  ) : null}
                  {locationCards.map((card, idx) => (
                    <div
                      key={card.id}
                      style={{
                        border: '1px solid var(--admin-border, #e5e7eb)',
                        borderRadius: 8,
                        padding: '0.8rem',
                        marginBottom: '0.7rem',
                        background: card.enabled === false ? '#f1f5f9' : '#fff',
                        opacity: card.enabled === false ? 0.72 : 1,
                      }}
                    >
                      <div className="admin-toolbar" style={{ marginBottom: '0.5rem' }}>
                        <strong>
                          #{idx + 1} · {card.title || 'Untitled'}
                          {card.enabled === false ? ' (hidden)' : ''}
                          {card.isDefault ? ' · default map' : ''}
                        </strong>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => moveLocationCard(card.id, -1)}
                            disabled={idx === 0}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => moveLocationCard(card.id, 1)}
                            disabled={idx === locationCards.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() =>
                              patchLocationCard(card.id, { enabled: card.enabled === false })
                            }
                          >
                            {card.enabled === false ? 'Show' : 'Hide'}
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => patchLocationCard(card.id, { isDefault: !card.isDefault })}
                          >
                            {card.isDefault ? 'Unset default' : 'Set default map'}
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            onClick={() =>
                              setLocationCards(locationCards.filter((c) => c.id !== card.id))
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="admin-form-grid">
                        <Field label="Tag">
                          <input
                            className="admin-input"
                            value={card.tag || ''}
                            onChange={(e) => patchLocationCard(card.id, { tag: e.target.value })}
                            placeholder="Head Office"
                          />
                        </Field>
                        <Field label="Title">
                          <input
                            className="admin-input"
                            value={card.title}
                            onChange={(e) => patchLocationCard(card.id, { title: e.target.value })}
                          />
                        </Field>
                        <div className="admin-field full">
                          <label>Address</label>
                          <textarea
                            className="admin-textarea"
                            style={{ minHeight: 64 }}
                            value={card.address}
                            onChange={(e) => patchLocationCard(card.id, { address: e.target.value })}
                          />
                        </div>
                        <Field label="Phone label">
                          <input
                            className="admin-input"
                            value={card.phone || ''}
                            onChange={(e) => patchLocationCard(card.id, { phone: e.target.value })}
                          />
                        </Field>
                        <Field label="Phone href">
                          <input
                            className="admin-input"
                            value={card.phoneHref || ''}
                            onChange={(e) => patchLocationCard(card.id, { phoneHref: e.target.value })}
                            placeholder="tel:+919590137666"
                          />
                        </Field>
                        <Field label="Directions URL">
                          <input
                            className="admin-input"
                            value={card.directionsUrl || ''}
                            onChange={(e) =>
                              patchLocationCard(card.id, { directionsUrl: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Directions label">
                          <input
                            className="admin-input"
                            value={card.directionsLabel || ''}
                            onChange={(e) =>
                              patchLocationCard(card.id, { directionsLabel: e.target.value })
                            }
                            placeholder="Get Directions →"
                          />
                        </Field>
                        <Field label="Map embed URL (hover preview)">
                          <input
                            className="admin-input"
                            value={card.mapEmbedUrl || ''}
                            onChange={(e) =>
                              patchLocationCard(card.id, { mapEmbedUrl: e.target.value })
                            }
                            placeholder="https://www.google.com/maps?q=lat,lng&z=16&output=embed"
                          />
                        </Field>
                        <Field label="Map title">
                          <input
                            className="admin-input"
                            value={card.mapTitle || ''}
                            onChange={(e) => patchLocationCard(card.id, { mapTitle: e.target.value })}
                          />
                        </Field>
                        <div className="admin-field full">
                          <label>Icon SVG (inner markup for 24×24 viewBox)</label>
                          <textarea
                            className="admin-textarea"
                            style={{ minHeight: 64, fontFamily: 'var(--admin-mono)' }}
                            value={card.icon || ''}
                            onChange={(e) => patchLocationCard(card.id, { icon: e.target.value })}
                            placeholder='<path d="M21 10c0 7-9 13…" />'
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {section.type === 'job_list' ? (
              <div
                style={{
                  marginTop: '0.8rem',
                  border: '1px solid var(--admin-border, #e5e7eb)',
                  borderRadius: 10,
                  padding: '0.9rem',
                  background: 'var(--admin-muted-bg, #f8fafc)',
                }}
              >
                <div className="admin-toolbar" style={{ marginBottom: '0.6rem' }}>
                  <div>
                    <strong>Job cards</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--admin-muted)', marginTop: 2 }}>
                      Edit each opening and set its background color. Clear uses the default white card.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() =>
                      setJobCards([
                        ...jobCards,
                        {
                          title: 'New role',
                          department: 'Engineering',
                          location: 'Bengaluru',
                          type: 'Full-Time',
                        },
                      ])
                    }
                  >
                    Add job
                  </button>
                </div>
                {jobCards.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-muted)' }}>
                    No jobs yet. Add one to populate the openings list.
                  </p>
                ) : null}
                {jobCards.map((job, idx) => (
                  <div
                    key={`job-${idx}-${job.title}`}
                    style={{
                      border: '1px solid var(--admin-border, #e5e7eb)',
                      borderRadius: 8,
                      padding: '0.8rem',
                      marginBottom: '0.7rem',
                      background: '#fff',
                    }}
                  >
                    <div className="admin-toolbar" style={{ marginBottom: '0.5rem' }}>
                      <strong>
                        #{idx + 1} · {job.title || 'Untitled'}
                      </strong>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => moveJobCard(idx, -1)}
                          disabled={idx === 0}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => moveJobCard(idx, 1)}
                          disabled={idx === jobCards.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          onClick={() => setJobCards(jobCards.filter((_, i) => i !== idx))}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <Field label="Title">
                        <input
                          className="admin-input"
                          value={job.title}
                          onChange={(e) => patchJobCard(idx, { title: e.target.value })}
                        />
                      </Field>
                      <ColorPickerField
                        label="Card background"
                        value={String(job.bg || '')}
                        fallback="#FFFFFF"
                        onChange={(next) => patchJobCard(idx, { bg: next || undefined })}
                        hint="Overrides the default white job card when set."
                      />
                      <Field label="Department">
                        <input
                          className="admin-input"
                          value={job.department || ''}
                          onChange={(e) =>
                            patchJobCard(idx, { department: e.target.value || undefined })
                          }
                        />
                      </Field>
                      <Field label="Location">
                        <input
                          className="admin-input"
                          value={job.location || ''}
                          onChange={(e) =>
                            patchJobCard(idx, { location: e.target.value || undefined })
                          }
                        />
                      </Field>
                      <Field label="Type">
                        <input
                          className="admin-input"
                          value={job.type || ''}
                          onChange={(e) => patchJobCard(idx, { type: e.target.value || undefined })}
                          placeholder="Full-Time"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {section.type === 'internship' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-form-grid">
                  <Field label="Card title">
                    <input
                      className="admin-input"
                      value={String(content.cardTitle || '')}
                      onChange={(e) => setField('cardTitle', e.target.value)}
                    />
                  </Field>
                  <Field label="CTA label">
                    <input className="admin-input" value={String(content.cta || '')} onChange={(e) => setField('cta', e.target.value)} />
                  </Field>
                  <Field label="Apply role (prefill)">
                    <input
                      className="admin-input"
                      value={String(content.applyRole || '')}
                      onChange={(e) => setField('applyRole', e.target.value)}
                    />
                  </Field>
                  <div className="admin-field full">
                    <label>Card body</label>
                    <textarea
                      className="admin-textarea"
                      value={String(content.cardBody || '')}
                      onChange={(e) => setField('cardBody', e.target.value)}
                    />
                  </div>
                  <div className="admin-field full">
                    <label>Points (one per line: Label | Value)</label>
                    <textarea
                      className="admin-textarea"
                      value={((content.points as Array<{ label: string; value: string }>) || [])
                        .map((p) => `${p.label} | ${p.value}`)
                        .join('\n')}
                      onChange={(e) =>
                        setField(
                          'points',
                          e.target.value
                            .split('\n')
                            .map((l) => l.trim())
                            .filter(Boolean)
                            .map((line) => {
                              const parts = line.split('|').map((p) => p.trim());
                              return { label: parts[0] || '', value: parts[1] || '' };
                            })
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {section.type === 'careers_apply' || section.type === 'enquiry_form' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-form-grid">
                  <Field label="Form title">
                    <input
                      className="admin-input"
                      value={String(content.formTitle || '')}
                      onChange={(e) => setField('formTitle', e.target.value)}
                    />
                  </Field>
                  <Field label="Submit label">
                    <input
                      className="admin-input"
                      value={String(content.submitLabel || '')}
                      onChange={(e) => setField('submitLabel', e.target.value)}
                    />
                  </Field>
                  <div className="admin-field full">
                    <label>Form intro</label>
                    <textarea
                      className="admin-textarea"
                      value={String(content.formIntro || '')}
                      onChange={(e) => setField('formIntro', e.target.value)}
                    />
                  </div>
                  <div className="admin-field full">
                    <label>Privacy note</label>
                    <textarea
                      className="admin-textarea"
                      value={String(content.privacyNote || '')}
                      onChange={(e) => setField('privacyNote', e.target.value)}
                    />
                  </div>
                  <Field label="Success title">
                    <input
                      className="admin-input"
                      value={String(content.successTitle || '')}
                      onChange={(e) => setField('successTitle', e.target.value)}
                    />
                  </Field>
                  <div className="admin-field full">
                    <label>Success body</label>
                    <textarea
                      className="admin-textarea"
                      value={String(content.successBody || '')}
                      onChange={(e) => setField('successBody', e.target.value)}
                    />
                  </div>
                  <Field label="Side title">
                    <input
                      className="admin-input"
                      value={String(content.sideTitle || '')}
                      onChange={(e) => setField('sideTitle', e.target.value)}
                    />
                  </Field>
                  <div className="admin-field full">
                    <label>Side items (one per line: Label | Value | href)</label>
                    <textarea
                      className="admin-textarea"
                      value={((content.sideItems as Array<{ label: string; value: string; href?: string }>) || [])
                        .map((i) => `${i.label} | ${i.value} | ${i.href || ''}`)
                        .join('\n')}
                      onChange={(e) => {
                        const prev = (content.sideItems as Array<{ icon?: string }>) || [];
                        setField(
                          'sideItems',
                          e.target.value
                            .split('\n')
                            .map((l) => l.trim())
                            .filter(Boolean)
                            .map((line, idx) => {
                              const parts = line.split('|').map((p) => p.trim());
                              return {
                                label: parts[0] || '',
                                value: parts[1] || '',
                                href: parts[2] || undefined,
                                icon: prev[idx]?.icon,
                              };
                            })
                        );
                      }}
                    />
                  </div>
                </div>
                {section.type === 'careers_apply' ? (
                  <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                    <Field label="Next steps title">
                      <input
                        className="admin-input"
                        value={String(content.nextTitle || '')}
                        onChange={(e) => setField('nextTitle', e.target.value)}
                      />
                    </Field>
                    <div className="admin-field full">
                      <label>Next steps (one per line)</label>
                      <textarea
                        className="admin-textarea"
                        value={((content.nextSteps as Array<{ text: string }>) || []).map((s) => s.text).join('\n')}
                        onChange={(e) =>
                          setField(
                            'nextSteps',
                            e.target.value
                              .split('\n')
                              .map((l) => l.trim())
                              .filter(Boolean)
                              .map((text) => ({ text }))
                          )
                        }
                      />
                    </div>
                    <div className="admin-field full">
                      <label>Role options (one per line)</label>
                      <textarea
                        className="admin-textarea"
                        value={((content.roles as string[]) || []).join('\n')}
                        onChange={(e) =>
                          setField(
                            'roles',
                            e.target.value
                              .split('\n')
                              .map((l) => l.trim())
                              .filter(Boolean)
                          )
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                    <Field label="Hours title">
                      <input
                        className="admin-input"
                        value={String(content.hoursTitle || '')}
                        onChange={(e) => setField('hoursTitle', e.target.value)}
                      />
                    </Field>
                    <div className="admin-field full">
                      <label>Hours (one per line: Label | Value)</label>
                      <textarea
                        className="admin-textarea"
                        value={((content.hours as Array<{ label: string; value: string }>) || [])
                          .map((h) => `${h.label} | ${h.value}`)
                          .join('\n')}
                        onChange={(e) =>
                          setField(
                            'hours',
                            e.target.value
                              .split('\n')
                              .map((l) => l.trim())
                              .filter(Boolean)
                              .map((line) => {
                                const parts = line.split('|').map((p) => p.trim());
                                return { label: parts[0] || '', value: parts[1] || '' };
                              })
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </form>
    </div>,
    document.body
  );
}
