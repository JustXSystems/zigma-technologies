'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import LogoBrandPreview from '@/components/admin/LogoBrandPreview';
import LogoTypeEditor, { FOOTER_LOGO_TYPE_KEYS } from '@/components/admin/LogoTypeEditor';
import NavMenuStylePicker from '@/components/admin/NavMenuStylePicker';
import HeadingLevelPicker from '@/components/admin/HeadingLevelPicker';
import EyebrowSizeEditor from '@/components/admin/EyebrowSizeEditor';
import HeaderTalkEditor from '@/components/admin/HeaderTalkEditor';
import HeaderCtaEditor from '@/components/admin/HeaderCtaEditor';
import FooterOfficeEditor from '@/components/admin/FooterOfficeEditor';
import FooterBrandEditor from '@/components/admin/FooterBrandEditor';

type FieldDef = {
  key: keyof SiteSettings;
  label: string;
  hint?: string;
  full?: boolean;
  multiline?: boolean;
  placeholder?: string;
};

const SECTIONS: Array<{ id: string; title: string; description: string; defaultOpen?: boolean; fields: FieldDef[] }> = [
  {
    id: 'brand',
    title: 'Brand & identity',
    description: 'Company name, logo image, tagline, and footer blurb — shared by header and footer .foot-brand.',
    defaultOpen: true,
    fields: [
      { key: 'companyName', label: 'Company name' },
      {
        key: 'tagline',
        label: 'Logo tagline',
        hint: 'Supports HTML: <br>, <b>, <i>, <em>, <strong>, <span>',
        full: true,
      },
      { key: 'logoUrl', label: 'Logo image URL', hint: 'Used in header, footer (unless overridden), and ecosystem mark', full: true },
      { key: 'logoAlt', label: 'Logo alt text', hint: 'Accessible name for the logo image sitewide' },
      { key: 'footerBlurb', label: 'Footer blurb', hint: 'Also editable under Footer brand', full: true, multiline: true },
    ],
  },
  {
    id: 'logo-sizes',
    title: 'Logo chip & word type',
    description:
      'Header logo image height plus company name and tagline type. Footer can inherit these (scaled) or customize under Footer brand. Preview toggles Header/Footer.',
    defaultOpen: true,
    fields: [],
  },
  {
    id: 'footer-brand',
    title: 'Footer brand',
    description:
      'Full control of .foot-brand: visibility, alignment, max width, optional footer logo URL, and inherit vs custom logo type (reuses Logo chip & word type UI).',
    defaultOpen: true,
    fields: [],
  },
  {
    id: 'contact',
    title: 'Contact details',
    description: 'Phone, email, and WhatsApp used in header and floating actions.',
    defaultOpen: false,
    fields: [
      { key: 'phone', label: 'Main phone' },
      { key: 'emergencyPhone', label: 'Emergency phone' },
      { key: 'email', label: 'Info email' },
      { key: 'supportEmail', label: 'Support email' },
      {
        key: 'whatsapp',
        label: 'WhatsApp number (digits only)',
        hint: 'e.g. 919590137444 — powers header, floating button, and mobile sticky chat',
        full: true,
      },
    ],
  },
  {
    id: 'header-cta',
    title: 'Request Consultation (header)',
    description:
      'Configure the orange header CTA: labels A/B, primary action, optional submenu chips (add/edit/delete/reorder), and desktop/mobile display (hidden, icon only, or icon + label).',
    defaultOpen: true,
    fields: [],
  },
  {
    id: 'header-talk',
    title: 'Talk to us (header)',
    description:
      'Configure the header Talk to us trigger and its submenu chips: add, edit, delete, reorder, and set desktop/mobile display (hidden, icon only, or icon + label).',
    defaultOpen: true,
    fields: [],
  },
  {
    id: 'nav-menu-style',
    title: 'Navigation menu style',
    description:
      'Choose how the public header and mega-menu look. Classic keeps today’s panels; Corporate matches a JustX-style compact dropdown. Also includes Lumen, Mosaic, and Ribbon modern variants.',
    defaultOpen: true,
    fields: [],
  },
  {
    id: 'heading-levels',
    title: 'Public heading levels',
    description:
      'Control whether page heroes and section titles render as H1, H2, or H3. Defaults to H3 (compact). Raise a role to H2/H1 for more emphasis — type size follows the theme tokens.',
    defaultOpen: true,
    fields: [],
  },
  {
    id: 'eyebrow-sizes',
    title: 'Eyebrow font sizes',
    description:
      'Uppercase mono labels above section titles. Base, medium (heroes), and large (.eyebrow-lg / section heads) sizes map to --text-eyebrow CSS variables.',
    defaultOpen: true,
    fields: [],
  },
  {
    id: 'footer-legal',
    title: 'Footer & legal',
    description: 'Copyright, powered-by credit, and policy links.',
    defaultOpen: false,
    fields: [
      { key: 'copyright', label: 'Copyright line', full: true },
      {
        key: 'poweredByEnabled',
        label: 'Powered by credit (true/false)',
        hint: 'When false, the footer credit is hidden',
      },
      { key: 'poweredByPrefix', label: 'Powered by prefix', hint: 'e.g. Powered by' },
      { key: 'poweredByName', label: 'Powered by name', hint: 'e.g. JustX Systems' },
      {
        key: 'poweredByUrl',
        label: 'Powered by URL',
        hint: 'Leave blank to show the name without a link',
        full: true,
      },
      { key: 'privacyUrl', label: 'Privacy Policy URL' },
      { key: 'termsUrl', label: 'Terms URL' },
      { key: 'cookiePolicyUrl', label: 'Cookie Policy URL' },
    ],
  },
  {
    id: 'social-links',
    title: 'Social links',
    description:
      'Profile URLs shown as icons in the footer brand column. Leave blank to hide a network. Also used in Organization JSON-LD (sameAs).',
    defaultOpen: true,
    fields: [
      {
        key: 'facebookUrl',
        label: 'Facebook URL',
        hint: 'e.g. https://www.facebook.com/your-page — leave blank to hide',
        full: true,
      },
      {
        key: 'instagramUrl',
        label: 'Instagram URL',
        hint: 'e.g. https://www.instagram.com/your-handle — leave blank to hide',
        full: true,
      },
      {
        key: 'linkedinUrl',
        label: 'LinkedIn URL',
        hint: 'e.g. https://www.linkedin.com/company/your-company — leave blank to hide',
        full: true,
      },
      {
        key: 'xUrl',
        label: 'X (Twitter) URL',
        hint: 'e.g. https://x.com/your-handle — leave blank to hide',
        full: true,
      },
      {
        key: 'youtubeUrl',
        label: 'YouTube URL',
        hint: 'e.g. https://www.youtube.com/@your-channel — leave blank to hide',
        full: true,
      },
    ],
  },
  {
    id: 'seo',
    title: 'SEO & social',
    description: 'Default meta description and OG image.',
    defaultOpen: false,
    fields: [
      { key: 'defaultMetaDescription', label: 'Default meta description', full: true, multiline: true },
      { key: 'ogImage', label: 'Default OG / social image URL', full: true },
    ],
  },
  {
    id: 'address',
    title: 'Address & office',
    description:
      'Postal address values, plus footer line layout (3/4-line field builder). Also used for Organization JSON-LD, contact form, thank-you, and /sla.',
    defaultOpen: false,
    fields: [
      { key: 'addressStreet', label: 'Address street (line 1)', hint: 'Building / plot / road', full: true },
      {
        key: 'addressStreet2',
        label: 'Address street (line 2)',
        hint: 'Area, landmark, or continuation — leave blank to hide',
        full: true,
      },
      { key: 'addressLocality', label: 'Address city', hint: 'Default Bengaluru' },
      { key: 'addressRegion', label: 'Address region/state' },
      { key: 'addressPostal', label: 'Postal code' },
      { key: 'addressCountry', label: 'Country code', hint: 'e.g. IN (shown as India in footer)' },
      { key: 'officeHours', label: 'Office hours', hint: 'Footer, contact form, thank-you, /sla' },
      { key: 'responseSla', label: 'Response SLA text', hint: 'e.g. within 1 business day' },
      { key: 'bookingUrl', label: 'Booking / calendar URL', hint: 'Shown on thank-you page', full: true },
      {
        key: 'slaMetricsJson',
        label: 'SLA metrics JSON',
        hint: 'Array of {label,value} for /sla dashboard',
        full: true,
        multiline: true,
      },
    ],
  },
  {
    id: 'enquiries',
    title: 'Enquiries & CRM',
    description: 'Notification emails, visitor auto-reply, and CRM webhook.',
    defaultOpen: false,
    fields: [
      {
        key: 'enquiryNotifyEmail',
        label: 'Enquiry notify emails',
        hint: 'Comma-separated. Requires SMTP_* in .env',
        full: true,
      },
      {
        key: 'enquiryNotifyEnabled',
        label: 'Enquiry email notify (true/false)',
        hint: 'Set to false to silence notifications without clearing addresses',
      },
      {
        key: 'visitorAutoReplyEnabled',
        label: 'Visitor auto-reply (true/false)',
        hint: 'Send confirmation email to submitter on enquiry/careers (requires SMTP)',
      },
      {
        key: 'crmWebhookUrl',
        label: 'CRM webhook URL',
        hint: 'Zapier/Make/HubSpot/custom POST endpoint for leads',
        full: true,
      },
      { key: 'crmWebhookSecret', label: 'CRM webhook bearer secret', hint: 'Optional Authorization: Bearer …' },
      {
        key: 'crmProvider',
        label: 'CRM provider label',
        hint: 'e.g. webhook, hubspot, zoho — stored on payload only',
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics & consent',
    description: 'GA4, Plausible, Turnstile, and consent toggles.',
    defaultOpen: false,
    fields: [
      { key: 'ga4MeasurementId', label: 'GA4 measurement ID', hint: 'e.g. G-XXXXXXXX — leave blank to disable' },
      { key: 'plausibleDomain', label: 'Plausible domain', hint: 'e.g. zigma-technologies.com' },
      {
        key: 'analyticsConsentRequired',
        label: 'Require analytics consent (true/false)',
        hint: 'When true, GA4/Plausible load only after Accept',
      },
      { key: 'marketingConsentEnabled', label: 'Show marketing consent toggle (true/false)' },
      {
        key: 'turnstileEnabled',
        label: 'Turnstile enabled note (true/false)',
        hint: 'Captcha activates when NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY are set',
      },
    ],
  },
];

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(() => mergeSiteSettings(DEFAULT_SITE_SETTINGS));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load');
        setSettings(mergeSiteSettings(data.settings));
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = mergeSiteSettings(settings);
      const res = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSettings(mergeSiteSettings(data.settings));
      setMessage('Site settings saved. Header/footer will pick them up on refresh.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function resetLogoSizes() {
    setSettings((prev) =>
      mergeSiteSettings({
        ...prev,
        logoChipHeight: DEFAULT_SITE_SETTINGS.logoChipHeight,
        logoChipHeightMobile: DEFAULT_SITE_SETTINGS.logoChipHeightMobile,
        logoWordFont: DEFAULT_SITE_SETTINGS.logoWordFont,
        logoWordSize: DEFAULT_SITE_SETTINGS.logoWordSize,
        logoWordSizeMobile: DEFAULT_SITE_SETTINGS.logoWordSizeMobile,
        logoWordWeight: DEFAULT_SITE_SETTINGS.logoWordWeight,
        logoWordStyle: DEFAULT_SITE_SETTINGS.logoWordStyle,
        logoWordLetterSpacing: DEFAULT_SITE_SETTINGS.logoWordLetterSpacing,
        logoTaglineFont: DEFAULT_SITE_SETTINGS.logoTaglineFont,
        logoTaglineSize: DEFAULT_SITE_SETTINGS.logoTaglineSize,
        logoTaglineSizeMobile: DEFAULT_SITE_SETTINGS.logoTaglineSizeMobile,
        logoTaglineWeight: DEFAULT_SITE_SETTINGS.logoTaglineWeight,
        logoTaglineStyle: DEFAULT_SITE_SETTINGS.logoTaglineStyle,
        logoTaglineLetterSpacing: DEFAULT_SITE_SETTINGS.logoTaglineLetterSpacing,
      })
    );
    setMessage('Logo chip & word type reset to defaults — click Save settings to publish.');
  }

  function resetFooterLogoType() {
    const patch: Partial<SiteSettings> = { footerLogoMode: 'inherit' };
    for (const key of FOOTER_LOGO_TYPE_KEYS) {
      patch[key] = DEFAULT_SITE_SETTINGS[key];
    }
    setSettings((prev) => mergeSiteSettings({ ...prev, ...patch }));
    setMessage('Footer logo type reset to inherit defaults — click Save settings to publish.');
  }

  function resetEyebrowSizes() {
    setSettings((prev) =>
      mergeSiteSettings({
        ...prev,
        eyebrowSize: DEFAULT_SITE_SETTINGS.eyebrowSize,
        eyebrowSizeMd: DEFAULT_SITE_SETTINGS.eyebrowSizeMd,
        eyebrowSizeLg: DEFAULT_SITE_SETTINGS.eyebrowSizeLg,
      })
    );
    setMessage('Eyebrow sizes reset to defaults — click Save settings to publish.');
  }

  function patchSettings(patch: Partial<SiteSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function renderField(field: FieldDef) {
    const multiline = field.multiline || field.key === 'footerBlurb' || field.key === 'defaultMetaDescription';
    const value = settings[field.key] ?? DEFAULT_SITE_SETTINGS[field.key] ?? '';
    const placeholder = field.placeholder || DEFAULT_SITE_SETTINGS[field.key] || undefined;
    return (
      <div key={field.key} className={`admin-field${field.full || multiline ? ' full' : ''}`}>
        <label htmlFor={`site-setting-${field.key}`}>{field.label}</label>
        {multiline ? (
          <textarea
            id={`site-setting-${field.key}`}
            className="admin-textarea"
            value={value}
            placeholder={placeholder}
            onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
          />
        ) : (
          <input
            id={`site-setting-${field.key}`}
            className="admin-input"
            value={value}
            placeholder={placeholder}
            onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
          />
        )}
        {field.hint ? (
          <small style={{ color: 'var(--admin-muted)' }}>
            {field.hint}
            {field.placeholder ? ` · default ${field.placeholder}` : null}
          </small>
        ) : field.placeholder ? (
          <small style={{ color: 'var(--admin-muted)' }}>Default: {field.placeholder}</small>
        ) : null}
      </div>
    );
  }

  return (
    <div className="admin-page-stack">
      <AdminFloatingActions status={message || (saving ? 'Saving…' : undefined)}>
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </AdminFloatingActions>

      <div className="admin-card admin-page-intro">
        <h2>Site settings</h2>
        <p>Global contact details and CTAs used across the public header, footer, and floating actions. Expand a section to edit.</p>
      </div>

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <LogoBrandPreview settings={settings} />

      <form
        onSubmit={(e) => {
          void save(e);
        }}
        className="admin-page-stack"
      >
        {SECTIONS.map((section) => (
          <AdminCollapsible
            key={section.id}
            title={section.title}
            description={section.description}
            defaultOpen={section.defaultOpen ?? false}
            badge={
              section.id === 'logo-sizes' ? (
                <button type="button" className="admin-btn admin-btn-secondary" onClick={resetLogoSizes}>
                  Reset logo type
                </button>
              ) : section.id === 'footer-brand' ? (
                <button type="button" className="admin-btn admin-btn-secondary" onClick={resetFooterLogoType}>
                  Reset footer type
                </button>
              ) : section.id === 'eyebrow-sizes' ? (
                <button type="button" className="admin-btn admin-btn-secondary" onClick={resetEyebrowSizes}>
                  Reset eyebrows
                </button>
              ) : undefined
            }
          >
            {section.id === 'logo-sizes' ? (
              <LogoTypeEditor settings={settings} onChange={patchSettings} scope="header" />
            ) : section.id === 'footer-brand' ? (
              <FooterBrandEditor settings={settings} onChange={patchSettings} />
            ) : section.id === 'header-cta' ? (
              <HeaderCtaEditor settings={settings} onChange={patchSettings} />
            ) : section.id === 'header-talk' ? (
              <HeaderTalkEditor settings={settings} onChange={patchSettings} />
            ) : section.id === 'nav-menu-style' ? (
              <NavMenuStylePicker settings={settings} onChange={patchSettings} />
            ) : section.id === 'heading-levels' ? (
              <HeadingLevelPicker settings={settings} onChange={patchSettings} />
            ) : section.id === 'eyebrow-sizes' ? (
              <EyebrowSizeEditor settings={settings} onChange={patchSettings} />
            ) : section.id === 'address' ? (
              <>
                <FooterOfficeEditor settings={settings} onChange={patchSettings} />
                <div className="admin-form-grid" style={{ marginTop: '1.25rem' }}>
                  {section.fields.map(renderField)}
                </div>
              </>
            ) : (
              <div className="admin-form-grid">{section.fields.map(renderField)}</div>
            )}
          </AdminCollapsible>
        ))}
      </form>
    </div>
  );
}
