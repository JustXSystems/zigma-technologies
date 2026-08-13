export type CmsPage = {
  id: number;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  status: 'draft' | 'published';
  sort_order: number;
  enabled: number;
  created_at?: string;
  updated_at?: string;
  sections?: CmsSection[];
};

export type CmsSection = {
  id: number;
  page_id: number;
  type: string;
  section_key: string | null;
  title: string | null;
  sort_order: number;
  enabled: number;
  content_json: Record<string, unknown>;
  style_json: Record<string, unknown>;
};

export const SECTION_TYPES = [
  { type: 'hero', label: 'Hero slider' },
  { type: 'page_hero', label: 'Inner page hero' },
  { type: 'cert_hero', label: 'Certifications hero' },
  { type: 'eco', label: 'Ecosystem intro' },
  { type: 'stats', label: 'Stat bar' },
  { type: 'culture_stats', label: 'Culture / metric strip' },
  { type: 'quick_contact', label: 'Quick contact strip' },
  { type: 'locations', label: 'Office locations + map' },
  { type: 'why', label: 'Why cards' },
  { type: 'split', label: 'Split feature block' },
  { type: 'timeline', label: 'Legacy timeline' },
  { type: 'projects_teaser', label: 'Projects teaser' },
  { type: 'industries', label: 'Industries grid' },
  { type: 'testimonials', label: 'Testimonials' },
  { type: 'partners', label: 'Partners marquee' },
  { type: 'logo_marquee', label: 'Logo / brand marquee' },
  { type: 'feature_grid', label: 'Feature cards grid' },
  { type: 'job_list', label: 'Job openings list' },
  { type: 'internship', label: 'Internship program' },
  { type: 'careers_apply', label: 'Careers apply form' },
  { type: 'cert_teaser', label: 'Certifications teaser' },
  { type: 'cert_cta', label: 'Certifications CTA' },
  { type: 'enquiry_form', label: 'Enquiry / contact form' },
  { type: 'cta', label: 'CTA band' },
  { type: 'rich_text', label: 'Rich text / HTML' },
  { type: 'comparison_table', label: 'Capability / Comparison table' },
] as const;
