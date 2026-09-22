import { getPageBySlug } from '@/lib/cms';
import type { CmsPage, CmsSection } from '@/lib/cms-types';
import { HOMEPAGE_SEED_SECTIONS } from '@/lib/homepage-seed';
import { CONTACT_SEED_SECTIONS, CAREERS_SEED_SECTIONS, CERTIFICATIONS_SEED_SECTIONS } from '@/lib/inner-page-seeds';
import { INDUSTRIES_HUB_SEED_SECTIONS, INDUSTRY_HUB_IMAGES } from '@/lib/industry-hub-seed';
import { INDUSTRY_DEFS, industryPublicPath } from '@/lib/industries';
import { PRIVACY_SEED_SECTIONS, TERMS_SEED_SECTIONS } from '@/lib/legal-page-seeds';

function industriesHubSeedSections() {
  const cards = INDUSTRY_DEFS.map((ind) => ({
    key: ind.key,
    eyebrow: ind.eyebrow,
    name: ind.name,
    lead: ind.lead,
    image: INDUSTRY_HUB_IMAGES[ind.key] || '/assets/images/city-skyline-with-solar-panels-and-indus.jpg',
    href: industryPublicPath(ind.key),
  }));
  return INDUSTRIES_HUB_SEED_SECTIONS.map((s) =>
    s.type === 'industry_hub' ? { ...s, content_json: { ...s.content_json, cards } } : s
  );
}

function seedForSlug(slug: string) {
  if (slug === 'home') return HOMEPAGE_SEED_SECTIONS;
  if (slug === 'contact') return CONTACT_SEED_SECTIONS;
  if (slug === 'careers') return CAREERS_SEED_SECTIONS;
  if (slug === 'certifications') return CERTIFICATIONS_SEED_SECTIONS;
  if (slug === 'privacy') return PRIVACY_SEED_SECTIONS;
  if (slug === 'terms') return TERMS_SEED_SECTIONS;
  if (slug === 'industries') return industriesHubSeedSections();
  return null;
}

function seedPage(slug: string, sections: ReturnType<typeof seedForSlug>): CmsPage {
  const titleMap: Record<string, string> = {
    home: 'Home',
    industries: 'Industries',
    certifications: 'Certifications',
  };
  return {
    id: 0,
    slug,
    title: titleMap[slug] || slug.charAt(0).toUpperCase() + slug.slice(1),
    meta_title: null,
    meta_description: null,
    status: 'published',
    sort_order: 0,
    enabled: 1,
    sections: (sections || []).map((s, i) => ({
      id: i + 1,
      page_id: 0,
      type: s.type,
      section_key: s.section_key,
      title: s.title,
      sort_order: i,
      enabled: 1,
      content_json: s.content_json,
      style_json: {},
    })) as CmsSection[],
  };
}

export type PublicCmsPageResult = {
  page: CmsPage;
  source: 'database' | 'seed';
  preview: boolean;
};

/** Load a public CMS page (DB or seed fallback) — for SSR and API routes. */
export async function loadPublicCmsPage(
  slug: string,
  allowPreview = false
): Promise<PublicCmsPageResult | null> {
  const page = await getPageBySlug(slug, allowPreview);

  if (page?.sections?.length) {
    return { page, source: 'database', preview: allowPreview };
  }

  const seed = seedForSlug(slug);
  if (seed) {
    return { page: seedPage(slug, seed), source: 'seed', preview: allowPreview };
  }

  return null;
}
