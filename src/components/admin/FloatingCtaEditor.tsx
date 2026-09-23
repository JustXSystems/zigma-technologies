'use client';

import {
  createFloatingCtaItem,
  FLOATING_CTA_ACTIONS,
  FLOATING_CTA_STYLES,
  FLOATING_CTA_ZONES,
  parseFloatingCta,
  serializeFloatingCta,
  type FloatingCtaAction,
  type FloatingCtaConfig,
  type FloatingCtaItem,
  type FloatingCtaStyle,
  type FloatingCtaZone,
} from '@/lib/floating-cta';
import type { SiteSettings } from '@/lib/site-settings';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

export default function FloatingCtaEditor({ settings, onChange }: Props) {
  const config = parseFloatingCta(settings.floatingCtaJson);

  function commit(next: FloatingCtaConfig) {
    onChange({ floatingCtaJson: serializeFloatingCta(next) });
  }

  function patchConfig(patch: Partial<FloatingCtaConfig>) {
    commit({ ...config, ...patch, items: patch.items ?? config.items });
  }

  function patchItem(id: string, patch: Partial<FloatingCtaItem>) {
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
    if (!confirm(`Remove "${item.label}"?`)) return;
    commit({ ...config, items: config.items.filter((i) => i.id !== id) });
  }

  function addItem(zone: FloatingCtaZone) {
    commit({
      ...config,
      items: [
        ...config.items,
        createFloatingCtaItem({
          label: zone === 'float' ? 'WhatsApp' : 'New button',
          action: zone === 'float' ? 'whatsapp' : 'call',
          style: zone === 'float' ? 'float' : 'quote',
          zone,
          openInNewTab: zone === 'float',
          ariaLabel: zone === 'float' ? 'Chat on WhatsApp' : '',
        }),
      ],
    });
  }

  function resetDefaults() {
    if (!confirm('Reset sticky bar and floating buttons to defaults?')) return;
    commit(parseFloatingCta(''));
  }

  const stickyCount = config.items.filter((i) => i.zone === 'sticky').length;
  const floatCount = config.items.filter((i) => i.zone === 'float').length;

  return (
    <div className="admin-page-stack" style={{ gap: '1.25rem' }}>
      <p style={{ margin: 0, color: 'var(--admin-muted)', fontSize: '0.92rem', lineHeight: 1.5 }}>
        Controls the mobile sticky bar (<code>sticky-mobile-cta</code>) and floating buttons (
        <code>float-wa</code>). Toggle zones, then add / edit / reorder / show-hide individual buttons.
        Path filters use comma-separated prefixes (e.g. <code>/careers</code>).
      </p>

      <div className="admin-form-grid">
        <div className="admin-field" style={{ display: 'flex', alignItems: 'end' }}>
          <label>
            <input
              type="checkbox"
              checked={config.stickyEnabled}
              onChange={(e) => patchConfig({ stickyEnabled: e.target.checked })}
            />{' '}
            Show sticky mobile bar ({stickyCount} buttons)
          </label>
        </div>
        <div className="admin-field" style={{ display: 'flex', alignItems: 'end' }}>
          <label>
            <input
              type="checkbox"
              checked={config.floatEnabled}
              onChange={(e) => patchConfig({ floatEnabled: e.target.checked })}
            />{' '}
            Show floating buttons ({floatCount} buttons)
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ marginRight: 'auto' }}>Buttons</strong>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={resetDefaults}>
          Reset defaults
        </button>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => addItem('float')}>
          Add floating
        </button>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => addItem('sticky')}>
          Add sticky
        </button>
      </div>

      {config.items.length === 0 ? (
        <p style={{ color: 'var(--admin-muted)', margin: 0 }}>No buttons. Add one or reset to defaults.</p>
      ) : null}

      {config.items.map((item, index) => (
        <div
          key={item.id}
          className="admin-card"
          style={{
            padding: '1rem',
            border: '1px solid var(--admin-border, #e2e8f0)',
            opacity: item.enabled ? 1 : 0.55,
          }}
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
              #{index + 1} · {item.label || 'Untitled'}{' '}
              <span style={{ fontWeight: 500, color: 'var(--admin-muted)', fontSize: '0.85rem' }}>
                ({item.zone}
                {!item.enabled ? ' · hidden' : ''})
              </span>
            </strong>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => moveItem(item.id, -1)}>
              ↑
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => moveItem(item.id, 1)}>
              ↓
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => patchItem(item.id, { enabled: !item.enabled })}
            >
              {item.enabled ? 'Hide' : 'Show'}
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => removeItem(item.id)}>
              Delete
            </button>
          </div>

          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor={`float-cta-label-${item.id}`}>Label</label>
              <input
                id={`float-cta-label-${item.id}`}
                className="admin-input"
                value={item.label}
                onChange={(e) => patchItem(item.id, { label: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label htmlFor={`float-cta-aria-${item.id}`}>Aria label (optional)</label>
              <input
                id={`float-cta-aria-${item.id}`}
                className="admin-input"
                value={item.ariaLabel}
                onChange={(e) => patchItem(item.id, { ariaLabel: e.target.value })}
                placeholder="Used for icon-only floating buttons"
              />
            </div>
            <div className="admin-field">
              <label htmlFor={`float-cta-zone-${item.id}`}>Zone</label>
              <select
                id={`float-cta-zone-${item.id}`}
                className="admin-select"
                value={item.zone}
                onChange={(e) => patchItem(item.id, { zone: e.target.value as FloatingCtaZone })}
              >
                {FLOATING_CTA_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor={`float-cta-action-${item.id}`}>Action</label>
              <select
                id={`float-cta-action-${item.id}`}
                className="admin-select"
                value={item.action}
                onChange={(e) => patchItem(item.id, { action: e.target.value as FloatingCtaAction })}
              >
                {FLOATING_CTA_ACTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor={`float-cta-style-${item.id}`}>Style</label>
              <select
                id={`float-cta-style-${item.id}`}
                className="admin-select"
                value={item.style}
                onChange={(e) => patchItem(item.id, { style: e.target.value as FloatingCtaStyle })}
              >
                {FLOATING_CTA_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {item.action === 'link' ? (
              <div className="admin-field full">
                <label htmlFor={`float-cta-href-${item.id}`}>Href</label>
                <input
                  id={`float-cta-href-${item.id}`}
                  className="admin-input"
                  value={item.href}
                  onChange={(e) => patchItem(item.id, { href: e.target.value })}
                  placeholder="/contact or https://…"
                />
              </div>
            ) : null}
            {item.action === 'consultation' ? (
              <div className="admin-field full">
                <label htmlFor={`float-cta-subject-${item.id}`}>Enquiry subject</label>
                <input
                  id={`float-cta-subject-${item.id}`}
                  className="admin-input"
                  value={item.consultSubject}
                  onChange={(e) => patchItem(item.id, { consultSubject: e.target.value })}
                />
              </div>
            ) : null}
            <div className="admin-field">
              <label htmlFor={`float-cta-include-${item.id}`}>Show only on paths</label>
              <input
                id={`float-cta-include-${item.id}`}
                className="admin-input"
                value={item.pathsInclude}
                onChange={(e) => patchItem(item.id, { pathsInclude: e.target.value })}
                placeholder="empty = all pages"
              />
            </div>
            <div className="admin-field">
              <label htmlFor={`float-cta-exclude-${item.id}`}>Hide on paths</label>
              <input
                id={`float-cta-exclude-${item.id}`}
                className="admin-input"
                value={item.pathsExclude}
                onChange={(e) => patchItem(item.id, { pathsExclude: e.target.value })}
                placeholder="e.g. /careers"
              />
            </div>
            <div className="admin-field" style={{ display: 'flex', alignItems: 'end' }}>
              <label>
                <input
                  type="checkbox"
                  checked={item.openInNewTab}
                  onChange={(e) => patchItem(item.id, { openInNewTab: e.target.checked })}
                />{' '}
                Open link in new tab
              </label>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
