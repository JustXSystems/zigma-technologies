'use client';

import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SITE_COPY, HERO_HEIGHT_PAGES, type SiteCopy } from '@/lib/site-copy';
import HeroHeightPicker from '@/components/admin/HeroHeightPicker';
import type { IndustryDef } from '@/lib/industries';
import type { LocationDef } from '@/lib/locations';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import { AdminLink, useDirtyTracker } from '@/components/admin/unsaved-changes';
import { CopyField, setPath, withPaths } from '@/components/admin/site-copy/CopyField';
import { COPY_PATHS_EDITED_ELSEWHERE } from '@/components/admin/site-copy/paths-elsewhere';

type Tab =
  | 'hubs'
  | 'features'
  | 'heroHeights'
  | 'tools'
  | 'locales'
  | 'industries'
  | 'locations';

export default function SiteCopyAdminPage() {
  const [tab, setTab] = useState<Tab>('hubs');
  const [copy, setCopy] = useState<SiteCopy>(DEFAULT_SITE_COPY);
  const [industriesJson, setIndustriesJson] = useState('[]');
  const [locationsJson, setLocationsJson] = useState('[]');
  const [needOptionsJson, setNeedOptionsJson] = useState('[]');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const { markClean } = useDirtyTracker({ copy, industriesJson, locationsJson, needOptionsJson });

  useEffect(() => {
    fetch('/api/admin/site-copy')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load');
        setCopy(data.copy);
        setIndustriesJson(JSON.stringify(data.industries || [], null, 2));
        setLocationsJson(JSON.stringify(data.locations || [], null, 2));
        setNeedOptionsJson(JSON.stringify(data.copy?.tools?.solutionFinder?.needOptions || [], null, 2));
        markClean();
      })
      .catch((e) => setError(e.message));
  }, [markClean]);

  const tabs = useMemo(
    () =>
      [
        { id: 'hubs' as const, label: 'Hub pages' },
        { id: 'features' as const, label: 'Features' },
        { id: 'heroHeights' as const, label: 'Hero height' },
        { id: 'tools' as const, label: 'Tools' },
        { id: 'locales' as const, label: 'Locales' },
        { id: 'industries' as const, label: 'Industries JSON' },
        { id: 'locations' as const, label: 'Locations JSON' },
      ] as const,
    []
  );

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      let industries: IndustryDef[] | undefined;
      let locations: LocationDef[] | undefined;
      let nextCopy = copy;
      if (tab === 'industries' || industriesJson) {
        industries = JSON.parse(industriesJson) as IndustryDef[];
      }
      if (tab === 'locations' || locationsJson) {
        locations = JSON.parse(locationsJson) as LocationDef[];
      }
      if (needOptionsJson) {
        nextCopy = setPath(nextCopy, 'tools.solutionFinder.needOptions', JSON.parse(needOptionsJson));
      }
      const latestRes = await fetch('/api/admin/site-copy');
      const latest = await latestRes.json();
      if (!latestRes.ok) throw new Error(latest.error || 'Could not reload the saved copy');
      nextCopy = withPaths(nextCopy, latest.copy, COPY_PATHS_EDITED_ELSEWHERE);
      const res = await fetch('/api/admin/site-copy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy: nextCopy, industries, locations }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setCopy(data.copy);
      setIndustriesJson(JSON.stringify(data.industries || [], null, 2));
      setLocationsJson(JSON.stringify(data.locations || [], null, 2));
      setNeedOptionsJson(JSON.stringify(data.copy?.tools?.solutionFinder?.needOptions || [], null, 2));
      markClean();
      setMessage('Site copy saved. Public pages pick this up on next load.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page-stack">
      <AdminFloatingActions status={message || (saving ? 'Saving…' : undefined)}>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={() => {
            setCopy(DEFAULT_SITE_COPY);
            setMessage('Reset to defaults in editor (not saved yet).');
          }}
        >
          Reset
        </button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save site copy'}
        </button>
      </AdminFloatingActions>

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-card admin-page-intro">
        <h2>Site Copy</h2>
        <p>
          Hub page and tool text for this deployment. Use with <strong>New Client</strong> to brand a similar
          industrial site without editing React. Header, footer and sticky-bar labels are in{' '}
          <AdminLink href="/admin/header-footer?tab=labels">Header &amp; Footer → Labels</AdminLink>; Google titles
          and descriptions in <AdminLink href="/admin/seo?tab=pages">SEO → Page titles</AdminLink>; the enquiry pop-up
          and thank-you page in <AdminLink href="/admin/forms?tab=messages">Forms &amp; CRM</AdminLink>; product,
          service and project page headings and the partner strip in{' '}
          <AdminLink href="/admin/catalog-settings">Catalog settings</AdminLink>; the cookie banner and /cookies page
          in <AdminLink href="/admin/site-settings#site-settings-analytics">Site Settings → Analytics &amp; cookies</AdminLink>.
        </p>
        <div className="theme-tabs" style={{ marginTop: '0.75rem' }}>
          {tabs.map((t) => (
            <button key={t.id} type="button" className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card">
        {tab === 'hubs' ? (
          <div className="admin-page-stack">
            {(['industries', 'locations', 'resources', 'press', 'sla', 'search'] as const).map((hub, i) => (
              <AdminCollapsible
                key={hub}
                title={hub.charAt(0).toUpperCase() + hub.slice(1)}
                description={`Copy for the /${hub} hub page.`}
                defaultOpen={i === 0}
              >
                <div className="admin-form-grid">
                  <CopyField label="Eyebrow" path={`hubs.${hub}.eyebrow`} copy={copy} onChange={setCopy} />
                  <CopyField label="Title" path={`hubs.${hub}.title`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <CopyField label="Lead" path={`hubs.${hub}.lead`} copy={copy} onChange={setCopy} multiline />
                  </div>
                  <CopyField label="Primary CTA" path={`hubs.${hub}.ctaPrimary`} copy={copy} onChange={setCopy} />
                  <CopyField label="Primary href" path={`hubs.${hub}.ctaPrimaryHref`} copy={copy} onChange={setCopy} />
                  <CopyField label="Secondary CTA" path={`hubs.${hub}.ctaSecondary`} copy={copy} onChange={setCopy} />
                  <CopyField label="Secondary href" path={`hubs.${hub}.ctaSecondaryHref`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <CopyField
                      label="Proof rail (one per line)"
                      path={`hubs.${hub}.proofRail`}
                      copy={copy}
                      onChange={setCopy}
                      multiline
                    />
                  </div>
                  <CopyField label="CTA band title" path={`hubs.${hub}.ctaBandTitle`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <CopyField label="CTA band lead" path={`hubs.${hub}.ctaBandLead`} copy={copy} onChange={setCopy} multiline />
                  </div>
                </div>
              </AdminCollapsible>
            ))}
          </div>
        ) : null}

        {tab === 'features' ? (
          <div className="admin-form-grid">
            {(
              [
                ['toolsEnabled', 'Enable tools (/tools/ups-calculator, /tools/solar-roi)'],
                ['solutionFinderEnabled', 'Enable solution finder (/tools/solution-finder)'],
                ['searchEnabled', 'Enable global search (header icon + /search)'],
                ['resourcesEnabled', 'Enable resources hub (/resources)'],
                ['industriesEnabled', 'Enable industries hub (/industries)'],
                ['partnersEnabled', 'Enable partner portal'],
                ['localesEnabled', 'Enable hi/kn locale landings'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="admin-field" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={Boolean(copy.features[key])}
                  onChange={(e) =>
                    setCopy({
                      ...copy,
                      features: { ...copy.features, [key]: e.target.checked },
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        ) : null}

        {tab === 'heroHeights' ? (
          <div className="admin-form-grid">
            <p className="full theme-help" style={{ marginTop: 0 }}>
              Full screen fills the browser window (like the Industries page); Compact fits the hero content or a
              custom % of the screen height. CMS
              pages (Home, About, Contact, Careers, Industries, …) set this on their hero section in{' '}
              <AdminLink href="/admin/pages">Pages</AdminLink>; product, project and service pages in{' '}
              <AdminLink href="/admin/catalog-settings">Catalog settings → Hero</AdminLink>.
            </p>
            {HERO_HEIGHT_PAGES.map(({ key, label }) => (
              <HeroHeightPicker
                key={key}
                label={label}
                value={copy.heroHeights?.[key]}
                onChange={(height) => setCopy({ ...copy, heroHeights: { ...copy.heroHeights, [key]: height } })}
              />
            ))}
          </div>
        ) : null}

        {tab === 'tools' ? (
          <div className="admin-form-grid">
            {(['solutionFinder', 'upsCalculator', 'solarRoi'] as const).map((tool) => (
              <div key={tool} className="full" style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                <h3 style={{ marginTop: 0, textTransform: 'capitalize' }}>{tool.replace(/([A-Z])/g, ' $1')}</h3>
                <div className="admin-form-grid">
                  <CopyField label="Eyebrow" path={`tools.${tool}.eyebrow`} copy={copy} onChange={setCopy} />
                  <CopyField label="Title" path={`tools.${tool}.title`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <CopyField label="Lead" path={`tools.${tool}.lead`} copy={copy} onChange={setCopy} multiline />
                  </div>
                  <CopyField label="CTA band title" path={`tools.${tool}.ctaBandTitle`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <CopyField label="CTA band lead" path={`tools.${tool}.ctaBandLead`} copy={copy} onChange={setCopy} multiline />
                  </div>
                </div>
              </div>
            ))}
            <div className="full">
              <label className="admin-field">Solution finder need options JSON</label>
              <p className="theme-help">
                Array of <code>{'{ id, title, blurb }'}</code> — id: backup | solar | storage | ev | service | unsure
              </p>
              <textarea
                className="admin-textarea"
                style={{ width: '100%', minHeight: 220, fontFamily: 'var(--admin-mono)', fontSize: '0.82rem' }}
                value={needOptionsJson}
                onChange={(e) => setNeedOptionsJson(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {tab === 'locales' ? (
          <div className="admin-page-stack">
            {(['hi', 'kn'] as const).map((locale, i) => (
              <AdminCollapsible
                key={locale}
                title={locale.toUpperCase()}
                description={`Locale landing copy for /${locale}.`}
                defaultOpen={i === 0}
              >
                <div className="admin-form-grid">
                  <CopyField label="Language name" path={`locales.${locale}.langName`} copy={copy} onChange={setCopy} />
                  <CopyField label="Title" path={`locales.${locale}.title`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <CopyField label="Lead" path={`locales.${locale}.lead`} copy={copy} onChange={setCopy} multiline />
                  </div>
                  <CopyField label="UPS link" path={`locales.${locale}.ups`} copy={copy} onChange={setCopy} />
                  <CopyField label="Solar link" path={`locales.${locale}.solar`} copy={copy} onChange={setCopy} />
                  <CopyField label="Calculator link" path={`locales.${locale}.calc`} copy={copy} onChange={setCopy} />
                  <CopyField label="CTA" path={`locales.${locale}.cta`} copy={copy} onChange={setCopy} />
                  <CopyField label="English site link" path={`locales.${locale}.englishSite`} copy={copy} onChange={setCopy} />
                  <CopyField label="Alt locale link" path={`locales.${locale}.altLocaleLabel`} copy={copy} onChange={setCopy} />
                </div>
              </AdminCollapsible>
            ))}
          </div>
        ) : null}

        {tab === 'industries' ? (
          <div>
            <p className="theme-help">
              JSON array of industry defs (<code>key, name, eyebrow, lead, subject, catalogHints, faqs</code>). Empty /
              invalid falls back to code defaults.
            </p>
            <textarea
              className="admin-textarea"
              style={{ width: '100%', minHeight: 420, fontFamily: 'var(--admin-mono)', fontSize: '0.82rem' }}
              value={industriesJson}
              onChange={(e) => setIndustriesJson(e.target.value)}
            />
          </div>
        ) : null}

        {tab === 'locations' ? (
          <div>
            <p className="theme-help">
              JSON array of location defs (<code>key, name, state, eyebrow, lead, highlights, serviceTags</code>).
            </p>
            <textarea
              className="admin-textarea"
              style={{ width: '100%', minHeight: 420, fontFamily: 'var(--admin-mono)', fontSize: '0.82rem' }}
              value={locationsJson}
              onChange={(e) => setLocationsJson(e.target.value)}
            />
          </div>
        ) : null}

        <div className="admin-inline-save" aria-hidden="true">
          <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save site copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
