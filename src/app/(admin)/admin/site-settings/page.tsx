'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@/lib/site-settings';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';

type FieldDef = { key: keyof SiteSettings; label: string; hint?: string; full?: boolean; multiline?: boolean };

const SECTIONS: Array<{ id: string; title: string; description: string; defaultOpen?: boolean; fields: FieldDef[] }> = [
  {
    id: 'brand',
    title: 'Brand & identity',
    description: 'Company name, logo, and footer blurb.',
    defaultOpen: true,
    fields: [
      { key: 'companyName', label: 'Company name' },
      { key: 'tagline', label: 'Logo tagline' },
      { key: 'logoUrl', label: 'Logo image URL', hint: 'Used in header, footer, and ecosystem mark', full: true },
      { key: 'logoAlt', label: 'Logo alt text', hint: 'Accessible name for the logo image sitewide' },
      { key: 'footerBlurb', label: 'Footer blurb', full: true, multiline: true },
    ],
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
    title: 'Header CTA',
    description: 'Primary header button labels and A/B split.',
    defaultOpen: false,
    fields: [
      { key: 'headerCtaLabel', label: 'Header CTA label (variant A)' },
      { key: 'headerCtaLabelB', label: 'Header CTA label (variant B)' },
      { key: 'ctaVariantBPercent', label: 'Variant B percent 0–100', hint: 'e.g. 50 shows B half the time' },
      { key: 'headerCtaHref', label: 'Header CTA href' },
    ],
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
      { key: 'facebookUrl', label: 'Facebook URL', hint: 'Leave blank to hide' },
      { key: 'linkedinUrl', label: 'LinkedIn URL', hint: 'Leave blank to hide' },
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
    description: 'Postal address, hours, and response SLA.',
    defaultOpen: false,
    fields: [
      { key: 'addressStreet', label: 'Address street', full: true },
      { key: 'addressLocality', label: 'Address city', hint: 'Default Bengaluru' },
      { key: 'addressRegion', label: 'Address region/state' },
      { key: 'addressPostal', label: 'Postal code' },
      { key: 'addressCountry', label: 'Country code', hint: 'e.g. IN' },
      { key: 'officeHours', label: 'Office hours', hint: 'Shown on contact / thank-you' },
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
  const [settings, setSettings] = useState<SiteSettings>({ ...DEFAULT_SITE_SETTINGS });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load');
        setSettings(data.settings);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSettings(data.settings);
      setMessage('Site settings saved. Header/footer will pick them up on refresh.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: FieldDef) {
    const multiline = field.multiline || field.key === 'footerBlurb' || field.key === 'defaultMetaDescription';
    return (
      <div key={field.key} className={`admin-field${field.full || multiline ? ' full' : ''}`}>
        <label>{field.label}</label>
        {multiline ? (
          <textarea
            className="admin-textarea"
            value={settings[field.key]}
            onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
          />
        ) : (
          <input
            className="admin-input"
            value={settings[field.key]}
            onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
          />
        )}
        {field.hint ? <small style={{ color: 'var(--admin-muted)' }}>{field.hint}</small> : null}
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
          >
            <div className="admin-form-grid">{section.fields.map(renderField)}</div>
          </AdminCollapsible>
        ))}
      </form>
    </div>
  );
}
