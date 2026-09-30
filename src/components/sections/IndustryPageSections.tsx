'use client';

import { ContactHeroSection } from '@/components/sections/ContactSections';
import { CertsCtaSection } from '@/components/sections/CertificationsSections';
import { PrivacyPolicySection } from '@/components/sections/PrivacySections';
import { withIndustryPageDefaults } from '@/lib/industry-page-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

export function IndustryPageHeroSection({ content, sectionKey }: SectionProps) {
  return <ContactHeroSection content={withIndustryPageDefaults('industry_page_hero', content)} sectionKey={sectionKey} defaultId="industry-hero" />;
}

export function IndustryPageOverviewSection({ content, sectionKey }: SectionProps) {
  return <PrivacyPolicySection content={withIndustryPageDefaults('industry_page_overview', content)} sectionKey={sectionKey} defaultId="overview" />;
}

export function IndustryPageCtaSection({ content, sectionKey }: SectionProps) {
  return (
    <CertsCtaSection content={withIndustryPageDefaults('industry_page_cta', content)} sectionKey={sectionKey} defaultId="cta" className="ind-cta" />
  );
}

export function renderIndustryPageSection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'industry_page_hero':
      return <IndustryPageHeroSection key={key} {...rest} />;
    case 'industry_page_overview':
      return <IndustryPageOverviewSection key={key} {...rest} />;
    case 'industry_page_cta':
      return <IndustryPageCtaSection key={key} {...rest} />;
    default:
      return null;
  }
}
