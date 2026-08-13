export type CatalogItemType = 'project' | 'product' | 'service';

export type CatalogCaseStudy = {
  enabled?: boolean;
  client_name?: string;
  client_sector?: string;
  location?: string;
  delivery_year?: string;
  challenge?: string;
  solution?: string;
  scope?: string;
  outcomes?: string[];
  technologies?: string[];
  testimonial?: {
    quote?: string;
    author?: string;
    role?: string;
  };
  /** Optional media pack */
  before_image_url?: string;
  after_image_url?: string;
  oem_badges?: string[];
  case_study_pdf_url?: string;
  video_url?: string;
  video_title?: string;
};

export type CatalogItem = {
  id: number;
  item_type: CatalogItemType;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  category_id: number | null;
  category_name?: string | null;
  category_slug?: string | null;
  tags_json: string[] | null;
  specs_json: Record<string, string> | null;
  price_label: string | null;
  availability_label: string | null;
  lead_time_label: string | null;
  status: 'draft' | 'published';
  featured: number;
  sort_order: number;
  enabled: number;
  cta_config_json: Record<string, unknown> | null;
  case_study_json: CatalogCaseStudy | null;
  created_at?: string;
  updated_at?: string;
  media?: CatalogMedia[];
  primary_image?: string | null;
};

export type CatalogMedia = {
  id: number;
  item_id: number;
  kind: 'image' | 'video' | 'svg';
  url: string;
  alt: string | null;
  sort_order: number;
  is_primary: number;
};

export type CatalogCategory = {
  id: number;
  item_type: CatalogItemType;
  name: string;
  slug: string;
  sort_order: number;
  enabled: number;
};

export type CatalogPageSettings = {
  id: number;
  item_type: CatalogItemType;
  layout: 'grid' | 'list';
  grid_columns: number;
  filters_json: string[] | null;
  search_fields_json: string[] | null;
  card_fields_json: string[] | null;
  modal_fields_json: string[] | null;
  hero_enabled: number;
  hero_autoplay_ms: number;
  hero_item_ids_json: number[] | null;
  hero_eyebrow: string | null;
  hero_title: string | null;
  hero_lead: string | null;
  visual_style: 'classic' | 'premium' | 'glass' | 'minimal' | 'bold-corporate';
  hero_variant: 'standard' | 'spotlight';
  loading_skeleton_enabled: number;
  reveal_animation_enabled: number;
  premium_borders_enabled: number;
};

export type FormField = {
  id: number;
  form_id: number;
  field_name: string;
  label: string;
  field_type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'number' | 'checkbox';
  required: number;
  options_json: string[] | null;
  placeholder: string | null;
  sort_order: number;
  enabled: number;
  validation_json: Record<string, unknown> | null;
};

export type FormDefinition = {
  id: number;
  form_key: string;
  name: string;
  item_type: CatalogItemType | 'general' | null;
  enabled: number;
  fields?: FormField[];
};

export type Enquiry = {
  id: number;
  form_id: number | null;
  item_id: number | null;
  item_type: CatalogItemType | 'general' | null;
  payload_json: Record<string, unknown>;
  status: 'new' | 'in_progress' | 'closed';
  admin_notes?: string | null;
  created_at: string;
  updated_at?: string;
  item_title?: string | null;
};

export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}
