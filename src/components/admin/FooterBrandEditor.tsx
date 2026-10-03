'use client';

import {
  DEFAULT_SITE_SETTINGS,
  describeFooterLogoInherit,
  isSettingEnabled,
  sanitizeFooterLogoMode,
  sanitizeFooterOfficeAlign,
  type FooterLogoMode,
  type FooterOfficeAlign,
  type SiteSettings,
} from '@/lib/site-settings';
import LogoTypeEditor from '@/components/admin/LogoTypeEditor';
import MediaPicker from '@/components/admin/MediaPicker';
import { ToggleCard } from '@/components/admin/form/controls';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

const ALIGNS: Array<{ id: FooterOfficeAlign; label: string; hint: string }> = [
  { id: 'start', label: 'Start', hint: 'Left-aligned brand column' },
  { id: 'center', label: 'Center', hint: 'Centered logo + copy' },
  { id: 'end', label: 'End', hint: 'Right-aligned brand column' },
];

const VISIBILITY: Array<{ key: keyof SiteSettings; label: string; hint: string }> = [
  { key: 'footerBrandShowLogo', label: 'Show logo chip', hint: 'Image mark in the footer brand lockup' },
  { key: 'footerBrandShowName', label: 'Show company name', hint: 'From Brand & identity · Company name' },
  { key: 'footerBrandShowTagline', label: 'Show logo tagline', hint: 'Small line under the company name' },
  { key: 'footerBrandShowBlurb', label: 'Show footer blurb', hint: 'Paragraph under the logo lockup' },
  { key: 'footerBrandShowNewsletter', label: 'Show newsletter', hint: 'Subscribe form under the blurb' },
];

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
        {VISIBILITY.map((t) => (
          <ToggleCard
            key={t.key}
            id={t.key}
            label={t.label}
            hint={t.hint}
            checked={isSettingEnabled(settings[t.key], true)}
            onChange={(on) => onChange({ [t.key]: on ? 'true' : 'false' })}
          />
        ))}
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
        <div className="full">
          <MediaPicker
            id="footerLogoUrl"
            label="Footer logo image (optional)"
            value={settings.footerLogoUrl}
            onChange={(footerLogoUrl) => onChange({ footerLogoUrl })}
            kinds={['image', 'svg']}
            allowUpload
            hint="Blank = use the Brand & identity logo. Overrides only the footer mark; the header keeps the main logo."
          />
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
