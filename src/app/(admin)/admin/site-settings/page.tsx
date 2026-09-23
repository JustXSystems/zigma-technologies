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
import FloatingCtaEditor from '@/components/admin/FloatingCtaEditor';
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

type SectionDef = {
  id: string;
  title: string;
  description: string;
  fields: FieldDef[];
};

/**
 * Site Settings sections — all start collapsed so Save stays visible and the page is scannable.
 * Editors (logo, header, footer) are wired by section id in the render map below.
 *
 * Intentionally omitted from the form (kept in schema for backwards compat):
 * - turnstileEnabled — captcha is driven by env keys only; the flag was unused
 * - flat headerCtaLabel / headerCtaHref / … — edited via headerCtaJson in HeaderCtaEditor
 */
const SECTIONS: SectionDef[] = [
  {
    id: 'brand',
    title: 'Brand & identity',
    description: 'Company name, logo image, and tagline shared by header and footer.',
    fields: [
      { key: 'companyName', label: 'Company name' },
      {
        key: 'tagline',
        label: 'Logo tagline',
        hint: 'Supports HTML: <br>, <b>, <i>, <em>, <strong>, <span>',
        full: true,
      },
      {
        key: 'logoUrl',
        label: 'Logo image URL',
        hint: 'Header, footer (unless overridden under Footer brand), and ecosystem mark',
        full: true,
      },
      { key: 'logoAlt', label: 'Logo alt text', hint: 'Accessible name for the logo image sitewide' },
    ],
  },
  {
    id: 'logo-sizes',
    title: 'Logo chip & word type',
    description:
      'Header logo height plus company name and tagline type. Preview Header/Footer; footer Inherit matches header 1:1 or customize under Footer brand.',
    fields: [],
  },
  {
    id: 'footer-brand',
    title: 'Footer brand',
    description:
      '.foot-brand column: visibility, alignment, max width, blurb, newsletter, optional footer logo URL, inherit vs custom type.',
    fields: [],
  },
  {
    id: 'contact',
    title: 'Contact details',
    description: 'Phone, email, and WhatsApp used in header, footer Contact column, and floating actions.',
    fields: [
      { key: 'phone', label: 'Main phone' },
      { key: 'emergencyPhone', label: 'Emergency phone' },
      { key: 'email', label: 'Info email' },
      { key: 'supportEmail', label: 'Support email' },
      {
        key: 'whatsapp',
        label: 'WhatsApp number (digits only)',
        hint: 'e.g. 919590137444 — header, floating button, and mobile sticky chat',
        full: true,
      },
    ],
  },
  {
    id: 'social-links',
    title: 'Social links',
    description:
      'Profile URLs as icons in the footer Contact column (after office block). Blank = hidden. Also Organization JSON-LD sameAs.',
    fields: [
      { key: 'facebookUrl', label: 'Facebook URL', hint: 'Leave blank to hide', full: true },
      { key: 'instagramUrl', label: 'Instagram URL', hint: 'Leave blank to hide', full: true },
      { key: 'linkedinUrl', label: 'LinkedIn URL', hint: 'Leave blank to hide', full: true },
      { key: 'xUrl', label: 'X (Twitter) URL', hint: 'Leave blank to hide', full: true },
      { key: 'youtubeUrl', label: 'YouTube URL', hint: 'Leave blank to hide', full: true },
    ],
  },
  {
    id: 'address',
    title: 'Address & office',
    description:
      'Postal address, office hours / SLA values, footer office labels & layout (default Match Contact h6). Feeds JSON-LD, contact form, thank-you, /sla.',
    fields: [
      { key: 'addressStreet', label: 'Address street (line 1)', hint: 'Building / plot / road', full: true },
      {
        key: 'addressStreet2',
        label: 'Address street (line 2)',
        hint: 'Area, landmark, or continuation — leave blank to hide',
        full: true,
      },
      {
        key: 'addressStreet3',
        label: 'Address street (line 3)',
        hint: 'Optional third row for footer split — leave blank to hide',
        full: true,
      },
      {
        key: 'addressStreet4',
        label: 'Address street (line 4)',
        hint: 'Optional fourth row for footer split — leave blank to hide',
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
    id: 'header-cta',
    title: 'Header · Request Consultation',
    description:
      'Orange header CTA: labels A/B, primary action, optional submenu chips, desktop/mobile display.',
    fields: [],
  },
  {
    id: 'header-talk',
    title: 'Header · Talk to us',
    description:
      'Talk to us trigger and submenu chips: add, edit, delete, reorder; desktop/mobile display.',
    fields: [],
  },
  {
    id: 'floating-cta',
    title: 'Sticky mobile & floating CTAs',
    description:
      'Mobile sticky bar and floating WhatsApp-style buttons: add, edit, delete, reorder, show/hide, path filters.',
    fields: [],
  },
  {
    id: 'nav-menu-style',
    title: 'Navigation menu style',
    description:
      'Public header mega-menu look: Classic, Corporate, Elegant, Rail, Lumen, Mosaic, Ribbon.',
    fields: [],
  },
  {
    id: 'typography',
    title: 'Public typography',
    description:
      'Page hero / section heading levels (H1–H3) and eyebrow (uppercase mono) sizes.',
    fields: [],
  },
  {
    id: 'footer-legal',
    title: 'Footer & legal',
    description: 'Copyright, powered-by credit, and policy links.',
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
    id: 'seo',
    title: 'SEO & social',
    description: 'Default meta description and Open Graph image.',
    fields: [
      { key: 'defaultMetaDescription', label: 'Default meta description', full: true, multiline: true },
      { key: 'ogImage', label: 'Default OG / social image URL', full: true },
    ],
  },
  {
    id: 'enquiries',
    title: 'Enquiries & CRM',
    description: 'Notification emails, visitor auto-reply, and CRM webhook.',
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
        hint: 'Confirmation email to submitter on enquiry/careers (requires SMTP)',
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
    description:
      'GA4, Plausible, and cookie consent toggles. Turnstile captcha uses NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY in .env (no toggle here).',
    fields: [
      { key: 'ga4MeasurementId', label: 'GA4 measurement ID', hint: 'e.g. G-XXXXXXXX — leave blank to disable' },
      { key: 'plausibleDomain', label: 'Plausible domain', hint: 'e.g. zigma-technologies.com' },
      {
        key: 'analyticsConsentRequired',
        label: 'Require analytics consent (true/false)',
        hint: 'When true, GA4/Plausible load only after Accept',
      },
      { key: 'marketingConsentEnabled', label: 'Show marketing consent toggle (true/false)' },
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

  function renderSectionBody(section: SectionDef) {
    switch (section.id) {
      case 'logo-sizes':
        return (
          <>
            <LogoBrandPreview settings={settings} />
            <LogoTypeEditor settings={settings} onChange={patchSettings} scope="header" />
          </>
        );
      case 'footer-brand':
        return <FooterBrandEditor settings={settings} onChange={patchSettings} />;
      case 'header-cta':
        return <HeaderCtaEditor settings={settings} onChange={patchSettings} />;
      case 'header-talk':
        return <HeaderTalkEditor settings={settings} onChange={patchSettings} />;
      case 'floating-cta':
        return <FloatingCtaEditor settings={settings} onChange={patchSettings} />;
      case 'nav-menu-style':
        return <NavMenuStylePicker settings={settings} onChange={patchSettings} />;
      case 'typography':
        return (
          <div className="admin-page-stack">
            <HeadingLevelPicker settings={settings} onChange={patchSettings} />
            <div style={{ marginTop: '1.25rem' }}>
              <div className="admin-collapse-badge" style={{ marginBottom: '0.65rem' }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={resetEyebrowSizes}>
                  Reset eyebrows
                </button>
              </div>
              <EyebrowSizeEditor settings={settings} onChange={patchSettings} />
            </div>
          </div>
        );
      case 'address':
        return (
          <>
            <FooterOfficeEditor settings={settings} onChange={patchSettings} />
            <div className="admin-form-grid" style={{ marginTop: '1.25rem' }}>
              {section.fields.map(renderField)}
            </div>
          </>
        );
      default:
        return <div className="admin-form-grid">{section.fields.map(renderField)}</div>;
    }
  }

  return (
    <div className="admin-page-stack admin-site-settings">
      <AdminFloatingActions status={message || (saving ? 'Saving…' : undefined)}>
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </AdminFloatingActions>

      <div className="admin-card admin-page-intro">
        <h2>Site settings</h2>
        <p>
          Global brand, contact, header, and footer options. All sections start collapsed — expand one to edit.
          Save stays docked at the bottom-right on desktop and full-width at the bottom on mobile.
        </p>
      </div>

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <nav className="admin-settings-jump" aria-label="Jump to section">
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#site-settings-${section.id}`} className="admin-settings-jump-link">
            {section.title}
          </a>
        ))}
      </nav>

      <form
        onSubmit={(e) => {
          void save(e);
        }}
        className="admin-page-stack"
      >
        {SECTIONS.map((section) => (
          <div key={section.id} id={`site-settings-${section.id}`}>
            <AdminCollapsible
              title={section.title}
              description={section.description}
              defaultOpen={false}
              badge={
                section.id === 'logo-sizes' ? (
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={resetLogoSizes}>
                    Reset logo type
                  </button>
                ) : section.id === 'footer-brand' ? (
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={resetFooterLogoType}>
                    Reset footer type
                  </button>
                ) : undefined
              }
            >
              {renderSectionBody(section)}
            </AdminCollapsible>
          </div>
        ))}
      </form>
    </div>
  );
}
