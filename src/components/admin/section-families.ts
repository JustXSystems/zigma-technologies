import type { ComponentType } from 'react';
import type { SectionFamilyEditorProps } from '@/components/admin/section-kit';
import AboutSectionEditor from '@/components/admin/about/AboutSectionEditor';
import BlogSectionEditor from '@/components/admin/blog/BlogSectionEditor';
import CareersSectionEditor from '@/components/admin/careers/CareersSectionEditor';
import CertificationsSectionEditor from '@/components/admin/certifications/CertificationsSectionEditor';
import ContactSectionEditor from '@/components/admin/contact/ContactSectionEditor';
import HomeSectionEditor from '@/components/admin/home/HomeSectionEditor';
import IndustriesSectionEditor from '@/components/admin/industries/IndustriesSectionEditor';
import IndustryPageSectionEditor from '@/components/admin/industries/IndustryPageSectionEditor';
import Industries101SectionEditor from '@/components/admin/industries101/Industries101SectionEditor';
import LegacySectionEditor from '@/components/admin/legacy/LegacySectionEditor';
import LifeSectionEditor from '@/components/admin/life/LifeSectionEditor';
import PrivacySectionEditor from '@/components/admin/privacy/PrivacySectionEditor';
import Projects101SectionEditor from '@/components/admin/projects101/Projects101SectionEditor';
import QualitySafetySectionEditor from '@/components/admin/qualitysafety/QualitySafetySectionEditor';
import TermsSectionEditor from '@/components/admin/terms/TermsSectionEditor';
import { isAboutSectionType, withAboutDefaults } from '@/lib/about-sections';
import { isBlogSectionType, withBlogDefaults } from '@/lib/blog-sections';
import { isCareersSectionType, withCareersDefaults } from '@/lib/careers-sections';
import { isCertsSectionType, withCertsDefaults } from '@/lib/certifications-sections';
import { isContactSectionType, withContactDefaults } from '@/lib/contact-sections';
import { isHomeSectionType, withHomeDefaults } from '@/lib/home-sections';
import { isIndustriesSectionType, withIndustriesDefaults } from '@/lib/industries-sections';
import { isIndustryPageSectionType, withIndustryPageDefaults } from '@/lib/industry-page-sections';
import { isIndustries101SectionType, withIndustries101Defaults } from '@/lib/industries101-sections';
import { isLegacySectionType, withLegacyDefaults } from '@/lib/legacy-sections';
import { isLifeSectionType, withLifeDefaults } from '@/lib/life-sections';
import { isPrivacySectionType, withPrivacyDefaults } from '@/lib/privacy-sections';
import { isProjects101SectionType, withProjects101Defaults } from '@/lib/projects101-sections';
import { isQsSectionType, withQsDefaults } from '@/lib/qualitysafety-sections';
import { isTermsSectionType, withTermsDefaults } from '@/lib/terms-sections';

/** A page's set of configurable section types and the editor that owns them. */
export type SectionFamily = {
  is: (type: string) => boolean;
  withDefaults: (type: string, raw: unknown) => Record<string, unknown>;
  Editor: ComponentType<SectionFamilyEditorProps<string>>;
};

function family<T extends string>(
  is: (type: string) => type is T,
  withDefaults: <C extends object>(type: T, raw: unknown) => C,
  Editor: ComponentType<SectionFamilyEditorProps<T>>
): SectionFamily {
  return {
    is,
    withDefaults: (type, raw) => withDefaults<Record<string, unknown>>(type as T, raw),
    Editor: Editor as ComponentType<SectionFamilyEditorProps<string>>,
  };
}

/** Every configurable section family; types not listed here use the classic built-in forms. */
export const SECTION_FAMILIES: readonly SectionFamily[] = [
  family(isHomeSectionType, withHomeDefaults, HomeSectionEditor),
  family(isAboutSectionType, withAboutDefaults, AboutSectionEditor),
  family(isLifeSectionType, withLifeDefaults, LifeSectionEditor),
  family(isLegacySectionType, withLegacyDefaults, LegacySectionEditor),
  family(isContactSectionType, withContactDefaults, ContactSectionEditor),
  family(isCareersSectionType, withCareersDefaults, CareersSectionEditor),
  family(isCertsSectionType, withCertsDefaults, CertificationsSectionEditor),
  family(isPrivacySectionType, withPrivacyDefaults, PrivacySectionEditor),
  family(isTermsSectionType, withTermsDefaults, TermsSectionEditor),
  family(isIndustriesSectionType, withIndustriesDefaults, IndustriesSectionEditor),
  family(isIndustryPageSectionType, withIndustryPageDefaults, IndustryPageSectionEditor),
  family(isIndustries101SectionType, withIndustries101Defaults, Industries101SectionEditor),
  family(isProjects101SectionType, withProjects101Defaults, Projects101SectionEditor),
  family(isQsSectionType, withQsDefaults, QualitySafetySectionEditor),
  family(isBlogSectionType, withBlogDefaults, BlogSectionEditor),
];

export function sectionFamilyOf(type: string): SectionFamily | null {
  return SECTION_FAMILIES.find((f) => f.is(type)) ?? null;
}
