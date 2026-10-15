'use client';

import { createSectionFamilyEditor } from '@/components/admin/section-kit';
import { ContactHeroEditor } from '@/components/admin/contact/ContactSectionEditor';
import { CertsCtaEditor } from '@/components/admin/certifications/CertificationsSectionEditor';
import { PrivacyPolicyEditor } from '@/components/admin/privacy/PrivacySectionEditor';
import { withTermsDefaults, type TermsSectionType } from '@/lib/terms-sections';

export default createSectionFamilyEditor<TermsSectionType>({
  withDefaults: withTermsDefaults,
  editors: {
    terms_hero: ContactHeroEditor,
    terms_policy: PrivacyPolicyEditor,
    terms_cta: CertsCtaEditor,
  },
});
