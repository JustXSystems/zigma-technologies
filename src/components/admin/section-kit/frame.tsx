'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import { SectionSiteSettingsContext, ThemeColorDatalist } from './controls';
import { GroupProvider } from './groups';
import type { EditorProps } from './blocks';

let lastSiteSettings: SiteSettings | null = null;

/** Saved site settings for admin editors: the last copy at once, then refreshed from the server. */
export function useAdminSiteSettings(): SiteSettings {
  const [site, setSite] = useState<SiteSettings>(() => lastSiteSettings ?? DEFAULT_SITE_SETTINGS);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/site-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.settings) return;
        lastSiteSettings = mergeSiteSettings(data.settings);
        setSite(lastSiteSettings);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return site;
}

// Each type's editor takes its own content shape; the family map is keyed by the matching type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TypeEditor = ComponentType<EditorProps<any>>;

export type SectionFamilyEditorProps<T extends string> = {
  type: T;
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

/**
 * Builds the editor for one family of section types (Home, About, Contact…): site typography
 * defaults, theme color suggestions and Expand / Collapse all are shared; each type maps to its form.
 */
export function createSectionFamilyEditor<T extends string>({
  withDefaults,
  editors,
}: {
  withDefaults: <C extends object>(type: T, raw: unknown) => C;
  editors: Record<T, TypeEditor>;
}) {
  return function SectionFamilyEditor({ type, content, onChange }: SectionFamilyEditorProps<T>) {
    const site = useAdminSiteSettings();
    const Editor: TypeEditor | undefined = editors[type];
    return (
      <SectionSiteSettingsContext.Provider value={site}>
        <div className="az-admin lz-admin">
          <ThemeColorDatalist />
          <GroupProvider key={type}>
            {Editor ? <Editor content={withDefaults<object>(type, content)} onChange={(next: object) => onChange(next as Record<string, unknown>)} /> : null}
          </GroupProvider>
        </div>
      </SectionSiteSettingsContext.Provider>
    );
  };
}
