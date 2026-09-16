import pool, { isDbUnavailableError } from '@/lib/db';
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
  type CatalogFacets,
  type CatalogBackgroundShading,
  type CatalogShadowStyle,
  type FormDefinition,
  type FormField,
  type Enquiry,
  DEFAULT_MEDIA_FIT_PERCENT,
} from '@/lib/types';
import { toStorageMediaPath } from '@/lib/media-paths';
import { ensureCatalogBackgroundColumn, ensureCatalogDiscoveryColumns, ensureCatalogMediaFitColumns } from '@/lib/schema-ensure';

const SHADING_VALUES = new Set<CatalogShadowStyle>(['none', 'soft', 'medium', 'strong', 'bottom']);

export function normalizeBackgroundShading(value: unknown): CatalogShadowStyle {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return SHADING_VALUES.has(raw as CatalogShadowStyle) ? (raw as CatalogShadowStyle) : 'medium';
}

export const normalizeShadowStyle = normalizeBackgroundShading;

export function normalizeMediaFitPercent(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_MEDIA_FIT_PERCENT;
  return Math.min(100, Math.max(20, Math.round(n)));
}

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
    background_image_url: row.background_image_url
      ? toStorageMediaPath(String(row.background_image_url))
      : null,
    background_shading_style: normalizeBackgroundShading(row.background_shading_style),
    background_fit_to_space:
      row.background_fit_to_space === undefined || row.background_fit_to_space === null
        ? false
        : !!Number(row.background_fit_to_space),
    background_fit_percent: normalizeMediaFitPercent(
      row.background_fit_percent === undefined || row.background_fit_percent === null
        ? 100
        : row.background_fit_percent
    ),
    media_fit_to_space:
      row.media_fit_to_space === undefined || row.media_fit_to_space === null
        ? true
        : !!Number(row.media_fit_to_space),
    media_fit_percent: normalizeMediaFitPercent(
      row.media_fit_percent === undefined || row.media_fit_percent === null
        ? DEFAULT_MEDIA_FIT_PERCENT
        : row.media_fit_percent
    ),
    primary_fit_to_space:
      row.primary_fit_to_space === undefined || row.primary_fit_to_space === null
        ? undefined
        : !!Number(row.primary_fit_to_space),
    primary_fit_percent:
      row.primary_fit_percent === undefined || row.primary_fit_percent === null
        ? undefined
        : normalizeMediaFitPercent(row.primary_fit_percent),
    primary_shadow_style:
      row.primary_shadow_style === undefined || row.primary_shadow_style === null
        ? undefined
        : normalizeShadowStyle(row.primary_shadow_style),
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

const PRIMARY_FIT_SUBQUERY = `(SELECT m.fit_to_space FROM catalog_media m
  WHERE m.item_id = i.id AND m.kind IN ('image','svg')
  ORDER BY m.is_primary DESC, m.sort_order ASC, m.id ASC LIMIT 1)`;

const PRIMARY_FIT_PCT_SUBQUERY = `(SELECT m.fit_percent FROM catalog_media m
  WHERE m.item_id = i.id AND m.kind IN ('image','svg')
  ORDER BY m.is_primary DESC, m.sort_order ASC, m.id ASC LIMIT 1)`;

const PRIMARY_SHADOW_SUBQUERY = `(SELECT m.shadow_style FROM catalog_media m
  WHERE m.item_id = i.id AND m.kind IN ('image','svg')
  ORDER BY m.is_primary DESC, m.sort_order ASC, m.id ASC LIMIT 1)`;

const CATALOG_LIST_SELECT = `i.*, c.name AS category_name, c.slug AS category_slug,
      ${THUMBNAIL_SUBQUERY} AS primary_image,
      ${PRIMARY_FIT_SUBQUERY} AS primary_fit_to_space,
      ${PRIMARY_FIT_PCT_SUBQUERY} AS primary_fit_percent,
      ${PRIMARY_SHADOW_SUBQUERY} AS primary_shadow_style`;

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
  try {
  await ensureCatalogBackgroundColumn();
  await ensureCatalogMediaFitColumns();
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
    `SELECT ${CATALOG_LIST_SELECT}
     FROM catalog_items i
     LEFT JOIN catalog_categories c ON c.id = i.category_id
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderSql}${limitSql}`,
    params
  );

  return rows.map(mapItem);
  } catch (err) {
    if (isDbUnavailableError(err)) return [];
    throw err;
  }
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
    `SELECT ${CATALOG_LIST_SELECT}
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
  try {
    await ensureCatalogBackgroundColumn();
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
    const primaryMedia =
      item.media.find((m) => m.is_primary && m.kind !== 'video') ||
      item.media.find((m) => m.kind !== 'video');
    if (primaryMedia) {
      item.primary_fit_to_space = primaryMedia.fit_to_space;
      item.primary_fit_percent = primaryMedia.fit_percent;
      item.primary_shadow_style = primaryMedia.shadow_style;
    }
    return item;
  } catch (err) {
    if (isDbUnavailableError(err)) return null;
    throw err;
  }
}

export async function getCatalogItemById(id: number) {
  await ensureCatalogBackgroundColumn();
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
  const primaryMedia =
    item.media.find((m) => m.is_primary && m.kind !== 'video') ||
    item.media.find((m) => m.kind !== 'video');
  if (primaryMedia) {
    item.primary_fit_to_space = primaryMedia.fit_to_space;
    item.primary_fit_percent = primaryMedia.fit_percent;
    item.primary_shadow_style = primaryMedia.shadow_style;
  }
  return item;
}

export async function listItemMedia(itemId: number): Promise<CatalogMedia[]> {
  await ensureCatalogMediaFitColumns();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM catalog_media WHERE item_id = ? ORDER BY is_primary DESC, sort_order ASC, id ASC',
    [itemId]
  );
  return rows.map((row) => ({
    id: row.id,
    item_id: row.item_id,
    kind: row.kind,
    url: toStorageMediaPath(String(row.url || '')),
    alt: row.alt,
    sort_order: row.sort_order,
    is_primary: row.is_primary,
    shadow_style: normalizeShadowStyle(row.shadow_style),
    fit_to_space:
      row.fit_to_space === undefined || row.fit_to_space === null ? true : !!Number(row.fit_to_space),
    fit_percent: normalizeMediaFitPercent(
      row.fit_percent === undefined || row.fit_percent === null
        ? DEFAULT_MEDIA_FIT_PERCENT
        : row.fit_percent
    ),
    created_at: row.created_at,
  })) as CatalogMedia[];
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
  background_image_url?: string | null;
  background_shading_style?: CatalogBackgroundShading;
  background_fit_to_space?: boolean;
  background_fit_percent?: number;
  media_fit_to_space?: boolean;
  media_fit_percent?: number;
  status?: 'draft' | 'published';
  featured?: boolean;
  enabled?: boolean;
  sort_order?: number;
  case_study_json?: CatalogCaseStudy | null;
  cta_config_json?: Record<string, unknown> | null;
}) {
  await ensureCatalogBackgroundColumn();
  const slug = slugify(input.slug || input.title);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO catalog_items
      (item_type, slug, title, summary, description, category_id, tags_json, specs_json, price_label, availability_label, lead_time_label, background_image_url, background_shading_style, background_fit_to_space, background_fit_percent, media_fit_to_space, media_fit_percent, status, featured, enabled, sort_order, case_study_json, cta_config_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      input.background_image_url?.trim()
        ? toStorageMediaPath(input.background_image_url.trim())
        : null,
      normalizeBackgroundShading(input.background_shading_style),
      input.background_fit_to_space ? 1 : 0,
      normalizeMediaFitPercent(input.background_fit_percent ?? 100),
      input.media_fit_to_space === false ? 0 : 1,
      normalizeMediaFitPercent(input.media_fit_percent ?? DEFAULT_MEDIA_FIT_PERCENT),
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
    background_image_url: string | null;
    background_shading_style: CatalogBackgroundShading;
    background_fit_to_space: boolean;
    background_fit_percent: number;
    media_fit_to_space: boolean;
    media_fit_percent: number;
    status: 'draft' | 'published';
    featured: boolean;
    enabled: boolean;
    sort_order: number;
    cta_config_json: Record<string, unknown> | null;
    case_study_json: CatalogCaseStudy | null;
  }>
) {
  await ensureCatalogBackgroundColumn();
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
    background_image_url:
      input.background_image_url !== undefined
        ? input.background_image_url?.trim()
          ? toStorageMediaPath(input.background_image_url.trim())
          : null
        : undefined,
    background_shading_style:
      input.background_shading_style !== undefined
        ? normalizeBackgroundShading(input.background_shading_style)
        : undefined,
    background_fit_to_space:
      input.background_fit_to_space === undefined ? undefined : input.background_fit_to_space ? 1 : 0,
    background_fit_percent:
      input.background_fit_percent !== undefined
        ? normalizeMediaFitPercent(input.background_fit_percent)
        : undefined,
    media_fit_to_space:
      input.media_fit_to_space === undefined ? undefined : input.media_fit_to_space ? 1 : 0,
    media_fit_percent:
      input.media_fit_percent !== undefined
        ? normalizeMediaFitPercent(input.media_fit_percent)
        : undefined,
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

/**
 * Amazon-style facet counts: each dimension ignores its own active filter
 * so shoppers always see truthful one-click options for the other filters.
 */
export async function getCatalogFacets(opts: {
  itemType: CatalogItemType;
  q?: string;
  category?: string;
  tag?: string;
  searchFields?: string[] | null;
}): Promise<CatalogFacets> {
  const base = {
    itemType: opts.itemType,
    q: opts.q,
    searchFields: opts.searchFields,
    sort: 'featured' as const,
  };

  const [categories, forTotal, forCategoryCounts, forTagCounts] = await Promise.all([
    listCategories(opts.itemType),
    listCatalogItems({ ...base, category: opts.category, tag: opts.tag }),
    listCatalogItems({ ...base, tag: opts.tag }),
    listCatalogItems({ ...base, category: opts.category }),
  ]);

  const categoryCountMap = new Map<string, number>();
  for (const item of forCategoryCounts) {
    const slug = item.category_slug || '_uncategorized';
    categoryCountMap.set(slug, (categoryCountMap.get(slug) || 0) + 1);
  }

  const facetCategories = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    count: categoryCountMap.get(c.slug) || 0,
    sort_order: c.sort_order,
  }));

  const tagCountMap = new Map<string, number>();
  for (const item of forTagCounts) {
    for (const raw of item.tags_json || []) {
      const value = String(raw).trim();
      if (!value) continue;
      tagCountMap.set(value, (tagCountMap.get(value) || 0) + 1);
    }
  }

  const tags = Array.from(tagCountMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  return {
    total: forTotal.length,
    categories: facetCategories,
    tags,
  };
}

export async function getPageSettings(itemType: CatalogItemType) {
  try {
    await ensureCatalogDiscoveryColumns();
  } catch {
    /* column ensure best-effort */
  }
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
    card_style: row.card_style === 'overlay' ? 'overlay' : 'marketplace',
    card_body_bg_color: row.card_body_bg_color || '#ffffff',
    hero_variant: row.hero_variant ?? 'spotlight',
    hero_standard_panel_enabled: Number(row.hero_standard_panel_enabled ?? 1),
    hero_meta_enabled: Number(row.hero_meta_enabled ?? 1),
    hero_elements_json: parseJsonField<string[] | null>(row.hero_elements_json, null),
    toolbar_elements_json: parseJsonField<string[] | null>(row.toolbar_elements_json, null),
    loading_skeleton_enabled: Number(row.loading_skeleton_enabled ?? 1),
    reveal_animation_enabled: Number(row.reveal_animation_enabled ?? 1),
    premium_borders_enabled: Number(row.premium_borders_enabled ?? 1),
    discovery_profile_rail_enabled: Number(row.discovery_profile_rail_enabled ?? 1),
    discovery_quick_find_enabled: Number(row.discovery_quick_find_enabled ?? 1),
    discovery_facet_rail_enabled: Number(row.discovery_facet_rail_enabled ?? 1),
    discovery_grouped_results_enabled: Number(row.discovery_grouped_results_enabled ?? 1),
    discovery_sticky_toolbar_enabled: Number(row.discovery_sticky_toolbar_enabled ?? 1),
    discovery_group_preview_count: Math.min(
      12,
      Math.max(1, Number(row.discovery_group_preview_count ?? 4) || 4)
    ),
  } satisfies CatalogPageSettings;
}

export async function updatePageSettings(
  itemType: CatalogItemType,
  input: Partial<Omit<CatalogPageSettings, 'id' | 'item_type'>>
) {
  try {
    await ensureCatalogDiscoveryColumns();
  } catch {
    /* column ensure best-effort */
  }
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
    card_style: input.card_style,
    card_body_bg_color: input.card_body_bg_color,
    hero_variant: input.hero_variant,
    hero_standard_panel_enabled:
      input.hero_standard_panel_enabled === undefined
        ? undefined
        : input.hero_standard_panel_enabled
          ? 1
          : 0,
    hero_meta_enabled:
      input.hero_meta_enabled === undefined ? undefined : input.hero_meta_enabled ? 1 : 0,
    hero_elements_json:
      input.hero_elements_json !== undefined ? JSON.stringify(input.hero_elements_json) : undefined,
    toolbar_elements_json:
      input.toolbar_elements_json !== undefined ? JSON.stringify(input.toolbar_elements_json) : undefined,
    loading_skeleton_enabled:
      input.loading_skeleton_enabled === undefined ? undefined : input.loading_skeleton_enabled ? 1 : 0,
    reveal_animation_enabled:
      input.reveal_animation_enabled === undefined ? undefined : input.reveal_animation_enabled ? 1 : 0,
    premium_borders_enabled:
      input.premium_borders_enabled === undefined ? undefined : input.premium_borders_enabled ? 1 : 0,
    discovery_profile_rail_enabled:
      input.discovery_profile_rail_enabled === undefined
        ? undefined
        : input.discovery_profile_rail_enabled
          ? 1
          : 0,
    discovery_quick_find_enabled:
      input.discovery_quick_find_enabled === undefined
        ? undefined
        : input.discovery_quick_find_enabled
          ? 1
          : 0,
    discovery_facet_rail_enabled:
      input.discovery_facet_rail_enabled === undefined
        ? undefined
        : input.discovery_facet_rail_enabled
          ? 1
          : 0,
    discovery_grouped_results_enabled:
      input.discovery_grouped_results_enabled === undefined
        ? undefined
        : input.discovery_grouped_results_enabled
          ? 1
          : 0,
    discovery_sticky_toolbar_enabled:
      input.discovery_sticky_toolbar_enabled === undefined
        ? undefined
        : input.discovery_sticky_toolbar_enabled
          ? 1
          : 0,
    discovery_group_preview_count:
      input.discovery_group_preview_count === undefined
        ? undefined
        : Math.min(12, Math.max(1, Number(input.discovery_group_preview_count) || 4)),
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
  fit_to_space?: boolean;
  fit_percent?: number;
  shadow_style?: CatalogShadowStyle;
}) {
  await ensureCatalogMediaFitColumns();
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

  const fitToSpace = input.fit_to_space === false ? 0 : 1;
  const fitPercent = normalizeMediaFitPercent(input.fit_percent ?? DEFAULT_MEDIA_FIT_PERCENT);
  const shadowStyle = normalizeShadowStyle(input.shadow_style);

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO catalog_media
      (item_id, kind, url, alt, sort_order, is_primary, fit_to_space, fit_percent, shadow_style)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.item_id,
      input.kind,
      input.url,
      input.alt || null,
      sortOrder,
      makePrimary ? 1 : 0,
      fitToSpace,
      fitPercent,
      shadowStyle,
    ]
  );

  return result.insertId;
}

export async function updateItemMediaFit(
  itemId: number,
  mediaId: number,
  input: { fit_to_space?: boolean; fit_percent?: number; shadow_style?: CatalogShadowStyle }
) {
  await ensureCatalogMediaFitColumns();
  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.fit_to_space !== undefined) {
    fields.push('fit_to_space = ?');
    params.push(input.fit_to_space ? 1 : 0);
  }
  if (input.fit_percent !== undefined) {
    fields.push('fit_percent = ?');
    params.push(normalizeMediaFitPercent(input.fit_percent));
  }
  if (input.shadow_style !== undefined) {
    fields.push('shadow_style = ?');
    params.push(normalizeShadowStyle(input.shadow_style));
  }
  if (!fields.length) return listItemMedia(itemId);
  params.push(mediaId, itemId);
  await pool.query(
    `UPDATE catalog_media SET ${fields.join(', ')} WHERE id = ? AND item_id = ?`,
    params
  );

  return listItemMedia(itemId);
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
      fit_to_space: m.fit_to_space,
      fit_percent: m.fit_percent,
      shadow_style: m.shadow_style,
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
