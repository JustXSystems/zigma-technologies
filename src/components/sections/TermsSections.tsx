'use client';

import { ContactHeroSection } from '@/components/sections/ContactSections';
import { CertsCtaSection } from '@/components/sections/CertificationsSections';
import { PrivacyPolicySection } from '@/components/sections/PrivacySections';
import { withTermsDefaults } from '@/lib/terms-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

export function TermsHeroSection({ content, sectionKey }: SectionProps) {
  return <ContactHeroSection content={withTermsDefaults('terms_hero', content)} sectionKey={sectionKey} defaultId="terms-hero" />;
}

export function TermsPolicySection({ content, sectionKey }: SectionProps) {
  return <PrivacyPolicySection content={withTermsDefaults('terms_policy', content)} sectionKey={sectionKey} defaultId="terms-body" />;
}

export function TermsCtaSection({ content, sectionKey }: SectionProps) {
  return <CertsCtaSection content={withTermsDefaults('terms_cta', content)} sectionKey={sectionKey} defaultId="terms-cta" className="pvc-cta" />;
}

export function renderTermsSection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'terms_hero':
      return <TermsHeroSection key={key} {...rest} />;
    case 'terms_policy':
      return <TermsPolicySection key={key} {...rest} />;
    case 'terms_cta':
      return <TermsCtaSection key={key} {...rest} />;
    default:
      return null;
  }
}
