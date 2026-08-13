import pool from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import {
  parseJsonField,
  slugify,
  type CatalogItem,
  type CatalogItemType,
  type CatalogMedia,
  type CatalogCategory,
  type CatalogCaseStudy,
  type CatalogPageSettings,
  type FormDefinition,
  type FormField,
  type Enquiry,
} from '@/lib/types';

function mapItem(row: RowDataPacket): CatalogItem {
  return {
    id: row.id,
    item_type: row.item_type,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    category_id: row.category_id,
    category_name: row.category_name ?? null,
    category_slug: row.category_slug ?? null,
    tags_json: parseJsonField<string[] | null>(row.tags_json, null),
    specs_json: parseJsonField<Record<string, string> | null>(row.specs_json, null),
    price_label: row.price_label,
    availability_label: row.availability_label ?? null,
    lead_time_label: row.lead_time_label ?? null,
    status: row.status,
    featured: row.featured,
    sort_order: row.sort_order,
    enabled: row.enabled,
    cta_config_json: parseJsonField<Record<string, unknown> | null>(row.cta_config_json, null),
    case_study_json: parseJsonField<CatalogCaseStudy | null>(row.case_study_json, null),
    created_at: row.created_at,
    updated_at: row.updated_at,
    primary_image: row.primary_image ?? null,
  };
}

/** Card/list thumbnail — prefers primary image/svg, then first non-video. */
export function pickCatalogThumbnail(media: CatalogMedia[] | undefined | null): string | null {
  if (!media?.length) return null;
  const primary = media.find((m) => m.is_primary && m.kind !== 'video');
  if (primary) return primary.url;
  const flagged = media.find((m) => m.is_primary);
  if (flagged && flagged.kind !== 'video') return flagged.url;
  const firstImage = media.find((m) => m.kind !== 'video');
  if (firstImage) return firstImage.url;
  return media[0]?.url || null;
}

export function mediaKindFromUrl(url: string): CatalogMedia['kind'] {
  if (/\.(mp4|webm)$/i.test(url)) return 'video';
  if (/\.svg$/i.test(url)) return 'svg';
  return 'image';
}

const THUMBNAIL_SUBQUERY = `(SELECT m.url FROM catalog_media m
  WHERE m.item_id = i.id AND m.kind IN ('image','svg')
  ORDER BY m.is_primary DESC, m.sort_order ASC, m.id ASC LIMIT 1)`;

export async function listCatalogItems(opts: {
  itemType: CatalogItemType;
  q?: string;
  category?: string;
  tag?: string;
  admin?: boolean;
  enabledOnly?: boolean;
  featuredOnly?: boolean;
  limit?: number;
  searchFields?: string[] | null;
  sort?: 'featured' | 'newest' | 'title';
}) {
  const where: string[] = ['i.item_type = ?'];
  const params: unknown[] = [opts.itemType];

  if (!opts.admin) {
    where.push("i.status = 'published'");
    where.push('i.enabled = 1');
  } else if (opts.enabledOnly) {
    where.push('i.enabled = 1');
  }

  if (opts.featuredOnly) {
    where.push('i.featured = 1');
  }

  if (opts.category) {
    where.push('c.slug = ?');
    params.push(opts.category);
  }

  if (opts.tag) {
    where.push('CAST(i.tags_json AS CHAR) LIKE ?');
    params.push(`%${opts.tag}%`);
  }

  if (opts.q) {
    const allowed = new Set(['title', 'summary', 'description', 'tags', 'price_label']);
    const fields = (opts.searchFields?.length ? opts.searchFields : ['title', 'summary', 'description']).filter((f) =>
      allowed.has(f)
    );
    const clauses: string[] = [];
    const like = `%${opts.q}%`;
    for (const field of fields.length ? fields : ['title', 'summary', 'description']) {
      if (field === 'tags') {
        clauses.push('CAST(i.tags_json AS CHAR) LIKE ?');
      } else {
        clauses.push(`i.${field} LIKE ?`);
      }
      params.push(like);
    }
    if (clauses.length) where.push(`(${clauses.join(' OR ')})`);
  }

  const limitSql = opts.limit && opts.limit > 0 ? ` LIMIT ${Math.min(opts.limit, 100)}` : '';
  const orderSql =
    opts.sort === 'title'
      ? 'i.title ASC, i.id DESC'
      : opts.sort === 'newest'
        ? 'i.id DESC'
        : 'i.featured DESC, i.sort_order ASC, i.id DESC';

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT i.*, c.name AS category_name, c.slug AS category_slug,
      ${THUMBNAIL_SUBQUERY} AS primary_image
     FROM catalog_items i
     LEFT JOIN catalog_categories c ON c.id = i.category_id
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderSql}${limitSql}`,
    params
  );

  return rows.map(mapItem);
}

export async function listCatalogItemsByIds(
  itemType: CatalogItemType,
  ids: number[],
  opts?: { admin?: boolean }
) {
  const orderedIds = Array.from(new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
  if (!orderedIds.length) return [];

  const where: string[] = ['i.item_type = ?', `i.id IN (${orderedIds.map(() => '?').join(',')})`];
  const params: unknown[] = [itemType, ...orderedIds];
  if (!opts?.admin) {
    where.push("i.status = 'published'");
    where.push('i.enabled = 1');
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT i.*, c.name AS category_name, c.slug AS category_slug,
      ${THUMBNAIL_SUBQUERY} AS primary_image
     FROM catalog_items i
     LEFT JOIN catalog_categories c ON c.id = i.category_id
     WHERE ${where.join(' AND ')}`,
    params
  );

  const mapped = rows.map(mapItem);
  const byId = new Map(mapped.map((item) => [item.id, item]));
  return orderedIds.map((id) => byId.get(id)).filter(Boolean) as CatalogItem[];
}

export async function getCatalogItemBySlug(itemType: CatalogItemType, slug: string, admin = false) {
  const where = ['i.item_type = ?', 'i.slug = ?'];
  const params: unknown[] = [itemType, slug];
  if (!admin) {
    where.push("i.status = 'published'");
    where.push('i.enabled = 1');
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT i.*, c.name AS category_name, c.slug AS category_slug
     FROM catalog_items i
     LEFT JOIN catalog_categories c ON c.id = i.category_id
     WHERE ${where.join(' AND ')}
     LIMIT 1`,
    params
  );
  if (!rows[0]) return null;
  const item = mapItem(rows[0]);
  item.media = await listItemMedia(item.id);
  item.primary_image = pickCatalogThumbnail(item.media);
  return item;
}

export async function getCatalogItemById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT i.*, c.name AS category_name, c.slug AS category_slug
     FROM catalog_items i
     LEFT JOIN catalog_categories c ON c.id = i.category_id
     WHERE i.id = ? LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  const item = mapItem(rows[0]);
  item.media = await listItemMedia(item.id);
  item.primary_image = pickCatalogThumbnail(item.media);
  return item;
}

export async function listItemMedia(itemId: number): Promise<CatalogMedia[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM catalog_media WHERE item_id = ? ORDER BY is_primary DESC, sort_order ASC, id ASC',
    [itemId]
  );
  return rows as CatalogMedia[];
}

export async function createCatalogItem(input: {
  item_type: CatalogItemType;
  title: string;
  slug?: string;
  summary?: string;
  description?: string;
  category_id?: number | null;
  tags_json?: string[];
  specs_json?: Record<string, string>;
  price_label?: string | null;
  availability_label?: string | null;
  lead_time_label?: string | null;
  status?: 'draft' | 'published';
  featured?: boolean;
  enabled?: boolean;
  sort_order?: number;
  case_study_json?: CatalogCaseStudy | null;
  cta_config_json?: Record<string, unknown> | null;
}) {
  const slug = slugify(input.slug || input.title);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO catalog_items
      (item_type, slug, title, summary, description, category_id, tags_json, specs_json, price_label, availability_label, lead_time_label, status, featured, enabled, sort_order, case_study_json, cta_config_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.item_type,
      slug,
      input.title,
      input.summary || null,
      input.description || null,
      input.category_id ?? null,
      JSON.stringify(input.tags_json || []),
      JSON.stringify(input.specs_json || {}),
      input.price_label ?? null,
      input.availability_label ?? null,
      input.lead_time_label ?? null,
      input.status || 'draft',
      input.featured ? 1 : 0,
      input.enabled === false ? 0 : 1,
      input.sort_order ?? 0,
      input.case_study_json !== undefined ? JSON.stringify(input.case_study_json) : null,
      input.cta_config_json ? JSON.stringify(input.cta_config_json) : null,
    ]
  );
  return getCatalogItemById(result.insertId);
}

export async function updateCatalogItem(
  id: number,
  input: Partial<{
    title: string;
    slug: string;
    summary: string;
    description: string;
    category_id: number | null;
    tags_json: string[];
    specs_json: Record<string, string>;
    price_label: string | null;
    availability_label: string | null;
    lead_time_label: string | null;
    status: 'draft' | 'published';
    featured: boolean;
    enabled: boolean;
    sort_order: number;
    cta_config_json: Record<string, unknown> | null;
    case_study_json: CatalogCaseStudy | null;
  }>
) {
  const fields: string[] = [];
  const params: unknown[] = [];

  const map: Record<string, unknown> = {
    title: input.title,
    slug: input.slug ? slugify(input.slug) : undefined,
    summary: input.summary,
    description: input.description,
    category_id: input.category_id,
    tags_json: input.tags_json !== undefined ? JSON.stringify(input.tags_json) : undefined,
    specs_json: input.specs_json !== undefined ? JSON.stringify(input.specs_json) : undefined,
    price_label: input.price_label,
    availability_label: input.availability_label,
    lead_time_label: input.lead_time_label,
    status: input.status,
    featured: input.featured === undefined ? undefined : input.featured ? 1 : 0,
    enabled: input.enabled === undefined ? undefined : input.enabled ? 1 : 0,
    sort_order: input.sort_order,
    cta_config_json:
      input.cta_config_json !== undefined ? JSON.stringify(input.cta_config_json) : undefined,
    case_study_json:
      input.case_study_json !== undefined ? JSON.stringify(input.case_study_json) : undefined,
  };

  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (!fields.length) return getCatalogItemById(id);

  params.push(id);
  await pool.query(`UPDATE catalog_items SET ${fields.join(', ')} WHERE id = ?`, params);
  return getCatalogItemById(id);
}

export async function deleteCatalogItem(id: number) {
  await pool.query('DELETE FROM catalog_items WHERE id = ?', [id]);
}

export async function deleteCatalogItemsByType(itemType: CatalogItemType) {
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM catalog_items WHERE item_type = ?', [itemType]);
  return result.affectedRows || 0;
}

export async function reorderCatalogItems(itemType: CatalogItemType, orderedIds: number[]) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedIds.length; i++) {
      await conn.query('UPDATE catalog_items SET sort_order = ? WHERE id = ? AND item_type = ?', [
        i,
        orderedIds[i],
        itemType,
      ]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function listCategories(itemType?: CatalogItemType, admin = false) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (itemType) {
    where.push('item_type = ?');
    params.push(itemType);
  }
  if (!admin) where.push('enabled = 1');
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM catalog_categories ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY sort_order ASC, id ASC`,
    params
  );
  return rows as CatalogCategory[];
}

export async function getPageSettings(itemType: CatalogItemType) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM catalog_page_settings WHERE item_type = ? LIMIT 1',
    [itemType]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    id: row.id,
    item_type: row.item_type,
    layout: row.layout,
    grid_columns: row.grid_columns,
    filters_json: parseJsonField<string[] | null>(row.filters_json, null),
    search_fields_json: parseJsonField<string[] | null>(row.search_fields_json, null),
    card_fields_json: parseJsonField<string[] | null>(row.card_fields_json, null),
    modal_fields_json: parseJsonField<string[] | null>(row.modal_fields_json, null),
    hero_enabled: Number(row.hero_enabled ?? 1),
    hero_autoplay_ms: Number(row.hero_autoplay_ms ?? 6000),
    hero_item_ids_json: parseJsonField<number[] | null>(row.hero_item_ids_json, null),
    hero_eyebrow: row.hero_eyebrow ?? null,
    hero_title: row.hero_title ?? null,
    hero_lead: row.hero_lead ?? null,
    visual_style: row.visual_style ?? 'premium',
    hero_variant: row.hero_variant ?? 'spotlight',
    loading_skeleton_enabled: Number(row.loading_skeleton_enabled ?? 1),
    reveal_animation_enabled: Number(row.reveal_animation_enabled ?? 1),
    premium_borders_enabled: Number(row.premium_borders_enabled ?? 1),
  } satisfies CatalogPageSettings;
}

export async function updatePageSettings(
  itemType: CatalogItemType,
  input: Partial<Omit<CatalogPageSettings, 'id' | 'item_type'>>
) {
  const fields: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, unknown> = {
    layout: input.layout,
    grid_columns: input.grid_columns,
    filters_json: input.filters_json !== undefined ? JSON.stringify(input.filters_json) : undefined,
    search_fields_json:
      input.search_fields_json !== undefined ? JSON.stringify(input.search_fields_json) : undefined,
    card_fields_json:
      input.card_fields_json !== undefined ? JSON.stringify(input.card_fields_json) : undefined,
    modal_fields_json:
      input.modal_fields_json !== undefined ? JSON.stringify(input.modal_fields_json) : undefined,
    hero_enabled: input.hero_enabled === undefined ? undefined : input.hero_enabled ? 1 : 0,
    hero_autoplay_ms: input.hero_autoplay_ms,
    hero_item_ids_json:
      input.hero_item_ids_json !== undefined ? JSON.stringify(input.hero_item_ids_json) : undefined,
    hero_eyebrow: input.hero_eyebrow,
    hero_title: input.hero_title,
    hero_lead: input.hero_lead,
    visual_style: input.visual_style,
    hero_variant: input.hero_variant,
    loading_skeleton_enabled:
      input.loading_skeleton_enabled === undefined ? undefined : input.loading_skeleton_enabled ? 1 : 0,
    reveal_animation_enabled:
      input.reveal_animation_enabled === undefined ? undefined : input.reveal_animation_enabled ? 1 : 0,
    premium_borders_enabled:
      input.premium_borders_enabled === undefined ? undefined : input.premium_borders_enabled ? 1 : 0,
  };
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (fields.length) {
    params.push(itemType);
    await pool.query(`UPDATE catalog_page_settings SET ${fields.join(', ')} WHERE item_type = ?`, params);
  }
  return getPageSettings(itemType);
}

export async function addItemMedia(input: {
  item_id: number;
  kind: 'image' | 'video' | 'svg';
  url: string;
  alt?: string;
  is_primary?: boolean;
  sort_order?: number;
}) {
  const existing = await listItemMedia(input.item_id);
  const hasPrimary = existing.some((m) => m.is_primary);
  const makePrimary =
    input.kind !== 'video' && (input.is_primary || (!hasPrimary && existing.length === 0));

  if (makePrimary) {
    await pool.query('UPDATE catalog_media SET is_primary = 0 WHERE item_id = ?', [input.item_id]);
  }

  const sortOrder =
    input.sort_order ??
    (existing.length ? Math.max(...existing.map((m) => m.sort_order)) + 1 : 0);

  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO catalog_media (item_id, kind, url, alt, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
    [
      input.item_id,
      input.kind,
      input.url,
      input.alt || null,
      sortOrder,
      makePrimary ? 1 : 0,
    ]
  );
  return result.insertId;
}

export async function setItemMediaPrimary(itemId: number, mediaId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, kind FROM catalog_media WHERE id = ? AND item_id = ? LIMIT 1',
    [mediaId, itemId]
  );
  const row = rows[0];
  if (!row) throw new Error('NOT_FOUND');
  if (row.kind === 'video') throw new Error('Videos cannot be used as card thumbnails');

  await pool.query('UPDATE catalog_media SET is_primary = 0 WHERE item_id = ?', [itemId]);
  await pool.query('UPDATE catalog_media SET is_primary = 1 WHERE id = ?', [mediaId]);
}

export async function reorderItemMedia(itemId: number, orderedIds: number[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query('UPDATE catalog_media SET sort_order = ? WHERE id = ? AND item_id = ?', [
      i,
      orderedIds[i],
      itemId,
    ]);
  }
}

export async function copyItemMedia(fromItemId: number, toItemId: number) {
  const media = await listItemMedia(fromItemId);
  for (const m of media) {
    await addItemMedia({
      item_id: toItemId,
      kind: m.kind,
      url: m.url,
      alt: m.alt || undefined,
      is_primary: !!m.is_primary,
      sort_order: m.sort_order,
    });
  }
}

export async function deleteItemMedia(id: number) {
  await pool.query('DELETE FROM catalog_media WHERE id = ?', [id]);
}

export async function getDefaultForm(): Promise<FormDefinition | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM form_definitions WHERE form_key = 'enquiry_default' LIMIT 1"
  );
  if (!rows[0]) return null;
  const form = rows[0] as FormDefinition;
  form.fields = await listFormFields(form.id);
  return form;
}

export async function listFormFields(formId: number, enabledOnly = false): Promise<FormField[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM form_fields WHERE form_id = ? ${enabledOnly ? 'AND enabled = 1' : ''} ORDER BY sort_order ASC, id ASC`,
    [formId]
  );
  return rows.map((row) => ({
    ...(row as FormField),
    options_json: parseJsonField<string[] | null>(row.options_json, null),
    validation_json: parseJsonField<Record<string, unknown> | null>(row.validation_json, null),
  }));
}

export async function createFormField(input: {
  form_id: number;
  field_name: string;
  label: string;
  field_type: FormField['field_type'];
  required?: boolean;
  options_json?: string[];
  placeholder?: string;
  sort_order?: number;
  enabled?: boolean;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO form_fields (form_id, field_name, label, field_type, required, options_json, placeholder, sort_order, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.form_id,
      input.field_name,
      input.label,
      input.field_type,
      input.required ? 1 : 0,
      JSON.stringify(input.options_json || []),
      input.placeholder || null,
      input.sort_order ?? 0,
      input.enabled === false ? 0 : 1,
    ]
  );
  return result.insertId;
}

export async function updateFormField(
  id: number,
  input: Partial<{
    label: string;
    field_type: FormField['field_type'];
    required: boolean;
    options_json: string[];
    placeholder: string;
    sort_order: number;
    enabled: boolean;
  }>
) {
  const fields: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, unknown> = {
    label: input.label,
    field_type: input.field_type,
    required: input.required === undefined ? undefined : input.required ? 1 : 0,
    options_json: input.options_json !== undefined ? JSON.stringify(input.options_json) : undefined,
    placeholder: input.placeholder,
    sort_order: input.sort_order,
    enabled: input.enabled === undefined ? undefined : input.enabled ? 1 : 0,
  };
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (fields.length) {
    params.push(id);
    await pool.query(`UPDATE form_fields SET ${fields.join(', ')} WHERE id = ?`, params);
  }
}

export async function deleteFormField(id: number) {
  await pool.query('DELETE FROM form_fields WHERE id = ?', [id]);
}

export async function createEnquiry(input: {
  form_id?: number | null;
  item_id?: number | null;
  item_type?: CatalogItemType | 'general' | null;
  payload_json: Record<string, unknown>;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO enquiries (form_id, item_id, item_type, payload_json, status) VALUES (?, ?, ?, ?, ?)',
    [
      input.form_id ?? null,
      input.item_id ?? null,
      input.item_type ?? 'general',
      JSON.stringify(input.payload_json),
      'new',
    ]
  );
  return result.insertId;
}

export async function listEnquiries(status?: Enquiry['status'] | 'all') {
  const params: unknown[] = [];
  let where = '';
  if (status && status !== 'all') {
    where = 'WHERE e.status = ?';
    params.push(status);
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.*, i.title AS item_title
     FROM enquiries e
     LEFT JOIN catalog_items i ON i.id = e.item_id
     ${where}
     ORDER BY e.created_at DESC
     LIMIT 500`,
    params
  );
  return rows.map((row) => ({
    id: row.id,
    form_id: row.form_id,
    item_id: row.item_id,
    item_type: row.item_type,
    payload_json: parseJsonField<Record<string, unknown>>(row.payload_json, {}),
    status: row.status,
    admin_notes: row.admin_notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    item_title: row.item_title,
  })) as Enquiry[];
}

export async function getEnquiry(id: number): Promise<Enquiry | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.*, i.title AS item_title
     FROM enquiries e
     LEFT JOIN catalog_items i ON i.id = e.item_id
     WHERE e.id = ?
     LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    id: row.id,
    form_id: row.form_id,
    item_id: row.item_id,
    item_type: row.item_type,
    payload_json: parseJsonField<Record<string, unknown>>(row.payload_json, {}),
    status: row.status,
    admin_notes: row.admin_notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    item_title: row.item_title,
  } as Enquiry;
}

export async function updateEnquiry(
  id: number,
  input: Partial<{ status: Enquiry['status']; admin_notes: string | null }>
) {
  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.status !== undefined) {
    fields.push('status = ?');
    params.push(input.status);
  }
  if (input.admin_notes !== undefined) {
    fields.push('admin_notes = ?');
    params.push(input.admin_notes);
  }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE enquiries SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function updateEnquiryStatus(id: number, status: Enquiry['status']) {
  await updateEnquiry(id, { status });
}

export async function deleteEnquiry(id: number) {
  await pool.query('DELETE FROM enquiries WHERE id = ?', [id]);
}

export async function reorderFormFields(formId: number, orderedIds: number[]) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedIds.length; i++) {
      await conn.query('UPDATE form_fields SET sort_order = ? WHERE id = ? AND form_id = ?', [
        i + 1,
        orderedIds[i],
        formId,
      ]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function dashboardCounts() {
  const [[items]] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM catalog_items'
  );
  const [[enquiries]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS c FROM enquiries WHERE status = 'new'"
  );
  const [[published]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS c FROM catalog_items WHERE status = 'published' AND enabled = 1"
  );
  const [[pages]] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM pages'
  );
  const [[media]] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM media_assets'
  );
  return {
    items: Number(items?.c || 0),
    newEnquiries: Number(enquiries?.c || 0),
    published: Number(published?.c || 0),
    pages: Number(pages?.c || 0),
    media: Number(media?.c || 0),
  };
}
