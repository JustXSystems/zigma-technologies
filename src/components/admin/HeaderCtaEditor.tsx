'use client';

import {
  createHeaderCtaItem,
  HEADER_CTA_ACTIONS,
  HEADER_CTA_DISPLAY_MODES,
  HEADER_CTA_ICONS,
  HEADER_CTA_STYLES,
  headerCtaLegacyPatch,
  parseHeaderCta,
  serializeHeaderCta,
  type HeaderCtaAction,
  type HeaderCtaConfig,
  type HeaderCtaDisplay,
  type HeaderCtaIcon,
  type HeaderCtaItem,
  type HeaderCtaStyle,
} from '@/lib/header-cta';
import type { SiteSettings } from '@/lib/site-settings';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

function DisplaySelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: HeaderCtaDisplay;
  onChange: (v: HeaderCtaDisplay) => void;
}) {
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="admin-select"
        value={value}
        onChange={(e) => onChange(e.target.value as HeaderCtaDisplay)}
      >
        {HEADER_CTA_DISPLAY_MODES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function HeaderCtaEditor({ settings, onChange }: Props) {
  const config = parseHeaderCta(settings.headerCtaJson, settings);

  function commit(next: HeaderCtaConfig) {
    onChange({
      headerCtaJson: serializeHeaderCta(next),
      ...headerCtaLegacyPatch(next),
    });
  }

  function patchTrigger(patch: Partial<HeaderCtaConfig>) {
    commit({ ...config, ...patch, items: config.items });
  }

  function patchItem(id: string, patch: Partial<HeaderCtaItem>) {
    commit({
      ...config,
      items: config.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function moveItem(id: string, dir: -1 | 1) {
    const idx = config.items.findIndex((i) => i.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= config.items.length) return;
    const items = [...config.items];
    [items[idx], items[swap]] = [items[swap], items[idx]];
    commit({ ...config, items });
  }

  function removeItem(id: string) {
    const item = config.items.find((i) => i.id === id);
    if (!item) return;
    if (!confirm(`Remove "${item.label}" from CTA submenu?`)) return;
    commit({ ...config, items: config.items.filter((i) => i.id !== id) });
  }

  function addItem() {
    commit({
      ...config,
      items: [
        ...config.items,
        createHeaderCtaItem({
          label: 'Get a Quote',
          action: 'consultation',
          consultSubject: 'Request a Quote',
          icon: 'quote',
          style: 'consult',
        }),
      ],
    });
  }

  function resetDefaults() {
    if (!confirm('Reset Request Consultation button and submenu to defaults?')) return;
    commit(parseHeaderCta(''));
  }

  return (
    <div className="admin-page-stack" style={{ gap: '1.25rem' }}>
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="header-cta-label-a">Label (variant A)</label>
          <input
            id="header-cta-label-a"
            className="admin-input"
            value={config.buttonLabelA}
            onChange={(e) => patchTrigger({ buttonLabelA: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="header-cta-label-b">Label (variant B)</label>
          <input
            id="header-cta-label-b"
            className="admin-input"
            value={config.buttonLabelB}
            onChange={(e) => patchTrigger({ buttonLabelB: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="header-cta-ab">Variant B percent 0–100</label>
          <input
            id="header-cta-ab"
            className="admin-input"
            type="number"
            min={0}
            max={100}
            value={config.variantBPercent}
            onChange={(e) => patchTrigger({ variantBPercent: Number(e.target.value) || 0 })}
          />
          <small style={{ color: 'var(--admin-muted)' }}>e.g. 50 shows B half the time</small>
        </div>
        <div className="admin-field">
          <label htmlFor="header-cta-action">Primary action</label>
          <select
            id="header-cta-action"
            className="admin-select"
            value={config.action}
            onChange={(e) => patchTrigger({ action: e.target.value as HeaderCtaAction })}
          >
            {HEADER_CTA_ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        {config.action === 'consultation' ? (
          <div className="admin-field full">
            <label htmlFor="header-cta-subject">Consultation subject</label>
            <input
              id="header-cta-subject"
              className="admin-input"
              value={config.consultSubject}
              onChange={(e) => patchTrigger({ consultSubject: e.target.value })}
            />
          </div>
        ) : null}
        {config.action === 'link' ? (
          <div className="admin-field full">
            <label htmlFor="header-cta-href">Href</label>
            <input
              id="header-cta-href"
              className="admin-input"
              value={config.href}
              placeholder="/contact#contact-form"
              onChange={(e) => patchTrigger({ href: e.target.value })}
            />
          </div>
        ) : (
          <div className="admin-field full">
            <label htmlFor="header-cta-href-fallback">Href (legacy / link fallback)</label>
            <input
              id="header-cta-href-fallback"
              className="admin-input"
              value={config.href}
              onChange={(e) => patchTrigger({ href: e.target.value })}
            />
          </div>
        )}
        <DisplaySelect
          id="header-cta-desktop"
          label="Desktop display"
          value={config.desktopDisplay}
          onChange={(desktopDisplay) => patchTrigger({ desktopDisplay })}
        />
        <DisplaySelect
          id="header-cta-mobile"
          label="Mobile display (≤900px)"
          value={config.mobileDisplay}
          onChange={(mobileDisplay) => patchTrigger({ mobileDisplay })}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ marginRight: 'auto' }}>Submenu buttons</strong>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={resetDefaults}>
          Reset defaults
        </button>
        <button type="button" className="admin-btn admin-btn-primary" onClick={addItem}>
          Add button
        </button>
      </div>

      {config.items.length === 0 ? (
        <p style={{ color: 'var(--admin-muted)', margin: 0 }}>
          No submenu — the trigger runs the primary action directly. Add chips to open a dropdown like Talk to us.
        </p>
      ) : null}

      {config.items.map((item, index) => (
        <div
          key={item.id}
          className="admin-card"
          style={{ padding: '1rem', border: '1px solid var(--admin-border, #e2e8f0)' }}
        >
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: '0.85rem',
            }}
          >
            <strong style={{ marginRight: 'auto' }}>
              #{index + 1} · {item.label || 'Untitled'}
            </strong>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => moveItem(item.id, -1)}>
              ↑
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => moveItem(item.id, 1)}>
              ↓
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => removeItem(item.id)}>
              Delete
            </button>
          </div>

          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor={`cta-label-${item.id}`}>Label</label>
              <input
                id={`cta-label-${item.id}`}
                className="admin-input"
                value={item.label}
                onChange={(e) => patchItem(item.id, { label: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label htmlFor={`cta-action-${item.id}`}>Action</label>
              <select
                id={`cta-action-${item.id}`}
                className="admin-select"
                value={item.action}
                onChange={(e) => patchItem(item.id, { action: e.target.value as HeaderCtaAction })}
              >
                {HEADER_CTA_ACTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            {item.action === 'consultation' ? (
              <div className="admin-field full">
                <label htmlFor={`cta-subject-${item.id}`}>Consultation subject</label>
                <input
                  id={`cta-subject-${item.id}`}
                  className="admin-input"
                  value={item.consultSubject}
                  onChange={(e) => patchItem(item.id, { consultSubject: e.target.value })}
                />
              </div>
            ) : null}
            {item.action === 'link' ? (
              <div className="admin-field full">
                <label htmlFor={`cta-href-${item.id}`}>Href</label>
                <input
                  id={`cta-href-${item.id}`}
                  className="admin-input"
                  value={item.href}
                  placeholder="/contact"
                  onChange={(e) => patchItem(item.id, { href: e.target.value })}
                />
              </div>
            ) : null}
            <div className="admin-field">
              <label htmlFor={`cta-icon-${item.id}`}>Icon</label>
              <select
                id={`cta-icon-${item.id}`}
                className="admin-select"
                value={item.icon}
                onChange={(e) => patchItem(item.id, { icon: e.target.value as HeaderCtaIcon })}
              >
                {HEADER_CTA_ICONS.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor={`cta-style-${item.id}`}>Chip color</label>
              <select
                id={`cta-style-${item.id}`}
                className="admin-select"
                value={item.style}
                onChange={(e) => patchItem(item.id, { style: e.target.value as HeaderCtaStyle })}
              >
                {HEADER_CTA_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <DisplaySelect
              id={`cta-desktop-${item.id}`}
              label="Desktop display"
              value={item.desktopDisplay}
              onChange={(desktopDisplay) => patchItem(item.id, { desktopDisplay })}
            />
            <DisplaySelect
              id={`cta-mobile-${item.id}`}
              label="Mobile display (≤900px)"
              value={item.mobileDisplay}
              onChange={(mobileDisplay) => patchItem(item.id, { mobileDisplay })}
            />
            {item.action === 'link' || item.action === 'whatsapp' ? (
              <div className="admin-field" style={{ display: 'flex', alignItems: 'end' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.openInNewTab}
                    onChange={(e) => patchItem(item.id, { openInNewTab: e.target.checked })}
                  />{' '}
                  Open in new tab
                </label>
              </div>
            ) : null}
          </div>
        </div>
      ))}

      <small style={{ color: 'var(--admin-muted)' }}>
        With a submenu, the orange trigger opens the chip panel (like Talk to us). Without submenu chips, it runs
        the primary action on click. Desktop/mobile can hide the control or show icon-only vs icon + label.
      </small>
    </div>
  );
}
