import type { CatalogItemType } from '@/lib/types';

/**
 * Column dictionary for the catalog import / export workbook — shared by the template builder,
 * the parser and the admin legend. Headers are matched loosely (case, spaces, punctuation and
 * "(…)" notes are ignored), so people can rename "SEO title" to "Meta title" and still import.
 */

export type TransferField =
  | 'id'
  | 'action'
  | 'title'
  | 'slug'
  | 'category'
  | 'status'
  | 'enabled'
  | 'featured'
  | 'sort_order'
  | 'summary'
  | 'description'
  | 'tags'
  | 'specs'
  | 'price_label'
  | 'availability_label'
  | 'lead_time_label'
  | 'brochure'
  | 'primary_image'
  | 'primary_alt'
  | 'gallery'
  | 'background_image'
  | 'meta_title'
  | 'meta_description'
  | 'og_image'
  | 'seo_noindex'
  | 'cs_client_name'
  | 'cs_client_sector'
  | 'cs_location'
  | 'cs_delivery_year'
  | 'cs_challenge'
  | 'cs_solution'
  | 'cs_scope'
  | 'cs_outcomes'
  | 'cs_technologies'
  | 'cs_quote'
  | 'cs_quote_author'
  | 'cs_quote_role'
  | 'cs_video_url'
  | 'cs_video_title'
  | 'cs_oem_badges'
  | 'cs_before_image'
  | 'cs_after_image'
  | 'cs_pdf_url'
  | 'version';

export type TransferGroup = 'system' | 'core' | 'content' | 'commercial' | 'media' | 'seo' | 'case';

export type TransferColumn = {
  field: TransferField;
  header: string;
  group: TransferGroup;
  aliases?: string[];
  required?: boolean;
  width: number;
  wrap?: boolean;
  hidden?: boolean;
  hint: string;
  example?: string;
  seoTip?: string;
  list?: 'status' | 'yesno' | 'action' | 'category';
  /** Highlighted in Excel when a filled cell is outside this length. */
  lengthRange?: [number, number];
  maxLength?: number;
  /** Only on these sheets (default: every type). */
  types?: CatalogItemType[];
};

/** SEO length targets — same as the inventory SEO editor. */
export const SEO_TITLE_RANGE: [number, number] = [30, 60];
export const SEO_DESCRIPTION_RANGE: [number, number] = [120, 160];
export const ALT_TEXT_MAX = 125;
export const SLUG_IDEAL_MAX = 75;
export const THIN_CONTENT_CHARS = 300;

export const CLEAR_TOKEN = '#clear';

export type TransferOptions = {
  /** upsert = create new rows and update matches; create / update restrict to one. */
  mode: 'upsert' | 'create' | 'update';
  /** What an empty cell means for an existing item. */
  blankCells: 'keep' | 'clear';
  /** sync = the sheet is the full gallery (adds, removes, reorders); append = only add. */
  gallery: 'sync' | 'append';
  defaultStatus: 'draft' | 'published';
  createCategories: boolean;
  seoAutopilot: boolean;
  redirects: boolean;
  allowDelete: boolean;
};

export const DEFAULT_TRANSFER_OPTIONS: TransferOptions = {
  mode: 'upsert',
  blankCells: 'keep',
  gallery: 'sync',
  defaultStatus: 'draft',
  createCategories: true,
  seoAutopilot: true,
  redirects: true,
  allowDelete: false,
};

const CASE_TYPES: CatalogItemType[] = ['project', 'service'];

export const TRANSFER_COLUMNS: TransferColumn[] = [
  {
    field: 'id',
    header: 'ID',
    group: 'system',
    width: 8,
    aliases: ['item id', 'system id'],
    hint: 'System ID. Leave blank on new rows and never change it on existing rows. It is how updates find the right item.',
  },
  {
    field: 'action',
    header: 'Action',
    group: 'system',
    width: 11,
    list: 'action',
    hint: 'Blank = create or update. Skip = ignore this row. Archive = unpublish and hide. Delete = remove (only if allowed at import). Example = sample row, always ignored.',
  },
  {
    field: 'title',
    header: 'Title',
    group: 'core',
    required: true,
    width: 34,
    aliases: ['name', 'product name', 'service name', 'project name'],
    maxLength: 255,
    hint: 'Customer-facing name. Required for new rows.',
    example: 'Modular UPS 30–120 kVA',
    seoTip: 'Lead with what buyers search for (product type + key spec). It becomes the page heading (H1) and the default search title.',
  },
  {
    field: 'slug',
    header: 'URL slug',
    group: 'core',
    width: 26,
    aliases: ['slug', 'url', 'page url'],
    maxLength: 160,
    hint: 'Last part of the page address. Leave blank to generate from the title. Changing it on a live page adds a 301 redirect automatically.',
    example: 'modular-ups-30-120-kva',
    seoTip: 'Short, lowercase, hyphenated, keyword-first; avoid dates and stop words. Under 75 characters.',
  },
  {
    field: 'category',
    header: 'Category',
    group: 'core',
    width: 22,
    list: 'category',
    hint: 'Pick from the list, or type a new name. New categories can be created on import.',
    example: 'Power protection',
  },
  {
    field: 'status',
    header: 'Status',
    group: 'core',
    width: 12,
    list: 'status',
    hint: 'Draft keeps the page private; Published makes it live. Blank on a new row uses the import default.',
    example: 'Draft',
  },
  {
    field: 'enabled',
    header: 'Visible',
    group: 'core',
    width: 9,
    list: 'yesno',
    aliases: ['enabled', 'show on site'],
    hint: 'No hides the item everywhere without unpublishing it.',
    example: 'Yes',
  },
  {
    field: 'featured',
    header: 'Featured',
    group: 'core',
    width: 10,
    list: 'yesno',
    hint: 'Yes pins the item first in the listing and makes it eligible for the hero spotlight.',
    example: 'No',
  },
  {
    field: 'sort_order',
    header: 'Sort order',
    group: 'core',
    width: 10,
    aliases: ['order', 'position'],
    hint: 'Whole number; lower numbers show first.',
    example: '10',
  },
  {
    field: 'summary',
    header: 'Card summary',
    group: 'content',
    width: 44,
    wrap: true,
    aliases: ['summary', 'short description'],
    hint: 'One or two sentences shown on listing cards. Also used as the search description when SEO description is blank.',
    example: 'Hot-swappable modular UPS for data centres with 96% online efficiency.',
    seoTip: 'Write it to earn the click: benefit + proof. 120–160 characters doubles as a perfect meta description.',
  },
  {
    field: 'description',
    header: 'Full description',
    group: 'content',
    width: 60,
    wrap: true,
    aliases: ['description', 'details', 'long description'],
    hint: 'Detail page body. Line breaks are kept.',
    seoTip: 'At least 300 characters of original copy. Answer what it is, who it is for, key specs and outcomes. Avoid copying manufacturer text word for word.',
  },
  {
    field: 'tags',
    header: 'Tags',
    group: 'content',
    width: 28,
    aliases: ['keywords', 'labels'],
    hint: 'Comma-separated. Powers the tag filters.',
    example: 'UPS, Data centre, Modular',
  },
  {
    field: 'specs',
    header: 'Specifications',
    group: 'content',
    width: 36,
    wrap: true,
    aliases: ['specs', 'specification', 'technical specifications'],
    hint: 'One per line as  Key: Value',
    example: 'Capacity: 30–120 kVA\nEfficiency: 96%',
  },
  {
    field: 'price_label',
    header: 'Price / key stat',
    group: 'commercial',
    width: 18,
    aliases: ['price', 'price label', 'key stat', 'stat'],
    maxLength: 120,
    hint: 'Short label on the card, e.g. "On request" or "40% energy saved".',
  },
  {
    field: 'availability_label',
    header: 'Availability',
    group: 'commercial',
    width: 16,
    aliases: ['availability', 'stock'],
    maxLength: 120,
    hint: 'e.g. In stock, Made to order.',
  },
  {
    field: 'lead_time_label',
    header: 'Lead time',
    group: 'commercial',
    width: 14,
    aliases: ['lead time', 'delivery time'],
    maxLength: 120,
    hint: 'e.g. 2–3 weeks.',
  },
  {
    field: 'brochure',
    header: 'Brochure link',
    group: 'commercial',
    width: 30,
    aliases: ['brochure', 'brochure url', 'datasheet', 'data sheet', 'spec sheet', 'pdf'],
    maxLength: 500,
    hint: 'Link to the PDF brochure or datasheet (https://… or /assets/… path). Shows a Download brochure button.',
  },
  {
    field: 'primary_image',
    header: 'Primary image',
    group: 'media',
    width: 30,
    aliases: ['main image', 'image', 'thumbnail', 'card image'],
    hint: 'Exact file name as on your computer, e.g. UPS Front View.jpg. Upload the file with the sheet. Shown on cards and in search previews.',
    example: 'UPS Front View.jpg',
    seoTip: 'Descriptive file names help image search. They are kept and turned into clean URLs automatically.',
  },
  {
    field: 'primary_alt',
    header: 'Primary image alt text',
    group: 'media',
    width: 34,
    aliases: ['alt text', 'image alt', 'alt'],
    maxLength: 255,
    hint: 'Describe what the image shows for screen readers and Google Images. Leave blank to generate from the title.',
    example: 'Front view of a modular 120 kVA UPS cabinet',
    seoTip: 'Describe the image in under 125 characters; include the product name naturally, do not stuff keywords.',
  },
  {
    field: 'gallery',
    header: 'Gallery media',
    group: 'media',
    width: 36,
    wrap: true,
    aliases: ['gallery', 'gallery images', 'additional images', 'images', 'media'],
    hint: 'More images or videos, one file name per line (or separated by ;). Order is kept. Alt text for each file goes in the Media sheet.',
    example: 'UPS Side.jpg\nUPS Install.mp4',
  },
  {
    field: 'background_image',
    header: 'Background image',
    group: 'media',
    width: 26,
    aliases: ['background', 'backdrop'],
    hint: 'Optional backdrop behind the product image in the Quick view.',
  },
  {
    field: 'meta_title',
    header: 'SEO title',
    group: 'seo',
    width: 40,
    aliases: ['meta title', 'search title', 'page title'],
    lengthRange: SEO_TITLE_RANGE,
    maxLength: 255,
    hint: 'Title shown in Google. Aim for 30–60 characters; the brand is added automatically. Blank = Title.',
    seoTip: 'Primary keyword first, then a differentiator. Unique across the site.',
  },
  {
    field: 'meta_description',
    header: 'SEO description',
    group: 'seo',
    width: 50,
    wrap: true,
    aliases: ['meta description', 'search description'],
    lengthRange: SEO_DESCRIPTION_RANGE,
    maxLength: 320,
    hint: 'Snippet shown under the title in Google. Aim for 120–160 characters. Blank = Card summary.',
    seoTip: 'Benefit + proof + call to action. Unique per page.',
  },
  {
    field: 'og_image',
    header: 'Social share image',
    group: 'seo',
    width: 26,
    aliases: ['og image', 'share image', 'open graph image'],
    hint: 'Image used when the page is shared on LinkedIn, WhatsApp and so on. 1200×630 works best. Blank = Primary image.',
  },
  {
    field: 'seo_noindex',
    header: 'Hide from search',
    group: 'seo',
    width: 12,
    list: 'yesno',
    aliases: ['noindex', 'no index'],
    hint: 'Yes keeps the page out of Google and the sitemap.',
  },
  { field: 'cs_client_name', header: 'Case study · Client', group: 'case', width: 22, types: CASE_TYPES, aliases: ['client', 'client name'], hint: 'Client or site name.' },
  { field: 'cs_client_sector', header: 'Case study · Sector', group: 'case', width: 18, types: CASE_TYPES, aliases: ['sector', 'industry'], hint: 'e.g. Healthcare, BFSI.' },
  { field: 'cs_location', header: 'Case study · Location', group: 'case', width: 18, types: CASE_TYPES, aliases: ['location', 'city'], hint: 'City / region.' },
  { field: 'cs_delivery_year', header: 'Case study · Year', group: 'case', width: 10, types: CASE_TYPES, aliases: ['year', 'delivery year'], hint: 'Year delivered.' },
  { field: 'cs_challenge', header: 'Case study · Challenge', group: 'case', width: 40, wrap: true, types: CASE_TYPES, aliases: ['challenge', 'problem'], hint: 'The problem the client faced.' },
  { field: 'cs_solution', header: 'Case study · Solution', group: 'case', width: 40, wrap: true, types: CASE_TYPES, aliases: ['solution'], hint: 'What was delivered.' },
  { field: 'cs_scope', header: 'Case study · Scope', group: 'case', width: 34, wrap: true, types: CASE_TYPES, aliases: ['scope', 'scope of work'], hint: 'Scope of work.' },
  { field: 'cs_outcomes', header: 'Case study · Outcomes', group: 'case', width: 34, wrap: true, types: CASE_TYPES, aliases: ['outcomes', 'results'], hint: 'One measurable result per line.' },
  { field: 'cs_technologies', header: 'Case study · Technologies', group: 'case', width: 28, types: CASE_TYPES, aliases: ['technologies', 'tech stack'], hint: 'Comma-separated.' },
  { field: 'cs_quote', header: 'Case study · Testimonial', group: 'case', width: 40, wrap: true, types: CASE_TYPES, aliases: ['testimonial', 'quote'], hint: 'Client quote.' },
  { field: 'cs_quote_author', header: 'Case study · Quote by', group: 'case', width: 20, types: CASE_TYPES, aliases: ['quote author', 'testimonial author'], hint: 'Person quoted.' },
  { field: 'cs_quote_role', header: 'Case study · Quote role', group: 'case', width: 20, types: CASE_TYPES, aliases: ['quote role', 'testimonial role'], hint: 'Their job title.' },
  { field: 'cs_video_url', header: 'Case study · Video URL', group: 'case', width: 28, types: CASE_TYPES, aliases: ['video url', 'video'], hint: 'YouTube / Vimeo link or a video file name.' },
  { field: 'cs_video_title', header: 'Case study · Video title', group: 'case', width: 24, types: CASE_TYPES, aliases: ['video title'], hint: 'Caption shown with the video.' },
  { field: 'cs_oem_badges', header: 'Case study · OEM badges', group: 'case', width: 24, types: CASE_TYPES, aliases: ['oem badges', 'oem', 'brands', 'partners'], hint: 'Brands / OEMs involved, comma-separated.' },
  { field: 'cs_before_image', header: 'Case study · Before image', group: 'case', width: 26, types: CASE_TYPES, aliases: ['before image', 'before'], hint: 'File name of the “before” photo.' },
  { field: 'cs_after_image', header: 'Case study · After image', group: 'case', width: 26, types: CASE_TYPES, aliases: ['after image', 'after'], hint: 'File name of the “after” photo.' },
  { field: 'cs_pdf_url', header: 'Case study · PDF link', group: 'case', width: 28, types: CASE_TYPES, aliases: ['case study pdf', 'case pdf'], maxLength: 500, hint: 'Link to a downloadable case study PDF (https://… or /assets/… path).' },
  {
    field: 'version',
    header: 'Version (do not edit)',
    group: 'system',
    width: 22,
    hidden: true,
    aliases: ['version', 'last updated'],
    hint: 'When this row was exported. Used to warn when the item changed in admin after the export.',
  },
];

export const TRANSFER_ACTIONS = ['Skip', 'Archive', 'Delete', 'Example'] as const;
export const STATUS_OPTIONS = ['Draft', 'Published'] as const;
export const YES_NO = ['Yes', 'No'] as const;

export const SHEET_NAME: Record<CatalogItemType, string> = {
  product: 'Products',
  service: 'Services',
  project: 'Projects',
};

export const MEDIA_SHEET = 'Media';
export const README_SHEET = 'Read me';
export const LISTS_SHEET = 'Lists';

export function columnsForType(type: CatalogItemType): TransferColumn[] {
  return TRANSFER_COLUMNS.filter((c) => !c.types || c.types.includes(type));
}

export function headerKey(header: string): string {
  return String(header || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\*/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

const HEADER_LOOKUP = new Map<string, TransferField>();
for (const col of TRANSFER_COLUMNS) {
  for (const label of [col.header, col.field, ...(col.aliases || [])]) {
    const key = headerKey(label);
    if (key && !HEADER_LOOKUP.has(key)) HEADER_LOOKUP.set(key, col.field);
  }
}

export function fieldForHeader(header: string): TransferField | null {
  return HEADER_LOOKUP.get(headerKey(header)) ?? null;
}

export const COLUMN_BY_FIELD = new Map(TRANSFER_COLUMNS.map((c) => [c.field, c]));

/** Sheet name → catalog type ("Products", "product list", "Services 2026"…). */
export function typeForSheetName(name: string): CatalogItemType | null {
  const key = name.toLowerCase();
  if (/product/.test(key)) return 'product';
  if (/service/.test(key)) return 'service';
  if (/project|case/.test(key)) return 'project';
  return null;
}

export type MediaSheetField = 'file_name' | 'stored_file' | 'alt' | 'tags' | 'used_by' | 'size' | 'preview';

export const MEDIA_COLUMNS: Array<{ field: MediaSheetField; header: string; width: number; system?: boolean; aliases?: string[]; hint: string }> = [
  {
    field: 'file_name',
    header: 'File name',
    width: 34,
    aliases: ['original name', 'name', 'file'],
    hint: 'The name people use for this file. Item sheets refer to media by this name. Rename here to give existing files a friendly name.',
  },
  {
    field: 'stored_file',
    header: 'Stored as',
    width: 46,
    system: true,
    aliases: ['path', 'url', 'stored file'],
    hint: 'Where the file lives on the website. Do not edit.',
  },
  {
    field: 'alt',
    header: 'Alt text',
    width: 46,
    aliases: ['alt', 'alternative text', 'description'],
    hint: 'What the image shows. Used wherever the file appears unless an item gives its own alt text.',
  },
  { field: 'tags', header: 'Tags', width: 24, hint: 'Comma-separated, for finding files in the media library.' },
  { field: 'used_by', header: 'Used by', width: 36, system: true, hint: 'Items that show this file (info only).' },
  { field: 'size', header: 'Size', width: 10, system: true, hint: 'File size (info only).' },
  { field: 'preview', header: 'Preview', width: 14, system: true, hint: 'Opens the file in your browser.' },
];

export function mediaFieldForHeader(header: string): MediaSheetField | null {
  const key = headerKey(header);
  for (const col of MEDIA_COLUMNS) {
    if ([col.header, col.field, ...(col.aliases || [])].some((label) => headerKey(label) === key)) return col.field;
  }
  return null;
}
