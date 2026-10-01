import { ABOUT_ZIGMA_SEED_SECTIONS } from '@/lib/about-sections';
import { CAREERS_SEED_SECTIONS_V2, CAREERS_SLUG, isCareersSectionType, upgradeCareersSection } from '@/lib/careers-sections';
import { CERTIFICATIONS_SEED_SECTIONS_V2, CERTS_SLUG, isCertsSectionType, upgradeCertsSection } from '@/lib/certifications-sections';
import { CONTACT_SEED_SECTIONS_V2, CONTACT_SLUG, isContactSectionType, upgradeContactSection } from '@/lib/contact-sections';
import { HOME_SEED_SECTIONS, HOME_SLUG, isHomeSectionType, upgradeHomeSection } from '@/lib/home-sections';
import { INDUSTRY_DEFS, industryPageSlug, industryPublicPath } from '@/lib/industries';
import { INDUSTRIES101_SEED_SECTIONS, INDUSTRIES101_SLUG } from '@/lib/industries101-sections';
import {
  INDUSTRIES_SEED_SECTIONS_V2,
  INDUSTRIES_SLUG,
  isIndustriesSectionType,
  upgradeIndustriesSection,
} from '@/lib/industries-sections';
import { industryPageSeedSections, isIndustryPageSectionType, upgradeIndustryPageSection } from '@/lib/industry-page-sections';
import { LEGACY_20YRS_SEED_SECTIONS, LEGACY_20YRS_SLUG } from '@/lib/legacy-sections';
import { LIFE_AT_ZIGMA_SEED_SECTIONS, LIFE_AT_ZIGMA_SLUG } from '@/lib/life-sections';
import { PRIVACY_SEED_SECTIONS_V2, PRIVACY_SLUG, isPrivacySectionType, upgradePrivacySection } from '@/lib/privacy-sections';
import { QS_SEED_SECTIONS, QS_SLUG } from '@/lib/qualitysafety-sections';
import { TERMS_SEED_SECTIONS_V2, TERMS_SLUG, isTermsSectionType, upgradeTermsSection } from '@/lib/terms-sections';

export type SeedSection = {
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
  enabled?: boolean;
};

export type SectionUpgrade = { type: string; content: Record<string, unknown> };

export type PageSeedGroup = 'Core' | 'Company' | 'Industries' | 'Legal';

export type PageSeedDef = {
  slug: string;
  label: string;
  group: PageSeedGroup;
  /** Public URL, for display only. */
  path: string;
  /** Used only when the page row is created; never overwrites an existing page's title or SEO. */
  page: { title: string; meta_title?: string; meta_description?: string };
  sections: () => SeedSection[];
  /** Converts an older generic section on this page to its configurable type, or null to leave it alone. */
  upgrade?: (type: string, content: Record<string, unknown>, sectionKey: string | null) => SectionUpgrade | null;
  /** Section types produced by `upgrade`; only these are restorable. */
  isUpgradedType?: (type: string) => boolean;
};

const CORE_AND_COMPANY: PageSeedDef[] = [
  {
    slug: HOME_SLUG,
    label: 'Homepage',
    group: 'Core',
    path: '/',
    page: {
      title: 'Home',
      meta_title: 'Zigma Technologies',
      meta_description: 'Solar, UPS, BESS & EV Charging Infrastructure in India',
    },
    sections: () => HOME_SEED_SECTIONS,
    upgrade: (type, content) => upgradeHomeSection(type, content),
    isUpgradedType: isHomeSectionType,
  },
  {
    slug: 'about-zigma',
    label: 'About Zigma',
    group: 'Company',
    path: '/about-zigma',
    page: {
      title: 'About Zigma',
      meta_title: 'About Zigma Technologies | 20+ Years of Power & Energy Engineering',
      meta_description:
        'Zigma Technologies is a 20+ year engineering partner delivering Solar EPC, UPS & Power Continuity, BESS, EV Charging, and Industrial Engineering solutions across India. Learn about our story, values, and team.',
    },
    sections: () => ABOUT_ZIGMA_SEED_SECTIONS,
  },
  {
    slug: LIFE_AT_ZIGMA_SLUG,
    label: 'Life at Zigma',
    group: 'Company',
    path: `/${LIFE_AT_ZIGMA_SLUG}`,
    page: {
      title: 'Life at Zigma',
      meta_title: 'Life at Zigma | Careers at Zigma Technologies',
      meta_description:
        'Life at Zigma Technologies: a 250+ strong team of engineers, technicians and support specialists powering UPS, solar and power electronics across India.',
    },
    sections: () => LIFE_AT_ZIGMA_SEED_SECTIONS,
  },
  {
    slug: LEGACY_20YRS_SLUG,
    label: '20 Years of Legacy',
    group: 'Company',
    path: `/${LEGACY_20YRS_SLUG}`,
    page: {
      title: '20 Years of Legacy',
      meta_title: '20 Years of Legacy | Zigma Technologies',
      meta_description:
        'Since 2006, Zigma Technologies has kept Indian industry powered and protected. Explore twenty years of milestones in UPS, solar, storage and EV charging.',
    },
    sections: () => LEGACY_20YRS_SEED_SECTIONS,
  },
  {
    slug: QS_SLUG,
    label: 'Quality & Safety',
    group: 'Company',
    path: `/${QS_SLUG}`,
    page: {
      title: 'Quality & Safety',
      meta_title: 'Quality & Safety | Zigma Technologies',
      meta_description:
        'How Zigma Technologies builds quality and safety into every UPS, solar and battery project: a four-stage quality process, six site safety habits, and certificates you can verify.',
    },
    sections: () => QS_SEED_SECTIONS,
  },
  {
    slug: CERTS_SLUG,
    label: 'Certifications',
    group: 'Company',
    path: `/${CERTS_SLUG}`,
    page: {
      title: 'Certifications',
      meta_title: 'Certifications | Zigma Technologies',
      meta_description: 'OEM authorizations, ISO certification, and engineering partnerships.',
    },
    sections: () => CERTIFICATIONS_SEED_SECTIONS_V2,
    upgrade: (type, content) => upgradeCertsSection(type, content),
    isUpgradedType: isCertsSectionType,
  },
  {
    slug: CAREERS_SLUG,
    label: 'Careers',
    group: 'Company',
    path: `/${CAREERS_SLUG}`,
    page: {
      title: 'Careers',
      meta_title: 'Careers | Zigma Technologies',
      meta_description: 'Join Zigma Technologies — careers in solar, power systems, and industrial engineering.',
    },
    sections: () => CAREERS_SEED_SECTIONS_V2,
    upgrade: (type, content, sectionKey) => upgradeCareersSection(type, content, sectionKey),
    isUpgradedType: isCareersSectionType,
  },
  {
    slug: CONTACT_SLUG,
    label: 'Contact',
    group: 'Company',
    path: `/${CONTACT_SLUG}`,
    page: {
      title: 'Contact',
      meta_title: 'Contact | Zigma Technologies',
      meta_description: 'Get in touch with Zigma Technologies for solar, UPS, BESS and EV charging support.',
    },
    sections: () => CONTACT_SEED_SECTIONS_V2,
    upgrade: (type, content) => upgradeContactSection(type, content),
    isUpgradedType: isContactSectionType,
  },
];

const INDUSTRY_PAGES: PageSeedDef[] = [
  {
    slug: INDUSTRIES_SLUG,
    label: 'Industries hub',
    group: 'Industries',
    path: `/${INDUSTRIES_SLUG}`,
    // Meta fields stay empty so Site Copy → SEO supplies the search title/description.
    page: { title: 'Industries' },
    sections: () => INDUSTRIES_SEED_SECTIONS_V2,
    upgrade: (type, content) => upgradeIndustriesSection(type, content),
    isUpgradedType: isIndustriesSectionType,
  },
  {
    slug: INDUSTRIES101_SLUG,
    label: 'Industries We Serve',
    group: 'Industries',
    path: `/${INDUSTRIES101_SLUG}`,
    page: {
      title: 'Industries We Serve',
      meta_title: 'Industries We Serve | Zigma Technologies',
      meta_description:
        'Zigma Technologies delivers Solar, UPS, BESS, EV Charging, and engineering power solutions across 24+ industries in India — from data centers and hospitals to manufacturing, EPC, and renewable energy developers.',
    },
    sections: () => INDUSTRIES101_SEED_SECTIONS,
  },
  ...INDUSTRY_DEFS.map((ind): PageSeedDef => {
    const slug = industryPageSlug(ind.key);
    return {
      slug,
      label: ind.name,
      group: 'Industries',
      path: industryPublicPath(ind.key),
      page: { title: ind.name },
      sections: () => industryPageSeedSections(ind.key),
      upgrade: (type, content) => upgradeIndustryPageSection(type, content, slug),
      isUpgradedType: isIndustryPageSectionType,
    };
  }),
];

const LEGAL: PageSeedDef[] = [
  {
    slug: PRIVACY_SLUG,
    label: 'Privacy Policy',
    group: 'Legal',
    path: `/${PRIVACY_SLUG}`,
    page: {
      title: 'Privacy Policy',
      meta_title: 'Privacy Policy | Zigma Technologies',
      meta_description: 'How Zigma Technologies collects, uses, and protects personal information.',
    },
    sections: () => PRIVACY_SEED_SECTIONS_V2,
    upgrade: (type, content) => upgradePrivacySection(type, content),
    isUpgradedType: isPrivacySectionType,
  },
  {
    slug: TERMS_SLUG,
    label: 'Terms of Use',
    group: 'Legal',
    path: `/${TERMS_SLUG}`,
    page: {
      title: 'Terms of Use',
      meta_title: 'Terms of Use | Zigma Technologies',
      meta_description: 'Terms governing use of the Zigma Technologies website.',
    },
    sections: () => TERMS_SEED_SECTIONS_V2,
    upgrade: (type, content) => upgradeTermsSection(type, content),
    isUpgradedType: isTermsSectionType,
  },
];

/** Every built-in page the CMS can seed, in display order. Add a page here and it gets a Seed button. */
export const PAGE_SEEDS: readonly PageSeedDef[] = [...CORE_AND_COMPANY, ...INDUSTRY_PAGES, ...LEGAL];

export function getPageSeed(slug: string): PageSeedDef | null {
  return PAGE_SEEDS.find((d) => d.slug === slug) || null;
}
