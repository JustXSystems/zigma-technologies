'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SITE_COPY, HERO_HEIGHT_PAGES, type SiteCopy } from '@/lib/site-copy';
import type { IndustryDef } from '@/lib/industries';
import type { LocationDef } from '@/lib/locations';
import { SITE_COPY_TABS } from '@/lib/admin-hub-tabs';
import AdminHub from '@/components/admin/AdminHub';
import HeroHeightPicker from '@/components/admin/HeroHeightPicker';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import { ToggleCard } from '@/components/admin/form/controls';
import { AdminLink, useDirtyTracker } from '@/components/admin/unsaved-changes';
import { CopyField, setPath, withPaths } from '@/components/admin/site-copy/CopyField';
import { COPY_PATHS_EDITED_ELSEWHERE } from '@/components/admin/site-copy/paths-elsewhere';

const HUBS = [
  { key: 'industries', label: 'Industries hub' },
  { key: 'locations', label: 'Locations hub' },
  { key: 'resources', label: 'Resources hub' },
  { key: 'press', label: 'Press hub' },
  { key: 'sla', label: 'SLA page' },
  { key: 'search', label: 'Search page' },
] as const;

const FEATURES = [
  { key: 'toolsEnabled', label: 'Calculators', hint: '/tools/ups-calculator and /tools/solar-roi' },
  { key: 'solutionFinderEnabled', label: 'Solution finder', hint: '/tools/solution-finder' },
  { key: 'searchEnabled', label: 'Site search', hint: 'Header search icon and /search' },
  { key: 'resourcesEnabled', label: 'Resources hub', hint: '/resources' },
  { key: 'industriesEnabled', label: 'Industries hub', hint: '/industries' },
  { key: 'partnersEnabled', label: 'Partner portal', hint: 'Partner sign-in and portal pages' },
  { key: 'localesEnabled', label: 'Language landings', hint: 'Hindi (/hi) and Kannada (/kn) pages' },
] as const;

const TOOLS = [
  { key: 'solutionFinder', label: 'Solution finder', path: '/tools/solution-finder' },
  { key: 'upsCalculator', label: 'UPS calculator', path: '/tools/ups-calculator' },
  { key: 'solarRoi', label: 'Solar ROI calculator', path: '/tools/solar-roi' },
] as const;

const LOCALES = [
  { key: 'hi', label: 'Hindi' },
  { key: 'kn', label: 'Kannada' },
] as const;

const jsonAreaStyle = { width: '100%', fontFamily: 'var(--admin-mono)', fontSize: '0.82rem' } as const;

function parseJson<T>(text: string, what: string): T {
  try {
    return JSON.parse(text || '[]') as T;
  } catch {
    throw new Error(`${what} is not valid JSON. Fix it before saving.`);
  }
}

/** Text and switches for the built-in (non-CMS) pages; every tab edits the one site copy document. */
export default function SiteCopyHub({ initialTab }: { initialTab?: string }) {
  const [copy, setCopy] = useState<SiteCopy>(DEFAULT_SITE_COPY);
  const [industriesJson, setIndustriesJson] = useState('[]');
  const [locationsJson, setLocationsJson] = useState('[]');
  const [needOptionsJson, setNeedOptionsJson] = useState('[]');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const { markClean } = useDirtyTracker({ copy, industriesJson, locationsJson, needOptionsJson });

  const applySaved = useCallback(
    (data: { copy: SiteCopy; industries?: unknown; locations?: unknown }) => {
      setCopy(data.copy);
      setIndustriesJson(JSON.stringify(data.industries || [], null, 2));
      setLocationsJson(JSON.stringify(data.locations || [], null, 2));
      setNeedOptionsJson(JSON.stringify(data.copy?.tools?.solutionFinder?.needOptions || [], null, 2));
      markClean();
    },
    [markClean]
  );

  useEffect(() => {
    fetch('/api/admin/site-copy')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load');
        applySaved(data);
      })
      .catch((e) => setError(e.message));
  }, [applySaved]);

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const industries = parseJson<IndustryDef[]>(industriesJson, 'Industries data');
      const locations = parseJson<LocationDef[]>(locationsJson, 'Locations data');
      let nextCopy = setPath(copy, 'tools.solutionFinder.needOptions', parseJson(needOptionsJson, 'Solution finder needs'));
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
      applySaved(data);
      setMessage('Site copy saved. Public pages pick this up on next load.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, path: string, opts: { multiline?: boolean; full?: boolean } = {}) => {
    const input = <CopyField label={label} path={path} copy={copy} onChange={setCopy} multiline={opts.multiline} />;
    return opts.full || opts.multiline ? <div className="full">{input}</div> : input;
  };

  return (
    <AdminHub
      title="Site Copy"
      intro={
        <>
          Text and switches for the built-in pages that are not CMS pages: hubs, tools and language landings. Header, footer
          and sticky-bar labels are in <AdminLink href="/admin/header-footer?tab=labels">Header &amp; Footer → Labels</AdminLink>,
          Google titles in <AdminLink href="/admin/seo?tab=pages">SEO → Page titles</AdminLink>, the enquiry pop-up in{' '}
          <AdminLink href="/admin/forms?tab=messages">Forms &amp; CRM</AdminLink>, and catalog page headings in{' '}
          <AdminLink href="/admin/catalog-settings">Catalog Settings</AdminLink>. Press Ctrl + K to find any setting.
        </>
      }
      tabs={SITE_COPY_TABS}
      initialTab={initialTab}
    >
      {(active) => (
        <>
          <AdminFloatingActions status={message || (saving ? 'Saving…' : undefined)}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => {
                if (!window.confirm('Replace every field with the built-in defaults? Nothing is saved until you press Save.')) return;
                setCopy(DEFAULT_SITE_COPY);
                setMessage('Defaults loaded in the editor. Press Save to keep them.');
              }}
            >
              Reset to defaults
            </button>
            <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save site copy'}
            </button>
          </AdminFloatingActions>

          {error ? <div className="admin-error">{error}</div> : null}
          {message ? <div className="admin-success">{message}</div> : null}

          <div className="admin-card">
            {active === 'hubs' ? (
              <div className="admin-page-stack">
                {HUBS.map((hub, i) => (
                  <AdminCollapsible key={hub.key} title={hub.label} description={`/${hub.key}`} defaultOpen={i === 0}>
                    <div className="admin-form-grid">
                      {field('Eyebrow', `hubs.${hub.key}.eyebrow`)}
                      {field('Title', `hubs.${hub.key}.title`)}
                      {field('Lead', `hubs.${hub.key}.lead`, { multiline: true })}
                      {field('Primary button', `hubs.${hub.key}.ctaPrimary`)}
                      {field('Primary button link', `hubs.${hub.key}.ctaPrimaryHref`)}
                      {field('Secondary button', `hubs.${hub.key}.ctaSecondary`)}
                      {field('Secondary button link', `hubs.${hub.key}.ctaSecondaryHref`)}
                      {field('Proof rail (one per line)', `hubs.${hub.key}.proofRail`, { multiline: true })}
                      {field('CTA band title', `hubs.${hub.key}.ctaBandTitle`)}
                      {field('CTA band lead', `hubs.${hub.key}.ctaBandLead`, { multiline: true })}
                    </div>
                  </AdminCollapsible>
                ))}
              </div>
            ) : null}

            {active === 'features' ? (
              <div className="admin-footer-office-toggles">
                {FEATURES.map((f) => (
                  <ToggleCard
                    key={f.key}
                    id={`site-feature-${f.key}`}
                    label={f.label}
                    hint={f.hint}
                    checked={Boolean(copy.features[f.key])}
                    onChange={(on) => setCopy({ ...copy, features: { ...copy.features, [f.key]: on } })}
                  />
                ))}
              </div>
            ) : null}

            {active === 'heroHeights' ? (
              <div className="admin-form-grid">
                <p className="full theme-help" style={{ marginTop: 0 }}>
                  Full screen fills the browser window (like the Industries page); Compact fits the hero content or a custom % of the
                  screen height. CMS pages set this on their hero section in <AdminLink href="/admin/pages">Pages</AdminLink>; product,
                  project and service pages in <AdminLink href="/admin/catalog-settings">Catalog Settings → Hero</AdminLink>.
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

            {active === 'tools' ? (
              <div className="admin-page-stack">
                {TOOLS.map((tool, i) => (
                  <AdminCollapsible key={tool.key} title={tool.label} description={tool.path} defaultOpen={i === 0}>
                    <div className="admin-form-grid">
                      {field('Eyebrow', `tools.${tool.key}.eyebrow`)}
                      {field('Title', `tools.${tool.key}.title`)}
                      {field('Lead', `tools.${tool.key}.lead`, { multiline: true })}
                      {field('CTA band title', `tools.${tool.key}.ctaBandTitle`)}
                      {field('CTA band lead', `tools.${tool.key}.ctaBandLead`, { multiline: true })}
                      {tool.key === 'solutionFinder' ? (
                        <div className="full admin-field">
                          <label htmlFor="site-copy-need-options">Needs offered (JSON)</label>
                          <p className="theme-help">
                            Array of <code>{'{ id, title, blurb }'}</code>; id is one of backup, solar, storage, ev, service, unsure.
                          </p>
                          <textarea
                            id="site-copy-need-options"
                            className="admin-textarea"
                            style={{ ...jsonAreaStyle, minHeight: 220 }}
                            value={needOptionsJson}
                            onChange={(e) => setNeedOptionsJson(e.target.value)}
                          />
                        </div>
                      ) : null}
                    </div>
                  </AdminCollapsible>
                ))}
              </div>
            ) : null}

            {active === 'locales' ? (
              <div className="admin-page-stack">
                {LOCALES.map((locale, i) => (
                  <AdminCollapsible key={locale.key} title={locale.label} description={`/${locale.key}`} defaultOpen={i === 0}>
                    <div className="admin-form-grid">
                      {field('Language name', `locales.${locale.key}.langName`)}
                      {field('Title', `locales.${locale.key}.title`)}
                      {field('Lead', `locales.${locale.key}.lead`, { multiline: true })}
                      {field('UPS link', `locales.${locale.key}.ups`)}
                      {field('Solar link', `locales.${locale.key}.solar`)}
                      {field('Calculator link', `locales.${locale.key}.calc`)}
                      {field('CTA', `locales.${locale.key}.cta`)}
                      {field('English site link', `locales.${locale.key}.englishSite`)}
                      {field('Other language link', `locales.${locale.key}.altLocaleLabel`)}
                    </div>
                  </AdminCollapsible>
                ))}
              </div>
            ) : null}

            {active === 'industries' ? (
              <div className="admin-field">
                <label htmlFor="site-copy-industries">Industries (JSON)</label>
                <p className="theme-help">
                  Array of industry definitions (<code>key, name, eyebrow, lead, subject, catalogHints, faqs</code>). Empty or invalid
                  falls back to the built-in list.
                </p>
                <textarea
                  id="site-copy-industries"
                  className="admin-textarea"
                  style={{ ...jsonAreaStyle, minHeight: 420 }}
                  value={industriesJson}
                  onChange={(e) => setIndustriesJson(e.target.value)}
                />
              </div>
            ) : null}

            {active === 'locations' ? (
              <div className="admin-field">
                <label htmlFor="site-copy-locations">Locations (JSON)</label>
                <p className="theme-help">
                  Array of location definitions (<code>key, name, state, eyebrow, lead, highlights, serviceTags</code>).
                </p>
                <textarea
                  id="site-copy-locations"
                  className="admin-textarea"
                  style={{ ...jsonAreaStyle, minHeight: 420 }}
                  value={locationsJson}
                  onChange={(e) => setLocationsJson(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        </>
      )}
    </AdminHub>
  );
}
