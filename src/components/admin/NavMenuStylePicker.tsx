'use client';

import { NAV_MENU_STYLES, sanitizeNavMenuStyle, type SiteSettings } from '@/lib/site-settings';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

export default function NavMenuStylePicker({ settings, onChange }: Props) {
  const selected = sanitizeNavMenuStyle(settings.navMenuStyle);

  return (
    <div className="admin-nav-style-picker" role="radiogroup" aria-label="Navigation menu style">
      {NAV_MENU_STYLES.map((style) => {
        const active = selected === style.id;
        return (
          <label
            key={style.id}
            className={`admin-nav-style-card${active ? ' is-active' : ''}`}
            data-style={style.id}
          >
            <input
              type="radio"
              name="navMenuStyle"
              value={style.id}
              checked={active}
              onChange={() => onChange({ navMenuStyle: style.id })}
            />
            <span className="admin-nav-style-preview" aria-hidden>
              <span className="admin-nav-style-preview-bar">
                <i />
                <i />
                <i className="is-open" />
                <i />
              </span>
              <span className="admin-nav-style-preview-panel">
                <span />
                <span />
                <span />
              </span>
            </span>
            <span className="admin-nav-style-copy">
              <strong>{style.label}</strong>
              <small>{style.description}</small>
            </span>
          </label>
        );
      })}
    </div>
  );
}
