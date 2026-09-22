export type CatalogItemType = 'project' | 'product' | 'service';

/** Drop-shadow style for background frame or attached product media */
export const CATALOG_SHADOW_STYLE_VALUES = [
  'none',
  'soft',
  'medium',
  'strong',
  'bottom',
  'lift',
  'diffuse',
  'crisp',
] as const;
export type CatalogShadowStyle = (typeof CATALOG_SHADOW_STYLE_VALUES)[number];
/** @deprecated Prefer CatalogShadowStyle */
export type CatalogBackgroundShading = CatalogShadowStyle;

export const CATALOG_SHADOW_STYLE_OPTIONS: Array<{
  value: CatalogShadowStyle;
  label: string;
  hint: string;
}> = [
  { value: 'none', label: 'None', hint: 'No drop shadow' },
  { value: 'soft', label: 'Soft', hint: 'Light ambient lift' },
  { value: 'medium', label: 'Medium', hint: 'Balanced depth (default)' },
  { value: 'strong', label: 'Strong', hint: 'High-contrast depth' },
  { value: 'bottom', label: 'Ground', hint: 'Shadow pooled underneath' },
  { value: 'lift', label: 'Lift', hint: 'Floating product / frame' },
  { value: 'diffuse', label: 'Diffuse', hint: 'Large soft studio bloom' },
  { value: 'crisp', label: 'Crisp', hint: 'Tight editorial edge' },
];

/** @deprecated Prefer CATALOG_SHADOW_STYLE_OPTIONS */
export const CATALOG_BACKGROUND_SHADING_OPTIONS = CATALOG_SHADOW_STYLE_OPTIONS;

/** Quick-view detail popup composition */
export const CATALOG_DETAIL_LAYOUT_VALUES = ['media-stage', 'balanced', 'stacked'] as const;
export type CatalogDetailLayout = (typeof CATALOG_DETAIL_LAYOUT_VALUES)[number];
export const DEFAULT_DETAIL_LAYOUT: CatalogDetailLayout = 'media-stage';
export const DEFAULT_DETAIL_GALLERY_SHADOW: CatalogShadowStyle = 'medium';

export const CATALOG_DETAIL_LAYOUT_OPTIONS: Array<{
  value: CatalogDetailLayout;
  label: string;
  hint: string;
}> = [
  {
    value: 'media-stage',
    label: 'Media stage',
    hint: 'Product-first: larger sticky gallery, content scrolls beside it',
  },
  {
    value: 'balanced',
    label: 'Balanced split',
    hint: 'Equal columns — good when copy and media share weight',
  },
  {
    value: 'stacked',
    label: 'Stacked',
    hint: 'Gallery full-width on top, details below — mobile-native',
  },
];

/** Visual template for the Quick-view popup shell */
export const CATALOG_DETAIL_TEMPLATE_VALUES = [
  'classic',
  'vitrine',
  'lumen',
  'horizon',
  'showcase',
] as const;
export type CatalogDetailTemplate = (typeof CATALOG_DETAIL_TEMPLATE_VALUES)[number];
export const DEFAULT_DETAIL_TEMPLATE: CatalogDetailTemplate = 'classic';

/** Templates that use floating chrome instead of the navy header bar */
export const CATALOG_DETAIL_MODERN_TEMPLATES: readonly CatalogDetailTemplate[] = [
  'vitrine',
  'lumen',
  'horizon',
  'showcase',
];

export const CATALOG_DETAIL_TEMPLATE_OPTIONS: Array<{
  value: CatalogDetailTemplate;
  label: string;
  hint: string;
}> = [
  {
    value: 'classic',
    label: 'Classic',
    hint: 'Navy chrome header, split stage, panel CTA rail — current system',
  },
  {
    value: 'vitrine',
    label: 'Vitrine',
    hint: 'Bright editorial: floating chrome, soft stage, refined specs, trust strip',
  },
  {
    value: 'lumen',
    label: 'Lumen',
    hint: 'Futuristic dark theater — cinematic media, neon accents, night-mode content',
  },
  {
    value: 'horizon',
    label: 'Horizon',
    hint: 'Immersive media canvas with frosted glass content sheet — ultra-modern',
  },
  {
    value: 'showcase',
    label: 'Showcase',
    hint: 'Reference match: media + CTA left, icon cards + trust strip right, gallery dots',
  },
];

export function isModernDetailTemplate(template: CatalogDetailTemplate): boolean {
  return (CATALOG_DETAIL_MODERN_TEMPLATES as readonly string[]).includes(template);
}

/** Toggleable pieces inside catalog-detail-panel */
export const CATALOG_DETAIL_ELEMENT_VALUES = [
  'close',
  'media',
  'gallery_dots',
  'title',
  'tagline',
  'price',
  'highlight',
  'overview',
  'tags',
  'specs',
  'trust',
  'cta_copy',
  'cta_profile',
  'cta_quote',
  'cta_contact',
  'enquiry',
  'chrome',
  'badge',
  'ref',
  'copy_link',
] as const;
export type CatalogDetailElement = (typeof CATALOG_DETAIL_ELEMENT_VALUES)[number];

export const DEFAULT_DETAIL_ELEMENTS: CatalogDetailElement[] = [
  'close',
  'media',
  'gallery_dots',
  'title',
  'tagline',
  'price',
  'highlight',
  'overview',
  'specs',
  'trust',
  'cta_copy',
  'cta_profile',
  'cta_quote',
  'cta_contact',
  'enquiry',
];

export const CATALOG_DETAIL_ELEMENT_OPTIONS: Array<{
  id: CatalogDetailElement;
  label: string;
  group: 'chrome' | 'content' | 'cta';
}> = [
  { id: 'close', label: 'Close (X)', group: 'chrome' },
  { id: 'chrome', label: 'Header chrome (Classic)', group: 'chrome' },
  { id: 'badge', label: 'Category badge', group: 'chrome' },
  { id: 'ref', label: 'Reference slug', group: 'chrome' },
  { id: 'copy_link', label: 'Copy link', group: 'chrome' },
  { id: 'media', label: 'Media gallery', group: 'content' },
  { id: 'gallery_dots', label: 'Gallery dots (Showcase)', group: 'content' },
  { id: 'title', label: 'Title', group: 'content' },
  { id: 'tagline', label: 'Tagline (summary)', group: 'content' },
  { id: 'price', label: 'Investment card', group: 'content' },
  { id: 'highlight', label: 'Highlight card', group: 'content' },
  { id: 'overview', label: 'Overview', group: 'content' },
  { id: 'tags', label: 'Tags', group: 'content' },
  { id: 'specs', label: 'Spec cards', group: 'content' },
  { id: 'trust', label: 'Trust strip', group: 'content' },
  { id: 'cta_copy', label: 'CTA intro copy', group: 'cta' },
  { id: 'cta_profile', label: 'View full profile', group: 'cta' },
  { id: 'cta_quote', label: 'Request a quote', group: 'cta' },
  { id: 'cta_contact', label: 'Contact link', group: 'cta' },
  { id: 'enquiry', label: 'Enquiry drawer', group: 'cta' },
];

export function normalizeDetailLayout(value: unknown): CatalogDetailLayout {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (CATALOG_DETAIL_LAYOUT_VALUES as readonly string[]).includes(raw)
    ? (raw as CatalogDetailLayout)
    : DEFAULT_DETAIL_LAYOUT;
}

export function normalizeDetailTemplate(value: unknown): CatalogDetailTemplate {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (CATALOG_DETAIL_TEMPLATE_VALUES as readonly string[]).includes(raw)
    ? (raw as CatalogDetailTemplate)
    : DEFAULT_DETAIL_TEMPLATE;
}

export function normalizeDetailElements(value: unknown): CatalogDetailElement[] {
  if (!Array.isArray(value) || !value.length) return [...DEFAULT_DETAIL_ELEMENTS];
  const allowed = new Set<string>(CATALOG_DETAIL_ELEMENT_VALUES);
  const next = value
    .map((v) => (typeof v === 'string' ? v.trim().toLowerCase() : ''))
    .filter((v): v is CatalogDetailElement => allowed.has(v));
  return next.length ? next : [...DEFAULT_DETAIL_ELEMENTS];
}

export function normalizeShadowStyle(value: unknown): CatalogShadowStyle {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (CATALOG_SHADOW_STYLE_VALUES as readonly string[]).includes(raw)
    ? (raw as CatalogShadowStyle)
    : DEFAULT_DETAIL_GALLERY_SHADOW;
}

export const DEFAULT_MEDIA_FIT_PERCENT = 78;
/** Listing-card product fill (higher = less empty margin around the image) */
export const DEFAULT_CARD_MEDIA_FIT_PERCENT = 94;
export type CatalogCardMediaInset = 'none' | 'snug' | 'roomy';
export const DEFAULT_CARD_MEDIA_INSET: CatalogCardMediaInset = 'snug';
export const CARD_MEDIA_INSET_OPTIONS: Array<{
  value: CatalogCardMediaInset;
  label: string;
  hint: string;
}> = [
  { value: 'none', label: 'None', hint: 'Edge-to-edge in the media frame' },
  { value: 'snug', label: 'Snug', hint: 'Tight padding (recommended)' },
  { value: 'roomy', label: 'Roomy', hint: 'More breathing room around the image' },
];

export function normalizeCardMediaFitPercent(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_CARD_MEDIA_FIT_PERCENT;
  return Math.min(100, Math.max(70, Math.round(n)));
}

export function normalizeCardMediaInset(value: unknown): CatalogCardMediaInset {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'none' || raw === 'snug' || raw === 'roomy') return raw;
  return DEFAULT_CARD_MEDIA_INSET;
}

/** Listing-card overall size: auto = content-driven (current); fixed = equal height tiles */
export type CatalogCardSizeMode = 'auto' | 'fixed';
export const DEFAULT_CARD_SIZE_MODE: CatalogCardSizeMode = 'auto';
export const DEFAULT_CARD_FIXED_HEIGHT_PX = 420;
export const CARD_FIXED_HEIGHT_MIN = 280;
export const CARD_FIXED_HEIGHT_MAX = 720;
export const CARD_SIZE_MODE_OPTIONS: Array<{
  value: CatalogCardSizeMode;
  label: string;
  description: string;
}> = [
  {
    value: 'auto',
    label: 'Auto',
    description: 'Cards grow with content — current marketplace / overlay behaviour.',
  },
  {
    value: 'fixed',
    label: 'Fixed',
    description: 'Uniform card height across the grid for a precise corporate lineup.',
  },
];
export const CARD_FIXED_HEIGHT_PRESETS: Array<{
  id: string;
  label: string;
  height: number;
  hint: string;
}> = [
  { id: 'compact', label: 'Compact', height: 360, hint: 'Dense browse grids' },
  { id: 'standard', label: 'Standard', height: 420, hint: 'Balanced default' },
  { id: 'comfort', label: 'Comfort', height: 480, hint: 'More media presence' },
  { id: 'tall', label: 'Tall', height: 560, hint: 'Hero-forward tiles' },
];

export function normalizeCardSizeMode(value: unknown): CatalogCardSizeMode {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return raw === 'fixed' ? 'fixed' : DEFAULT_CARD_SIZE_MODE;
}

export function normalizeCardFixedHeightPx(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_CARD_FIXED_HEIGHT_PX;
  return Math.min(CARD_FIXED_HEIGHT_MAX, Math.max(CARD_FIXED_HEIGHT_MIN, Math.round(n)));
}

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
  /** Backdrop for catalog-gallery-main in product/service/project popups */
  background_image_url: string | null;
  /** Drop-shadow on the background frame (catalog-card-media) */
  background_shading_style: CatalogShadowStyle;
  /** How the background image fills the media frame */
  background_fit_to_space: boolean;
  /** Background image size % when fit is on */
  background_fit_percent: number;
  /** @deprecated Defaults for new attaches — prefer per-media fit */
  media_fit_to_space: boolean;
  /** @deprecated Defaults for new attaches — prefer per-media fit */
  media_fit_percent: number;
  /** Primary attached image presentation (from list query / media) */
  primary_fit_to_space?: boolean;
  primary_fit_percent?: number;
  primary_shadow_style?: CatalogShadowStyle;
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
  /** Drop-shadow on this product/asset image */
  shadow_style: CatalogShadowStyle;
  /** When true, this asset is contained within the frame at fit_percent */
  fit_to_space: boolean;
  /** Max width/height of this asset as % of the available frame (when fit is on) */
  fit_percent: number;
  created_at?: string;
};

export type CatalogCategory = {
  id: number;
  item_type: CatalogItemType;
  name: string;
  slug: string;
  sort_order: number;
  enabled: number;
};

/** Facet counts for catalog discovery (profile rail + filter rail). */
export type CatalogFacetCategory = {
  slug: string;
  name: string;
  count: number;
  sort_order: number;
};

export type CatalogFacetTag = {
  value: string;
  count: number;
};

export type CatalogFacets = {
  /** Items matching every active filter (same set as the result list). */
  total: number;
  /**
   * Items matching q + tag (any category). Used for the Profiles “All” control
   * so its count stays truthful while a category is selected.
   */
  categoryAllCount: number;
  categories: CatalogFacetCategory[];
  tags: CatalogFacetTag[];
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
  /**
   * Catalog card composition:
   * - overlay: cinematic tile (text over media)
   * - marketplace: Amazon-like stacked image then body below
   */
  card_style: 'overlay' | 'marketplace';
  /** Body panel background for marketplace (and optional overlay body tint) */
  card_body_bg_color: string | null;
  /** Media frame fill behind product/background imagery on listing cards */
  card_media_bg_color: string | null;
  /** Background for the catalog listing section (.catalog-listing) */
  listing_bg_color: string | null;
  /** Border color on marketplace card hover */
  marketplace_hover_border_color: string | null;
  /**
   * Listing-card product image size (% of media frame). Page-level override for
   * catalog cards only — inventory fit still controls the detail popup.
   */
  card_media_fit_percent: number;
  /** Padding around the product image inside catalog-card-media */
  card_media_inset: 'none' | 'snug' | 'roomy';
  /**
   * Listing card sizing:
   * - auto: content-driven height (current behaviour)
   * - fixed: equal-height cards using card_fixed_height_px
   */
  card_size_mode: CatalogCardSizeMode;
  /** Target card height in px when card_size_mode is fixed */
  card_fixed_height_px: number;
  /**
   * Quick-view popup composition (catalog-detail-panel).
   * media-stage = product-first sticky gallery; balanced = equal split; stacked = gallery on top.
   * Applies to Classic template; Vitrine uses its own stage proportions.
   */
  detail_layout: CatalogDetailLayout;
  /**
   * Drop shadow on .catalog-gallery-main inside the Quick-view popup.
   * Independent of listing-card frame shadow (item.background_shading_style).
   */
  detail_gallery_shadow: CatalogShadowStyle;
  /** Visual shell for Quick view: classic (current) or vitrine (advanced modern) */
  detail_template: CatalogDetailTemplate;
  /** Toggleable UI pieces inside the Quick-view popup */
  detail_elements_json: string[] | null;
  hero_variant: 'standard' | 'spotlight';
  /** When hero_variant is standard, show/hide the compact active-item panel. */
  hero_standard_panel_enabled: number;
  /** Show/hide the hero meta row (highlights / autoplay / type). */
  hero_meta_enabled: number;
  /** Explicit hero UI pieces. Content chips apply to all variants/styles;
   * standard_panel / spotlight only gate the featured-item shell for that layout. */
  hero_elements_json: string[] | null;
  /** Toolbar pieces (search, sort, result_meta, filter_chips, clear). */
  toolbar_elements_json: string[] | null;
  loading_skeleton_enabled: number;
  reveal_animation_enabled: number;
  premium_borders_enabled: number;
  /** Shop-by-profile category tiles */
  discovery_profile_rail_enabled: number;
  /** Quick-find intent/tag chips */
  discovery_quick_find_enabled: number;
  /** Left Refine facet rail (Filters drawer on mobile) */
  discovery_facet_rail_enabled: number;
  /** Group unfiltered results by category */
  discovery_grouped_results_enabled: number;
  /** Sticky search/filter toolbar */
  discovery_sticky_toolbar_enabled: number;
  /** Cards shown per group before “View all” */
  discovery_group_preview_count: number;
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
