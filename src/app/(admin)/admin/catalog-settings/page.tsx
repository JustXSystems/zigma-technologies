'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CatalogCategory, CatalogItemType, CatalogPageSettings } from '@/lib/types';
import { slugify } from '@/lib/types';

const TYPES: CatalogItemType[] = ['product', 'project', 'service'];

const FILTER_OPTS = ['category', 'tags'] as const;
const SEARCH_OPTS = ['title', 'summary', 'description', 'tags', 'price_label'] as const;
const CARD_OPTS = ['title', 'summary', 'category', 'primary_image', 'price_label', 'tags'] as const;
const MODAL_OPTS = ['title', 'summary', 'description', 'category', 'price_label', 'tags', 'specs', 'media', 'enquiry'] as const;
const VISUAL_STYLE_OPTS = ['classic', 'premium', 'glass', 'minimal', 'bold-corporate'] as const;
const HERO_VARIANT_OPTS = ['standard', 'spotlight'] as const;

function toggleInList(list: string[] | null | undefined, value: string, on: boolean) {
  const base = [...(list || [])];
  if (on) {
    if (!base.includes(value)) base.push(value);
  } else {
    return base.filter((v) => v !== value);
  }
  return base;
}

function ChipGroup({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: readonly string[];
  values: string[] | null | undefined;
  onChange: (next: string[]) => void;
}) {
  const set = new Set(values || []);
  return (
    <div className="admin-field full">
      <label>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
        {options.map((opt) => (
          <label
            key={opt}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--admin-border)',
              borderRadius: 999,
              padding: '0.35rem 0.7rem',
              fontSize: '0.82rem',
              background: set.has(opt) ? 'rgba(37, 99, 235, 0.08)' : '#fff',
            }}
          >
            <input
              type="checkbox"
              checked={set.has(opt)}
              onChange={(e) => onChange(toggleInList(values, opt, e.target.checked))}
            />
            {opt}
          </label>
        ))}
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
  const selectedIds = settings.hero_item_ids_json || [];
  const orderedSelected = selectedIds
    .map((id) => items.find((item) => item.id === id))
    .filter(Boolean) as Array<{ id: number; title: string; status: string; featured: number; primary_image?: string | null }>;
  const previewItems = (orderedSelected.length ? orderedSelected : items).slice(0, 2);
  const active = previewItems[0];

  if (!active) {
    return (
      <div className="admin-field full">
        <label>Live preview</label>
        <div className="admin-empty">Create or seed some {type}s to preview the selected style.</div>
      </div>
    );
  }

  return (
    <div className="admin-field full">
      <label>Live preview</label>
      <div
        className={`catalog-page catalog-style-${settings.visual_style} ${
          settings.premium_borders_enabled ? 'catalog-premium-borders' : ''
        }`}
        style={{ border: '1px solid var(--admin-border)', borderRadius: 16, overflow: 'hidden', background: '#eef2f6' }}
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
              <div className="eyebrow">{settings.hero_eyebrow || `${type} spotlight`}</div>
              <h1 style={{ maxWidth: 480, marginBottom: '0.6rem' }}>{settings.hero_title || `Preview /${type}s`}</h1>
              <p className="lead" style={{ maxWidth: 480, marginTop: 0 }}>
                {settings.hero_lead || 'Curated hero presentation with controlled visual presets.'}
              </p>
              <div className="catalog-hero-meta">
                <span>{settings.visual_style}</span>
                <span>{settings.hero_variant}</span>
                <span>{settings.loading_skeleton_enabled ? 'skeleton on' : 'skeleton off'}</span>
              </div>
              {settings.hero_variant === 'standard' ? (
                <div className="catalog-hero-standard-panel">
                  <span className="catalog-hero-kicker">{type}</span>
                  <h2>{active.title}</h2>
                  <p>Previewing the standard hero variant with compact active-item messaging.</p>
                </div>
              ) : null}
            </div>
            {settings.hero_variant === 'spotlight' ? (
              <div className="catalog-hero-spotlight">
                <div className="catalog-hero-spotlight-top">
                  <span className="catalog-hero-kicker">{type}</span>
                  <span className="catalog-hero-price">Preview</span>
                </div>
                <h2>{active.title}</h2>
                <p>Premium spotlight card showing how the active catalog item will be framed on the public page.</p>
                <div className="catalog-hero-tags">
                  <span className="catalog-hero-tag">interactive</span>
                  <span className="catalog-hero-tag">premium</span>
                </div>
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
    setSettings(settingsData.settings);
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

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setMessage('');
    const res = await fetch('/api/admin/catalog-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_type: type,
        layout: settings.layout,
        grid_columns: settings.grid_columns,
        filters_json: settings.filters_json,
        search_fields_json: settings.search_fields_json,
        card_fields_json: settings.card_fields_json,
        modal_fields_json: settings.modal_fields_json,
        hero_enabled: !!settings.hero_enabled,
        hero_autoplay_ms: settings.hero_autoplay_ms,
        hero_item_ids_json: settings.hero_item_ids_json || [],
        hero_eyebrow: settings.hero_eyebrow || null,
        hero_title: settings.hero_title || null,
        hero_lead: settings.hero_lead || null,
        visual_style: settings.visual_style,
        hero_variant: settings.hero_variant,
        loading_skeleton_enabled: !!settings.loading_skeleton_enabled,
        reveal_animation_enabled: !!settings.reveal_animation_enabled,
        premium_borders_enabled: !!settings.premium_borders_enabled,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Save failed');
      return;
    }
    setMessage('Catalog page settings saved. Public listing updates on next load.');
    setSettings(data.settings);
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
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-toolbar">
        <div className="left">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`admin-btn ${type === t ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => setType(t)}
            >
              {t}s
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Listing settings · {type}</h2>
        <p style={{ color: 'var(--admin-muted)', marginTop: 0 }}>
          Controls public /{type}s layout, hero spotlight, filters, search fields, card contents, and detail modal sections.
        </p>
        {settings ? (
          <form onSubmit={saveSettings} className="admin-form-grid">
            <div className="full" style={{ border: '1px solid var(--admin-border)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.3rem' }}>Hero spotlight</h3>
                  <p style={{ color: 'var(--admin-muted)', margin: 0, fontSize: '0.9rem' }}>
                    Curate which {type}s rotate in the public page hero. If none are selected, featured items are used automatically.
                  </p>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={!!settings.hero_enabled}
                    onChange={(e) => setSettings({ ...settings, hero_enabled: e.target.checked ? 1 : 0 })}
                  />
                  Enable hero spotlight
                </label>
              </div>

              <div className="admin-form-grid">
                <div className="admin-field">
                  <label>Visual style preset</label>
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
                  <label>Hero variant</label>
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
                  <label>Hero eyebrow</label>
                  <input
                    className="admin-input"
                    value={settings.hero_eyebrow || ''}
                    onChange={(e) => setSettings({ ...settings, hero_eyebrow: e.target.value })}
                    placeholder={type === 'product' ? 'Product Spotlight' : type === 'project' ? 'Selected Projects' : 'Service Spotlight'}
                  />
                </div>
                <div className="admin-field">
                  <label>Rotation interval (ms)</label>
                  <input
                    className="admin-input"
                    type="number"
                    min={2500}
                    max={30000}
                    step={500}
                    value={settings.hero_autoplay_ms || 6000}
                    onChange={(e) => setSettings({ ...settings, hero_autoplay_ms: Number(e.target.value) || 6000 })}
                  />
                </div>
                <div className="admin-field full">
                  <label>Hero title</label>
                  <input
                    className="admin-input"
                    value={settings.hero_title || ''}
                    onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                    placeholder={`Headline for /${type}s`}
                  />
                </div>
                <div className="admin-field full">
                  <label>Hero lead</label>
                  <textarea
                    className="admin-input"
                    value={settings.hero_lead || ''}
                    onChange={(e) => setSettings({ ...settings, hero_lead: e.target.value })}
                    rows={3}
                    placeholder="Supporting copy shown above the spotlight card."
                  />
                </div>
                <div className="admin-field full">
                  <label>Curated appearance toggles</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {[
                      ['loading_skeleton_enabled', 'Skeleton loading'],
                      ['reveal_animation_enabled', 'Reveal animation'],
                      ['premium_borders_enabled', 'Premium borders'],
                    ].map(([key, label]) => (
                      <label
                        key={key}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          border: '1px solid var(--admin-border)',
                          borderRadius: 999,
                          padding: '0.45rem 0.8rem',
                          background: '#fff',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(settings[key as keyof CatalogPageSettings])}
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
                <div className="admin-field full">
                  <label>Selected spotlight items</label>
                  <div
                    style={{
                      border: '1px solid var(--admin-border)',
                      borderRadius: 12,
                      background: '#fff',
                      maxHeight: 300,
                      overflow: 'auto',
                      padding: '0.75rem',
                    }}
                  >
                    {items.length ? (
                      <div style={{ display: 'grid', gap: '0.55rem' }}>
                        {items.map((item) => {
                          const activeIds = settings.hero_item_ids_json || [];
                          const checked = activeIds.includes(item.id);
                          const idx = activeIds.indexOf(item.id);
                          const canUp = checked && idx > 0;
                          const canDown = checked && idx >= 0 && idx < activeIds.length - 1;
                          return (
                            <label
                              key={item.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr auto auto',
                                gap: '0.75rem',
                                alignItems: 'center',
                                border: '1px solid var(--admin-border)',
                                borderRadius: 10,
                                padding: '0.65rem 0.8rem',
                                background: checked ? 'rgba(37, 99, 235, 0.06)' : '#fff',
                              }}
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
                                <strong style={{ display: 'block' }}>{item.title}</strong>
                                <span style={{ fontSize: '0.82rem', color: 'var(--admin-muted)' }}>
                                  {item.status}
                                  {item.featured ? ' · featured' : ''}
                                </span>
                              </span>
                              {checked && activeIds.length > 1 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn-secondary"
                                    style={{ padding: '0.25rem 0.55rem', minWidth: 70, opacity: canUp ? 1 : 0.5 }}
                                    disabled={!canUp}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      moveHeroItem(item.id, -1);
                                    }}
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn-secondary"
                                    style={{ padding: '0.25rem 0.55rem', minWidth: 70, opacity: canDown ? 1 : 0.5 }}
                                    disabled={!canDown}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
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
                        })}
                      </div>
                    ) : (
                      <p className="admin-empty">Create or seed some {type}s to curate hero spotlight items.</p>
                    )}
                  </div>
                  <p style={{ margin: '0.55rem 0 0', color: 'var(--admin-muted)', fontSize: '0.82rem' }}>
                    Selection order controls slide order. Leave empty to fall back to featured items automatically.
                  </p>
                </div>
                {previewSettings ? <CatalogAppearancePreview type={type} settings={previewSettings} items={items} /> : null}
              </div>
            </div>
            <div className="admin-field">
              <label>Layout</label>
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
              <label>Grid columns</label>
              <input
                className="admin-input"
                type="number"
                min={1}
                max={4}
                value={settings.grid_columns}
                onChange={(e) => setSettings({ ...settings, grid_columns: Number(e.target.value) })}
              />
            </div>
            <ChipGroup
              label="Filters"
              options={FILTER_OPTS}
              values={settings.filters_json}
              onChange={(filters_json) => setSettings({ ...settings, filters_json })}
            />
            <ChipGroup
              label="Search fields"
              options={SEARCH_OPTS}
              values={settings.search_fields_json}
              onChange={(search_fields_json) => setSettings({ ...settings, search_fields_json })}
            />
            <ChipGroup
              label="Card fields"
              options={CARD_OPTS}
              values={settings.card_fields_json}
              onChange={(card_fields_json) => setSettings({ ...settings, card_fields_json })}
            />
            <ChipGroup
              label="Modal fields"
              options={MODAL_OPTS}
              values={settings.modal_fields_json}
              onChange={(modal_fields_json) => setSettings({ ...settings, modal_fields_json })}
            />
            <div className="full">
              <button type="submit" className="admin-btn admin-btn-primary">
                Save settings
              </button>
            </div>
          </form>
        ) : (
          <p className="admin-empty">Loading settings…</p>
        )}
      </div>

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Categories · {type}</h2>
        <form onSubmit={addCategory} className="admin-form-grid" style={{ marginBottom: '1rem' }}>
          <div className="admin-field">
            <label>Name</label>
            <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="admin-field" style={{ display: 'flex', alignItems: 'end' }}>
            <button type="submit" className="admin-btn admin-btn-primary">
              Add category
            </button>
          </div>
        </form>
        <div className="admin-table-wrap" style={{ border: '1px solid var(--admin-border)', borderRadius: 12 }}>
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
              {categories.map((cat) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
