'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import { AboutSiteSettingsContext, ThemeColorDatalist } from '@/components/admin/about/AboutControls';
import { LifeGroupProvider } from '@/components/admin/life/LifeControls';
import { ContactHeroEditor } from '@/components/admin/contact/ContactSectionEditor';
import { CertsCtaEditor } from '@/components/admin/certifications/CertificationsSectionEditor';
import { PrivacyPolicyEditor } from '@/components/admin/privacy/PrivacySectionEditor';
import {
  withIndustryPageDefaults,
  type IndustryPageCtaContent,
  type IndustryPageHeroContent,
  type IndustryPageOverviewContent,
  type IndustryPageSectionType,
} from '@/lib/industry-page-sections';

export default function IndustryPageSectionEditor({
  type,
  content,
  onChange,
}: {
  type: IndustryPageSectionType;
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const emit = (next: object) => onChange(next as Record<string, unknown>);
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/site-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.settings) setSite(mergeSiteSettings(data.settings));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AboutSiteSettingsContext.Provider value={site}>
      <div className="az-admin lz-admin lgy-admin ctc-admin pvc-admin ind-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'industry_page_hero' ? (
            <ContactHeroEditor content={withIndustryPageDefaults<IndustryPageHeroContent>(type, content)} onChange={emit} />
          ) : type === 'industry_page_overview' ? (
            <PrivacyPolicyEditor content={withIndustryPageDefaults<IndustryPageOverviewContent>(type, content)} onChange={emit} />
          ) : type === 'industry_page_cta' ? (
            <CertsCtaEditor content={withIndustryPageDefaults<IndustryPageCtaContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
