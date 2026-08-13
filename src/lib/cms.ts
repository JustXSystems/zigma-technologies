import pool from '@/lib/db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { cache } from 'react';
import { parseJsonField, slugify } from '@/lib/types';
import type { CmsPage, CmsSection } from '@/lib/cms-types';

export type { CmsPage, CmsSection } from '@/lib/cms-types';
export { SECTION_TYPES } from '@/lib/cms-types';

function mapPage(row: RowDataPacket): CmsPage {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    meta_title: row.meta_title,
    meta_description: row.meta_description,
    status: row.status,
    sort_order: row.sort_order,
    enabled: row.enabled,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapSection(row: RowDataPacket): CmsSection {
  return {
    id: row.id,
    page_id: row.page_id,
    type: row.type,
    section_key: row.section_key,
    title: row.title,
    sort_order: row.sort_order,
    enabled: row.enabled,
    content_json: parseJsonField<Record<string, unknown>>(row.content_json, {}),
    style_json: parseJsonField<Record<string, unknown>>(row.style_json, {}),
  };
}

export async function listPages(admin = false) {
  const where = admin ? '' : "WHERE enabled = 1 AND status = 'published'";
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM pages ${where} ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(mapPage);
}

export async function getPageBySlug(slug: string, admin = false) {
  const where = ['slug = ?'];
  const params: unknown[] = [slug];
  if (!admin) {
    where.push('enabled = 1');
    where.push("status = 'published'");
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM pages WHERE ${where.join(' AND ')} LIMIT 1`,
    params
  );
  if (!rows[0]) return null;
  const page = mapPage(rows[0]);
  page.sections = await listSections(page.id, admin);
  return page;
}

export async function getPageById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM pages WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
  const page = mapPage(rows[0]);
  page.sections = await listSections(page.id, true);
  return page;
}

export async function createPage(input: {
  slug: string;
  title: string;
  meta_title?: string;
  meta_description?: string;
  status?: 'draft' | 'published';
  enabled?: boolean;
  sort_order?: number;
}) {
  const slug = slugify(input.slug || input.title);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO pages (slug, title, meta_title, meta_description, status, enabled, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      slug,
      input.title,
      input.meta_title || null,
      input.meta_description || null,
      input.status || 'draft',
      input.enabled === false ? 0 : 1,
      input.sort_order ?? 0,
    ]
  );
  return getPageById(result.insertId);
}

export async function updatePage(
  id: number,
  input: Partial<{
    slug: string;
    title: string;
    meta_title: string | null;
    meta_description: string | null;
    status: 'draft' | 'published';
    enabled: boolean;
    sort_order: number;
  }>
) {
  const fields: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, unknown> = {
    slug: input.slug ? slugify(input.slug) : undefined,
    title: input.title,
    meta_title: input.meta_title,
    meta_description: input.meta_description,
    status: input.status,
    enabled: input.enabled === undefined ? undefined : input.enabled ? 1 : 0,
    sort_order: input.sort_order,
  };
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (fields.length) {
    params.push(id);
    await pool.query(`UPDATE pages SET ${fields.join(', ')} WHERE id = ?`, params);
  }
  return getPageById(id);
}

export async function deletePage(id: number) {
  await pool.query('DELETE FROM pages WHERE id = ?', [id]);
}

export async function listSections(pageId: number, admin = false) {
  const where = ['page_id = ?'];
  const params: unknown[] = [pageId];
  if (!admin) where.push('enabled = 1');
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM page_sections WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, id ASC`,
    params
  );
  return rows.map(mapSection);
}

export async function getSectionById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM page_sections WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] ? mapSection(rows[0]) : null;
}

export async function createSection(input: {
  page_id: number;
  type: string;
  section_key?: string | null;
  title?: string;
  content_json?: Record<string, unknown>;
  style_json?: Record<string, unknown>;
  enabled?: boolean;
  sort_order?: number;
}) {
  const [maxRows] = await pool.query<RowDataPacket[]>(
    'SELECT COALESCE(MAX(sort_order), -1) AS m FROM page_sections WHERE page_id = ?',
    [input.page_id]
  );
  const nextSort = input.sort_order ?? Number(maxRows[0]?.m ?? -1) + 1;
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO page_sections (page_id, type, section_key, title, sort_order, enabled, content_json, style_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.page_id,
      input.type,
      input.section_key || null,
      input.title || null,
      nextSort,
      input.enabled === false ? 0 : 1,
      JSON.stringify(input.content_json || {}),
      JSON.stringify(input.style_json || {}),
    ]
  );
  return getSectionById(result.insertId);
}

export async function updateSection(
  id: number,
  input: Partial<{
    type: string;
    section_key: string | null;
    title: string | null;
    enabled: boolean;
    sort_order: number;
    content_json: Record<string, unknown>;
    style_json: Record<string, unknown>;
  }>
) {
  const fields: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, unknown> = {
    type: input.type,
    section_key: input.section_key,
    title: input.title,
    enabled: input.enabled === undefined ? undefined : input.enabled ? 1 : 0,
    sort_order: input.sort_order,
    content_json: input.content_json !== undefined ? JSON.stringify(input.content_json) : undefined,
    style_json: input.style_json !== undefined ? JSON.stringify(input.style_json) : undefined,
  };
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (fields.length) {
    params.push(id);
    await pool.query(`UPDATE page_sections SET ${fields.join(', ')} WHERE id = ?`, params);
  }
  return getSectionById(id);
}

export async function deleteSection(id: number) {
  await pool.query('DELETE FROM page_sections WHERE id = ?', [id]);
}

export async function clearPageSections(pageId: number) {
  await pool.query('DELETE FROM page_sections WHERE page_id = ?', [pageId]);
}

export async function reorderSections(pageId: number, orderedIds: number[]) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedIds.length; i++) {
      await conn.query('UPDATE page_sections SET sort_order = ? WHERE id = ? AND page_id = ?', [
        i,
        orderedIds[i],
        pageId,
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

export async function reorderNavItems(location: 'header' | 'footer', orderedIds: number[]) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedIds.length; i++) {
      await conn.query('UPDATE nav_items SET sort_order = ? WHERE id = ? AND location = ?', [
        i,
        orderedIds[i],
        location,
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

export const getThemeSettings = cache(async () => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM theme_settings');
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    out[row.setting_key] = parseJsonField(row.value_json, {});
  }
  return out;
});

export async function upsertThemeSetting(key: string, value: unknown) {
  await pool.query(
    `INSERT INTO theme_settings (setting_key, value_json) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)`,
    [key, JSON.stringify(value)]
  );
}

export async function getPublishedCssOverride() {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM css_overrides WHERE status = 'published' ORDER BY version DESC LIMIT 1"
  );
  return rows[0]
    ? {
        id: rows[0].id as number,
        version: rows[0].version as number,
        css_text: rows[0].css_text as string,
        status: rows[0].status as string,
        notes: rows[0].notes as string | null,
        published_at: rows[0].published_at as string | null,
      }
    : null;
}

export async function getLatestCssDraft() {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM css_overrides WHERE status = 'draft' ORDER BY id DESC LIMIT 1"
  );
  return rows[0]
    ? {
        id: rows[0].id as number,
        version: rows[0].version as number,
        css_text: rows[0].css_text as string,
        status: rows[0].status as string,
        notes: rows[0].notes as string | null,
      }
    : null;
}

export async function saveCssDraft(cssText: string, notes?: string) {
  const [maxRows] = await pool.query<RowDataPacket[]>(
    'SELECT COALESCE(MAX(version), 0) AS v FROM css_overrides'
  );
  const version = Number(maxRows[0]?.v || 0) + 1;
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO css_overrides (version, css_text, status, notes) VALUES (?, ?, 'draft', ?)`,
    [version, cssText, notes || null]
  );
  return result.insertId;
}

export async function publishCssOverride(id: number) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE css_overrides SET status = 'archived' WHERE status = 'published'");
    await conn.query(
      "UPDATE css_overrides SET status = 'published', published_at = NOW() WHERE id = ?",
      [id]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function listCssOverrides(limit = 20) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, version, status, notes, css_text, created_at, published_at FROM css_overrides ORDER BY id DESC LIMIT ?',
    [limit]
  );
  return rows;
}

export async function getCssOverrideById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM css_overrides WHERE id = ? LIMIT 1', [id]);
  return rows[0]
    ? {
        id: rows[0].id as number,
        version: rows[0].version as number,
        css_text: rows[0].css_text as string,
        status: rows[0].status as string,
        notes: rows[0].notes as string | null,
      }
    : null;
}
