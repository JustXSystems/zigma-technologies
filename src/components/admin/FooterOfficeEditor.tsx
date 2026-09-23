'use client';

import {
  DEFAULT_SITE_SETTINGS,
  FOOTER_COLUMN_H6_TOKENS,
  FOOTER_OFFICE_ACCENT_LABEL_TOKENS,
  sanitizeFooterOfficeAlign,
  sanitizeFooterOfficeLabelMode,
  type FooterOfficeAlign,
  type FooterOfficeLabelMode,
  type SiteSettings,
} from '@/lib/site-settings';
import FooterOfficeLayoutEditor from '@/components/admin/FooterOfficeLayoutEditor';
import LogoFontPicker from '@/components/admin/LogoFontPicker';
import { LOGO_WEIGHT_OPTIONS } from '@/lib/logo-fonts';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

const ALIGNS: Array<{ id: FooterOfficeAlign; label: string; hint: string }> = [
  { id: 'start', label: 'Start', hint: 'Left-aligned with the Contact column' },
  { id: 'center', label: 'Center', hint: 'Centered within the column' },
  { id: 'end', label: 'End', hint: 'Right-aligned within the column' },
];

const LABEL_MODES: Array<{ id: FooterOfficeLabelMode; label: string; hint: string }> = [
  {
    id: 'match-h6',
    label: 'Match Contact h6',
    hint: 'Same type as the Contact column heading',
  },
  {
    id: 'accent',
    label: 'Accent',
    hint: 'Small cyan mono (legacy Hours look)',
  },
  {
    id: 'custom',
    label: 'Custom',
    hint: 'Pick font, size, color, weight, tracking',
  },
];

const TRANSFORM_OPTIONS = [
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'none', label: 'None' },
  { value: 'capitalize', label: 'Capitalize' },
  { value: 'lowercase', label: 'Lowercase' },
] as const;

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
      <input id={id} type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
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

function ModePicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: FooterOfficeLabelMode;
  onChange: (mode: FooterOfficeLabelMode) => void;
}) {
  return (
    <div className="admin-footer-office-align" role="radiogroup" aria-label={name}>
      {LABEL_MODES.map((opt) => {
        const active = value === opt.id;
        return (
          <label key={opt.id} className={`admin-footer-office-align-btn${active ? ' is-active' : ''}`}>
            <input
              type="radio"
              name={name}
              value={opt.id}
              checked={active}
              onChange={() => onChange(opt.id)}
            />
            <strong>{opt.label}</strong>
            <small>{opt.hint}</small>
          </label>
        );
      })}
    </div>
  );
}

function CustomTypeFields({
  idPrefix,
  fontKey,
  sizeKey,
  colorKey,
  weightKey,
  spacingKey,
  transformKey,
  settings,
  onChange,
}: {
  idPrefix: string;
  fontKey: keyof SiteSettings;
  sizeKey: keyof SiteSettings;
  colorKey: keyof SiteSettings;
  weightKey: keyof SiteSettings;
  spacingKey: keyof SiteSettings;
  transformKey: keyof SiteSettings;
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
}) {
  const set = (key: keyof SiteSettings, value: string) => onChange({ [key]: value });
  return (
    <div className="admin-form-grid" style={{ marginTop: '0.75rem' }}>
      <div className="admin-field full">
        <LogoFontPicker
          id={`${idPrefix}-font`}
          label="Font"
          value={settings[fontKey] || ''}
          onChange={(v) => set(fontKey, v)}
        />
      </div>
      <div className="admin-field">
        <label htmlFor={`${idPrefix}-size`}>Size</label>
        <input
          id={`${idPrefix}-size`}
          className="admin-input"
          value={settings[sizeKey]}
          placeholder={FOOTER_COLUMN_H6_TOKENS.size}
          onChange={(e) => set(sizeKey, e.target.value)}
        />
      </div>
      <div className="admin-field">
        <label htmlFor={`${idPrefix}-color`}>Color</label>
        <input
          id={`${idPrefix}-color`}
          className="admin-input"
          value={settings[colorKey]}
          placeholder={FOOTER_COLUMN_H6_TOKENS.color}
          onChange={(e) => set(colorKey, e.target.value)}
        />
        <small style={{ color: 'var(--admin-muted)' }}>Hex, rgb, or var(--white)</small>
      </div>
      <div className="admin-field">
        <label htmlFor={`${idPrefix}-weight`}>Weight</label>
        <select
          id={`${idPrefix}-weight`}
          className="admin-input"
          value={settings[weightKey]}
          onChange={(e) => set(weightKey, e.target.value)}
        >
          {LOGO_WEIGHT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-field">
        <label htmlFor={`${idPrefix}-spacing`}>Letter spacing</label>
        <input
          id={`${idPrefix}-spacing`}
          className="admin-input"
          value={settings[spacingKey]}
          placeholder={FOOTER_COLUMN_H6_TOKENS.letterSpacing}
          onChange={(e) => set(spacingKey, e.target.value)}
        />
      </div>
      <div className="admin-field">
        <label htmlFor={`${idPrefix}-transform`}>Transform</label>
        <select
          id={`${idPrefix}-transform`}
          className="admin-input"
          value={settings[transformKey]}
          onChange={(e) => set(transformKey, e.target.value)}
        >
          {TRANSFORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Show/hide, labels, type, alignment, and address line layout for the footer office block. */
export default function FooterOfficeEditor({ settings, onChange }: Props) {
  const align = sanitizeFooterOfficeAlign(settings.footerOfficeAlign);
  const labelMode = sanitizeFooterOfficeLabelMode(settings.footerOfficeLabelMode);
  const metaMode = sanitizeFooterOfficeLabelMode(settings.footerOfficeMetaLabelMode);

  return (
    <div className="admin-footer-office-editor">
      <p className="admin-footer-office-lead">
        Renders in the footer <strong>Contact</strong> column — after contact links, before social icons.
        Arrange address fields into 3 or 4 lines (or custom) with the layout builder. Label text and type
        live here (default matches the Contact <code>h6</code>).
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
          id="footerOfficeShowLabel"
          label="Show office heading"
          hint="Office / address block title above the lines"
          value={isOn(settings.footerOfficeShowLabel, true)}
          onChange={(on) => onChange({ footerOfficeShowLabel: on ? 'true' : 'false' })}
        />
        <Toggle
          id="footerOfficeShowAddress"
          label="Include address fields"
          hint="Street, city, region, postal, country in the layout"
          value={isOn(settings.footerOfficeShowAddress, true)}
          onChange={(on) => onChange({ footerOfficeShowAddress: on ? 'true' : 'false' })}
        />
        <Toggle
          id="footerOfficeShowHours"
          label="Include office hours"
          hint="Only if hours is in the layout"
          value={isOn(settings.footerOfficeShowHours, true)}
          onChange={(on) => onChange({ footerOfficeShowHours: on ? 'true' : 'false' })}
        />
        <Toggle
          id="footerOfficeShowSla"
          label="Include response SLA"
          hint="Only if SLA is in the layout"
          value={isOn(settings.footerOfficeShowSla, false)}
          onChange={(on) => onChange({ footerOfficeShowSla: on ? 'true' : 'false' })}
        />
      </div>

      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="footerOfficeLabel">Office heading label</label>
          <input
            id="footerOfficeLabel"
            className="admin-input"
            value={settings.footerOfficeLabel}
            placeholder={DEFAULT_SITE_SETTINGS.footerOfficeLabel}
            onChange={(e) => onChange({ footerOfficeLabel: e.target.value })}
          />
          <small style={{ color: 'var(--admin-muted)' }}>Shown above the address (like Contact)</small>
        </div>
        <div className="admin-field">
          <label htmlFor="footerOfficeHoursLabel">Hours label</label>
          <input
            id="footerOfficeHoursLabel"
            className="admin-input"
            value={settings.footerOfficeHoursLabel}
            placeholder={DEFAULT_SITE_SETTINGS.footerOfficeHoursLabel}
            onChange={(e) => onChange({ footerOfficeHoursLabel: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="footerOfficeSlaLabel">SLA label</label>
          <input
            id="footerOfficeSlaLabel"
            className="admin-input"
            value={settings.footerOfficeSlaLabel}
            placeholder={DEFAULT_SITE_SETTINGS.footerOfficeSlaLabel}
            onChange={(e) => onChange({ footerOfficeSlaLabel: e.target.value })}
          />
        </div>
      </div>

      <div className="admin-field full" style={{ marginTop: '1rem' }}>
        <span className="admin-footer-office-align-label">Office heading type</span>
        <ModePicker
          name="footerOfficeLabelMode"
          value={labelMode}
          onChange={(mode) => onChange({ footerOfficeLabelMode: mode })}
        />
        {labelMode === 'match-h6' ? (
          <p className="admin-footer-office-lead" style={{ marginBottom: 0, marginTop: '0.65rem' }}>
            Uses Contact column heading type: {FOOTER_COLUMN_H6_TOKENS.size} / white / mono / uppercase.
          </p>
        ) : null}
        {labelMode === 'accent' ? (
          <p className="admin-footer-office-lead" style={{ marginBottom: 0, marginTop: '0.65rem' }}>
            Uses accent tokens: {FOOTER_OFFICE_ACCENT_LABEL_TOKENS.size} / cyan.
          </p>
        ) : null}
        {labelMode === 'custom' ? (
          <CustomTypeFields
            idPrefix="office-label"
            fontKey="footerOfficeLabelFont"
            sizeKey="footerOfficeLabelSize"
            colorKey="footerOfficeLabelColor"
            weightKey="footerOfficeLabelWeight"
            spacingKey="footerOfficeLabelLetterSpacing"
            transformKey="footerOfficeLabelTransform"
            settings={settings}
            onChange={onChange}
          />
        ) : null}
      </div>

      <div className="admin-field full" style={{ marginTop: '1rem' }}>
        <span className="admin-footer-office-align-label">Hours / SLA label type</span>
        <ModePicker
          name="footerOfficeMetaLabelMode"
          value={metaMode}
          onChange={(mode) => onChange({ footerOfficeMetaLabelMode: mode })}
        />
        {metaMode === 'match-h6' ? (
          <p className="admin-footer-office-lead" style={{ marginBottom: 0, marginTop: '0.65rem' }}>
            Hours and Reply labels match Contact <code>h6</code>.
          </p>
        ) : null}
        {metaMode === 'accent' ? (
          <p className="admin-footer-office-lead" style={{ marginBottom: 0, marginTop: '0.65rem' }}>
            Small cyan mono labels beside the hours / SLA values.
          </p>
        ) : null}
        {metaMode === 'custom' ? (
          <CustomTypeFields
            idPrefix="office-meta-label"
            fontKey="footerOfficeMetaLabelFont"
            sizeKey="footerOfficeMetaLabelSize"
            colorKey="footerOfficeMetaLabelColor"
            weightKey="footerOfficeMetaLabelWeight"
            spacingKey="footerOfficeMetaLabelLetterSpacing"
            transformKey="footerOfficeMetaLabelTransform"
            settings={settings}
            onChange={onChange}
          />
        ) : null}
      </div>

      <FooterOfficeLayoutEditor settings={settings} onChange={onChange} />

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
