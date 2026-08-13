import type { CatalogCaseStudy, CatalogItem, CatalogItemType } from '@/lib/types';

export const CATALOG_TYPE_PATH: Record<CatalogItemType, string> = {
  project: 'projects',
  product: 'products',
  service: 'services',
};

export const CATALOG_TYPE_LABEL: Record<CatalogItemType, string> = {
  project: 'Project',
  product: 'Product',
  service: 'Service',
};

export function catalogPublicPath(itemType: CatalogItemType, slug: string) {
  return `/${CATALOG_TYPE_PATH[itemType]}/${slug}`;
}

export function catalogListingPath(itemType: CatalogItemType) {
  return `/${CATALOG_TYPE_PATH[itemType]}`;
}

export function hasCaseStudyContent(item: CatalogItem) {
  const cs = item.case_study_json;
  if (!cs) return false;
  if (cs.enabled === false) return false;
  return Boolean(
    cs.client_name ||
      cs.client_sector ||
      cs.location ||
      cs.challenge ||
      cs.solution ||
      cs.scope ||
      cs.outcomes?.length ||
      cs.technologies?.length ||
      cs.testimonial?.quote
  );
}

export function caseStudyLabel(itemType: CatalogItemType) {
  return itemType === 'project' ? 'Case study' : itemType === 'product' ? 'Product profile' : 'Service profile';
}

export function pickHighlightMetric(specs: Record<string, string> | null | undefined) {
  if (!specs) return null;
  const highlight = specs.Highlight || specs.highlight;
  if (highlight) return highlight;
  const first = Object.entries(specs)[0];
  return first ? first[1] : null;
}

export function buildCaseStudyJson(input: {
  enabled: boolean;
  client_name: string;
  client_sector: string;
  location: string;
  delivery_year: string;
  challenge: string;
  solution: string;
  scope: string;
  outcomes: string;
  technologies: string;
  testimonial_quote: string;
  testimonial_author: string;
  testimonial_role: string;
  before_image_url?: string;
  after_image_url?: string;
  oem_badges?: string;
  case_study_pdf_url?: string;
  video_url?: string;
  video_title?: string;
}): CatalogCaseStudy | null {
  if (!input.enabled) return { enabled: false };

  const outcomes = input.outcomes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const technologies = input.technologies
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const oem_badges = (input.oem_badges || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const study: CatalogCaseStudy = {
    enabled: true,
    client_name: input.client_name || undefined,
    client_sector: input.client_sector || undefined,
    location: input.location || undefined,
    delivery_year: input.delivery_year || undefined,
    challenge: input.challenge || undefined,
    solution: input.solution || undefined,
    scope: input.scope || undefined,
    outcomes: outcomes.length ? outcomes : undefined,
    technologies: technologies.length ? technologies : undefined,
    before_image_url: input.before_image_url?.trim() || undefined,
    after_image_url: input.after_image_url?.trim() || undefined,
    oem_badges: oem_badges.length ? oem_badges : undefined,
    case_study_pdf_url: input.case_study_pdf_url?.trim() || undefined,
    video_url: input.video_url?.trim() || undefined,
    video_title: input.video_title?.trim() || undefined,
    testimonial:
      input.testimonial_quote || input.testimonial_author || input.testimonial_role
        ? {
            quote: input.testimonial_quote || undefined,
            author: input.testimonial_author || undefined,
            role: input.testimonial_role || undefined,
          }
        : undefined,
  };

  if (!hasCaseStudyContent({ ...({} as CatalogItem), case_study_json: study })) {
    return { enabled: true };
  }

  return study;
}

export function caseStudyToEditor(cs: CatalogCaseStudy | null | undefined) {
  return {
    case_study_enabled: cs?.enabled !== false,
    case_study_client: cs?.client_name || '',
    case_study_sector: cs?.client_sector || '',
    case_study_location: cs?.location || '',
    case_study_year: cs?.delivery_year || '',
    case_study_challenge: cs?.challenge || '',
    case_study_solution: cs?.solution || '',
    case_study_scope: cs?.scope || '',
    case_study_outcomes: (cs?.outcomes || []).join('\n'),
    case_study_technologies: (cs?.technologies || []).join(', '),
    case_study_testimonial_quote: cs?.testimonial?.quote || '',
    case_study_testimonial_author: cs?.testimonial?.author || '',
    case_study_testimonial_role: cs?.testimonial?.role || '',
    case_study_before_image: cs?.before_image_url || '',
    case_study_after_image: cs?.after_image_url || '',
    case_study_oem_badges: (cs?.oem_badges || []).join(', '),
    case_study_pdf_url: cs?.case_study_pdf_url || '',
    case_study_video_url: cs?.video_url || '',
    case_study_video_title: cs?.video_title || '',
  };
}
