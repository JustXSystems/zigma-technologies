'use client';

import { FormEvent, MouseEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SITE_SETTINGS, isSettingEnabled, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import MediaPicker from '@/components/admin/MediaPicker';
import { Field, ToggleCard } from '@/components/admin/form/controls';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import { useUnsavedChanges } from '@/components/admin/unsaved-changes';
import LogoBrandPreview from '@/components/admin/LogoBrandPreview';
import LogoTypeEditor, { FOOTER_LOGO_TYPE_KEYS } from '@/components/admin/LogoTypeEditor';
import NavMenuStylePicker from '@/components/admin/NavMenuStylePicker';
import NavTypographyEditor from '@/components/admin/NavTypographyEditor';
import HeaderTalkEditor from '@/components/admin/HeaderTalkEditor';
import HeaderCtaEditor from '@/components/admin/HeaderCtaEditor';
import FloatingCtaEditor from '@/components/admin/FloatingCtaEditor';
import FooterOfficeEditor from '@/components/admin/FooterOfficeEditor';
import FooterBrandEditor from '@/components/admin/FooterBrandEditor';
import NapLinkPanel from '@/components/admin/NapLinkPanel';
import CrmLeadSettings from '@/components/admin/leads/CrmLeadSettings';
import { useAdminUser } from '@/components/admin/admin-session';
import { useSiteCopySlice } from '@/components/admin/site-copy/use-site-copy-slice';
import { COOKIE_COPY_PATHS } from '@/components/admin/site-copy/paths-elsewhere';
import { hasScreenAccess } from '@/lib/admin-screens';
import CookieCopyFields from './CookieCopyFields';
import { diffSettings, saveSiteSettingsChanges } from './save-site-settings';

type FieldDef = {
  key: keyof SiteSettings;
  label: string;
  hint?: string;
  full?: boolean;
  multiline?: boolean;
  placeholder?: string;
  /** `toggle` stores 'true' / 'false'; `image` picks from the media library. */
  kind?: 'toggle' | 'image';
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
        label: 'Logo image',
        hint: 'Header, footer (unless overridden under Footer brand), and ecosystem mark',
        full: true,
        kind: 'image',
      },
      { key: 'logoAlt', label: 'Logo alt text', hint: 'Accessible name for the logo image sitewide' },
      {
        key: 'logoHref',
        label: 'Logo link',
        hint: 'Where clicking the header and footer logo goes, e.g. / or /products or https://… (blank = home page)',
        placeholder: '/',
      },
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
    description:
      'The one place to type phone and email. Header, floating actions, structured data and emails read them directly; menus and page sections follow them through {{phone}}-style placeholders.',
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
      'Postal address and office hours / SLA values. Feeds the footer, JSON-LD, contact form, thank-you and /sla.',
    fields: [
      {
        key: 'addressStreet',
        label: 'Address street (line 1)',
        hint: 'Building / plot / road. No trailing comma — lines are joined with ", " automatically',
        full: true,
      },
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
    title: 'Navigation menu style & fonts',
    description:
      'Public header mega-menu look (Classic, Corporate, Elegant, Rail, Lumen, Mosaic, Ribbon) plus font family, size, weight, style, case and spacing for top menu items, submenu headings and submenu links.',
    fields: [],
  },
  {
    id: 'footer-office',
    title: 'Footer office block',
    description:
      'Office / Hours / SLA labels, layout and type in the footer Contact column (default Match Contact h6). The address itself is in Site Settings → Address & office.',
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
        label: 'Show powered-by credit',
        hint: 'Credit line at the bottom of the footer',
        kind: 'toggle',
        full: true,
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
    description: 'Used by any page without its own meta description or social share image.',
    fields: [
      { key: 'defaultMetaDescription', label: 'Default meta description', full: true, multiline: true },
      {
        key: 'ogImage',
        label: 'Default social share image',
        hint: 'Open Graph image used when a page has none of its own (1200×630 recommended)',
        full: true,
        kind: 'image',
      },
    ],
  },
  {
    id: 'crm',
    title: 'CRM integration',
    description:
      'Forward website submissions to your CRM as they arrive. Email notifications, recipients and auto-replies are managed in Admin → Email.',
    fields: [
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
    title: 'Analytics & cookies',
    description:
      'GA4, Plausible, cookie consent, and the wording of the cookie banner and /cookies page. Turnstile captcha uses NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY in .env (no toggle here).',
    fields: [
      { key: 'ga4MeasurementId', label: 'GA4 measurement ID', hint: 'e.g. G-XXXXXXXX — leave blank to disable' },
      { key: 'plausibleDomain', label: 'Plausible domain', hint: 'e.g. zigma-technologies.com' },
      {
        key: 'analyticsConsentRequired',
        label: 'Require analytics consent',
        hint: 'GA4 / Plausible load only after the visitor accepts cookies',
        kind: 'toggle',
      },
      {
        key: 'marketingConsentEnabled',
        label: 'Offer marketing consent',
        hint: 'Adds a marketing switch to the cookie banner',
        kind: 'toggle',
      },
    ],
  },
];

/** Which screen shows each section, in display order (see `SITE_SETTINGS_GROUP_HOME`). */
export const SITE_SETTINGS_GROUPS = {
  general: ['brand', 'contact', 'social-links', 'address', 'analytics'],
  header: ['logo-sizes', 'nav-menu-style', 'header-cta', 'header-talk', 'floating-cta'],
  footer: ['footer-brand', 'footer-office', 'footer-legal'],
  seo: ['seo'],
  leads: ['crm'],
} as const;

export type SiteSettingsGroup = keyof typeof SITE_SETTINGS_GROUPS;

/** Where each group is edited — old `/admin/site-settings#site-settings-<id>` links are sent here. */
export const SITE_SETTINGS_GROUP_HOME: Record<SiteSettingsGroup, string> = {
  general: '/admin/site-settings',
  header: '/admin/header-footer?tab=header',
  footer: '/admin/header-footer?tab=footer',
  seo: '/admin/seo?tab=defaults',
  leads: '/admin/forms?tab=crm',
};

const FIELD_LABELS = new Map<string, string>([
  ...SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, f.label] as const)),
  ['crmLeadKinds', 'Send to the CRM'],
]);

function fieldLabel(key: string) {
  return FIELD_LABELS.get(key) ?? key;
}

/** `#site-settings-<id>` deep links; `enquiries` is the old name of the CRM section. */
export function sectionFromHash(hash: string) {
  const prefix = '#site-settings-';
  if (!hash.startsWith(prefix)) return null;
  const requested = hash.slice(prefix.length);
  const sectionId = requested === 'enquiries' ? 'crm' : requested;
  return SECTIONS.some((s) => s.id === sectionId) ? sectionId : null;
}

export function groupOfSection(sectionId: string): SiteSettingsGroup | null {
  const groups = Object.keys(SITE_SETTINGS_GROUPS) as SiteSettingsGroup[];
  return groups.find((g) => (SITE_SETTINGS_GROUPS[g] as readonly string[]).includes(sectionId)) ?? null;
}

/** Sections now edited outside Site Settings editors altogether. */
const SECTIONS_MOVED_OUT: Readonly<Record<string, string>> = {
  typography: '/admin/theme?tab=typography',
};

/** Where an old `/admin/site-settings#site-settings-<id>` link now lives; null when it stays on that page. */
export function siteSettingsHashHome(hash: string): string | null {
  const moved = SECTIONS_MOVED_OUT[hash.replace(/^#site-settings-/, '')];
  if (moved) return moved;
  const sectionId = sectionFromHash(hash);
  const group = sectionId ? groupOfSection(sectionId) : null;
  return group && group !== 'general' ? `${SITE_SETTINGS_GROUP_HOME[group]}${hash}` : null;
}

type Props = {
  group: SiteSettingsGroup;
  /** Intro card; omit when the host screen has its own. */
  intro?: { title: string; body: ReactNode };
};

/** Loads, edits and saves the site settings sections of one group (only changed keys are sent). */
export default function SiteSettingsEditor({ group, intro }: Props) {
  const sections = useMemo(
    () => SITE_SETTINGS_GROUPS[group].flatMap((id) => SECTIONS.filter((s) => s.id === id)),
    [group]
  );
  const single = sections.length === 1;
  const [settings, setSettings] = useState<SiteSettings>(() => mergeSiteSettings(DEFAULT_SITE_SETTINGS));
  const [saved, setSaved] = useState<SiteSettings | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const user = useAdminUser();
  const cookieCopy = useSiteCopySlice(COOKIE_COPY_PATHS, 'Cookie wording saved.', {
    enabled: group === 'general' && !!user && hasScreenAccess(user.screens, 'siteCopy'),
  });
  const dirty = useMemo(
    () => !!saved && Object.keys(diffSettings(saved, mergeSiteSettings(settings)).changes).length > 0,
    [saved, settings]
  );
  useUnsavedChanges(dirty);

  const expandSection = useCallback((sectionId: string, scroll = true) => {
    setOpenSections((prev) => (prev[sectionId] ? prev : { ...prev, [sectionId]: true }));
    if (!scroll) return;
    // Defer until after React paints the expanded panel (hidden panels affect scroll position).
    window.setTimeout(() => {
      document.getElementById(`site-settings-${sectionId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 40);
  }, []);

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load');
        const loaded = mergeSiteSettings(data.settings);
        setSettings(loaded);
        setSaved(loaded);
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        const sectionId = sectionFromHash(window.location.hash);
        if (sectionId && groupOfSection(sectionId) === group) expandSection(sectionId, true);
      });
  }, [expandSection, group]);

  function onJumpClick(e: MouseEvent<HTMLAnchorElement>, sectionId: string) {
    e.preventDefault();
    expandSection(sectionId, true);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#site-settings-${sectionId}`);
    }
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (!saved) throw new Error('Settings have not loaded yet.');
      const result = await saveSiteSettingsChanges(saved, settings, fieldLabel);
      if (result.changed) {
        setSettings(result.settings);
        setSaved(result.settings);
      }
      const copyChanged = cookieCopy.dirty;
      if (copyChanged && !(await cookieCopy.save())) return;
      setMessage(
        result.changed || copyChanged ? 'Settings saved. The public site picks them up on refresh.' : 'No changes to save.'
      );
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

  function patchSettings(patch: Partial<SiteSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function renderField(field: FieldDef) {
    const id = `site-setting-${field.key}`;
    const value = settings[field.key] ?? DEFAULT_SITE_SETTINGS[field.key] ?? '';
    const set = (next: string) => patchSettings({ [field.key]: next });

    if (field.kind === 'toggle') {
      return (
        <div key={field.key} className={field.full ? 'full' : undefined}>
          <ToggleCard
            id={id}
            label={field.label}
            hint={field.hint}
            checked={isSettingEnabled(value, isSettingEnabled(DEFAULT_SITE_SETTINGS[field.key]))}
            onChange={(on) => set(on ? 'true' : 'false')}
          />
        </div>
      );
    }
    if (field.kind === 'image') {
      return (
        <div key={field.key} className="full">
          <MediaPicker id={id} label={field.label} value={value} onChange={set} kinds={['image', 'svg']} allowUpload hint={field.hint} />
        </div>
      );
    }

    const multiline = field.multiline || field.key === 'footerBlurb' || field.key === 'defaultMetaDescription';
    const placeholder = field.placeholder || DEFAULT_SITE_SETTINGS[field.key] || undefined;
    const hint = [field.hint, field.placeholder ? `default ${field.placeholder}` : ''].filter(Boolean).join(' · ');
    return (
      <Field key={field.key} label={field.label} htmlFor={id} full={field.full || multiline} hint={hint || undefined}>
        {multiline ? (
          <textarea id={id} className="admin-textarea" value={value} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
        ) : (
          <input id={id} className="admin-input" value={value} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
        )}
      </Field>
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
        return (
          <div className="admin-page-stack">
            <NavMenuStylePicker settings={settings} onChange={patchSettings} />
            <div style={{ marginTop: '1.25rem' }}>
              <NavTypographyEditor settings={settings} onChange={patchSettings} />
            </div>
          </div>
        );
      case 'contact':
        return (
          <>
            <div className="admin-form-grid">{section.fields.map(renderField)}</div>
            <NapLinkPanel />
          </>
        );
      case 'footer-office':
        return <FooterOfficeEditor settings={settings} onChange={patchSettings} />;
      case 'crm':
        return (
          <>
            <div className="admin-form-grid">{section.fields.map(renderField)}</div>
            <CrmLeadSettings settings={settings} onChange={patchSettings} />
          </>
        );
      case 'analytics':
        return (
          <>
            <div className="admin-form-grid">{section.fields.map(renderField)}</div>
            {cookieCopy.copy ? (
              <CookieCopyFields
                copy={cookieCopy.copy}
                onChange={cookieCopy.setCopy}
                marketingEnabled={isSettingEnabled(settings.marketingConsentEnabled, true)}
              />
            ) : null}
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

      {intro ? (
        <div className="admin-card admin-page-intro">
          <h2>{intro.title}</h2>
          <p>{intro.body}</p>
        </div>
      ) : null}

      {error || cookieCopy.error ? <div className="admin-error">{error || cookieCopy.error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      {single ? null : (
        <nav className="admin-settings-jump" aria-label="Jump to section">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#site-settings-${section.id}`}
              className={`admin-settings-jump-link${openSections[section.id] ? ' is-active' : ''}`}
              onClick={(e) => onJumpClick(e, section.id)}
            >
              {section.title}
            </a>
          ))}
        </nav>
      )}

      <form
        onSubmit={(e) => {
          void save(e);
        }}
        className="admin-page-stack"
      >
        {sections.map((section) => (
          <div key={section.id} id={`site-settings-${section.id}`}>
            {single ? (
              <section className="admin-card">
                <h3 style={{ marginTop: 0 }}>{section.title}</h3>
                <p className="theme-help" style={{ marginTop: 0 }}>
                  {section.description}
                </p>
                {renderSectionBody(section)}
              </section>
            ) : (
              <AdminCollapsible
                title={section.title}
                description={section.description}
                open={!!openSections[section.id]}
                onOpenChange={(next) => setOpenSections((prev) => ({ ...prev, [section.id]: next }))}
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
            )}
          </div>
        ))}
      </form>
    </div>
  );
}
