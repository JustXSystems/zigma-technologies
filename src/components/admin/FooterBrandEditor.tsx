'use client';

import {
  DEFAULT_SITE_SETTINGS,
  describeFooterLogoInherit,
  sanitizeFooterLogoMode,
  sanitizeFooterOfficeAlign,
  type FooterLogoMode,
  type FooterOfficeAlign,
  type SiteSettings,
} from '@/lib/site-settings';
import LogoTypeEditor from '@/components/admin/LogoTypeEditor';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

const ALIGNS: Array<{ id: FooterOfficeAlign; label: string; hint: string }> = [
  { id: 'start', label: 'Start', hint: 'Left-aligned brand column' },
  { id: 'center', label: 'Center', hint: 'Centered logo + copy' },
  { id: 'end', label: 'End', hint: 'Right-aligned brand column' },
];

function isOn(value: string | undefined, fallback: boolean) {
  const v = value?.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return fallback;
}

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

/**
 * Full control for footer .foot-brand — visibility, alignment, and logo type
 * (inherit from header Logo chip & word type, or customize with the same editor UI).
 */
export default function FooterBrandEditor({ settings, onChange }: Props) {
  const mode = sanitizeFooterLogoMode(settings.footerLogoMode);
  const align = sanitizeFooterOfficeAlign(settings.footerBrandAlign);
  const inherit = describeFooterLogoInherit(settings);

  return (
    <div className="admin-footer-brand-editor">
      <p className="admin-footer-office-lead">
        Controls the public footer <strong>.foot-brand</strong> column. Company name, tagline text, and
        blurb come from <strong>Brand &amp; identity</strong>. Logo sizing reuses the same editor as{' '}
        <strong>Logo chip &amp; word type</strong> — inherit matches header exactly, or customize.
      </p>

      <div className="admin-footer-office-toggles">
        <Toggle
          id="footerBrandShowLogo"
          label="Show logo chip"
          hint="Image mark in the footer brand lockup"
          value={isOn(settings.footerBrandShowLogo, true)}
          onChange={(on) => onChange({ footerBrandShowLogo: on ? 'true' : 'false' })}
        />
        <Toggle
          id="footerBrandShowName"
          label="Show company name"
          hint="From Brand & identity · Company name"
          value={isOn(settings.footerBrandShowName, true)}
          onChange={(on) => onChange({ footerBrandShowName: on ? 'true' : 'false' })}
        />
        <Toggle
          id="footerBrandShowTagline"
          label="Show logo tagline"
          hint="Small line under the company name"
          value={isOn(settings.footerBrandShowTagline, true)}
          onChange={(on) => onChange({ footerBrandShowTagline: on ? 'true' : 'false' })}
        />
        <Toggle
          id="footerBrandShowBlurb"
          label="Show footer blurb"
          hint="Paragraph under the logo lockup"
          value={isOn(settings.footerBrandShowBlurb, true)}
          onChange={(on) => onChange({ footerBrandShowBlurb: on ? 'true' : 'false' })}
        />
        <Toggle
          id="footerBrandShowNewsletter"
          label="Show newsletter"
          hint="Subscribe form under the blurb"
          value={isOn(settings.footerBrandShowNewsletter, true)}
          onChange={(on) => onChange({ footerBrandShowNewsletter: on ? 'true' : 'false' })}
        />
      </div>

      <div className="admin-field full">
        <span className="admin-footer-office-align-label">Brand column alignment</span>
        <div className="admin-footer-office-align" role="radiogroup" aria-label="Footer brand alignment">
          {ALIGNS.map((opt) => {
            const active = align === opt.id;
            return (
              <label key={opt.id} className={`admin-footer-office-align-btn${active ? ' is-active' : ''}`}>
                <input
                  type="radio"
                  name="footerBrandAlign"
                  value={opt.id}
                  checked={active}
                  onChange={() => onChange({ footerBrandAlign: opt.id })}
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
          <label htmlFor="footerBrandMaxWidth">Max width (desktop)</label>
          <input
            id="footerBrandMaxWidth"
            className="admin-input"
            value={settings.footerBrandMaxWidth}
            placeholder={DEFAULT_SITE_SETTINGS.footerBrandMaxWidth}
            onChange={(e) => onChange({ footerBrandMaxWidth: e.target.value })}
          />
          <small style={{ color: 'var(--admin-muted)' }}>e.g. 420px — use none for full column</small>
        </div>
        <div className="admin-field">
          <label htmlFor="footerBrandMaxWidthMobile">Max width (mobile)</label>
          <input
            id="footerBrandMaxWidthMobile"
            className="admin-input"
            value={settings.footerBrandMaxWidthMobile}
            placeholder={DEFAULT_SITE_SETTINGS.footerBrandMaxWidthMobile}
            onChange={(e) => onChange({ footerBrandMaxWidthMobile: e.target.value })}
          />
          <small style={{ color: 'var(--admin-muted)' }}>Default none (full width under 760px)</small>
        </div>
        <div className="admin-field full">
          <label htmlFor="footerLogoUrl">Footer logo image URL (optional)</label>
          <input
            id="footerLogoUrl"
            className="admin-input"
            value={settings.footerLogoUrl}
            placeholder="Blank = use Brand & identity logo"
            onChange={(e) => onChange({ footerLogoUrl: e.target.value })}
          />
          <small style={{ color: 'var(--admin-muted)' }}>
            Override only the footer mark; header keeps the main logo URL
          </small>
        </div>
        <div className="admin-field full">
          <label htmlFor="footerBlurb">Footer blurb</label>
          <textarea
            id="footerBlurb"
            className="admin-textarea"
            value={settings.footerBlurb}
            placeholder={DEFAULT_SITE_SETTINGS.footerBlurb}
            onChange={(e) => onChange({ footerBlurb: e.target.value })}
          />
          <small style={{ color: 'var(--admin-muted)' }}>Shown under the logo lockup when “Show footer blurb” is on</small>
        </div>
      </div>

      <div className="admin-field full">
        <span className="admin-footer-office-align-label">Logo type source</span>
        <div className="admin-footer-logo-mode" role="radiogroup" aria-label="Footer logo type mode">
          {(
            [
              {
                id: 'inherit' as FooterLogoMode,
                label: 'Inherit from header',
                hint: 'Exact 1:1 match — same chip, font, size, spacing, and tagline as the header',
              },
              {
                id: 'custom' as FooterLogoMode,
                label: 'Customize footer type',
                hint: 'Independent chip, name, and tagline type for the footer only',
              },
            ] as const
          ).map((opt) => {
            const active = mode === opt.id;
            return (
              <label key={opt.id} className={`admin-footer-office-align-btn${active ? ' is-active' : ''}`}>
                <input
                  type="radio"
                  name="footerLogoMode"
                  value={opt.id}
                  checked={active}
                  onChange={() => onChange({ footerLogoMode: opt.id })}
                />
                <strong>{opt.label}</strong>
                <small>{opt.hint}</small>
              </label>
            );
          })}
        </div>
      </div>

      {mode === 'custom' ? (
        <div className="admin-footer-brand-type">
          <h3 className="logo-type-block-title">Footer logo chip &amp; word type</h3>
          <LogoTypeEditor settings={settings} onChange={onChange} scope="footer" />
        </div>
      ) : (
        <p className="admin-footer-office-lead" style={{ marginBottom: 0 }}>
          Footer lockup matches <strong>Logo chip &amp; word type</strong> exactly: chip{' '}
          <code>{inherit.chip}</code> / <code>{inherit.chipMobile}</code> mobile; company name{' '}
          <code>{inherit.word}</code> / <code>{inherit.wordMobile}</code> mobile; fonts, weight, tracking,
          and tagline identical to header. Switch to Customize for a distinct footer scale. Check Logo
          preview → Footer to verify.
        </p>
      )}
    </div>
  );
}
