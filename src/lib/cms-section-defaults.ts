import { defaultIndustryCategoryContent } from '@/lib/industry-category';
import { defaultAboutSectionContent } from '@/lib/about-sections';
import { defaultLifeSectionContent } from '@/lib/life-sections';
import { defaultLegacySectionContent } from '@/lib/legacy-sections';
import { defaultContactSectionContent } from '@/lib/contact-sections';
import { defaultCareersSectionContent } from '@/lib/careers-sections';
import { defaultCertsSectionContent } from '@/lib/certifications-sections';
import { defaultPrivacySectionContent } from '@/lib/privacy-sections';
import { defaultTermsSectionContent } from '@/lib/terms-sections';
import { defaultIndustriesSectionContent } from '@/lib/industries-sections';
import { defaultIndustryPageSectionContent } from '@/lib/industry-page-sections';
import { defaultIndustries101SectionContent } from '@/lib/industries101-sections';
import { defaultQsSectionContent } from '@/lib/qualitysafety-sections';
import { defaultHomeSectionContent } from '@/lib/home-sections';
import { defaultBlogSectionContent } from '@/lib/blog-sections';

/** Starter content for a newly added CMS section of `type` (empty object when the type has no seed). */
export function defaultCmsSectionContent(type: string, pageSlug?: string): Record<string, unknown> {
  if (type === 'industry_category') return defaultIndustryCategoryContent();
  return (
    defaultAboutSectionContent(type) ||
    defaultLifeSectionContent(type) ||
    defaultLegacySectionContent(type) ||
    defaultContactSectionContent(type) ||
    defaultCareersSectionContent(type) ||
    defaultCertsSectionContent(type) ||
    defaultPrivacySectionContent(type) ||
    defaultTermsSectionContent(type) ||
    defaultIndustriesSectionContent(type) ||
    defaultIndustryPageSectionContent(type, pageSlug) ||
    defaultIndustries101SectionContent(type) ||
    defaultQsSectionContent(type) ||
    defaultHomeSectionContent(type) ||
    defaultBlogSectionContent(type) ||
    {}
  );
}
