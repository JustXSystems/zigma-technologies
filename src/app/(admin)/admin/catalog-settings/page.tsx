'use client';

import { FormEvent, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CatalogCategory, CatalogItemType, CatalogPageSettings } from '@/lib/types';
import {
  slugify,
  CARD_MEDIA_INSET_OPTIONS,
  CATALOG_DETAIL_ELEMENT_OPTIONS,
  CATALOG_DETAIL_LAYOUT_OPTIONS,
  CATALOG_DETAIL_TEMPLATE_OPTIONS,
  CATALOG_SHADOW_STYLE_OPTIONS,
  DEFAULT_CARD_MEDIA_FIT_PERCENT,
  DEFAULT_CARD_MEDIA_INSET,
  DEFAULT_DETAIL_ELEMENTS,
  DEFAULT_DETAIL_GALLERY_SHADOW,
  DEFAULT_DETAIL_LAYOUT,
  DEFAULT_DETAIL_TEMPLATE,
  normalizeCardMediaFitPercent,
  normalizeCardMediaInset,
  normalizeDetailElements,
  normalizeDetailLayout,
  normalizeDetailTemplate,
  normalizeShadowStyle,
} from '@/lib/types';
import {
  DEFAULT_HERO_ELEMENTS,
  DEFAULT_TOOLBAR_ELEMENTS,
  resolveDetailElements,
  resolveHeroElements,
  resolveToolbarElements,
} from '@/lib/catalog-page-elements';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import {
  CATALOG_SETTINGS_BLOCKS,
  CATALOG_SETTINGS_PAGE_INTRO,
  CATALOG_SETTINGS_SECTIONS,
  FILTER_LABELS,
  HERO_ELEMENT_LABELS,
  SEARCH_FIELD_LABELS,
  TOOLBAR_ELEMENT_LABELS,
  type SettingsGuide,
  type SettingsSectionId,
} from '@/lib/admin-catalog-settings-guides';

const TYPES: CatalogItemType[] = ['product', 'project', 'service'];
type SettingsSection = SettingsSectionId;

const FILTER_OPTS = ['category', 'tags'] as const;
const SEARCH_OPTS = ['title', 'summary', 'description', 'tags', 'price_label'] as const;
const DEFAULT_CARD_FIELDS = [
  'title',
  'summary',
  'category',
  'primary_image',
  'background_image',
  'price_label',
  'quick_view',
  'case_study_link',
] as const;
const CARD_FIELDS_V2 = 'card_fields_v2';
const CARD_FIELD_OPTS: Array<{ id: string; label: string; group: 'media' | 'body' }> = [
  { id: 'primary_image', label: 'Product image', group: 'media' },
  { id: 'background_image', label: 'Background image', group: 'media' },
  { id: 'category', label: 'Category', group: 'body' },
  { id: 'title', label: 'Title', group: 'body' },
  { id: 'price_label', label: 'Price / stat', group: 'body' },
  { id: 'summary', label: 'Description', group: 'body' },
  { id: 'tags', label: 'Tags', group: 'body' },
  { id: 'availability_label', label: 'Availability', group: 'body' },
  { id: 'lead_time_label', label: 'Lead time', group: 'body' },
  { id: 'quick_view', label: 'Quick view', group: 'body' },
  { id: 'case_study_link', label: 'Detail page link', group: 'body' },
];

function normalizeAdminCardFields(fields: string[] | null | undefined): string[] {
  if (!fields?.length) return [...DEFAULT_CARD_FIELDS];
  const cleaned = fields.filter((f) => f !== CARD_FIELDS_V2);
  if (fields.includes(CARD_FIELDS_V2) || cleaned.includes('background_image')) return cleaned;
  const next = [...cleaned];
  const idx = next.indexOf('primary_image');
  if (idx >= 0) next.splice(idx + 1, 0, 'background_image');
  else next.push('background_image');
  return next;
}
const MODAL_OPTS = ['title', 'summary', 'description', 'category', 'price_label', 'tags', 'specs', 'media', 'enquiry'] as const;
const VISUAL_STYLE_OPTS = ['classic', 'premium', 'glass', 'minimal', 'bold-corporate'] as const;
const HERO_VARIANT_OPTS = ['standard', 'spotlight'] as const;
const HERO_ELEMENT_OPTS = DEFAULT_HERO_ELEMENTS;
const TOOLBAR_ELEMENT_OPTS = DEFAULT_TOOLBAR_ELEMENTS;

function toggleInList(list: string[] | null | undefined, value: string, on: boolean) {
  const base = [...(list || [])];
  if (on) {
    if (!base.includes(value)) base.push(value);
  } else {
    return base.filter((v) => v !== value);
  }
  return base;
}

function HelpTip({
  guide,
  text,
  label = 'Help',
  align = 'start',
}: {
  guide?: SettingsGuide;
  text?: string;
  label?: string;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!guide && !text) return null;

  return (
    <span
      ref={rootRef}
      className={`admin-help${align === 'end' ? ' admin-help--end' : ''}${open ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="admin-help-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={tipId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10.5V17" />
          <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open ? (
        <div id={tipId} className="admin-help-panel" role="note">
          {guide ? (
            <>
              <p>
                <span className="admin-help-kicker">Purpose</span>
                {guide.purpose}
              </p>
              <p>
                <span className="admin-help-kicker">When</span>
                {guide.when}
              </p>
              <p>
                <span className="admin-help-kicker">How</span>
                {guide.how}
              </p>
              {guide.tip ? (
                <p>
                  <span className="admin-help-kicker admin-help-kicker--tip">Tip</span>
                  {guide.tip}
                </p>
              ) : null}
            </>
          ) : (
            <p>{text}</p>
          )}
        </div>
      ) : null}
    </span>
  );
}

function LabelWithHelp({
  children,
  help,
  htmlFor,
}: {
  children: ReactNode;
  help?: string;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor}>
      {children}
      {help ? <HelpTip text={help} label={`Help: ${typeof children === 'string' ? children : 'field'}`} /> : null}
    </label>
  );
}

function sectionMeta(id: SettingsSection) {
  return CATALOG_SETTINGS_SECTIONS.find((s) => s.id === id)!;
}

function SettingsBlock({
  blockId,
  children,
}: {
  blockId: keyof typeof CATALOG_SETTINGS_BLOCKS;
  children: ReactNode;
}) {
  const block = CATALOG_SETTINGS_BLOCKS[blockId];
  return (
    <div className="admin-settings-section">
      <div className="admin-help-title-row">
        <h3 className="admin-settings-section-title">{block.title}</h3>
        <HelpTip guide={block.guide} label={`Help: ${block.title}`} />
      </div>
      {children}
    </div>
  );
}

function ChipGroup({
  label,
  options,
  values,
  onChange,
  optionLabels,
  hint,
}: {
  label: string;
  options: readonly string[];
  values: string[] | null | undefined;
  onChange: (next: string[]) => void;
  optionLabels?: Record<string, string>;
  hint?: string;
}) {
  const set = new Set(values || []);
  return (
    <div className="admin-field full">
      <LabelWithHelp help={hint}>{label}</LabelWithHelp>
      <div className="admin-chips" style={{ marginTop: '0.45rem' }}>
        {options.map((opt) => (
          <label key={opt} className={`admin-chip${set.has(opt) ? ' is-on' : ''}`}>
            <input
              type="checkbox"
              checked={set.has(opt)}
              onChange={(e) => onChange(toggleInList(values, opt, e.target.checked))}
            />
            {optionLabels?.[opt] || opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function ToggleChips({
  label,
  items,
  values,
  onToggle,
}: {
  label: string;
  items: Array<{ id: string; label: string }>;
  values: Set<string>;
  onToggle: (id: string, on: boolean) => void;
}) {
  return (
    <div className="admin-chip-group">
      <div className="admin-chip-group-label">{label}</div>
      <div className="admin-chips">
        {items.map((opt) => (
          <label key={opt.id} className={`admin-chip${values.has(opt.id) ? ' is-on' : ''}`}>
            <input
              type="checkbox"
              checked={values.has(opt.id)}
              onChange={(e) => onToggle(opt.id, e.target.checked)}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
  hint,
}: {
  label: string;
  value: string | null | undefined;
  fallback: string;
  onChange: (next: string) => void;
  hint?: string;
}) {
  const hex = /^#[0-9A-Fa-f]{6}$/.test(value || '') ? value! : fallback;
  return (
    <div className="admin-field">
      <LabelWithHelp help={hint}>{label}</LabelWithHelp>
      <div className="admin-color-field">
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        <input className="admin-input" value={value || fallback} onChange={(e) => onChange(e.target.value)} placeholder={fallback} />
      </div>
    </div>
  );
}

function CardFieldsChecklist({
  values,
  onChange,
}: {
  values: string[] | null | undefined;
  onChange: (next: string[]) => void;
}) {
  const set = new Set(values || []);
  const media = CARD_FIELD_OPTS.filter((o) => o.group === 'media');
  const body = CARD_FIELD_OPTS.filter((o) => o.group === 'body');

  function renderGroup(title: string, opts: typeof CARD_FIELD_OPTS) {
    return (
      <div className="admin-chip-group">
        <div className="admin-chip-group-label">{title}</div>
        <div className="admin-chips">
          {opts.map((opt) => (
            <label key={opt.id} className={`admin-chip${set.has(opt.id) ? ' is-on' : ''}`} title={opt.label}>
              <input
                type="checkbox"
                checked={set.has(opt.id)}
                onChange={(e) => onChange(toggleInList(values, opt.id, e.target.checked))}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-field full">
      <LabelWithHelp help="Choose which fields appear on each listing card. Keep Product image + Title + one CTA as a minimum.">
        Catalog card fields
      </LabelWithHelp>
      <div style={{ display: 'grid', gap: '0.65rem', marginTop: '0.35rem' }}>
        {renderGroup('Media', media)}
        {renderGroup('Card body', body)}
      </div>
    </div>
  );
}

function CatalogAppearancePreview({
  type,
  settings,
  items,
}: {
  type: CatalogItemType;
  settings: CatalogPageSettings;
  items: Array<{ id: number; title: string; status: string; featured: number; primary_image?: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const selectedIds = settings.hero_item_ids_json || [];
  const orderedSelected = selectedIds
    .map((id) => items.find((item) => item.id === id))
    .filter(Boolean) as Array<{ id: number; title: string; status: string; featured: number; primary_image?: string | null }>;
  const previewItems = (orderedSelected.length ? orderedSelected : items).slice(0, 2);
  const active = previewItems[0];
  const heroEls = new Set(resolveHeroElements(settings));
  const variant = settings.hero_variant;
  const showFeaturedPanel =
    variant === 'standard' ? heroEls.has('standard_panel') : heroEls.has('spotlight');

  if (!active) {
    return (
      <div className="admin-field full">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <label style={{ margin: 0 }}>Live preview</label>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide' : 'Show'}
          </button>
        </div>
        {open ? (
          <div className="admin-empty" style={{ marginTop: '0.65rem' }}>
            Create or seed some {type}s to preview the selected style.
          </div>
        ) : (
          <p style={{ margin: '0.45rem 0 0', fontSize: '0.78rem', color: 'var(--admin-muted)' }}>
            Hidden by default — open to preview hero and card styling.
          </p>
        )}
      </div>
    );
  }

  const featuredBody = (
    <>
      {heroEls.has('kicker') || heroEls.has('price') ? (
        <div className="catalog-hero-spotlight-top">
          {heroEls.has('kicker') ? <span className="catalog-hero-kicker">{type}</span> : <span />}
          {heroEls.has('price') ? <span className="catalog-hero-price">Preview</span> : null}
        </div>
      ) : null}
      <h2>{active.title}</h2>
      <p>
        {variant === 'spotlight'
          ? 'Premium spotlight card showing how the active catalog item will be framed on the public page.'
          : 'Previewing the standard hero variant with compact active-item messaging.'}
      </p>
      {heroEls.has('tags') ? (
        <div className="catalog-hero-tags">
          <span className="catalog-hero-tag">interactive</span>
          <span className="catalog-hero-tag">premium</span>
        </div>
      ) : null}
      {heroEls.has('actions') ? (
        <div className="catalog-hero-actions">
          <span className="btn btn-primary">{variant === 'spotlight' ? 'View spotlight' : 'View details'}</span>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="admin-field full">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <label style={{ margin: 0 }}>Live preview</label>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
      {!open ? (
        <p style={{ margin: '0.45rem 0 0', fontSize: '0.78rem', color: 'var(--admin-muted)' }}>
          Hidden by default — open to preview hero and card styling.
        </p>
      ) : (
      <div
        className={`catalog-page catalog-style-${settings.visual_style} ${
          settings.premium_borders_enabled ? 'catalog-premium-borders' : ''
        }`}
        style={{
          border: '1px solid var(--admin-border)',
          borderRadius: 16,
          overflow: 'hidden',
          background: '#eef2f6',
          marginTop: '0.65rem',
        }}
      >
        <div
          className={`page-hero catalog-hero catalog-hero--${settings.hero_variant}`}
          style={{ minHeight: 360, padding: '4rem 1.25rem 1.5rem', position: 'relative' }}
        >
          <div className="hero-bg catalog-hero-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.primary_image || '/assets/images/engineers-reviewing-electrical-design-dr.jpg'} alt="" />
            <div className="hero-overlay"></div>
            <div className="grid-overlay"></div>
            <div className="catalog-hero-tint"></div>
          </div>
          <div
            className={`container catalog-hero-layout ${
              settings.hero_variant === 'standard' ? 'catalog-hero-layout--standard' : ''
            }`}
            style={{ padding: 0 }}
          >
            <div className="catalog-hero-copy">
              {heroEls.has('eyebrow') ? (
                <div className="eyebrow">{settings.hero_eyebrow || `${type} spotlight`}</div>
              ) : null}
              {heroEls.has('title') ? (
                <h1 style={{ maxWidth: 480, marginBottom: '0.6rem' }}>{settings.hero_title || `Preview /${type}s`}</h1>
              ) : null}
              {heroEls.has('lead') ? (
                <p className="lead" style={{ maxWidth: 480, marginTop: 0 }}>
                  {settings.hero_lead || 'Curated hero presentation with controlled visual presets.'}
                </p>
              ) : null}
              {heroEls.has('meta') ? (
                <div className="catalog-hero-meta">
                  <span>{settings.visual_style}</span>
                  <span>{settings.hero_variant}</span>
                  <span>{settings.loading_skeleton_enabled ? 'skeleton on' : 'skeleton off'}</span>
                </div>
              ) : null}
              {variant === 'standard' && showFeaturedPanel ? (
                <div className="catalog-hero-standard-panel">{featuredBody}</div>
              ) : null}
              {heroEls.has('dots') && variant === 'standard' ? (
                <div className="catalog-hero-standard-dots" aria-hidden="true">
                  <button type="button" className="active" />
                  <button type="button" />
                </div>
              ) : null}
            </div>
            {variant === 'spotlight' && showFeaturedPanel ? (
              <div className="catalog-hero-spotlight">
                {featuredBody}
                {heroEls.has('dots') ? (
                  <div className="catalog-hero-dots" aria-hidden="true">
                    <button type="button" className="active" />
                    <button type="button" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ padding: '1rem 1.25rem 1.25rem', background: '#f5f7fb' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
            {previewItems.map((item) => (
              <div key={item.id} className="proj-card" style={{ background: 'transparent' }}>
                <div className="proj-media">
                  {item.primary_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.primary_image} alt={item.title} />
                  ) : null}
                  <span className="tag">{type}</span>
                </div>
                <div className="proj-body">
                  <h5>{item.title}</h5>
                  <p>{item.featured ? 'Featured sample item in the current preset.' : 'Sample item card preview.'}</p>
                  <span className="link">View details →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default function CatalogSettingsPage() {
  const [type, setType] = useState<CatalogItemType>('product');
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [items, setItems] = useState<Array<{ id: number; title: string; status: string; featured: number; primary_image?: string | null }>>(
    []
  );
  const [settings, setSettings] = useState<CatalogPageSettings | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<SettingsSection>('hero');
  const previewSettings = useMemo(() => settings, [settings]);

  async function load() {
    const [catsRes, settingsRes, itemsRes] = await Promise.all([
      fetch(`/api/admin/categories?type=${type}`),
      fetch(`/api/admin/catalog-settings?type=${type}`),
      fetch(`/api/admin/catalog?type=${type}`),
    ]);
    const catsData = await catsRes.json();
    const settingsData = await settingsRes.json();
    const itemsData = await itemsRes.json();
    if (!catsRes.ok) throw new Error(catsData.error || 'Failed categories');
    if (!settingsRes.ok) throw new Error(settingsData.error || 'Failed settings');
    if (!itemsRes.ok) throw new Error(itemsData.error || 'Failed items');
    setCategories(catsData.categories);
    setSettings({
      ...settingsData.settings,
      card_style: settingsData.settings?.card_style || 'marketplace',
      card_body_bg_color: settingsData.settings?.card_body_bg_color || '#ffffff',
      card_media_bg_color: settingsData.settings?.card_media_bg_color || '#ffffff',
      listing_bg_color: settingsData.settings?.listing_bg_color || '#ffffff',
      marketplace_hover_border_color: settingsData.settings?.marketplace_hover_border_color || '#FF6B1A',
      card_media_fit_percent: normalizeCardMediaFitPercent(settingsData.settings?.card_media_fit_percent),
      card_media_inset: normalizeCardMediaInset(settingsData.settings?.card_media_inset),
      detail_layout: normalizeDetailLayout(settingsData.settings?.detail_layout ?? DEFAULT_DETAIL_LAYOUT),
      detail_gallery_shadow: normalizeShadowStyle(
        settingsData.settings?.detail_gallery_shadow ?? DEFAULT_DETAIL_GALLERY_SHADOW
      ),
      detail_template: normalizeDetailTemplate(
        settingsData.settings?.detail_template ?? DEFAULT_DETAIL_TEMPLATE
      ),
      detail_elements_json: resolveDetailElements(settingsData.settings),
      card_fields_json: normalizeAdminCardFields(settingsData.settings?.card_fields_json),
      modal_fields_json: settingsData.settings?.modal_fields_json?.length
        ? settingsData.settings.modal_fields_json
        : ['title', 'summary', 'description', 'category', 'price_label', 'tags', 'specs', 'media', 'enquiry'],
    });
    setItems(itemsData.items || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [type]);

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_type: type,
        name,
        slug: slugify(name),
        sort_order: categories.length,
        enabled: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Create failed');
      return;
    }
    setName('');
    await load();
  }

  async function toggleCategory(cat: CatalogCategory) {
    await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !cat.enabled }),
    });
    await load();
  }

  async function deleteCategory(cat: CatalogCategory) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
    await load();
  }

  async function saveSettings(e?: FormEvent) {
    e?.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/catalog-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: type,
          layout: settings.layout,
          grid_columns: settings.grid_columns,
          filters_json: settings.filters_json,
          search_fields_json: settings.search_fields_json,
          card_fields_json: [...(settings.card_fields_json || []).filter((f) => f !== CARD_FIELDS_V2), CARD_FIELDS_V2],
          modal_fields_json: settings.modal_fields_json,
          hero_enabled: !!settings.hero_enabled,
          hero_autoplay_ms: settings.hero_autoplay_ms,
          hero_item_ids_json: settings.hero_item_ids_json || [],
          hero_eyebrow: settings.hero_eyebrow || null,
          hero_title: settings.hero_title || null,
          hero_lead: settings.hero_lead || null,
          visual_style: settings.visual_style,
          card_style: settings.card_style || 'marketplace',
          card_body_bg_color: settings.card_body_bg_color || '#ffffff',
          card_media_bg_color: settings.card_media_bg_color || '#ffffff',
          listing_bg_color: settings.listing_bg_color || '#ffffff',
          marketplace_hover_border_color: settings.marketplace_hover_border_color || '#FF6B1A',
          card_media_fit_percent: normalizeCardMediaFitPercent(settings.card_media_fit_percent),
          card_media_inset: normalizeCardMediaInset(settings.card_media_inset),
          detail_layout: normalizeDetailLayout(settings.detail_layout),
          detail_gallery_shadow: normalizeShadowStyle(settings.detail_gallery_shadow),
          detail_template: normalizeDetailTemplate(settings.detail_template),
          detail_elements_json: normalizeDetailElements(settings.detail_elements_json),
          hero_variant: settings.hero_variant,
          hero_elements_json: resolveHeroElements(settings),
          toolbar_elements_json: resolveToolbarElements(settings),
          hero_standard_panel_enabled: resolveHeroElements(settings).includes('standard_panel'),
          hero_meta_enabled: resolveHeroElements(settings).includes('meta'),
          loading_skeleton_enabled: !!settings.loading_skeleton_enabled,
          reveal_animation_enabled: !!settings.reveal_animation_enabled,
          premium_borders_enabled: !!settings.premium_borders_enabled,
          discovery_profile_rail_enabled: !!settings.discovery_profile_rail_enabled,
          discovery_quick_find_enabled: !!settings.discovery_quick_find_enabled,
          discovery_facet_rail_enabled: !!settings.discovery_facet_rail_enabled,
          discovery_grouped_results_enabled: !!settings.discovery_grouped_results_enabled,
          discovery_sticky_toolbar_enabled: !!settings.discovery_sticky_toolbar_enabled,
          discovery_group_preview_count: settings.discovery_group_preview_count || 4,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Save failed');
        return;
      }
      setMessage('Catalog page settings saved. Public listing updates on next load.');
      setSettings({
        ...data.settings,
        card_style: data.settings?.card_style || 'marketplace',
        card_body_bg_color: data.settings?.card_body_bg_color || '#ffffff',
        card_media_bg_color: data.settings?.card_media_bg_color || '#ffffff',
        listing_bg_color: data.settings?.listing_bg_color || '#ffffff',
        marketplace_hover_border_color: data.settings?.marketplace_hover_border_color || '#FF6B1A',
        card_media_fit_percent: normalizeCardMediaFitPercent(data.settings?.card_media_fit_percent),
        card_media_inset: normalizeCardMediaInset(data.settings?.card_media_inset),
        detail_layout: normalizeDetailLayout(data.settings?.detail_layout),
        detail_gallery_shadow: normalizeShadowStyle(data.settings?.detail_gallery_shadow),
        detail_template: normalizeDetailTemplate(data.settings?.detail_template),
        detail_elements_json: resolveDetailElements(data.settings),
        card_fields_json: normalizeAdminCardFields(data.settings?.card_fields_json),
      });
    } finally {
      setSaving(false);
    }
  }

  function moveHeroItem(itemId: number, dir: -1 | 1) {
    if (!settings) return;
    const current = settings.hero_item_ids_json || [];
    const idx = current.indexOf(itemId);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= current.length) return;
    const next = [...current];
    const [moved] = next.splice(idx, 1);
    next.splice(nextIdx, 0, moved);
    setSettings({ ...settings, hero_item_ids_json: next });
  }
  return (
    <div className="admin-settings">
      <AdminFloatingActions status={message || (saving ? 'Saving…' : undefined)}>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={saving || !settings}
          onClick={() => void saveSettings()}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </AdminFloatingActions>

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <header className="admin-settings-masthead">
        <h1>{CATALOG_SETTINGS_PAGE_INTRO.title}</h1>
        <p>
          {CATALOG_SETTINGS_PAGE_INTRO.lead} Currently editing{' '}
          <strong>
            <code>/{type}s</code>
          </strong>
          .
        </p>
        <div className="admin-settings-typebar" role="tablist" aria-label="Catalog type">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={type === t}
              className={`admin-settings-type${type === t ? ' is-active' : ''}`}
              onClick={() => setType(t)}
            >
              {t}s
            </button>
          ))}
        </div>
        <p className="admin-hint" style={{ marginTop: '0.85rem', display: 'inline-flex', alignItems: 'center' }}>
          Catalog type
          <HelpTip text="Each type (products, projects, services) has its own settings profile. Saving products does not change projects or services." label="Help: Catalog type" />
        </p>
      </header>

      <nav className="admin-settings-nav" aria-label="Settings sections">
        {CATALOG_SETTINGS_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`admin-settings-nav-btn${section === s.id ? ' is-active' : ''}`}
            title={s.summary}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {!settings ? (
        <p className="admin-empty">Loading settings…</p>
      ) : (
        <form
          onSubmit={(e) => {
            void saveSettings(e);
          }}
        >
          {section === 'hero' ? (
            <div className="admin-settings-panel">
              <div className="admin-settings-panel-head">
                <div>
                  <div className="admin-settings-panel-head-copy">
                    <h2>
                      {sectionMeta('hero').title}
                      <HelpTip guide={sectionMeta('hero').guide} label="Help: Hero spotlight" />
                    </h2>
                    <p>{sectionMeta('hero').summary}</p>
                  </div>
                </div>
                <label className="admin-enable-switch" title="Master switch for the public page hero banner">
                  <input
                    type="checkbox"
                    checked={!!settings.hero_enabled}
                    onChange={(e) => setSettings({ ...settings, hero_enabled: e.target.checked ? 1 : 0 })}
                  />
                  Hero enabled
                </label>
              </div>
              <div className="admin-settings-panel-body">
                <SettingsBlock blockId="hero_presentation">
                  <div className="admin-form-grid">
                    <div className="admin-field">
                      <LabelWithHelp help="Overall catalog page mood (hero + cards chrome). Try premium or glass for a richer look.">
                        Visual style
                      </LabelWithHelp>
                      <select
                        className="admin-select"
                        value={settings.visual_style}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            visual_style: e.target.value as CatalogPageSettings['visual_style'],
                          })
                        }
                      >
                        {VISUAL_STYLE_OPTS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-field">
                      <LabelWithHelp help="standard = compact copy + optional panel. spotlight = large featured card beside the headline.">Hero variant</LabelWithHelp>
                      <select
                        className="admin-select"
                        value={settings.hero_variant}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            hero_variant: e.target.value as CatalogPageSettings['hero_variant'],
                          })
                        }
                      >
                        {HERO_VARIANT_OPTS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>

                    </div>
                    <div className="admin-field">
                      <LabelWithHelp help="Small label above the title (e.g. “Product Spotlight”). Keep short.">Hero eyebrow</LabelWithHelp>
                      <input
                        className="admin-input"
                        value={settings.hero_eyebrow || ''}
                        onChange={(e) => setSettings({ ...settings, hero_eyebrow: e.target.value })}
                        placeholder={
                          type === 'product'
                            ? 'Product Spotlight'
                            : type === 'project'
                              ? 'Selected Projects'
                              : 'Service Spotlight'
                        }
                      />

                    </div>
                    <div className="admin-field">
                      <LabelWithHelp help="Time between slides when multiple spotlight items are selected. 5000–8000 ms feels natural.">Rotation interval (ms)</LabelWithHelp>
                      <input
                        className="admin-input"
                        type="number"
                        min={2500}
                        max={30000}
                        step={500}
                        value={settings.hero_autoplay_ms || 6000}
                        onChange={(e) =>
                          setSettings({ ...settings, hero_autoplay_ms: Number(e.target.value) || 6000 })
                        }
                      />

                    </div>
                    <div className="admin-field full">
                      <LabelWithHelp help={`Main headline on the public /${type}s page. Leave blank only if you hide the title element.`}>
                        Hero title
                      </LabelWithHelp>
                      <input
                        className="admin-input"
                        value={settings.hero_title || ''}
                        onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                        placeholder={`Headline for /${type}s`}
                      />

                    </div>
                    <div className="admin-field full">
                      <LabelWithHelp help="One or two sentences under the title. Explain who the catalog is for.">Hero lead</LabelWithHelp>
                      <textarea
                        className="admin-input"
                        value={settings.hero_lead || ''}
                        onChange={(e) => setSettings({ ...settings, hero_lead: e.target.value })}
                        rows={3}
                        placeholder="Supporting copy shown above the spotlight card."
                      />

                    </div>
                  </div>
                </SettingsBlock>

                <SettingsBlock blockId="hero_elements">
                  <ChipGroup
                    label="Hero elements"
                    options={HERO_ELEMENT_OPTS}
                    values={resolveHeroElements(settings)}
                    optionLabels={HERO_ELEMENT_LABELS}
                    onChange={(hero_elements_json) =>
                      setSettings({
                        ...settings,
                        hero_elements_json,
                        hero_meta_enabled: hero_elements_json.includes('meta') ? 1 : 0,
                        hero_standard_panel_enabled: hero_elements_json.includes('standard_panel') ? 1 : 0,
                      })
                    }
                    hint="Toggle visibility of each hero piece. Blue chips are currently shown on the public page."
                  />
                  <div style={{ marginTop: '0.85rem' }}>
                    <div className="admin-chip-group-label" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      Motion & borders
                      <HelpTip
                        text="These affect the listing experience under the hero as well as hero polish."
                        label="Help: Motion & borders"
                      />
                    </div>
                    <div className="admin-chips" style={{ marginTop: '0.4rem' }}>
                      {(
                        [
                          ['loading_skeleton_enabled', 'Skeleton loading', 'Placeholder shimmer while cards load'],
                          ['reveal_animation_enabled', 'Reveal animation', 'Cards ease in as you scroll'],
                          ['premium_borders_enabled', 'Premium borders', 'Stronger card outlines for a premium feel'],
                        ] as const
                      ).map(([key, label, tip]) => (
                        <label
                          key={key}
                          className={`admin-chip${settings[key] ? ' is-on' : ''}`}
                          title={tip}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(settings[key])}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                [key]: e.target.checked ? 1 : 0,
                              } as CatalogPageSettings)
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </SettingsBlock>

                <SettingsBlock blockId="hero_spotlight_items">
                  <div className="admin-picker-list">
                    {items.length ? (
                      items.map((item) => {
                        const activeIds = settings.hero_item_ids_json || [];
                        const checked = activeIds.includes(item.id);
                        const idx = activeIds.indexOf(item.id);
                        const canUp = checked && idx > 0;
                        const canDown = checked && idx >= 0 && idx < activeIds.length - 1;
                        return (
                          <label
                            key={item.id}
                            className={`admin-picker-row${checked ? ' is-on' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...activeIds, item.id]
                                  : activeIds.filter((id) => id !== item.id);
                                setSettings({ ...settings, hero_item_ids_json: next });
                              }}
                            />
                            <span>
                              <strong style={{ display: 'block', fontSize: '0.84rem' }}>{item.title}</strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--admin-muted)' }}>
                                {item.status}
                                {item.featured ? ' · featured' : ''}
                              </span>
                            </span>
                            {checked ? (
                              <div className="admin-picker-actions">
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-secondary"
                                  disabled={!canUp}
                                  onClick={(ev) => {
                                    ev.preventDefault();
                                    moveHeroItem(item.id, -1);
                                  }}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-secondary"
                                  disabled={!canDown}
                                  onClick={(ev) => {
                                    ev.preventDefault();
                                    moveHeroItem(item.id, 1);
                                  }}
                                >
                                  ↓
                                </button>
                              </div>
                            ) : (
                              <span />
                            )}
                            <code>#{item.id}</code>
                          </label>
                        );
                      })
                    ) : (
                      <p className="admin-empty">Create or seed some {type}s to curate hero spotlight items.</p>
                    )}
                  </div>
                </SettingsBlock>

                <div className="admin-settings-section">
                  <div className="admin-help-title-row">
                    <h3 className="admin-settings-section-title">Live preview</h3>
                    <HelpTip text="Optional check that hero style and elements roughly match what you configured. Hidden by default — open only when needed." label="Help: Live preview" />
                  </div>
                  {previewSettings ? (
                    <CatalogAppearancePreview type={type} settings={previewSettings} items={items} />
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {section === 'listing' ? (
            <div className="admin-settings-panel">
              <div className="admin-settings-panel-head">
                <div>
                  <div className="admin-settings-panel-head-copy">
                    <h2>
                      {sectionMeta('listing').title}
                      <HelpTip guide={sectionMeta('listing').guide} label="Help: Listing & cards" />
                    </h2>
                    <p>{sectionMeta('listing').summary}</p>
                  </div>
                </div>
              </div>
              <div className="admin-settings-panel-body">
                <SettingsBlock blockId="listing_layout">
                  <div className="admin-form-grid">
                    <div className="admin-field">
                      <LabelWithHelp help="Marketplace is clearest for products. Overlay suits bold photography-led catalogs.">Card style</LabelWithHelp>
                      <select
                        className="admin-select"
                        value={settings.card_style || 'marketplace'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            card_style: e.target.value as CatalogPageSettings['card_style'],
                          })
                        }
                      >
                        <option value="marketplace">Marketplace (image above, body below)</option>
                        <option value="overlay">Overlay (text over media)</option>
                      </select>

                    </div>
                    <div className="admin-field">
                      <LabelWithHelp help="Grid for visual browse; list when summaries matter more than images.">Layout</LabelWithHelp>
                      <select
                        className="admin-select"
                        value={settings.layout}
                        onChange={(e) => setSettings({ ...settings, layout: e.target.value as 'grid' | 'list' })}
                      >
                        <option value="grid">grid</option>
                        <option value="list">list</option>
                      </select>

                    </div>
                    <div className="admin-field">
                      <LabelWithHelp help="Desktop columns (1–4). Mobile still stacks. 3 is a balanced default.">Grid columns</LabelWithHelp>
                      <input
                        className="admin-input"
                        type="number"
                        min={1}
                        max={4}
                        value={settings.grid_columns}
                        onChange={(e) => setSettings({ ...settings, grid_columns: Number(e.target.value) })}
                      />

                    </div>
                  </div>
                </SettingsBlock>

                <SettingsBlock blockId="listing_colors">
                  <div className="admin-form-grid">
                    <ColorField
                      label="Card body background"
                      value={settings.card_body_bg_color}
                      fallback="#ffffff"
                      onChange={(card_body_bg_color) => setSettings({ ...settings, card_body_bg_color })}
                      hint="Title/price panel under the product image (Marketplace cards)."
                    />
                    <ColorField
                      label="Card media background"
                      value={settings.card_media_bg_color}
                      fallback="#ffffff"
                      onChange={(card_media_bg_color) => setSettings({ ...settings, card_media_bg_color })}
                      hint="Fill behind product photos on cards and in the Quick view gallery stage."
                    />
                    <ColorField
                      label="Listing background"
                      value={settings.listing_bg_color}
                      fallback="#ffffff"
                      onChange={(listing_bg_color) => setSettings({ ...settings, listing_bg_color })}
                      hint="Page background behind the card grid (below the hero)."
                    />
                    <ColorField
                      label="Marketplace hover border"
                      value={settings.marketplace_hover_border_color}
                      fallback="#FF6B1A"
                      onChange={(marketplace_hover_border_color) =>
                        setSettings({ ...settings, marketplace_hover_border_color })
                      }
                      hint="Accent outline when hovering Marketplace cards — usually brand orange."
                    />
                  </div>
                </SettingsBlock>

                <SettingsBlock blockId="listing_media">
                  <div className="admin-form-grid">
                    <div className="admin-field full">
                      <label>
                        Card image fill — {settings.card_media_fit_percent ?? DEFAULT_CARD_MEDIA_FIT_PERCENT}%
                        <HelpTip
                          text="Listing cards only. 100% = edge-to-edge cover. Quick view product fit is set in Inventory → Media."
                          label="Help: Card image fill"
                        />
                      </label>
                      <div className="admin-range-row">
                        <input
                          type="range"
                          min={70}
                          max={100}
                          step={1}
                          value={settings.card_media_fit_percent ?? DEFAULT_CARD_MEDIA_FIT_PERCENT}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              card_media_fit_percent: normalizeCardMediaFitPercent(Number(e.target.value)),
                            })
                          }
                          aria-label="Card image fill percent"
                        />
                        <input
                          className="admin-input"
                          type="number"
                          min={70}
                          max={100}
                          value={settings.card_media_fit_percent ?? DEFAULT_CARD_MEDIA_FIT_PERCENT}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              card_media_fit_percent: normalizeCardMediaFitPercent(Number(e.target.value)),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="admin-field full">
                      <LabelWithHelp help="Padding around the image inside the card media area. Hover a chip for detail.">Card media inset</LabelWithHelp>
                      <div className="admin-chips" style={{ marginTop: '0.35rem' }}>
                        {CARD_MEDIA_INSET_OPTIONS.map((opt) => {
                          const active = (settings.card_media_inset || DEFAULT_CARD_MEDIA_INSET) === opt.value;
                          return (
                            <label key={opt.value} className={`admin-chip${active ? ' is-on' : ''}`} title={opt.hint}>
                              <input
                                type="radio"
                                name="card_media_inset"
                                checked={active}
                                onChange={() => setSettings({ ...settings, card_media_inset: opt.value })}
                              />
                              {opt.label}
                            </label>
                          );
                        })}
                      </div>

                    </div>
                  </div>
                </SettingsBlock>

                <SettingsBlock blockId="listing_fields">
                  <div className="admin-form-grid">
                    <ChipGroup
                      label="Filters"
                      options={FILTER_OPTS}
                      values={settings.filters_json}
                      optionLabels={FILTER_LABELS}
                      onChange={(filters_json) => setSettings({ ...settings, filters_json })}
                      hint="Which refine options appear in discovery / filter UI. Categories must exist under Categories."
                    />
                    <ChipGroup
                      label="Search fields"
                      options={SEARCH_OPTS}
                      values={settings.search_fields_json}
                      optionLabels={SEARCH_FIELD_LABELS}
                      onChange={(search_fields_json) => setSettings({ ...settings, search_fields_json })}
                      hint="Which inventory text fields the catalog search box matches against."
                    />
                    <CardFieldsChecklist
                      values={settings.card_fields_json}
                      onChange={(card_fields_json) => setSettings({ ...settings, card_fields_json })}
                    />
                  </div>
                </SettingsBlock>
              </div>
            </div>
          ) : null}

          {section === 'popup' ? (
            <div className="admin-settings-panel">
              <div className="admin-settings-panel-head">
                <div>
                  <div className="admin-settings-panel-head-copy">
                    <h2>
                      {sectionMeta('popup').title}
                      <HelpTip guide={sectionMeta('popup').guide} label="Help: Quick view popup" />
                    </h2>
                    <p>{sectionMeta('popup').summary}</p>
                  </div>
                </div>
              </div>
              <div className="admin-settings-panel-body">
                <SettingsBlock blockId="popup_template">
                  <div className="admin-choice-grid">
                    {CATALOG_DETAIL_TEMPLATE_OPTIONS.map((opt) => {
                      const active =
                        normalizeDetailTemplate(settings.detail_template ?? DEFAULT_DETAIL_TEMPLATE) === opt.value;
                      return (
                        <label key={opt.value} className={`admin-choice-card${active ? ' is-on' : ''}`}>
                          <input
                            type="radio"
                            name="detail_template"
                            checked={active}
                            onChange={() => setSettings({ ...settings, detail_template: opt.value })}
                          />
                          <strong>{opt.label}</strong>
                          <span>{opt.hint}</span>
                        </label>
                      );
                    })}
                  </div>
                </SettingsBlock>

                <SettingsBlock blockId="popup_components">
                  <div style={{ display: 'grid', gap: '0.85rem' }}>
                    {(['chrome', 'content', 'cta'] as const).map((group) => {
                      const opts = CATALOG_DETAIL_ELEMENT_OPTIONS.filter((o) => o.group === group);
                      const set = new Set(settings.detail_elements_json || DEFAULT_DETAIL_ELEMENTS);
                      return (
                        <ToggleChips
                          key={group}
                          label={group === 'chrome' ? 'Chrome' : group === 'content' ? 'Content' : 'Calls to action'}
                          items={opts.map((o) => ({ id: o.id, label: o.label }))}
                          values={set}
                          onToggle={(id, on) => {
                            const next = new Set(settings.detail_elements_json || DEFAULT_DETAIL_ELEMENTS);
                            if (on) next.add(id as (typeof DEFAULT_DETAIL_ELEMENTS)[number]);
                            else next.delete(id as (typeof DEFAULT_DETAIL_ELEMENTS)[number]);
                            setSettings({
                              ...settings,
                              detail_elements_json: normalizeDetailElements([...next]),
                            });
                          }}
                        />
                      );
                    })}
                  </div>
                </SettingsBlock>

                <SettingsBlock blockId="popup_classic_layout">
                  <div className="admin-choice-grid">
                    {CATALOG_DETAIL_LAYOUT_OPTIONS.map((opt) => {
                      const active = normalizeDetailLayout(settings.detail_layout) === opt.value;
                      const dim = normalizeDetailTemplate(settings.detail_template) !== 'classic';
                      return (
                        <label
                          key={opt.value}
                          className={`admin-choice-card${active ? ' is-on' : ''}${dim ? ' is-dim' : ''}`}
                          title={opt.hint}
                        >
                          <input
                            type="radio"
                            name="detail_layout"
                            checked={active}
                            onChange={() => setSettings({ ...settings, detail_layout: opt.value })}
                          />
                          <strong>{opt.label}</strong>
                          <span>{opt.hint}</span>
                        </label>
                      );
                    })}
                  </div>
                </SettingsBlock>

                <SettingsBlock blockId="popup_shadow">
                  <div className="admin-form-grid">
                    <div className="admin-field">
                      <LabelWithHelp
                        htmlFor="detail-gallery-shadow"
                        help="Applies to the Quick view main image frame only. Listing card frame shadow is set per item in Inventory → Media."
                      >
                        Frame shadow
                      </LabelWithHelp>
                      <select
                        id="detail-gallery-shadow"
                        className="admin-select"
                        value={normalizeShadowStyle(settings.detail_gallery_shadow ?? DEFAULT_DETAIL_GALLERY_SHADOW)}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            detail_gallery_shadow: normalizeShadowStyle(e.target.value),
                          })
                        }
                      >
                        {CATALOG_SHADOW_STYLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} — {opt.hint}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </SettingsBlock>

                <details className="admin-advanced">
                  <summary>
                    Advanced · legacy modal fields
                    <HelpTip
                      text="Older field list used only when Popup components are empty. Prefer Components above for new setups. Leave legacy alone unless you are migrating an old catalog."
                      label="Help: Legacy modal fields"
                    />
                  </summary>
                  <ChipGroup
                    label="Modal fields (legacy)"
                    options={MODAL_OPTS}
                    values={settings.modal_fields_json}
                    onChange={(modal_fields_json) => setSettings({ ...settings, modal_fields_json })}
                  />
                </details>
              </div>
            </div>
          ) : null}

          {section === 'discovery' ? (
            <div className="admin-settings-panel">
              <div className="admin-settings-panel-head">
                <div>
                  <div className="admin-settings-panel-head-copy">
                    <h2>
                      {sectionMeta('discovery').title}
                      <HelpTip guide={sectionMeta('discovery').guide} label="Help: Discovery experience" />
                    </h2>
                    <p>{sectionMeta('discovery').summary}</p>
                  </div>
                </div>
              </div>
              <div className="admin-settings-panel-body">
                <SettingsBlock blockId="discovery_features">
                  <div className="admin-chips">
                    {(
                      [
                        [
                          'discovery_profile_rail_enabled',
                          'Shop by profile rail',
                          'Horizontal profiles for one-click browsing segments',
                        ],
                        [
                          'discovery_quick_find_enabled',
                          'Quick find chips',
                          'Shortcut chips above results for common finds',
                        ],
                        [
                          'discovery_facet_rail_enabled',
                          'Refine facet rail',
                          'Side/refine filters for category, tags, etc.',
                        ],
                        [
                          'discovery_grouped_results_enabled',
                          'Grouped results (All view)',
                          'Show results clustered by category',
                        ],
                        [
                          'discovery_sticky_toolbar_enabled',
                          'Sticky search toolbar',
                          'Keep search/sort visible while scrolling',
                        ],
                      ] as const
                    ).map(([key, label, tip]) => (
                      <label key={key} className={`admin-chip${settings[key] ? ' is-on' : ''}`} title={tip}>
                        <input
                          type="checkbox"
                          checked={Boolean(settings[key])}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              [key]: e.target.checked ? 1 : 0,
                            } as CatalogPageSettings)
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </SettingsBlock>
                <SettingsBlock blockId="discovery_toolbar">
                  <div className="admin-form-grid">
                    <div className="admin-field" style={{ maxWidth: 220 }}>
                      <LabelWithHelp help="Cards shown per category before “View all”. Only when Grouped results is on.">Group preview count</LabelWithHelp>
                      <input
                        className="admin-input"
                        type="number"
                        min={1}
                        max={12}
                        value={settings.discovery_group_preview_count || 4}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            discovery_group_preview_count: Number(e.target.value) || 4,
                          })
                        }
                        disabled={!settings.discovery_grouped_results_enabled}
                      />

                    </div>
                    <ChipGroup
                      label="Toolbar elements"
                      options={TOOLBAR_ELEMENT_OPTS}
                      values={resolveToolbarElements(settings)}
                      optionLabels={TOOLBAR_ELEMENT_LABELS}
                      onChange={(toolbar_elements_json) => setSettings({ ...settings, toolbar_elements_json })}
                      hint="Pieces inside the listing toolbar: search, sort, counts, active filters, clear."
                    />
                  </div>
                </SettingsBlock>
              </div>
            </div>
          ) : null}
        </form>
      )}

      {section === 'categories' ? (
        <div className="admin-settings-panel">
          <div className="admin-settings-panel-head">
            <div>
              <div className="admin-settings-panel-head-copy">
                <h2>
                  {sectionMeta('categories').title} · {type}
                  <HelpTip guide={sectionMeta('categories').guide} label="Help: Categories" />
                </h2>
                <p>{sectionMeta('categories').summary}</p>
              </div>
            </div>
          </div>
          <div className="admin-settings-panel-body">
            <form onSubmit={addCategory} className="admin-form-grid" style={{ marginBottom: '1rem' }}>
              <div className="admin-field">
                <LabelWithHelp help="Customer-facing label (e.g. “Industrial UPS”). Slug is generated automatically.">Name</LabelWithHelp>
                <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} required />

              </div>
              <div className="admin-field" style={{ display: 'flex', alignItems: 'end' }}>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Add category
                </button>
              </div>
            </form>
            <div className="admin-table-wrap" style={{ border: '1px solid var(--admin-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--admin-border)' }}>
                <strong style={{ fontSize: '0.82rem' }}>Existing categories</strong>
                <HelpTip
                  text="Prefer Disable over Delete if items still use the category. Assign categories on each item in Inventory."
                  label="Help: Category actions"
                  align="end"
                />
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Enabled</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <p className="admin-empty" style={{ margin: '0.75rem 0' }}>
                          No categories yet. Add one above, then assign items in Inventory.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat.id}>
                        <td>{cat.name}</td>
                        <td>
                          <code>{cat.slug}</code>
                        </td>
                        <td>{cat.enabled ? 'Yes' : 'No'}</td>
                        <td>
                          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => toggleCategory(cat)}>
                            {cat.enabled ? 'Disable' : 'Enable'}
                          </button>{' '}
                          <button type="button" className="admin-btn admin-btn-danger" onClick={() => deleteCategory(cat)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
