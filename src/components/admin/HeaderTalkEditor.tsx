'use client';

import {
  createHeaderTalkItem,
  HEADER_TALK_ACTIONS,
  HEADER_TALK_DISPLAY_MODES,
  HEADER_TALK_ICONS,
  HEADER_TALK_STYLES,
  parseHeaderTalk,
  serializeHeaderTalk,
  type HeaderTalkAction,
  type HeaderTalkConfig,
  type HeaderTalkDisplay,
  type HeaderTalkIcon,
  type HeaderTalkItem,
  type HeaderTalkStyle,
} from '@/lib/header-talk';
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
  value: HeaderTalkDisplay;
  onChange: (v: HeaderTalkDisplay) => void;
}) {
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="admin-select"
        value={value}
        onChange={(e) => onChange(e.target.value as HeaderTalkDisplay)}
      >
        {HEADER_TALK_DISPLAY_MODES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function HeaderTalkEditor({ settings, onChange }: Props) {
  const config = parseHeaderTalk(settings.headerTalkJson);

  function commit(next: HeaderTalkConfig) {
    onChange({ headerTalkJson: serializeHeaderTalk(next) });
  }

  function patchTrigger(patch: Partial<HeaderTalkConfig>) {
    commit({ ...config, ...patch, items: config.items });
  }

  function patchItem(id: string, patch: Partial<HeaderTalkItem>) {
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
    if (!confirm(`Remove "${item.label}" from Talk submenu?`)) return;
    commit({ ...config, items: config.items.filter((i) => i.id !== id) });
  }

  function addItem() {
    commit({
      ...config,
      items: [
        ...config.items,
        createHeaderTalkItem({
          label: 'New action',
          action: 'link',
          href: '/contact',
          icon: 'link',
          style: 'tool',
        }),
      ],
    });
  }

  function resetDefaults() {
    if (!confirm('Reset Talk to us button and submenu to defaults?')) return;
    commit(parseHeaderTalk(''));
  }

  return (
    <div className="admin-page-stack" style={{ gap: '1.25rem' }}>
      <div className="admin-form-grid">
        <div className="admin-field full">
          <label htmlFor="header-talk-label">Trigger button label</label>
          <input
            id="header-talk-label"
            className="admin-input"
            value={config.buttonLabel}
            onChange={(e) => patchTrigger({ buttonLabel: e.target.value })}
          />
        </div>
        <DisplaySelect
          id="header-talk-desktop"
          label="Desktop display"
          value={config.desktopDisplay}
          onChange={(desktopDisplay) => patchTrigger({ desktopDisplay })}
        />
        <DisplaySelect
          id="header-talk-mobile"
          label="Mobile display (≤900px)"
          value={config.mobileDisplay}
          onChange={(mobileDisplay) => patchTrigger({ mobileDisplay })}
        />
        <div className="admin-field" style={{ display: 'flex', alignItems: 'end' }}>
          <label>
            <input
              type="checkbox"
              checked={config.showPulse}
              onChange={(e) => patchTrigger({ showPulse: e.target.checked })}
            />{' '}
            Show pulse dot on icon
          </label>
        </div>
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
        <p style={{ color: 'var(--admin-muted)', margin: 0 }}>No submenu buttons. Add one or reset to defaults.</p>
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
              <label htmlFor={`talk-label-${item.id}`}>Label</label>
              <input
                id={`talk-label-${item.id}`}
                className="admin-input"
                value={item.label}
                onChange={(e) => patchItem(item.id, { label: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label htmlFor={`talk-action-${item.id}`}>Action</label>
              <select
                id={`talk-action-${item.id}`}
                className="admin-select"
                value={item.action}
                onChange={(e) => patchItem(item.id, { action: e.target.value as HeaderTalkAction })}
              >
                {HEADER_TALK_ACTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            {item.action === 'link' || item.action === 'solution_finder' ? (
              <div className="admin-field full">
                <label htmlFor={`talk-href-${item.id}`}>
                  {item.action === 'solution_finder' ? 'Href (optional override)' : 'Href'}
                </label>
                <input
                  id={`talk-href-${item.id}`}
                  className="admin-input"
                  value={item.href}
                  placeholder={item.action === 'solution_finder' ? '/tools/solution-finder' : '/contact'}
                  onChange={(e) => patchItem(item.id, { href: e.target.value })}
                />
              </div>
            ) : null}
            <div className="admin-field">
              <label htmlFor={`talk-icon-${item.id}`}>Icon</label>
              <select
                id={`talk-icon-${item.id}`}
                className="admin-select"
                value={item.icon}
                onChange={(e) => patchItem(item.id, { icon: e.target.value as HeaderTalkIcon })}
              >
                {HEADER_TALK_ICONS.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor={`talk-style-${item.id}`}>Chip color</label>
              <select
                id={`talk-style-${item.id}`}
                className="admin-select"
                value={item.style}
                onChange={(e) => patchItem(item.id, { style: e.target.value as HeaderTalkStyle })}
              >
                {HEADER_TALK_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <DisplaySelect
              id={`talk-desktop-${item.id}`}
              label="Desktop display"
              value={item.desktopDisplay}
              onChange={(desktopDisplay) => patchItem(item.id, { desktopDisplay })}
            />
            <DisplaySelect
              id={`talk-mobile-${item.id}`}
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
        Call / WhatsApp / Emergency use Site Settings contact numbers. Callback opens the header callback form.
        Hidden on a breakpoint removes that chip (or the whole Talk control) for that viewport.
      </small>
    </div>
  );
}
