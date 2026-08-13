'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@/lib/site-settings';

const FIELDS: Array<{ key: keyof SiteSettings; label: string; hint?: string }> = [
  { key: 'companyName', label: 'Company name' },
  { key: 'tagline', label: 'Logo tagline' },
  { key: 'footerBlurb', label: 'Footer blurb' },
  { key: 'phone', label: 'Main phone' },
  { key: 'emergencyPhone', label: 'Emergency phone' },
  { key: 'email', label: 'Info email' },
  { key: 'supportEmail', label: 'Support email' },
  { key: 'whatsapp', label: 'WhatsApp number (digits only)', hint: 'e.g. 919590137444' },
  { key: 'headerCtaLabel', label: 'Header CTA label (variant A)' },
  { key: 'headerCtaLabelB', label: 'Header CTA label (variant B)' },
  { key: 'ctaVariantBPercent', label: 'Variant B percent 0–100', hint: 'e.g. 50 shows B half the time' },
  { key: 'headerCtaHref', label: 'Header CTA href' },
  { key: 'copyright', label: 'Copyright line' },
  { key: 'defaultMetaDescription', label: 'Default meta description' },
  { key: 'ogImage', label: 'Default OG / social image URL' },
  {
    key: 'enquiryNotifyEmail',
    label: 'Enquiry notify emails',
    hint: 'Comma-separated. Requires SMTP_* in .env',
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
  { key: 'logoUrl', label: 'Logo image URL', hint: 'Used in header and footer' },
  { key: 'facebookUrl', label: 'Facebook URL', hint: 'Leave blank to hide' },
  { key: 'linkedinUrl', label: 'LinkedIn URL', hint: 'Leave blank to hide' },
  { key: 'privacyUrl', label: 'Privacy Policy URL' },
  { key: 'termsUrl', label: 'Terms URL' },
  { key: 'cookiePolicyUrl', label: 'Cookie Policy URL' },
  { key: 'addressStreet', label: 'Address street' },
  { key: 'addressLocality', label: 'Address city', hint: 'Default Bengaluru' },
  { key: 'addressRegion', label: 'Address region/state' },
  { key: 'addressPostal', label: 'Postal code' },
  { key: 'addressCountry', label: 'Country code', hint: 'e.g. IN' },
  { key: 'officeHours', label: 'Office hours', hint: 'Shown on contact / thank-you' },
  { key: 'responseSla', label: 'Response SLA text', hint: 'e.g. within 1 business day' },
  { key: 'bookingUrl', label: 'Booking / calendar URL', hint: 'Shown on thank-you page' },
  { key: 'crmWebhookUrl', label: 'CRM webhook URL', hint: 'Zapier/Make/HubSpot/custom POST endpoint for leads' },
  { key: 'crmWebhookSecret', label: 'CRM webhook bearer secret', hint: 'Optional Authorization: Bearer …' },
  { key: 'crmProvider', label: 'CRM provider label', hint: 'e.g. webhook, hubspot, zoho — stored on payload only' },
  {
    key: 'slaMetricsJson',
    label: 'SLA metrics JSON',
    hint: 'Array of {label,value} for /sla dashboard',
  },
  {
    key: 'turnstileEnabled',
    label: 'Turnstile enabled note (true/false)',
    hint: 'Captcha activates when NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY are set',
  },
  { key: 'ga4MeasurementId', label: 'GA4 measurement ID', hint: 'e.g. G-XXXXXXXX — leave blank to disable' },
  { key: 'plausibleDomain', label: 'Plausible domain', hint: 'e.g. zigma-technologies.com' },
  {
    key: 'analyticsConsentRequired',
    label: 'Require analytics consent (true/false)',
    hint: 'When true, GA4/Plausible load only after Accept',
  },
  {
    key: 'marketingConsentEnabled',
    label: 'Show marketing consent toggle (true/false)',
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

  async function save(e: FormEvent) {
    e.preventDefault();
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

  return (
    <div className="admin-card">
      <h2 style={{ marginTop: 0 }}>Site settings</h2>
      <p style={{ color: 'var(--admin-muted)' }}>
        Global contact details and CTAs used across the public header, footer, and floating actions.
      </p>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}
      <form onSubmit={save} className="admin-form-grid">
        {FIELDS.map((field) => (
          <div
            key={field.key}
            className={`admin-field${field.key === 'footerBlurb' || field.key === 'copyright' || field.key === 'defaultMetaDescription' ? ' full' : ''}`}
          >
            <label>{field.label}</label>
            {field.key === 'footerBlurb' || field.key === 'defaultMetaDescription' ? (
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
        ))}
        <div className="full">
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
