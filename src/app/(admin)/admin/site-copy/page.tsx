'use client';

import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SITE_COPY, type SiteCopy } from '@/lib/site-copy';
import type { IndustryDef } from '@/lib/industries';
import type { LocationDef } from '@/lib/locations';

type Tab = 'chrome' | 'hubs' | 'legal' | 'features' | 'consultation' | 'tools' | 'catalog' | 'locales' | 'industries' | 'locations';

function setPath(obj: SiteCopy, path: string, value: unknown): SiteCopy {
  const parts = path.split('.');
  const clone = structuredClone(obj) as Record<string, unknown>;
  let cur: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
  return clone as unknown as SiteCopy;
}

function Field({
  label,
  path,
  copy,
  onChange,
  multiline,
}: {
  label: string;
  path: string;
  copy: SiteCopy;
  onChange: (next: SiteCopy) => void;
  multiline?: boolean;
}) {
  const parts = path.split('.');
  let cur: unknown = copy;
  for (const p of parts) {
    cur = (cur as Record<string, unknown>)?.[p];
  }
  const value = typeof cur === 'string' ? cur : Array.isArray(cur) ? cur.join('\n') : '';

  return (
    <div className="admin-field">
      <label>{label}</label>
      {multiline ? (
        <textarea
          className="admin-textarea"
          style={{ width: '100%', minHeight: 88 }}
          value={value}
          onChange={(e) => {
            if (Array.isArray(cur)) {
              onChange(setPath(copy, path, e.target.value.split('\n').filter(Boolean)));
            } else {
              onChange(setPath(copy, path, e.target.value));
            }
          }}
        />
      ) : (
        <input
          className="admin-input"
          style={{ width: '100%' }}
          value={value}
          onChange={(e) => onChange(setPath(copy, path, e.target.value))}
        />
      )}
    </div>
  );
}

export default function SiteCopyAdminPage() {
  const [tab, setTab] = useState<Tab>('chrome');
  const [copy, setCopy] = useState<SiteCopy>(DEFAULT_SITE_COPY);
  const [industriesJson, setIndustriesJson] = useState('[]');
  const [locationsJson, setLocationsJson] = useState('[]');
  const [interestJson, setInterestJson] = useState('[]');
  const [needOptionsJson, setNeedOptionsJson] = useState('[]');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/site-copy')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load');
        setCopy(data.copy);
        setIndustriesJson(JSON.stringify(data.industries || [], null, 2));
        setLocationsJson(JSON.stringify(data.locations || [], null, 2));
        setInterestJson(JSON.stringify(data.copy?.consultation?.interestOptions || [], null, 2));
        setNeedOptionsJson(JSON.stringify(data.copy?.tools?.solutionFinder?.needOptions || [], null, 2));
      })
      .catch((e) => setError(e.message));
  }, []);

  const tabs = useMemo(
    () =>
      [
        { id: 'chrome' as const, label: 'Chrome (Talk / Footer)' },
        { id: 'hubs' as const, label: 'Hub pages' },
        { id: 'legal' as const, label: 'Cookies / Thank-you' },
        { id: 'features' as const, label: 'Features' },
        { id: 'consultation' as const, label: 'Consultation' },
        { id: 'tools' as const, label: 'Tools' },
        { id: 'catalog' as const, label: 'Catalog' },
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
      if (interestJson) {
        nextCopy = setPath(nextCopy, 'consultation.interestOptions', JSON.parse(interestJson));
      }
      if (needOptionsJson) {
        nextCopy = setPath(nextCopy, 'tools.solutionFinder.needOptions', JSON.parse(needOptionsJson));
      }
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
      setInterestJson(JSON.stringify(data.copy?.consultation?.interestOptions || [], null, 2));
      setNeedOptionsJson(JSON.stringify(data.copy?.tools?.solutionFinder?.needOptions || [], null, 2));
      setMessage('Site copy saved. Public pages pick this up on next load.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Site Copy</h2>
        <p style={{ color: 'var(--admin-muted)' }}>
          Marketing chrome and hub page text for this deployment. Use with <strong>New Client</strong> to brand a
          similar industrial site without editing React.
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
        {tab === 'chrome' ? (
          <div className="admin-form-grid">
            <Field label="Talk button" path="talk.buttonLabel" copy={copy} onChange={setCopy} />
            <Field label="Talk · Call" path="talk.call" copy={copy} onChange={setCopy} />
            <Field label="Talk · WhatsApp" path="talk.whatsapp" copy={copy} onChange={setCopy} />
            <Field label="Talk · Callback" path="talk.callback" copy={copy} onChange={setCopy} />
            <Field label="Talk · Solution finder" path="talk.solutionFinder" copy={copy} onChange={setCopy} />
            <Field label="Talk · Emergency" path="talk.emergency" copy={copy} onChange={setCopy} />
            <div className="full">
              <Field label="WhatsApp prefill" path="talk.whatsappPrefill" copy={copy} onChange={setCopy} multiline />
            </div>
            <Field label="Newsletter label" path="footer.newsletterLabel" copy={copy} onChange={setCopy} />
            <Field label="Newsletter placeholder" path="footer.newsletterPlaceholder" copy={copy} onChange={setCopy} />
            <Field label="Subscribe button" path="footer.subscribe" copy={copy} onChange={setCopy} />
            <Field label="Sticky · Call" path="footer.stickyCall" copy={copy} onChange={setCopy} />
            <Field label="Sticky · WhatsApp" path="footer.stickyWhatsapp" copy={copy} onChange={setCopy} />
            <Field label="Sticky · Quote" path="footer.stickyQuote" copy={copy} onChange={setCopy} />
            <Field label="Search placeholder" path="searchForm.placeholder" copy={copy} onChange={setCopy} />
            <Field label="Search button / aria" path="searchForm.ariaLabel" copy={copy} onChange={setCopy} />
            <Field label="Logo / icon · Menu toggle" path="a11y.menuToggle" copy={copy} onChange={setCopy} />
            <Field label="Logo / icon · Close" path="a11y.close" copy={copy} onChange={setCopy} />
            <Field label="Logo / icon · Close consultation" path="a11y.closeConsultation" copy={copy} onChange={setCopy} />
            <Field label="Logo / icon · Close enquiry" path="a11y.closeEnquiry" copy={copy} onChange={setCopy} />
            <Field label="Logo / icon · Copy link" path="a11y.copyLink" copy={copy} onChange={setCopy} />
            <Field label="Logo / icon · Facebook" path="a11y.facebook" copy={copy} onChange={setCopy} />
            <Field label="Logo / icon · LinkedIn" path="a11y.linkedin" copy={copy} onChange={setCopy} />
            <Field label="Logo / icon · Certifications link" path="a11y.viewCertifications" copy={copy} onChange={setCopy} />
            <Field label="Social proof title" path="socialProof.title" copy={copy} onChange={setCopy} />
            <div className="full">
              <Field label="Social proof subtitle" path="socialProof.subtitle" copy={copy} onChange={setCopy} />
            </div>
          </div>
        ) : null}

        {tab === 'hubs' ? (
          <div className="admin-form-grid">
            {(['industries', 'locations', 'resources', 'press', 'sla', 'search'] as const).map((hub) => (
              <div key={hub} className="full" style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                <h3 style={{ textTransform: 'capitalize', marginTop: 0 }}>{hub}</h3>
                <div className="admin-form-grid">
                  <Field label="Eyebrow" path={`hubs.${hub}.eyebrow`} copy={copy} onChange={setCopy} />
                  <Field label="Title" path={`hubs.${hub}.title`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <Field label="Lead" path={`hubs.${hub}.lead`} copy={copy} onChange={setCopy} multiline />
                  </div>
                  <Field label="Primary CTA" path={`hubs.${hub}.ctaPrimary`} copy={copy} onChange={setCopy} />
                  <Field label="Primary href" path={`hubs.${hub}.ctaPrimaryHref`} copy={copy} onChange={setCopy} />
                  <Field label="Secondary CTA" path={`hubs.${hub}.ctaSecondary`} copy={copy} onChange={setCopy} />
                  <Field label="Secondary href" path={`hubs.${hub}.ctaSecondaryHref`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <Field
                      label="Proof rail (one per line)"
                      path={`hubs.${hub}.proofRail`}
                      copy={copy}
                      onChange={setCopy}
                      multiline
                    />
                  </div>
                  <Field label="CTA band title" path={`hubs.${hub}.ctaBandTitle`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <Field label="CTA band lead" path={`hubs.${hub}.ctaBandLead`} copy={copy} onChange={setCopy} multiline />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'legal' ? (
          <div className="admin-form-grid">
            <div className="full">
              <Field label="Cookie banner body" path="cookies.bannerBody" copy={copy} onChange={setCopy} multiline />
            </div>
            <Field label="Save choices" path="cookies.saveChoices" copy={copy} onChange={setCopy} />
            <Field label="Decline optional" path="cookies.declineOptional" copy={copy} onChange={setCopy} />
            <Field label="Cookie page title" path="cookies.pageTitle" copy={copy} onChange={setCopy} />
            <div className="full">
              <Field label="Cookie page lead" path="cookies.pageLead" copy={copy} onChange={setCopy} multiline />
            </div>
            <div className="full">
              <Field label="Necessary body" path="cookies.necessaryBody" copy={copy} onChange={setCopy} multiline />
            </div>
            <div className="full">
              <Field label="Analytics body" path="cookies.analyticsBody" copy={copy} onChange={setCopy} multiline />
            </div>
            <Field label="Thank-you eyebrow" path="thankYou.eyebrow" copy={copy} onChange={setCopy} />
            <Field label="Title · enquiry" path="thankYou.titleEnquiry" copy={copy} onChange={setCopy} />
            <Field label="Title · callback" path="thankYou.titleCallback" copy={copy} onChange={setCopy} />
            <div className="full">
              <Field
                label="Next steps (one per line)"
                path="thankYou.nextSteps"
                copy={copy}
                onChange={setCopy}
                multiline
              />
            </div>
          </div>
        ) : null}

        {tab === 'features' ? (
          <div className="admin-form-grid">
            {(
              [
                ['toolsEnabled', 'Enable tools (/tools/*)'],
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

        {tab === 'consultation' ? (
          <div className="admin-form-grid">
            <Field label="Badge" path="consultation.badge" copy={copy} onChange={setCopy} />
            <Field label="Title" path="consultation.title" copy={copy} onChange={setCopy} />
            <div className="full">
              <Field label="Step 0 lead" path="consultation.step0Lead" copy={copy} onChange={setCopy} multiline />
            </div>
            <div className="full">
              <Field label="Step 1 lead" path="consultation.step1Lead" copy={copy} onChange={setCopy} multiline />
            </div>
            <div className="full">
              <Field label="Step 2 lead" path="consultation.step2Lead" copy={copy} onChange={setCopy} multiline />
            </div>
            <div className="full">
              <Field label="Proof strip (one per line)" path="consultation.proofStrip" copy={copy} onChange={setCopy} multiline />
            </div>
            <div className="full">
              <Field label="Capacity options (one per line)" path="consultation.capacityOptions" copy={copy} onChange={setCopy} multiline />
            </div>
            <div className="full">
              <Field label="Urgency options (one per line)" path="consultation.urgencyOptions" copy={copy} onChange={setCopy} multiline />
            </div>
            <Field label="Submit label" path="consultation.submitLabel" copy={copy} onChange={setCopy} />
            <div className="full">
              <label className="admin-field">Interest options JSON</label>
              <p className="theme-help">
                Array of <code>{'{ title, subtitle, subject }'}</code> — subject must match enquiry form options.
              </p>
              <textarea
                className="admin-textarea"
                style={{ width: '100%', minHeight: 220, fontFamily: 'var(--admin-mono)', fontSize: '0.82rem' }}
                value={interestJson}
                onChange={(e) => setInterestJson(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {tab === 'tools' ? (
          <div className="admin-form-grid">
            {(['solutionFinder', 'upsCalculator', 'solarRoi'] as const).map((tool) => (
              <div key={tool} className="full" style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                <h3 style={{ marginTop: 0, textTransform: 'capitalize' }}>{tool.replace(/([A-Z])/g, ' $1')}</h3>
                <div className="admin-form-grid">
                  <Field label="Eyebrow" path={`tools.${tool}.eyebrow`} copy={copy} onChange={setCopy} />
                  <Field label="Title" path={`tools.${tool}.title`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <Field label="Lead" path={`tools.${tool}.lead`} copy={copy} onChange={setCopy} multiline />
                  </div>
                  <Field label="CTA band title" path={`tools.${tool}.ctaBandTitle`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <Field label="CTA band lead" path={`tools.${tool}.ctaBandLead`} copy={copy} onChange={setCopy} multiline />
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

        {tab === 'catalog' ? (
          <div className="admin-form-grid">
            {(['products', 'services', 'projects'] as const).map((kind) => (
              <div key={kind} className="full" style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                <h3 style={{ marginTop: 0, textTransform: 'capitalize' }}>{kind}</h3>
                <div className="admin-form-grid">
                  <Field label="Eyebrow" path={`catalog.${kind}.eyebrow`} copy={copy} onChange={setCopy} />
                  <Field label="Title" path={`catalog.${kind}.title`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <Field label="Lead" path={`catalog.${kind}.lead`} copy={copy} onChange={setCopy} multiline />
                  </div>
                  <Field label="Social proof title" path={`catalog.${kind}.socialProofTitle`} copy={copy} onChange={setCopy} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'locales' ? (
          <div className="admin-form-grid">
            {(['hi', 'kn'] as const).map((locale) => (
              <div key={locale} className="full" style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                <h3 style={{ marginTop: 0, textTransform: 'uppercase' }}>{locale}</h3>
                <div className="admin-form-grid">
                  <Field label="Language name" path={`locales.${locale}.langName`} copy={copy} onChange={setCopy} />
                  <Field label="Title" path={`locales.${locale}.title`} copy={copy} onChange={setCopy} />
                  <div className="full">
                    <Field label="Lead" path={`locales.${locale}.lead`} copy={copy} onChange={setCopy} multiline />
                  </div>
                  <Field label="UPS link" path={`locales.${locale}.ups`} copy={copy} onChange={setCopy} />
                  <Field label="Solar link" path={`locales.${locale}.solar`} copy={copy} onChange={setCopy} />
                  <Field label="Calculator link" path={`locales.${locale}.calc`} copy={copy} onChange={setCopy} />
                  <Field label="CTA" path={`locales.${locale}.cta`} copy={copy} onChange={setCopy} />
                  <Field label="English site link" path={`locales.${locale}.englishSite`} copy={copy} onChange={setCopy} />
                  <Field label="Alt locale link" path={`locales.${locale}.altLocaleLabel`} copy={copy} onChange={setCopy} />
                </div>
              </div>
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

        <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save site copy'}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              setCopy(DEFAULT_SITE_COPY);
              setMessage('Reset to defaults in editor (not saved yet).');
            }}
          >
            Reset editor to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
