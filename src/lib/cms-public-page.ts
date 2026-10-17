import { getPageBySlug } from '@/lib/cms';
import type { CmsPage, CmsSection } from '@/lib/cms-types';
import { HOME_SEED_SECTIONS } from '@/lib/home-sections';
import {
  CAREERS_SEED_SECTIONS_V2,
  type CareersApplicationContent,
  type CareersJobsContent,
  type CareersRoleOption,
} from '@/lib/careers-sections';
import { CERTIFICATIONS_SEED_SECTIONS_V2 } from '@/lib/certifications-sections';
import { INDUSTRIES_SEED_SECTIONS_V2 } from '@/lib/industries-sections';
import { PRIVACY_SEED_SECTIONS_V2 } from '@/lib/privacy-sections';
import { TERMS_SEED_SECTIONS_V2 } from '@/lib/terms-sections';
import { QS_SEED_SECTIONS, QS_SLUG } from '@/lib/qualitysafety-sections';
import { BLOG_SEED_SECTIONS, BLOG_SLUG } from '@/lib/blog-sections';
import { PROJECTS101_SEED_SECTIONS, PROJECTS101_SLUG } from '@/lib/projects101-sections';
import { bootstrapHiringFromCareersCms, careerJobToPublicCard, listOpenCareerJobs } from '@/lib/career-hiring';

function seedForSlug(slug: string) {
  if (slug === BLOG_SLUG) return BLOG_SEED_SECTIONS;
  if (slug === PROJECTS101_SLUG) return PROJECTS101_SEED_SECTIONS;
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
    [BLOG_SLUG]: 'Blog',
    [PROJECTS101_SLUG]: 'Projects',
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

/** Replace careers_jobs.jobs with live open postings from the hiring ATS (admin-only archive). */
async function hydrateCareersHiring(page: CmsPage): Promise<CmsPage> {
  if (page.slug !== 'careers') return page;
  let openCards: ReturnType<typeof careerJobToPublicCard>[] = [];
  try {
    await bootstrapHiringFromCareersCms('system');
    openCards = (await listOpenCareerJobs()).map(careerJobToPublicCard);
  } catch (err) {
    console.error('[careers] could not load hiring jobs', err);
    return page;
  }
  const roleOptions: CareersRoleOption[] = openCards.map((j) => ({
    label: j.role || j.title,
    jobId: j.id,
    publicId: j.publicId,
    slug: j.slug,
  }));
  const roles = roleOptions.map((r) => r.label).filter(Boolean);
  const sections = page.sections || [];
  return {
    ...page,
    sections: sections.map((section) => {
      if (section.type === 'careers_jobs') {
        const content = { ...(section.content_json || {}) } as CareersJobsContent;
        /* Prefer ATS open roles; fall back to section JSON until HR imports into Hiring. */
        const jobs = openCards.length ? openCards : content.jobs || [];
        return { ...section, content_json: { ...content, jobs, _hiringSource: openCards.length ? 'ats' : 'legacy' } };
      }
      if (section.type === 'careers_application' && (roles.length || roleOptions.length)) {
        const content = { ...(section.content_json || {}) } as CareersApplicationContent;
        const existing = Array.isArray(content.roles) ? content.roles.map(String).filter(Boolean) : [];
        const merged = Array.from(new Set([...roles, ...existing, 'General Application']));
        const general: CareersRoleOption = { label: 'General Application' };
        const byKey = new Map<string, CareersRoleOption>();
        for (const opt of [...roleOptions, ...(content.roleOptions || []), general]) {
          const key = opt.publicId || opt.label;
          if (!key || byKey.has(key)) continue;
          byKey.set(key, opt);
        }
        /* Keep select labels aligned with merged role list order. */
        const ordered: CareersRoleOption[] = [];
        for (const label of merged) {
          const hit = [...byKey.values()].find((o) => o.label === label) || ({ label } as CareersRoleOption);
          ordered.push(hit);
        }
        return { ...section, content_json: { ...content, roles: merged, roleOptions: ordered } };
      }
      return section;
    }),
  };
}

/** Load a public CMS page (DB or seed fallback) — for SSR and API routes. */
export async function loadPublicCmsPage(
  slug: string,
  allowPreview = false
): Promise<PublicCmsPageResult | null> {
  const page = await getPageBySlug(slug, allowPreview);

  if (page?.sections?.length) {
    return { page: await hydrateCareersHiring(page), source: 'database', preview: allowPreview };
  }

  const seed = seedForSlug(slug);
  if (seed) {
    return { page: await hydrateCareersHiring(seedPage(slug, seed)), source: 'seed', preview: allowPreview };
  }

  return null;
}
