'use client';

import { useEffect, useMemo, useState } from 'react';
import { hasScreenAccess } from '@/lib/admin-screens';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, sanitizeCssSize, type SiteSettings } from '@/lib/site-settings';
import { DEFAULT_THEME_TOKENS, TYPOGRAPHY_TOKEN_KEYS, mergeTokens, pickTokens } from '@/lib/theme-tokens';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import EyebrowSizeEditor from '@/components/admin/EyebrowSizeEditor';
import HeadingLevelPicker from '@/components/admin/HeadingLevelPicker';
import { useAdminUser } from '@/components/admin/admin-session';
import { saveSiteSettingsChanges } from '@/components/admin/site-settings/save-site-settings';
import { useDirtyTracker } from '@/components/admin/unsaved-changes';
import { TokenFields } from './TokenEditor';
import ThemePreviewPane from './ThemePreviewPane';

/** Site settings shown here (the type scale itself is theme tokens). */
const TYPE_SETTINGS = {
  headingPageHero: 'Page hero heading level',
  headingSection: 'Section heading level',
  eyebrowSize: 'Base eyebrow',
  eyebrowSizeMd: 'Medium eyebrow',
  eyebrowSizeLg: 'Large eyebrow',
} as const;
type TypeSettingKey = keyof typeof TYPE_SETTINGS;
const TYPE_SETTING_KEYS = Object.keys(TYPE_SETTINGS) as TypeSettingKey[];

const pickTypeSettings = (s: SiteSettings) => Object.fromEntries(TYPE_SETTING_KEYS.map((key) => [key, s[key]]));
const typeSettingLabel = (key: string) => TYPE_SETTINGS[key as TypeSettingKey] ?? key;

async function fetchTokens(): Promise<Record<string, string>> {
  const res = await fetch('/api/admin/theme');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load theme tokens');
  return mergeTokens(data.tokens);
}

async function fetchSettings(): Promise<SiteSettings> {
  const res = await fetch('/api/admin/site-settings');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load site settings');
  return mergeSiteSettings(data.settings);
}

/**
 * The public type system in one place: size scale (theme tokens, Theme Studio permission) plus heading
 * levels and eyebrow sizes (site settings, Site Settings permission). Each part shows only when allowed.
 */
export default function TypographyEditor() {
  const user = useAdminUser();
  const canScale = !!user && hasScreenAccess(user.screens, 'theme');
  const canLevels = !!user && hasScreenAccess(user.screens, 'siteSettings');
  const [scale, setScale] = useState<Record<string, string> | null>(null);
  const [savedScale, setSavedScale] = useState<Record<string, string> | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [savedSettings, setSavedSettings] = useState<SiteSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const { dirty, markClean } = useDirtyTracker(
    loaded ? { scale, levels: settings && pickTypeSettings(settings) } : null
  );

  useEffect(() => {
    if (!canScale && !canLevels) return;
    Promise.all([canScale ? fetchTokens() : null, canLevels ? fetchSettings() : null])
      .then(([tokens, site]) => {
        const loadedScale = tokens && pickTokens(tokens, TYPOGRAPHY_TOKEN_KEYS);
        setScale(loadedScale);
        setSavedScale(loadedScale);
        setSettings(site);
        setSavedSettings(site);
        setLoaded(true);
        markClean();
      })
      .catch((e: Error) => setError(e.message));
  }, [canScale, canLevels, markClean]);

  const previewCss = useMemo(() => {
    const vars: Array<[string, string]> = [...Object.entries(scale ?? {})];
    if (settings) {
      vars.push(
        ['--text-eyebrow', sanitizeCssSize(settings.eyebrowSize, DEFAULT_SITE_SETTINGS.eyebrowSize)],
        ['--text-eyebrow-md', sanitizeCssSize(settings.eyebrowSizeMd, DEFAULT_SITE_SETTINGS.eyebrowSizeMd)],
        ['--text-eyebrow-lg', sanitizeCssSize(settings.eyebrowSizeLg, DEFAULT_SITE_SETTINGS.eyebrowSizeLg)]
      );
    }
    // `html:root` outranks the site's own `:root` declarations of the same variables.
    return vars.length ? `html:root{${vars.map(([key, value]) => `${key}:${value};`).join('')}}` : '';
  }, [scale, settings]);

  async function save() {
    if (!dirty) {
      setMessage('No changes to save.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (scale && JSON.stringify(scale) !== JSON.stringify(savedScale)) {
        const latest = await fetchTokens();
        const res = await fetch('/api/admin/theme', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: { ...latest, ...scale } }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Saving the type scale failed');
        const next = pickTokens(mergeTokens(data.tokens), TYPOGRAPHY_TOKEN_KEYS);
        setScale(next);
        setSavedScale(next);
      }
      if (settings && savedSettings) {
        const result = await saveSiteSettingsChanges(savedSettings, settings, typeSettingLabel);
        setSettings(result.settings);
        setSavedSettings(result.settings);
      }
      markClean();
      setMessage('Typography saved. The public site picks it up on refresh.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (scale) setScale(pickTokens(DEFAULT_THEME_TOKENS, TYPOGRAPHY_TOKEN_KEYS));
    if (settings) {
      setSettings({ ...settings, ...Object.fromEntries(TYPE_SETTING_KEYS.map((key) => [key, DEFAULT_SITE_SETTINGS[key]])) });
    }
    setMessage('Typography reset to defaults (not saved yet).');
  }

  const patchSettings = (patch: Partial<SiteSettings>) => setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <div className="theme-studio admin-page-stack">
      <AdminFloatingActions status={message || (saving ? 'Saving…' : undefined)}>
        <button type="button" className="admin-btn admin-btn-secondary" disabled={!loaded} onClick={reset}>
          Reset typography
        </button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving || !loaded} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save typography'}
        </button>
      </AdminFloatingActions>

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="theme-studio-grid theme-studio-grid--wide">
        <div className="theme-studio-controls">
          {!loaded && !error ? <div className="admin-card">Loading typography…</div> : null}

          {scale ? (
            <section className="admin-card" aria-labelledby="typography-scale">
              <h3 id="typography-scale" style={{ marginTop: 0 }}>
                Type scale
              </h3>
              <p className="theme-help" style={{ marginTop: 0 }}>
                Body, lead and heading sizes as CSS lengths or <code>clamp()</code>. The heading levels below choose
                between these sizes.
              </p>
              <TokenFields group="typography" tokens={scale} onChange={setScale} />
            </section>
          ) : null}

          {settings ? (
            <>
              <section className="admin-card" aria-labelledby="typography-levels">
                <h3 id="typography-levels" style={{ marginTop: 0 }}>
                  Heading levels
                </h3>
                <HeadingLevelPicker settings={settings} onChange={patchSettings} />
              </section>
              <section className="admin-card" aria-labelledby="typography-eyebrows">
                <h3 id="typography-eyebrows" style={{ marginTop: 0 }}>
                  Eyebrows
                </h3>
                <EyebrowSizeEditor settings={settings} onChange={patchSettings} />
              </section>
            </>
          ) : null}
        </div>

        <div className="theme-studio-preview-col admin-card">
          <h3 style={{ marginTop: 0 }}>Live preview</h3>
          <p className="theme-help">
            Sizes update as you type. Heading levels change the page markup — save, then press Refresh to see them.
          </p>
          <ThemePreviewPane previewCss={previewCss} path="/" />
        </div>
      </div>
    </div>
  );
}
