'use client';

import {
  DEFAULT_SITE_SETTINGS,
  sanitizeFooterOfficeAlign,
  type FooterOfficeAlign,
  type SiteSettings,
} from '@/lib/site-settings';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

const ALIGNS: Array<{ id: FooterOfficeAlign; label: string; hint: string }> = [
  { id: 'start', label: 'Start', hint: 'Left-aligned with the Contact column' },
  { id: 'center', label: 'Center', hint: 'Centered within the column' },
  { id: 'end', label: 'End', hint: 'Right-aligned within the column' },
];

function Toggle({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="admin-footer-office-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
    </label>
  );
}

function isOn(value: string | undefined, fallback: boolean) {
  const v = value?.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return fallback;
}

/** Show/hide + alignment controls for the footer office / address block. */
export default function FooterOfficeEditor({ settings, onChange }: Props) {
  const align = sanitizeFooterOfficeAlign(settings.footerOfficeAlign);

  return (
    <div className="admin-footer-office-editor">
      <p className="admin-footer-office-lead">
        Renders in the footer <strong>Contact</strong> column — after contact links, before social icons.
        Also powers JSON-LD, contact form SLA, thank-you, and /sla.
      </p>

      <div className="admin-footer-office-toggles">
        <Toggle
          id="footerOfficeEnabled"
          label="Show in footer"
          hint="Master switch for the office block in the footer"
          value={isOn(settings.footerOfficeEnabled, true)}
          onChange={(on) => onChange({ footerOfficeEnabled: on ? 'true' : 'false' })}
        />
        <Toggle
          id="footerOfficeShowAddress"
          label="Show address"
          hint="Street, city, region, postal, country"
          value={isOn(settings.footerOfficeShowAddress, true)}
          onChange={(on) => onChange({ footerOfficeShowAddress: on ? 'true' : 'false' })}
        />
        <Toggle
          id="footerOfficeShowHours"
          label="Show office hours"
          hint="Uses the Office hours field below"
          value={isOn(settings.footerOfficeShowHours, true)}
          onChange={(on) => onChange({ footerOfficeShowHours: on ? 'true' : 'false' })}
        />
        <Toggle
          id="footerOfficeShowSla"
          label="Show response SLA"
          hint="Uses the Response SLA text field below"
          value={isOn(settings.footerOfficeShowSla, false)}
          onChange={(on) => onChange({ footerOfficeShowSla: on ? 'true' : 'false' })}
        />
      </div>

      <div className="admin-field full">
        <span className="admin-footer-office-align-label">Text alignment</span>
        <div className="admin-footer-office-align" role="radiogroup" aria-label="Footer office alignment">
          {ALIGNS.map((opt) => {
            const active = align === opt.id;
            return (
              <label key={opt.id} className={`admin-footer-office-align-btn${active ? ' is-active' : ''}`}>
                <input
                  type="radio"
                  name="footerOfficeAlign"
                  value={opt.id}
                  checked={active}
                  onChange={() => onChange({ footerOfficeAlign: opt.id })}
                />
                <strong>{opt.label}</strong>
                <small>{opt.hint}</small>
              </label>
            );
          })}
        </div>
      </div>

      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="footerOfficeMarginTop">Top spacing</label>
          <input
            id="footerOfficeMarginTop"
            className="admin-input"
            value={settings.footerOfficeMarginTop}
            placeholder={DEFAULT_SITE_SETTINGS.footerOfficeMarginTop}
            onChange={(e) => onChange({ footerOfficeMarginTop: e.target.value })}
          />
          <small style={{ color: 'var(--admin-muted)' }}>e.g. 1.15rem, 24px</small>
        </div>
        <div className="admin-field">
          <label htmlFor="footerOfficeMaxWidth">Max width</label>
          <input
            id="footerOfficeMaxWidth"
            className="admin-input"
            value={settings.footerOfficeMaxWidth}
            placeholder="Full column"
            onChange={(e) => onChange({ footerOfficeMaxWidth: e.target.value })}
          />
          <small style={{ color: 'var(--admin-muted)' }}>e.g. 280px — leave blank for full column</small>
        </div>
      </div>
    </div>
  );
}
