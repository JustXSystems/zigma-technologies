import { getPageBySlug } from '@/lib/cms';
import type { CmsPage, CmsSection } from '@/lib/cms-types';
import { HOME_SEED_SECTIONS } from '@/lib/home-sections';
import { CAREERS_SEED_SECTIONS_V2 } from '@/lib/careers-sections';
import { CERTIFICATIONS_SEED_SECTIONS_V2 } from '@/lib/certifications-sections';
import { INDUSTRIES_SEED_SECTIONS_V2 } from '@/lib/industries-sections';
import { PRIVACY_SEED_SECTIONS_V2 } from '@/lib/privacy-sections';
import { TERMS_SEED_SECTIONS_V2 } from '@/lib/terms-sections';
import { QS_SEED_SECTIONS, QS_SLUG } from '@/lib/qualitysafety-sections';

function seedForSlug(slug: string) {
  if (slug === 'home') return HOME_SEED_SECTIONS;
  if (slug === 'careers') return CAREERS_SEED_SECTIONS_V2;
  if (slug === 'certifications') return CERTIFICATIONS_SEED_SECTIONS_V2;
  if (slug === 'privacy') return PRIVACY_SEED_SECTIONS_V2;
  if (slug === 'terms') return TERMS_SEED_SECTIONS_V2;
  if (slug === 'industries') return INDUSTRIES_SEED_SECTIONS_V2;
  if (slug === QS_SLUG) return QS_SEED_SECTIONS;
  return null;
}

function seedPage(slug: string, sections: ReturnType<typeof seedForSlug>): CmsPage {
  const titleMap: Record<string, string> = {
    home: 'Home',
    industries: 'Industries',
    certifications: 'Certifications',
    [QS_SLUG]: 'Quality & Safety',
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
      enabled: 'enabled' in s && s.enabled === false ? 0 : 1,
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
