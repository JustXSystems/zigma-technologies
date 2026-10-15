'use client';

import { createSectionFamilyEditor } from '@/components/admin/section-kit';
import { ContactHeroEditor } from '@/components/admin/contact/ContactSectionEditor';
import { CertsCtaEditor } from '@/components/admin/certifications/CertificationsSectionEditor';
import { PrivacyPolicyEditor } from '@/components/admin/privacy/PrivacySectionEditor';
import { withIndustryPageDefaults, type IndustryPageSectionType } from '@/lib/industry-page-sections';

export default createSectionFamilyEditor<IndustryPageSectionType>({
  withDefaults: withIndustryPageDefaults,
  editors: {
    industry_page_hero: ContactHeroEditor,
    industry_page_overview: PrivacyPolicyEditor,
    industry_page_cta: CertsCtaEditor,
  },
});
