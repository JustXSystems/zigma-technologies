import { readdir, stat } from 'fs/promises';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { addItemMedia, createCatalogItem, deleteCatalogItem, updateCatalogItem } from '@/lib/catalog';
import { getBrochureUrl, withBrochureUrl } from '@/lib/catalog-brochure';
import { CATALOG_TYPE_LABEL, catalogListingPath, catalogPublicPath } from '@/lib/catalog-case-study';
import {
  ALT_TEXT_MAX,
  CLEAR_TOKEN,
  COLUMN_BY_FIELD,
  DEFAULT_TRANSFER_OPTIONS,
  LISTS_SHEET,
  MEDIA_COLUMNS,
  MEDIA_SHEET,
  README_SHEET,
  SEO_DESCRIPTION_RANGE,
  SEO_TITLE_RANGE,
  SHEET_NAME,
  SLUG_IDEAL_MAX,
  STATUS_OPTIONS,
  THIN_CONTENT_CHARS,
  TRANSFER_ACTIONS,
  TRANSFER_COLUMNS,
  YES_NO,
  columnsForType,
  fieldForHeader,
  headerKey,
  mediaFieldForHeader,
  typeForSheetName,
  type MediaSheetField,
  type TransferField,
  type TransferOptions,
} from '@/lib/catalog-transfer-columns';
import { upsertMediaMetadata } from '@/lib/media-library';
import { baseName, fileExtension, hasMediaExtension, mediaKindFromName, mediaMatchKey } from '@/lib/media-naming';
import { adminMediaDiskDir, adminMediaPublicPath, resolvePublicAssetDiskPath, toStorageMediaPath, type AdminMediaCategory } from '@/lib/media-paths';
import { invalidateRedirectCache, keepOldAddress, normalizePath, redirectMovedPath } from '@/lib/redirects';
import { ensureCatalogBackgroundColumn, ensureCatalogMediaFitColumns, ensureMediaAssetColumns } from '@/lib/schema-ensure';
import { siteOrigin } from '@/lib/seo';
import { parseJsonField, slugify, type CatalogCaseStudy, type CatalogItemType } from '@/lib/types';
import { buildXlsx, type XlsxCell, type XlsxColumn, type XlsxSheet } from '@/lib/xlsx-writer';
import { readCsv, readXlsx, type SheetCell, type SheetGrid } from '@/lib/xlsx-reader';

/* ================================================================ types */

export const CATALOG_TYPES: CatalogItemType[] = ['product', 'service', 'project'];
export const TRANSFER_MAX_ROWS = 5_000;
export const TRANSFER_MAX_FILE_BYTES = 20 * 1024 * 1024;
const HEAVY_IMAGE_BYTES = 1024 * 1024;

/** A problem with the uploaded file the user can fix; the message is safe to show. */
export class TransferInputError extends Error {}

export { DEFAULT_TRANSFER_OPTIONS, type TransferOptions };

type RowValues = Partial<Record<TransferField, string>>;

export type ParsedRow = { key: string; sheet: string; row: number; type: CatalogItemType; values: RowValues };
export type ParsedMediaRow = { row: number; values: Partial<Record<MediaSheetField, string>> };
export type ParsedSheet = {
  name: string;
  kind: CatalogItemType | 'media' | 'ignored';
  rows: number;
  unknownHeaders: string[];
  note?: string;
};
export type ParsedWorkbook = { fileName: string; rows: ParsedRow[]; media: ParsedMediaRow[]; sheets: ParsedSheet[] };

export type IssueLevel = 'error' | 'warning' | 'info';
export type Issue = { level: IssueLevel; field?: string; message: string };
export type Change = { field: string; label: string; before: string; after: string; auto?: boolean };
export type MediaSource = 'upload' | 'original-name' | 'file-name' | 'path' | 'similar-name';
export type MediaRef = {
  ref: string;
  role: 'primary' | 'gallery' | 'background' | 'og' | 'case';
  status: 'resolved' | 'missing' | 'invalid';
  path?: string;
  source?: MediaSource;
  kind?: 'image' | 'svg' | 'video';
  size?: number | null;
  note?: string;
};
export type SeoCheck = { id: string; label: string; state: 'pass' | 'warn' | 'fail'; tip?: string };
export type RowAction = 'create' | 'update' | 'unchanged' | 'skip' | 'archive' | 'delete' | 'error';

export type PlannedRow = {
  key: string;
  sheet: string;
  row: number;
  type: CatalogItemType;
  action: RowAction;
  title: string;
  slug: string;
  url: string;
  itemId: number | null;
  matchedBy: 'id' | 'slug' | 'title' | null;
  reason?: string;
  changes: Change[];
  issues: Issue[];
  media: MediaRef[];
  seo: { score: number; checks: SeoCheck[]; indexable: boolean } | null;
};

export type MediaSheetPlan = { row: number; file: string; path: string | null; status: 'update' | 'unchanged' | 'missing'; changes: string[] };

export type TransferPlan = {
  rows: PlannedRow[];
  mediaSheet: MediaSheetPlan[];
  media: Array<{ ref: string; status: MediaRef['status']; path?: string; source?: MediaSource; uses: number; note?: string }>;
  summary: {
    total: number;
    create: number;
    update: number;
    unchanged: number;
    skip: number;
    archive: number;
    delete: number;
    error: number;
    warnings: number;
    seoAverage: number | null;
    mediaResolved: number;
    mediaMissing: number;
    newCategories: string[];
    byType: Record<CatalogItemType, number>;
  };
  sheets: ParsedSheet[];
};

/** Upload key (file name or folder-relative path, lowercase) → stored media path. */
export type SessionMediaMap = Record<string, string>;

/* ================================================================ parsing */

function cellText(v: SheetCell | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(+v.toPrecision(15));
  return String(v).replace(/\r\n?/g, '\n').trim();
}

function findHeaderRow(grid: SheetGrid, isHeader: (fields: Set<string>) => boolean, map: (h: string) => string | null) {
  for (let r = 0; r < Math.min(grid.rows.length, 12); r++) {
    const fields = new Set<string>();
    for (const cell of grid.rows[r] || []) {
      const f = map(cellText(cell));
      if (f) fields.add(f);
    }
    if (isHeader(fields)) return r;
  }
  return -1;
}

function parseItemSheet(grid: SheetGrid, fallbackType: CatalogItemType | null, out: ParsedWorkbook): ParsedSheet | null {
  const headerRow = findHeaderRow(
    grid,
    (f) => f.has('title') || (f.has('id') && f.size >= 2),
    (h) => (['type', 'itemtype', 'catalogtype'].includes(headerKey(h)) ? 'type' : fieldForHeader(h))
  );
  if (headerRow < 0) return null;

  const headers = (grid.rows[headerRow] || []).map(cellText);
  const columns: Array<{ index: number; field: TransferField | 'type' }> = [];
  const seen = new Set<string>();
  const unknownHeaders: string[] = [];
  headers.forEach((h, index) => {
    if (!h) return;
    const field = ['type', 'itemtype', 'catalogtype'].includes(headerKey(h)) ? 'type' : fieldForHeader(h);
    if (!field) return void unknownHeaders.push(h);
    if (seen.has(field)) return;
    seen.add(field);
    columns.push({ index, field });
  });

  const sheetType = typeForSheetName(grid.name) ?? fallbackType;
  let count = 0;
  let examples = 0;
  let note: string | undefined;
  for (let r = headerRow + 1; r < grid.rows.length; r++) {
    const cells = grid.rows[r] || [];
    if (!cells.some((c) => cellText(c) !== '')) continue;
    const values: RowValues = {};
    let rowType: CatalogItemType | null = sheetType;
    for (const col of columns) {
      const text = cellText(cells[col.index]);
      if (col.field === 'type') rowType = typeForSheetName(text) ?? rowType;
      else values[col.field] = text;
    }
    if ((values.action || '').trim().toLowerCase() === 'example') {
      examples++;
      continue;
    }
    if (!rowType) {
      note = 'Rows were skipped because the sheet name does not say Products, Services or Projects and there is no Type column.';
      continue;
    }
    if (out.rows.length >= TRANSFER_MAX_ROWS) {
      throw new TransferInputError(`The workbook has more than ${TRANSFER_MAX_ROWS.toLocaleString('en')} rows. Split it into smaller files and import them one after another.`);
    }
    out.rows.push({ key: `${grid.name}!${r + 1}`, sheet: grid.name, row: r + 1, type: rowType, values });
    count++;
  }
  if (examples) {
    const exampleNote = `${examples} row${examples === 1 ? '' : 's'} marked Example ${examples === 1 ? 'was' : 'were'} ignored — clear the Action cell to import ${examples === 1 ? 'it' : 'them'}.`;
    note = note ? `${note} ${exampleNote}` : exampleNote;
  }
  return { name: grid.name, kind: sheetType ?? 'ignored', rows: count, unknownHeaders, note };
}

function parseMediaSheet(grid: SheetGrid, out: ParsedWorkbook): ParsedSheet | null {
  const headerRow = findHeaderRow(grid, (f) => f.has('file_name') || f.has('stored_file'), mediaFieldForHeader);
  if (headerRow < 0) return null;
  const headers = (grid.rows[headerRow] || []).map(cellText);
  const columns = headers
    .map((h, index) => ({ index, field: mediaFieldForHeader(h) }))
    .filter((c): c is { index: number; field: MediaSheetField } => !!c.field);
  let count = 0;
  for (let r = headerRow + 1; r < grid.rows.length; r++) {
    const cells = grid.rows[r] || [];
    const values: ParsedMediaRow['values'] = {};
    for (const col of columns) values[col.field] = cellText(cells[col.index]);
    if (!values.file_name && !values.stored_file) continue;
    out.media.push({ row: r + 1, values });
    count++;
  }
  return { name: grid.name, kind: 'media', rows: count, unknownHeaders: [] };
}

export function parseCatalogWorkbook(buf: Buffer, fileName: string, fallbackType: CatalogItemType | null): ParsedWorkbook {
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    throw new TransferInputError('This is an old Excel 97–2003 (.xls) file. In Excel use File → Save As → Excel Workbook (.xlsx) and upload again.');
  }
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
  const isCsv = /\.csv$/i.test(fileName) || !isZip;
  let grids: SheetGrid[];
  try {
    grids = isCsv ? [readCsv(buf.toString('utf8'), fileName.replace(/\.[^.]+$/, ''))] : readXlsx(buf);
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'ZIP_ENCRYPTED') throw new TransferInputError('The workbook is password-protected. Remove the password and upload again.');
    throw new TransferInputError('This file could not be read as an Excel workbook (.xlsx) or CSV. In Excel use File → Save As → Excel Workbook.');
  }

  const out: ParsedWorkbook = { fileName, rows: [], media: [], sheets: [] };
  // A workbook without any Products / Services / Projects sheet is treated as the type being viewed.
  const fallback = grids.some((g) => typeForSheetName(g.name)) ? null : fallbackType;
  for (const grid of grids) {
    const lname = grid.name.trim().toLowerCase();
    if (lname === README_SHEET.toLowerCase() || lname === LISTS_SHEET.toLowerCase()) {
      out.sheets.push({ name: grid.name, kind: 'ignored', rows: 0, unknownHeaders: [] });
      continue;
    }
    const sheet =
      lname === MEDIA_SHEET.toLowerCase() || /^media\b/.test(lname)
        ? parseMediaSheet(grid, out)
        : (parseItemSheet(grid, fallback, out) ?? parseMediaSheet(grid, out));
    out.sheets.push(sheet ?? { name: grid.name, kind: 'ignored', rows: 0, unknownHeaders: [], note: 'No recognised header row (needs a Title column).' });
  }
  if (!out.rows.length && !out.media.length) {
    throw new TransferInputError('No catalog rows found. Keep the header row from the template (at least a Title column) and fill rows below it.');
  }
  return out;
}

/* ================================================================ database snapshot */

type DbMedia = { id: number; url: string; kind: 'image' | 'svg' | 'video'; alt: string | null; is_primary: boolean; sort_order: number };
type DbItem = {
  id: number;
  type: CatalogItemType;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  category_id: number | null;
  tags_json: string[];
  specs_json: Record<string, string>;
  price_label: string | null;
  availability_label: string | null;
  lead_time_label: string | null;
  background_image_url: string | null;
  status: 'draft' | 'published';
  enabled: boolean;
  featured: boolean;
  sort_order: number;
  case_study_json: CatalogCaseStudy | null;
  cta_config_json: Record<string, unknown> | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  seo_noindex: boolean;
  updated_at: Date | null;
  media: DbMedia[];
};
type DbCategory = { id: number; type: CatalogItemType; name: string; slug: string };
type Asset = { id: number | null; path: string; original_name: string | null; alt: string | null; tags: string[] | null; size: number | null };

type Snapshot = {
  items: DbItem[];
  byId: Map<number, DbItem>;
  categories: DbCategory[];
  media: MediaIndex;
};

async function loadItems(): Promise<DbItem[]> {
  await ensureCatalogBackgroundColumn();
  await ensureCatalogMediaFitColumns();
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM catalog_items ORDER BY item_type, sort_order, id');
  const [mediaRows] = await pool.query<RowDataPacket[]>(
    'SELECT id, item_id, kind, url, alt, is_primary, sort_order FROM catalog_media ORDER BY item_id, is_primary DESC, sort_order, id'
  );
  const media = new Map<number, DbMedia[]>();
  for (const m of mediaRows) {
    const list = media.get(Number(m.item_id)) || [];
    list.push({
      id: Number(m.id),
      url: toStorageMediaPath(String(m.url || '')),
      kind: m.kind,
      alt: m.alt ?? null,
      is_primary: !!Number(m.is_primary),
      sort_order: Number(m.sort_order),
    });
    media.set(Number(m.item_id), list);
  }
  return rows.map((r) => ({
    id: Number(r.id),
    type: r.item_type,
    slug: String(r.slug),
    title: String(r.title),
    summary: r.summary ?? null,
    description: r.description ?? null,
    category_id: r.category_id != null ? Number(r.category_id) : null,
    tags_json: parseJsonField<string[] | null>(r.tags_json, null) || [],
    specs_json: parseJsonField<Record<string, string> | null>(r.specs_json, null) || {},
    price_label: r.price_label ?? null,
    availability_label: r.availability_label ?? null,
    lead_time_label: r.lead_time_label ?? null,
    background_image_url: r.background_image_url ? toStorageMediaPath(String(r.background_image_url)) : null,
    status: r.status === 'published' ? 'published' : 'draft',
    enabled: !!Number(r.enabled),
    featured: !!Number(r.featured),
    sort_order: Number(r.sort_order || 0),
    case_study_json: parseJsonField<CatalogCaseStudy | null>(r.case_study_json, null),
    cta_config_json: parseJsonField<Record<string, unknown> | null>(r.cta_config_json, null),
    meta_title: r.meta_title ?? null,
    meta_description: r.meta_description ?? null,
    og_image_url: r.og_image_url ? toStorageMediaPath(String(r.og_image_url)) : null,
    seo_noindex: !!Number(r.seo_noindex ?? 0),
    updated_at: r.updated_at ? new Date(r.updated_at) : null,
    media: media.get(Number(r.id)) || [],
  }));
}

async function loadCategories(): Promise<DbCategory[]> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, item_type, name, slug FROM catalog_categories ORDER BY sort_order, id');
  return rows.map((r) => ({ id: Number(r.id), type: r.item_type, name: String(r.name), slug: String(r.slug) }));
}

/* ================================================================ media index */

class MediaIndex {
  byPath = new Map<string, Asset>();
  private byOriginal = new Map<string, Asset[]>();
  private byBase = new Map<string, Asset[]>();
  private byKey = new Map<string, Asset[]>();

  add(asset: Asset) {
    this.byPath.set(asset.path, asset);
    const push = (map: Map<string, Asset[]>, key: string) => {
      if (!key) return;
      const list = map.get(key) || [];
      if (!list.includes(asset)) list.push(asset);
      map.set(key, list);
    };
    if (asset.original_name) push(this.byOriginal, asset.original_name.toLowerCase());
    push(this.byBase, baseName(asset.path).toLowerCase());
    if (asset.original_name) push(this.byKey, mediaMatchKey(asset.original_name));
    push(this.byKey, mediaMatchKey(asset.path));
  }

  rename(asset: Asset, originalName: string) {
    if (asset.original_name) {
      const list = this.byOriginal.get(asset.original_name.toLowerCase());
      if (list) this.byOriginal.set(asset.original_name.toLowerCase(), list.filter((a) => a !== asset));
    }
    asset.original_name = originalName;
    this.add(asset);
  }

  /** Newest first, so an ambiguous name picks the most recent upload. */
  private pick(list: Asset[] | undefined) {
    if (!list?.length) return null;
    const sorted = [...list].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    return { asset: sorted[0], ambiguous: sorted.length };
  }

  resolve(ref: string, session: SessionMediaMap): { asset?: Asset; path?: string; source?: MediaSource; error?: string; note?: string } {
    let value = ref.trim();
    if (!value) return {};
    if (/^https?:\/\//i.test(value)) {
      const origin = siteOrigin();
      const at = value.indexOf('/assets/');
      if (value.toLowerCase().startsWith(origin.toLowerCase()) || at > 0) value = at > 0 ? value.slice(at) : value.slice(origin.length);
      else return { error: 'External links are not imported. Download the file and add it to the upload instead.' };
    }
    if (value.startsWith('/')) {
      const clean = toStorageMediaPath(value);
      const asset = this.byPath.get(clean);
      return asset ? { asset, path: clean, source: 'path' } : { error: `${clean} is not in the media library.` };
    }
    const lower = value.toLowerCase().replace(/\\/g, '/');
    const fromSession = session[lower] ?? session[baseName(lower)];
    if (fromSession) {
      const clean = toStorageMediaPath(fromSession);
      return { asset: this.byPath.get(clean), path: clean, source: 'upload' };
    }
    const name = baseName(lower);
    const tries: Array<[Asset[] | undefined, MediaSource]> = [
      [this.byOriginal.get(name), 'original-name'],
      [this.byBase.get(name), 'file-name'],
      [this.byKey.get(mediaMatchKey(name)), 'similar-name'],
    ];
    for (const [list, source] of tries) {
      const hit = this.pick(list);
      if (!hit) continue;
      return {
        asset: hit.asset,
        path: hit.asset.path,
        source,
        note:
          hit.ambiguous > 1
            ? `${hit.ambiguous} library files are called “${baseName(value)}”; using the newest. Upload the file with this sheet to be sure.`
            : source === 'similar-name'
              ? `Matched “${baseName(hit.asset.original_name || hit.asset.path)}” (ignoring case, spaces and punctuation).`
              : undefined,
      };
    }
    if (!hasMediaExtension(value)) return { error: `“${value}” has no image or video extension (.jpg, .png, .webp, .svg, .mp4…).` };
    return {};
  }

  /** Spreadsheet name for a stored file that resolves back to the same file. */
  exportName(filePath: string): string {
    const asset = this.byPath.get(filePath);
    const candidates = [asset?.original_name, baseName(filePath)].filter(Boolean) as string[];
    for (const name of candidates) if (this.resolve(name, {}).path === filePath) return name;
    return filePath;
  }
}

async function loadMediaIndex(): Promise<MediaIndex> {
  await ensureMediaAssetColumns();
  const index = new MediaIndex();
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, path, original_name, alt, tags_json, size_bytes FROM media_assets ORDER BY id');
  for (const r of rows) {
    index.add({
      id: Number(r.id),
      path: toStorageMediaPath(String(r.path || '')),
      original_name: r.original_name ? String(r.original_name) : null,
      alt: r.alt ? String(r.alt) : null,
      tags: parseJsonField<string[] | null>(r.tags_json, null),
      size: r.size_bytes != null ? Number(r.size_bytes) : null,
    });
  }
  for (const category of ['images', 'svg', 'video'] as AdminMediaCategory[]) {
    const names = await readdir(adminMediaDiskDir(category)).catch(() => [] as string[]);
    for (const name of names) {
      if (name.startsWith('.')) continue;
      const p = adminMediaPublicPath(category, name);
      if (!index.byPath.has(p)) index.add({ id: null, path: p, original_name: null, alt: null, tags: null, size: null });
    }
  }
  return index;
}

async function fileSize(asset: Asset | undefined, filePath: string): Promise<number | null> {
  if (asset?.size != null) return asset.size;
  const disk = resolvePublicAssetDiskPath(filePath);
  if (!disk) return null;
  const size = await stat(disk).then((s) => s.size).catch(() => null);
  if (asset && size != null) asset.size = size;
  return size;
}

async function loadSnapshot(): Promise<Snapshot> {
  const [items, categories, media] = await Promise.all([loadItems(), loadCategories(), loadMediaIndex()]);
  return { items, byId: new Map(items.map((i) => [i.id, i])), categories, media };
}

/* ================================================================ value helpers */

const YES = new Set(['yes', 'y', 'true', '1', 'on', 'x', '✓', '✔', 'published', 'live']);
const NO = new Set(['no', 'n', 'false', '0', 'off', '-', 'hidden']);

function parseBool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (YES.has(v)) return true;
  if (NO.has(v)) return false;
  return null;
}

function parseStatus(raw: string): 'draft' | 'published' | null {
  const v = raw.trim().toLowerCase();
  if (['published', 'publish', 'live', 'online', 'active', 'yes'].includes(v)) return 'published';
  if (['draft', 'private', 'offline', 'inactive', 'hidden', 'no'].includes(v)) return 'draft';
  return null;
}

function splitList(raw: string): string[] {
  return Array.from(new Set(raw.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean)));
}

function splitMedia(raw: string): string[] {
  const parts = raw.split(/[\n;|]+/).map((t) => t.trim()).filter(Boolean);
  return parts.flatMap((p) => {
    const pieces = p.split(',').map((t) => t.trim()).filter(Boolean);
    return pieces.length > 1 && pieces.every(hasMediaExtension) ? pieces : [p];
  });
}

function parseSpecs(raw: string, issues: Issue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const m = /^(.+?)\s*(?::|=|\t|\s[–—-]\s)\s*(.*)$/.exec(line);
    if (!m) {
      issues.push({ level: 'warning', field: 'specs', message: `Specification line “${line.slice(0, 60)}” has no “Key: Value” separator and was ignored.` });
      continue;
    }
    out[m[1].trim()] = m[2].trim();
  }
  return out;
}

function lines(raw: string) {
  return raw.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
}

function plain(text: string | null | undefined) {
  return String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateWords(text: string, max: number) {
  const clean = plain(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/, '')}`;
}

function sameValue(a: unknown, b: unknown) {
  const norm = (v: unknown) => (v === '' || v === undefined ? null : v);
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== '' && v != null);
    return entries.length ? entries.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('; ') : '—';
  }
  const s = String(value);
  return s.length > 160 ? `${s.slice(0, 157)}…` : s;
}

function cleanCaseStudy(cs: CatalogCaseStudy | null | undefined): CatalogCaseStudy | null {
  if (!cs) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cs)) {
    if (v === '' || v == null || (Array.isArray(v) && !v.length)) continue;
    if (k === 'testimonial' && v && typeof v === 'object') {
      const t = Object.fromEntries(Object.entries(v).filter(([, x]) => x));
      if (Object.keys(t).length) out.testimonial = t;
      continue;
    }
    out[k] = v;
  }
  return Object.keys(out).length ? (out as CatalogCaseStudy) : null;
}

/* ================================================================ planning */

type ItemPatch = Partial<{
  title: string;
  slug: string;
  category_id: number | null;
  status: 'draft' | 'published';
  enabled: boolean;
  featured: boolean;
  sort_order: number;
  summary: string;
  description: string;
  tags_json: string[];
  specs_json: Record<string, string>;
  price_label: string | null;
  availability_label: string | null;
  lead_time_label: string | null;
  background_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  seo_noindex: boolean;
  case_study_json: CatalogCaseStudy | null;
  cta_config_json: Record<string, unknown> | null;
}>;

type MediaEntry = { url: string; kind: 'image' | 'svg' | 'video'; alt: string | null };
type MediaPlan = { entries: MediaEntry[]; primaryUrl: string | null };

type Work = PlannedRow & {
  patch: ItemPatch;
  newCategory?: string;
  mediaPlan?: MediaPlan;
  existing: DbItem | null;
  final: { title: string; slug: string; summary: string | null; description: string | null; meta_title: string | null; meta_description: string | null; status: 'draft' | 'published'; enabled: boolean; seo_noindex: boolean; tags: string[]; category: boolean; og: string | null; media: MediaEntry[] };
};

const FIELD_TEXT_LIMITS: Partial<Record<TransferField, number>> = Object.fromEntries(
  TRANSFER_COLUMNS.filter((c) => c.maxLength).map((c) => [c.field, c.maxLength!])
);

function label(field: string) {
  return COLUMN_BY_FIELD.get(field as TransferField)?.header ?? field;
}

const PATCH_LABEL: Record<keyof ItemPatch, string> = {
  title: 'Title',
  slug: 'URL slug',
  category_id: 'Category',
  status: 'Status',
  enabled: 'Visible',
  featured: 'Featured',
  sort_order: 'Sort order',
  summary: 'Card summary',
  description: 'Full description',
  tags_json: 'Tags',
  specs_json: 'Specifications',
  price_label: 'Price / key stat',
  availability_label: 'Availability',
  lead_time_label: 'Lead time',
  background_image_url: 'Background image',
  meta_title: 'SEO title',
  meta_description: 'SEO description',
  og_image_url: 'Social share image',
  seo_noindex: 'Hide from search',
  case_study_json: 'Case study',
  cta_config_json: 'Brochure link',
};

/** Accepts an absolute http(s) URL or a site path; null when it is neither. */
function linkValue(text: string): string | null {
  if (/^https?:\/\/[^\s]+$/i.test(text)) return text;
  if (/^\/[^\s]*$/.test(text) && !text.split('/').includes('..')) return text;
  return null;
}

const CASE_FIELDS: Array<[TransferField, keyof CatalogCaseStudy | 'quote' | 'quote_author' | 'quote_role']> = [
  ['cs_client_name', 'client_name'],
  ['cs_client_sector', 'client_sector'],
  ['cs_location', 'location'],
  ['cs_delivery_year', 'delivery_year'],
  ['cs_challenge', 'challenge'],
  ['cs_solution', 'solution'],
  ['cs_scope', 'scope'],
  ['cs_outcomes', 'outcomes'],
  ['cs_technologies', 'technologies'],
  ['cs_quote', 'quote'],
  ['cs_quote_author', 'quote_author'],
  ['cs_quote_role', 'quote_role'],
  ['cs_video_url', 'video_url'],
  ['cs_video_title', 'video_title'],
  ['cs_oem_badges', 'oem_badges'],
  ['cs_before_image', 'before_image_url'],
  ['cs_after_image', 'after_image_url'],
  ['cs_pdf_url', 'case_study_pdf_url'],
];

export async function planCatalogImport(
  workbook: ParsedWorkbook,
  options: TransferOptions,
  session: SessionMediaMap
): Promise<{ plan: TransferPlan; work: Work[]; snapshot: Snapshot; mediaUpdates: Array<{ path: string; original_name?: string; alt?: string; tags?: string[] }> }> {
  const snapshot = await loadSnapshot();
  const { media: index } = snapshot;

  /* ---- Media sheet: renames and alt text apply before item rows resolve file names. */
  const mediaSheet: MediaSheetPlan[] = [];
  const mediaUpdates: Array<{ path: string; original_name?: string; alt?: string; tags?: string[] }> = [];
  const sheetAlt = new Map<string, string>();
  for (const m of workbook.media) {
    const stored = m.values.stored_file?.trim();
    const name = m.values.file_name?.trim() || '';
    const resolved = stored ? index.resolve(stored, session) : index.resolve(name, session);
    const asset = resolved.path ? index.byPath.get(resolved.path) : undefined;
    if (!resolved.path) {
      mediaSheet.push({ row: m.row, file: name || stored || '', path: null, status: 'missing', changes: [] });
      continue;
    }
    const update: { path: string; original_name?: string; alt?: string; tags?: string[] } = { path: resolved.path };
    const changes: string[] = [];
    if (stored && name && name !== (asset?.original_name || '') && name !== baseName(resolved.path)) {
      update.original_name = name;
      changes.push(`name → ${name}`);
      if (asset) index.rename(asset, name);
    }
    const alt = m.values.alt?.trim();
    if (alt !== undefined && alt !== '' && alt !== (asset?.alt || '')) {
      update.alt = alt.slice(0, 255);
      changes.push('alt text');
    }
    if (alt) sheetAlt.set(resolved.path, alt.slice(0, 255));
    if (m.values.tags !== undefined && m.values.tags !== '') {
      const tags = splitList(m.values.tags);
      if (!sameValue(tags, asset?.tags || [])) {
        update.tags = tags;
        changes.push('tags');
      }
    }
    if (changes.length) mediaUpdates.push(update);
    mediaSheet.push({ row: m.row, file: name || baseName(resolved.path), path: resolved.path, status: changes.length ? 'update' : 'unchanged', changes });
  }

  /* ---- lookups */
  const byType = (t: CatalogItemType) => snapshot.items.filter((i) => i.type === t);
  const slugOwner = new Map<string, number | string>();
  for (const i of snapshot.items) slugOwner.set(`${i.type}:${i.slug}`, i.id);
  const claimed = new Map<number, string>();
  const idsSeen = new Map<number, string>();
  const newCategories = new Map<string, string>();
  const mediaUses = new Map<string, { ref: string; status: MediaRef['status']; path?: string; source?: MediaSource; uses: number; note?: string }>();

  const work: Work[] = [];

  for (const parsed of workbook.rows) {
    const v = parsed.values;
    const issues: Issue[] = [];
    const changes: Change[] = [];
    const mediaRefs: MediaRef[] = [];
    const action = (v.action || '').trim().toLowerCase();
    const typeLabel = CATALOG_TYPE_LABEL[parsed.type];

    /* ---- match an existing item */
    let existing: DbItem | null = null;
    let matchedBy: PlannedRow['matchedBy'] = null;
    const idText = (v.id || '').trim();
    if (idText) {
      const id = Number(idText);
      const hit = Number.isInteger(id) ? snapshot.byId.get(id) : undefined;
      if (!hit) issues.push({ level: 'error', field: 'id', message: `ID ${idText} does not exist. Clear the ID cell to create a new ${typeLabel.toLowerCase()}.` });
      else if (hit.type !== parsed.type)
        issues.push({ level: 'error', field: 'id', message: `ID ${idText} is a ${CATALOG_TYPE_LABEL[hit.type].toLowerCase()}, not a ${typeLabel.toLowerCase()}. Move the row to the ${SHEET_NAME[hit.type]} sheet.` });
      else {
        existing = hit;
        matchedBy = 'id';
      }
    }
    if (!existing && !idText) {
      const slugText = slugify(v.slug || '');
      const title = (v.title || '').trim().toLowerCase();
      const candidates = byType(parsed.type);
      const bySlug = slugText ? candidates.find((i) => i.slug === slugText) : undefined;
      const byTitle = !bySlug && title ? candidates.filter((i) => i.title.trim().toLowerCase() === title) : [];
      if (bySlug) {
        existing = bySlug;
        matchedBy = 'slug';
      } else if (byTitle.length === 1) {
        existing = byTitle[0];
        matchedBy = 'title';
        issues.push({ level: 'info', message: `Matched the existing ${typeLabel.toLowerCase()} #${existing.id} by title.` });
      } else if (byTitle.length > 1) {
        issues.push({ level: 'error', field: 'title', message: `${byTitle.length} existing ${SHEET_NAME[parsed.type].toLowerCase()} have this title. Add the ID or URL slug so the right one is updated.` });
      }
    }
    if (existing) {
      const prev = claimed.get(existing.id);
      if (prev) issues.push({ level: 'error', message: `Row ${prev} already updates this ${typeLabel.toLowerCase()} (#${existing.id}). Keep one row per item.` });
      else claimed.set(existing.id, String(parsed.row));
      if (idText) idsSeen.set(existing.id, String(parsed.row));
    }

    const base: Work = {
      key: parsed.key,
      sheet: parsed.sheet,
      row: parsed.row,
      type: parsed.type,
      action: 'skip',
      title: (v.title || existing?.title || '').trim(),
      slug: existing?.slug || '',
      url: existing ? catalogPublicPath(parsed.type, existing.slug) : '',
      itemId: existing?.id ?? null,
      matchedBy,
      changes,
      issues,
      media: mediaRefs,
      seo: null,
      patch: {},
      existing,
      final: {
        title: existing?.title || '',
        slug: existing?.slug || '',
        summary: existing?.summary ?? null,
        description: existing?.description ?? null,
        meta_title: existing?.meta_title ?? null,
        meta_description: existing?.meta_description ?? null,
        status: existing?.status ?? options.defaultStatus,
        enabled: existing?.enabled ?? true,
        seo_noindex: existing?.seo_noindex ?? false,
        tags: existing?.tags_json ?? [],
        category: existing?.category_id != null,
        og: existing?.og_image_url ?? null,
        media: (existing?.media || []).map((m) => ({ url: m.url, kind: m.kind, alt: m.alt })),
      },
    };
    work.push(base);

    /* ---- row actions */
    if (action && !['skip', 'archive', 'delete', 'upsert', 'update', 'create'].includes(action)) {
      issues.push({ level: 'error', field: 'action', message: `Unknown action “${v.action}”. Use blank, ${TRANSFER_ACTIONS.join(', ')}.` });
    }
    if (action === 'skip') {
      base.action = 'skip';
      base.reason = 'Marked Skip in the sheet';
      continue;
    }
    if (action === 'archive' || action === 'delete') {
      if (!existing) {
        base.action = issues.some((i) => i.level === 'error') ? 'error' : 'skip';
        base.reason = `Nothing to ${action}: no matching ${typeLabel.toLowerCase()} found`;
        continue;
      }
      if (action === 'delete' && !options.allowDelete) {
        issues.push({ level: 'error', field: 'action', message: 'Delete is turned off. Enable “Allow Delete rows” in the import rules, or use Archive to hide the item instead.' });
      }
      if (action === 'archive') {
        base.patch = { status: 'draft', enabled: false };
        if (existing.status !== 'draft') changes.push({ field: 'status', label: 'Status', before: 'Published', after: 'Draft' });
        if (existing.enabled) changes.push({ field: 'enabled', label: 'Visible', before: 'Yes', after: 'No' });
      } else if (existing.status === 'published' && existing.enabled) {
        issues.push({ level: 'info', message: options.redirects ? `The live page will 301-redirect to ${catalogListingPath(parsed.type)} so search traffic is not lost.` : 'The live page will start returning 404.' });
      }
      base.action = issues.some((i) => i.level === 'error') ? 'error' : action === 'archive' && !changes.length ? 'unchanged' : (action as RowAction);
      continue;
    }
    if (options.mode === 'create' && existing) {
      base.action = issues.some((i) => i.level === 'error') ? 'error' : 'skip';
      base.reason = 'Already exists (create-only import)';
      continue;
    }
    if (options.mode === 'update' && !existing) {
      base.action = issues.some((i) => i.level === 'error') ? 'error' : 'skip';
      base.reason = 'Not found (update-only import)';
      continue;
    }

    /* ---- field values */
    const patch: ItemPatch = {};
    const auto = new Set<string>();
    const isCreate = !existing;
    const has = (f: TransferField) => Object.prototype.hasOwnProperty.call(v, f);
    /** 'set' with a value, 'clear', or 'keep' (leave as is / default). */
    const intent = (f: TransferField): { kind: 'set'; text: string } | { kind: 'clear' } | { kind: 'keep' } => {
      if (!has(f)) return { kind: 'keep' };
      const text = (v[f] || '').trim();
      if (text.toLowerCase() === CLEAR_TOKEN) return { kind: 'clear' };
      if (!text) return !isCreate && options.blankCells === 'clear' ? { kind: 'clear' } : { kind: 'keep' };
      const limit = FIELD_TEXT_LIMITS[f];
      if (limit && text.length > limit) {
        issues.push({ level: 'error', field: f, message: `${label(f)} is ${text.length} characters; the limit is ${limit}.` });
        return { kind: 'keep' };
      }
      return { kind: 'set', text };
    };
    const notClearable = (f: TransferField) =>
      issues.push({ level: 'warning', field: f, message: `${label(f)} cannot be cleared; the current value is kept.` });

    // Title
    const t = intent('title');
    if (t.kind === 'set') patch.title = t.text;
    else if (t.kind === 'clear' && !isCreate) notClearable('title');
    if (isCreate && !patch.title) issues.push({ level: 'error', field: 'title', message: 'Title is required for a new item.' });
    const finalTitle = patch.title ?? existing?.title ?? '';

    // Slug
    const s = intent('slug');
    let finalSlug = existing?.slug ?? '';
    if (s.kind === 'set') {
      const clean = slugify(s.text);
      if (!clean) issues.push({ level: 'error', field: 'slug', message: `URL slug “${s.text}” has no letters or numbers.` });
      else {
        if (clean !== s.text) issues.push({ level: 'info', field: 'slug', message: `URL slug tidied to “${clean}”.` });
        finalSlug = clean;
      }
    } else if (s.kind === 'clear' && !isCreate) notClearable('slug');
    if (isCreate && !finalSlug && finalTitle) {
      finalSlug = slugify(finalTitle);
      auto.add('slug');
    }
    if (finalSlug) {
      const owner = slugOwner.get(`${parsed.type}:${finalSlug}`);
      if (owner !== undefined && owner !== existing?.id) {
        if (auto.has('slug')) {
          let n = 2;
          while (slugOwner.has(`${parsed.type}:${finalSlug.slice(0, 150)}-${n}`)) n++;
          const next = `${finalSlug.slice(0, 150)}-${n}`;
          issues.push({ level: 'warning', field: 'slug', message: `URL slug “${finalSlug}” is taken; using “${next}”. Check this is not a duplicate of an existing item.` });
          finalSlug = next;
        } else {
          issues.push({
            level: 'error',
            field: 'slug',
            message: typeof owner === 'number' ? `URL slug “${finalSlug}” is already used by #${owner}.` : `URL slug “${finalSlug}” is also used on row ${owner.split('!')[1]}.`,
          });
        }
      }
      if (!issues.some((i) => i.level === 'error' && i.field === 'slug')) slugOwner.set(`${parsed.type}:${finalSlug}`, existing?.id ?? parsed.key);
    }
    if (finalSlug && finalSlug !== existing?.slug) patch.slug = finalSlug;
    if (existing && patch.slug && existing.status === 'published' && existing.enabled) {
      issues.push({
        level: options.redirects ? 'info' : 'warning',
        field: 'slug',
        message: options.redirects
          ? `URL changes from ${catalogPublicPath(parsed.type, existing.slug)}; a 301 redirect keeps old links and rankings.`
          : 'URL changes on a live page and redirects are off: old links will 404.',
      });
    }

    // Category
    const c = intent('category');
    if (c.kind === 'set') {
      const key = c.text.toLowerCase();
      const cat = snapshot.categories.find((x) => x.type === parsed.type && (x.name.toLowerCase() === key || x.slug === slugify(c.text)));
      if (cat) patch.category_id = cat.id;
      else if (options.createCategories) {
        base.newCategory = c.text;
        newCategories.set(`${parsed.type}:${key}`, `${c.text} (${SHEET_NAME[parsed.type]})`);
        issues.push({ level: 'info', field: 'category', message: `New category “${c.text}” will be created.` });
      } else issues.push({ level: 'error', field: 'category', message: `Category “${c.text}” does not exist for ${SHEET_NAME[parsed.type].toLowerCase()}. Add it in Categories, or allow new categories.` });
    } else if (c.kind === 'clear') patch.category_id = null;

    // Status / flags / order
    const st = intent('status');
    if (st.kind === 'set') {
      const status = parseStatus(st.text);
      if (status) patch.status = status;
      else issues.push({ level: 'error', field: 'status', message: `Status “${st.text}” is not Draft or Published.` });
    } else if (isCreate) {
      patch.status = options.defaultStatus;
      auto.add('status');
    }
    for (const f of ['enabled', 'featured', 'seo_noindex'] as const) {
      const b = intent(f);
      if (b.kind === 'set') {
        const val = parseBool(b.text);
        if (val === null) issues.push({ level: 'error', field: f, message: `${label(f)} must be Yes or No (got “${b.text}”).` });
        else patch[f] = val;
      } else if (b.kind === 'clear' && f === 'seo_noindex') patch.seo_noindex = false;
    }
    const so = intent('sort_order');
    if (so.kind === 'set') {
      const n = Number(so.text);
      if (!Number.isFinite(n)) issues.push({ level: 'error', field: 'sort_order', message: `Sort order “${so.text}” is not a number.` });
      else patch.sort_order = Math.round(n);
    }

    // Text
    for (const f of ['summary', 'description'] as const) {
      const x = intent(f);
      if (x.kind === 'set') patch[f] = x.text;
      else if (x.kind === 'clear') patch[f] = '';
    }
    for (const f of ['price_label', 'availability_label', 'lead_time_label', 'meta_title', 'meta_description'] as const) {
      const x = intent(f);
      if (x.kind === 'set') patch[f] = x.text;
      else if (x.kind === 'clear') patch[f] = null;
    }
    const tg = intent('tags');
    if (tg.kind === 'set') patch.tags_json = splitList(tg.text);
    else if (tg.kind === 'clear') patch.tags_json = [];
    const sp = intent('specs');
    if (sp.kind === 'set') patch.specs_json = parseSpecs(sp.text, issues);
    else if (sp.kind === 'clear') patch.specs_json = {};

    // Brochure lives in cta_config_json next to other CTA settings, which are kept.
    const br = intent('brochure');
    if (br.kind === 'set') {
      const link = linkValue(br.text);
      if (link) patch.cta_config_json = withBrochureUrl(existing?.cta_config_json, link);
      else issues.push({ level: 'error', field: 'brochure', message: `Brochure link “${br.text.slice(0, 60)}” must start with https:// or /assets/.` });
    } else if (br.kind === 'clear') patch.cta_config_json = withBrochureUrl(existing?.cta_config_json, null);

    const resolveRef = (ref: string, role: MediaRef['role']): MediaRef => {
      const r = index.resolve(ref, session);
      const out: MediaRef = r.path
        ? { ref, role, status: 'resolved', path: r.path, source: r.source, kind: mediaKindFromName(r.path), note: r.note }
        : { ref, role, status: r.error ? 'invalid' : 'missing', note: r.error ?? 'Not in the media library yet. Add the file to the upload.' };
      mediaRefs.push(out);
      const k = ref.toLowerCase();
      const agg = mediaUses.get(k) || { ref, status: out.status, path: out.path, source: out.source, uses: 0, note: out.note };
      agg.uses++;
      mediaUses.set(k, agg);
      return out;
    };

    // Case study (merged so fields the sheet does not carry survive)
    if (CASE_FIELDS.some(([f]) => has(f))) {
      const cs: CatalogCaseStudy = JSON.parse(JSON.stringify(existing?.case_study_json || {}));
      let touched = false;
      for (const [f, key] of CASE_FIELDS) {
        const x = intent(f);
        if (x.kind === 'keep') continue;
        const text = x.kind === 'set' ? x.text : '';
        if (key === 'before_image_url' || key === 'after_image_url') {
          if (text) {
            const ref = resolveRef(text, 'case');
            if (ref.status !== 'resolved' || ref.kind === 'video') {
              issues.push({ level: 'warning', field: f, message: `${label(f)} “${text}”: ${ref.kind === 'video' ? 'must be an image.' : ref.note} Left unchanged.` });
              continue;
            }
            cs[key] = ref.path;
          } else cs[key] = '';
        } else if (key === 'video_url' || key === 'case_study_pdf_url') {
          const link = text ? (linkValue(text) ?? (key === 'video_url' ? resolveRef(text, 'case').path : null)) : '';
          if (link === null || link === undefined) {
            issues.push({ level: 'warning', field: f, message: `${label(f)} “${text.slice(0, 60)}” is not a link or a library file. Left unchanged.` });
            continue;
          }
          cs[key] = link;
        } else if (key === 'outcomes') cs.outcomes = text ? lines(text) : [];
        else if (key === 'technologies' || key === 'oem_badges') cs[key] = text ? splitList(text) : [];
        else if (key === 'quote' || key === 'quote_author' || key === 'quote_role') {
          const prop = key === 'quote' ? 'quote' : key === 'quote_author' ? 'author' : 'role';
          cs.testimonial = { ...(cs.testimonial || {}), [prop]: text };
        } else (cs as Record<string, unknown>)[key] = text;
        touched = true;
      }
      if (touched) {
        const next = cleanCaseStudy(cs);
        if (next && !existing?.case_study_json) next.enabled = true;
        patch.case_study_json = next;
      }
    }

    /* ---- media */
    for (const [f, target, role] of [
      ['background_image', 'background_image_url', 'background'],
      ['og_image', 'og_image_url', 'og'],
    ] as const) {
      const x = intent(f);
      if (x.kind === 'set') {
        const ref = resolveRef(x.text, role);
        if (ref.status === 'resolved') {
          if (ref.kind === 'video') issues.push({ level: 'error', field: f, message: `${label(f)} must be an image, not a video.` });
          else patch[target] = ref.path!;
        } else issues.push({ level: 'warning', field: f, message: `${label(f)} “${x.text}”: ${ref.note} Left unchanged.` });
      } else if (x.kind === 'clear') patch[target] = null;
    }

    const pI = intent('primary_image');
    const gI = intent('gallery');
    const altI = intent('primary_alt');
    const existingMedia = existing?.media || [];
    const existingPrimary = existingMedia.find((m) => m.is_primary && m.kind !== 'video') || existingMedia.find((m) => m.kind !== 'video');
    if (pI.kind !== 'keep' || gI.kind !== 'keep' || altI.kind === 'set') {
      let primaryUrl: string | null = existingPrimary?.url ?? null;
      let primaryOk = true;
      if (pI.kind === 'set') {
        const ref = resolveRef(pI.text, 'primary');
        if (ref.status !== 'resolved') {
          primaryOk = false;
          issues.push({ level: 'warning', field: 'primary_image', message: `Primary image “${pI.text}”: ${ref.note}` });
        } else if (ref.kind === 'video') {
          issues.push({ level: 'warning', field: 'primary_image', message: 'A video cannot be the primary image; it was added to the gallery instead.' });
          primaryUrl = null;
        } else primaryUrl = ref.path!;
      } else if (pI.kind === 'clear') primaryUrl = null;

      let galleryUrls: string[] = existingMedia.filter((m) => m.url !== existingPrimary?.url).map((m) => m.url);
      let galleryOk = true;
      if (gI.kind === 'set') {
        const refs = splitMedia(gI.text).map((r) => resolveRef(r, 'gallery'));
        const missing = refs.filter((r) => r.status !== 'resolved');
        if (missing.length) {
          galleryOk = false;
          issues.push({
            level: 'warning',
            field: 'gallery',
            message: `${missing.length} gallery file${missing.length > 1 ? 's' : ''} not found (${missing.map((m) => m.ref).join(', ')}). The gallery is left unchanged until ${missing.length > 1 ? 'they are' : 'it is'} uploaded.`,
          });
        } else galleryUrls = refs.map((r) => r.path!);
      } else if (gI.kind === 'clear') galleryUrls = [];

      if (pI.kind === 'set' && primaryOk && primaryUrl === null) {
        const video = mediaRefs.find((r) => r.role === 'primary' && r.status === 'resolved');
        if (video?.path) galleryUrls = [video.path, ...galleryUrls];
      }

      if (primaryOk || galleryOk) {
        const ordered =
          options.gallery === 'append' && existing
            ? [...existingMedia.map((m) => m.url), ...(primaryUrl ? [primaryUrl] : []), ...galleryUrls]
            : [...(primaryUrl ? [primaryUrl] : []), ...galleryUrls];
        const unique = Array.from(new Set(ordered.filter(Boolean)));
        const altFor = (url: string, i: number): string | null => {
          if (url === primaryUrl && altI.kind === 'set') return altI.text.slice(0, 255);
          if (url === primaryUrl && altI.kind === 'clear') return null;
          const prior = existingMedia.find((m) => m.url === url)?.alt;
          const fromSheet = sheetAlt.get(url);
          const lib = index.byPath.get(url)?.alt;
          const value = fromSheet || prior || lib || null;
          if (value) return value;
          if (options.seoAutopilot && finalTitle) {
            auto.add('alt');
            return url === primaryUrl || i === 0 ? finalTitle.slice(0, 255) : `${finalTitle} – ${mediaKindFromName(url) === 'video' ? 'video' : 'view'} ${i + 1}`.slice(0, 255);
          }
          return null;
        };
        const entries: MediaEntry[] = unique.map((url, i) => ({ url, kind: mediaKindFromName(url), alt: altFor(url, i) }));
        const effectivePrimary = primaryUrl && unique.includes(primaryUrl) ? primaryUrl : (entries.find((e) => e.kind !== 'video')?.url ?? null);
        const before = existingMedia.map((m) => `${m.url}|${m.alt || ''}|${m.is_primary ? 1 : 0}`).join('\n');
        const after = entries.map((e) => `${e.url}|${e.alt || ''}|${e.url === effectivePrimary ? 1 : 0}`).join('\n');
        if (before !== after) {
          base.mediaPlan = { entries, primaryUrl: effectivePrimary };
          const names = (list: string[]) => (list.length ? list.map((u) => index.exportName(u)).join(', ') : '—');
          const beforeUrls = existingMedia.map((m) => m.url);
          if (beforeUrls.join('\n') !== unique.join('\n') || existingPrimary?.url !== effectivePrimary) {
            changes.push({ field: 'media', label: 'Media', before: names(beforeUrls), after: names(unique) });
          }
          const altChanged = entries.filter((e) => {
            const prior = existingMedia.find((m) => m.url === e.url);
            return prior && (prior.alt || '') !== (e.alt || '');
          });
          if (altChanged.length) {
            changes.push({
              field: 'media_alt',
              label: 'Alt text',
              before: altChanged.map((e) => existingMedia.find((m) => m.url === e.url)?.alt || '—').join(' · '),
              after: altChanged.map((e) => e.alt || '—').join(' · '),
              auto: auto.has('alt'),
            });
          }
        }
        base.final.media = entries;
      }
    }

    /* ---- SEO autopilot (fills only what is empty) */
    const finalSummary = patch.summary !== undefined ? patch.summary : (existing?.summary ?? '');
    const finalDescription = patch.description !== undefined ? patch.description : (existing?.description ?? '');
    let finalMetaTitle = patch.meta_title !== undefined ? patch.meta_title : (existing?.meta_title ?? null);
    let finalMetaDescription = patch.meta_description !== undefined ? patch.meta_description : (existing?.meta_description ?? null);
    if (options.seoAutopilot && finalTitle) {
      const fallbackTitle = `${finalTitle} — ${typeLabel}`;
      if (!finalMetaTitle && fallbackTitle.length > SEO_TITLE_RANGE[1]) {
        finalMetaTitle = truncateWords(finalTitle.length > SEO_TITLE_RANGE[1] ? finalTitle : fallbackTitle, SEO_TITLE_RANGE[1]);
        patch.meta_title = finalMetaTitle;
        auto.add('meta_title');
      }
      const fallbackDesc = plain(finalSummary || finalDescription);
      if (!finalMetaDescription && fallbackDesc && (fallbackDesc.length < SEO_DESCRIPTION_RANGE[0] || fallbackDesc.length > SEO_DESCRIPTION_RANGE[1])) {
        const pooled = plain([finalSummary, finalDescription].filter(Boolean).join(' '));
        const candidate = pooled.length > SEO_DESCRIPTION_RANGE[1] ? `${truncateWords(pooled, SEO_DESCRIPTION_RANGE[1] - 2)}…` : pooled;
        if (candidate.length >= SEO_DESCRIPTION_RANGE[0] || candidate.length > fallbackDesc.length) {
          finalMetaDescription = candidate;
          patch.meta_description = candidate;
          auto.add('meta_description');
        }
      }
    }

    /* ---- conflict check */
    const version = (v.version || '').trim();
    if (existing && version && existing.updated_at) {
      const exportedAt = Date.parse(version);
      if (Number.isFinite(exportedAt) && existing.updated_at.getTime() - exportedAt > 2_000) {
        issues.push({
          level: 'warning',
          message: `Edited in admin on ${existing.updated_at.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}, after this sheet was exported. Importing overwrites those edits for the columns in this sheet.`,
        });
      }
    }

    /* ---- diff */
    const current: Record<string, unknown> = existing
      ? {
          ...existing,
          case_study_json: cleanCaseStudy(existing.case_study_json),
        }
      : {};
    const catName = (id: number | null | undefined) => snapshot.categories.find((x) => x.id === id)?.name ?? null;
    const show = (key: keyof ItemPatch, value: unknown) => {
      if (key === 'category_id') return display(catName(value as number | null));
      if (key === 'status') return value === 'published' ? 'Published' : value === 'draft' ? 'Draft' : '—';
      if ((key === 'background_image_url' || key === 'og_image_url') && value) return index.exportName(String(value));
      if (key === 'cta_config_json') return display(getBrochureUrl({ cta_config_json: value as Record<string, unknown> | null }));
      return display(value);
    };
    for (const [key, value] of Object.entries(patch) as Array<[keyof ItemPatch, unknown]>) {
      const before = current[key];
      const compareValue = key === 'case_study_json' ? cleanCaseStudy(value as CatalogCaseStudy | null) : value;
      if (existing && sameValue(before ?? null, compareValue ?? null)) {
        delete patch[key];
        continue;
      }
      changes.push({
        field: key,
        label: PATCH_LABEL[key],
        before: existing ? show(key, before) : '—',
        after: show(key, value),
        auto: auto.has(key),
      });
    }
    if (base.newCategory) {
      changes.push({ field: 'category_id', label: 'Category', before: existing ? display(catName(existing.category_id)) : '—', after: `${base.newCategory} (new)` });
    }

    base.patch = patch;
    base.title = finalTitle;
    base.slug = finalSlug;
    base.url = finalSlug ? catalogPublicPath(parsed.type, finalSlug) : '';
    base.final = {
      ...base.final,
      title: finalTitle,
      slug: finalSlug,
      summary: finalSummary || null,
      description: finalDescription || null,
      meta_title: finalMetaTitle,
      meta_description: finalMetaDescription,
      status: patch.status ?? existing?.status ?? options.defaultStatus,
      enabled: patch.enabled ?? existing?.enabled ?? true,
      seo_noindex: patch.seo_noindex ?? existing?.seo_noindex ?? false,
      tags: patch.tags_json ?? existing?.tags_json ?? [],
      category: base.newCategory ? true : patch.category_id !== undefined ? patch.category_id !== null : existing?.category_id != null,
      og: patch.og_image_url !== undefined ? patch.og_image_url : (existing?.og_image_url ?? null),
    };

    const hasErrors = issues.some((i) => i.level === 'error');
    base.action = hasErrors ? 'error' : isCreate ? 'create' : changes.length ? 'update' : 'unchanged';
  }

  /* ---- SEO scoring (needs every row to find duplicates) */
  const titleUse = new Map<string, number>();
  const descUse = new Map<string, number>();
  const effTitle = (title: string, meta: string | null, type: CatalogItemType) => (meta || `${title} — ${CATALOG_TYPE_LABEL[type]}`).trim().toLowerCase();
  const effDesc = (meta: string | null, summary: string | null, description: string | null) => plain(meta || summary || description).slice(0, 160).toLowerCase();
  const touched = new Set(work.filter((w) => w.existing).map((w) => w.existing!.id));
  const live = [
    ...snapshot.items.filter((i) => !touched.has(i.id) && i.status === 'published' && i.enabled).map((i) => ({ t: effTitle(i.title, i.meta_title, i.type), d: effDesc(i.meta_description, i.summary, i.description) })),
    ...work
      .filter((w) => ['create', 'update', 'unchanged'].includes(w.action))
      .map((w) => ({ t: effTitle(w.final.title, w.final.meta_title, w.type), d: effDesc(w.final.meta_description, w.final.summary, w.final.description) })),
  ];
  for (const x of live) {
    titleUse.set(x.t, (titleUse.get(x.t) || 0) + 1);
    if (x.d) descUse.set(x.d, (descUse.get(x.d) || 0) + 1);
  }

  for (const w of work) {
    if (!['create', 'update', 'unchanged'].includes(w.action)) continue;
    w.seo = await scoreSeo(w, index, titleUse, descUse, effTitle, effDesc);
    const noImage = w.seo.checks.some((c) => c.id === 'primary_image' && c.state === 'fail');
    if (w.final.status === 'published' && w.final.enabled && noImage) {
      w.issues.push({ level: 'warning', field: 'primary_image', message: 'Published without an image: cards and link previews will look empty.' });
    }
    if (w.final.status === 'published' && w.final.seo_noindex) {
      w.issues.push({ level: 'info', field: 'seo_noindex', message: 'Published but hidden from search engines (Hide from search = Yes).' });
    }
  }

  /* ---- summary */
  const count = (a: RowAction) => work.filter((w) => w.action === a).length;
  const scored = work.filter((w) => w.seo && w.action !== 'unchanged');
  const scoredAll = scored.length ? scored : work.filter((w) => w.seo);
  const mediaList = [...mediaUses.values()];
  const byTypeCount = { product: 0, service: 0, project: 0 } as Record<CatalogItemType, number>;
  for (const w of work) byTypeCount[w.type]++;

  const plan: TransferPlan = {
    rows: work.map(publicRow),
    mediaSheet,
    media: mediaList,
    summary: {
      total: work.length,
      create: count('create'),
      update: count('update'),
      unchanged: count('unchanged'),
      skip: count('skip'),
      archive: count('archive'),
      delete: count('delete'),
      error: count('error'),
      warnings: work.reduce((n, w) => n + w.issues.filter((i) => i.level === 'warning').length, 0),
      seoAverage: scoredAll.length ? Math.round(scoredAll.reduce((n, w) => n + (w.seo?.score || 0), 0) / scoredAll.length) : null,
      mediaResolved: mediaList.filter((m) => m.status === 'resolved').length,
      mediaMissing: mediaList.filter((m) => m.status !== 'resolved').length,
      newCategories: [...newCategories.values()],
      byType: byTypeCount,
    },
    sheets: workbook.sheets,
  };
  return { plan, work, snapshot, mediaUpdates };
}

function publicRow(w: Work): PlannedRow {
  return {
    key: w.key,
    sheet: w.sheet,
    row: w.row,
    type: w.type,
    action: w.action,
    title: w.title,
    slug: w.slug,
    url: w.url,
    itemId: w.itemId,
    matchedBy: w.matchedBy,
    reason: w.reason,
    changes: w.changes,
    issues: w.issues,
    media: w.media,
    seo: w.seo,
  };
}

async function scoreSeo(
  w: Work,
  index: MediaIndex,
  titleUse: Map<string, number>,
  descUse: Map<string, number>,
  effTitle: (title: string, meta: string | null, type: CatalogItemType) => string,
  effDesc: (meta: string | null, summary: string | null, description: string | null) => string
): Promise<NonNullable<PlannedRow['seo']>> {
  const f = w.final;
  const checks: SeoCheck[] = [];
  const weights: Record<string, number> = {};
  const add = (id: string, weight: number, label: string, state: SeoCheck['state'], tip?: string) => {
    weights[id] = weight;
    checks.push({ id, label, state, tip });
  };
  const inRange = (n: number, [min, max]: [number, number], slack: number) => (n >= min && n <= max ? 'pass' : n > 0 && n >= min - slack && n <= max + slack ? 'warn' : 'fail');

  const title = f.meta_title || `${f.title} — ${CATALOG_TYPE_LABEL[w.type]}`;
  add('title', 15, `Search title ${title.length} chars`, inRange(title.length, SEO_TITLE_RANGE, 10), `Aim for ${SEO_TITLE_RANGE[0]}–${SEO_TITLE_RANGE[1]} characters.`);

  const metaDesc = plain(f.meta_description);
  const fallbackDesc = plain(f.summary || f.description);
  const desc = metaDesc || fallbackDesc;
  const descTip = `Write ${SEO_DESCRIPTION_RANGE[0]}–${SEO_DESCRIPTION_RANGE[1]} characters in SEO description or Card summary.`;
  if (metaDesc) add('description', 15, `Search description ${metaDesc.length} chars`, inRange(metaDesc.length, SEO_DESCRIPTION_RANGE, 25), descTip);
  else if (fallbackDesc)
    add(
      'description',
      15,
      `Search description from ${f.summary ? 'summary' : 'description'} (${fallbackDesc.length} chars)`,
      // Longer text is clamped by the site, so it still works — just not as crafted copy.
      fallbackDesc.length > SEO_DESCRIPTION_RANGE[1] ? 'warn' : inRange(fallbackDesc.length, SEO_DESCRIPTION_RANGE, 25),
      descTip
    );
  else add('description', 15, 'Search description missing', 'fail', descTip);

  const slugOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug);
  add('slug', 10, `URL /${f.slug.slice(0, 40)}${f.slug.length > 40 ? '…' : ''}`, !slugOk ? 'fail' : f.slug.length <= SLUG_IDEAL_MAX ? 'pass' : 'warn', `Keep it under ${SLUG_IDEAL_MAX} characters, keyword-first.`);

  const content = plain(f.description);
  add(
    'content',
    15,
    `Page copy ${content.length} chars`,
    content.length >= THIN_CONTENT_CHARS ? 'pass' : content.length >= THIN_CONTENT_CHARS / 2 ? 'warn' : 'fail',
    `Thin pages rank poorly; write ${THIN_CONTENT_CHARS}+ characters of original description.`
  );

  const images = f.media.filter((m) => m.kind !== 'video');
  add('primary_image', 10, images.length ? 'Primary image set' : 'No image', images.length ? 'pass' : 'fail', 'Add a primary image for cards, Google Images and link previews.');

  const missingAlt = f.media.filter((m) => !m.alt).length;
  const longAlt = f.media.filter((m) => (m.alt || '').length > ALT_TEXT_MAX).length;
  add(
    'alt',
    10,
    !f.media.length ? 'No media to describe' : missingAlt ? `${missingAlt} file${missingAlt > 1 ? 's' : ''} without alt text` : longAlt ? `${longAlt} alt text${longAlt > 1 ? 's' : ''} over ${ALT_TEXT_MAX} chars` : 'Alt text on every file',
    !f.media.length ? 'warn' : missingAlt ? 'fail' : longAlt ? 'warn' : 'pass',
    'Describe each image in plain words; it powers accessibility and image search.'
  );

  const dupTitle = (titleUse.get(effTitle(f.title, f.meta_title, w.type)) || 0) > 1;
  const dupDesc = desc ? (descUse.get(effDesc(f.meta_description, f.summary, f.description)) || 0) > 1 : false;
  add('unique', 10, dupTitle || dupDesc ? `Duplicate ${dupTitle ? 'title' : ''}${dupTitle && dupDesc ? ' and ' : ''}${dupDesc ? 'description' : ''}` : 'Unique title and description', dupTitle || dupDesc ? 'fail' : 'pass', 'Every page needs its own title and description, or Google picks one and ignores the rest.');

  add('taxonomy', 5, f.category ? `Categorised${f.tags.length ? ` · ${f.tags.length} tags` : ''}` : 'No category', f.category ? (f.tags.length ? 'pass' : 'warn') : 'fail', 'Categories and tags build internal links and filters.');

  add('social', 5, f.og ? 'Social image set' : images.length ? 'Social image falls back to primary' : 'No social image', f.og ? 'pass' : images.length ? 'warn' : 'fail', 'A 1200×630 share image makes LinkedIn and WhatsApp previews stand out.');

  let heavy = 0;
  let legacy = 0;
  for (const m of images) {
    const size = await fileSize(index.byPath.get(m.url), m.url);
    if (size && size > HEAVY_IMAGE_BYTES) heavy++;
    if (['.png', '.jpg', '.jpeg', '.gif'].includes(fileExtension(m.url)) && size && size > 300 * 1024) legacy++;
  }
  add(
    'weight',
    5,
    heavy ? `${heavy} image${heavy > 1 ? 's' : ''} over 1 MB` : legacy ? `${legacy} large JPG/PNG — WebP would be lighter` : 'Images are light',
    heavy ? 'fail' : legacy ? 'warn' : 'pass',
    'Heavy images slow the page (Core Web Vitals). Export as WebP under ~300 KB.'
  );

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const got = checks.reduce((n, c) => n + (c.state === 'pass' ? weights[c.id] : c.state === 'warn' ? weights[c.id] / 2 : 0), 0);
  return { score: Math.round((got / total) * 100), checks, indexable: f.status === 'published' && f.enabled && !f.seo_noindex };
}

/* ================================================================ apply */

export type ResultRow = {
  key: string;
  sheet: string;
  row: number;
  type: CatalogItemType;
  title: string;
  status: 'created' | 'updated' | 'unchanged' | 'archived' | 'deleted' | 'skipped' | 'failed';
  itemId: number | null;
  url: string;
  message: string;
  changes: number;
  seo: number | null;
};

async function clearRedirectFrom(publicPath: string) {
  await pool.query('DELETE FROM redirects WHERE from_path = ?', [normalizePath(publicPath)]).catch(() => undefined);
  invalidateRedirectCache();
}

async function applyMedia(itemId: number, existing: DbMedia[], plan: MediaPlan) {
  const keep = new Set(plan.entries.map((e) => e.url));
  for (const m of existing) if (!keep.has(m.url)) await pool.query('DELETE FROM catalog_media WHERE id = ? AND item_id = ?', [m.id, itemId]);
  const byUrl = new Map(existing.map((m) => [m.url, m]));
  let primaryId: number | null = null;
  for (let i = 0; i < plan.entries.length; i++) {
    const e = plan.entries[i];
    const prior = byUrl.get(e.url);
    let id: number;
    if (prior) {
      id = prior.id;
      await pool.query('UPDATE catalog_media SET sort_order = ?, alt = ? WHERE id = ?', [i, e.alt, id]);
    } else {
      id = await addItemMedia({ item_id: itemId, kind: e.kind, url: e.url, alt: e.alt || undefined, sort_order: i });
    }
    if (e.url === plan.primaryUrl) primaryId = id;
  }
  // Stored URLs may differ in form from the normalised ones, so the primary is set by row id.
  await pool.query('UPDATE catalog_media SET is_primary = (id = ?) WHERE item_id = ?', [primaryId ?? 0, itemId]);
}

export async function applyCatalogImport(
  workbook: ParsedWorkbook,
  options: TransferOptions,
  session: SessionMediaMap
): Promise<{ plan: TransferPlan; results: ResultRow[] }> {
  const { plan, work, snapshot, mediaUpdates } = await planCatalogImport(workbook, options, session);

  for (const u of mediaUpdates) {
    await upsertMediaMetadata({ path: u.path, original_name: u.original_name, alt: u.alt, tags: u.tags }).catch((err) =>
      console.error('[catalog-transfer] media metadata', u.path, err)
    );
  }

  const categoryIds = new Map<string, number>();
  const ensureCategory = async (type: CatalogItemType, name: string) => {
    const key = `${type}:${name.toLowerCase()}`;
    const known = categoryIds.get(key) ?? snapshot.categories.find((c) => c.type === type && c.name.toLowerCase() === name.toLowerCase())?.id;
    if (known) return known;
    const slugBase = slugify(name) || 'category';
    let slug = slugBase;
    for (let n = 2; snapshot.categories.some((c) => c.type === type && c.slug === slug); n++) slug = `${slugBase}-${n}`;
    const sort = snapshot.categories.filter((c) => c.type === type).length;
    const [res] = await pool.query<ResultSetHeader>(
      'INSERT INTO catalog_categories (item_type, name, slug, sort_order, enabled) VALUES (?, ?, ?, ?, 1)',
      [type, name.slice(0, 120), slug, sort]
    );
    snapshot.categories.push({ id: res.insertId, type, name, slug });
    categoryIds.set(key, res.insertId);
    return res.insertId;
  };

  const results: ResultRow[] = [];
  for (const w of work) {
    const result: ResultRow = {
      key: w.key,
      sheet: w.sheet,
      row: w.row,
      type: w.type,
      title: w.title,
      status: 'skipped',
      itemId: w.itemId,
      url: w.url,
      message: w.reason || '',
      changes: w.changes.length,
      seo: w.seo?.score ?? null,
    };
    results.push(result);
    try {
      if (w.action === 'error') {
        result.status = 'failed';
        result.message = w.issues.filter((i) => i.level === 'error').map((i) => i.message).join(' ');
        continue;
      }
      if (w.action === 'skip') continue;
      if (w.action === 'unchanged') {
        result.status = 'unchanged';
        continue;
      }
      if (w.action === 'delete' && w.existing) {
        const from = catalogPublicPath(w.type, w.existing.slug);
        const wasLive = w.existing.status === 'published' && w.existing.enabled;
        await deleteCatalogItem(w.existing.id);
        if (wasLive && options.redirects) await redirectMovedPath(from, catalogListingPath(w.type));
        result.status = 'deleted';
        result.message = wasLive && options.redirects ? `Redirects to ${catalogListingPath(w.type)}` : '';
        continue;
      }

      const patch = { ...w.patch };
      if (w.newCategory) patch.category_id = await ensureCategory(w.type, w.newCategory);

      if (w.action === 'create') {
        const created = await createCatalogItem({
          item_type: w.type,
          title: patch.title || w.title,
          slug: patch.slug || w.slug,
          summary: patch.summary,
          description: patch.description,
          category_id: patch.category_id ?? null,
          tags_json: patch.tags_json,
          specs_json: patch.specs_json,
          price_label: patch.price_label ?? null,
          availability_label: patch.availability_label ?? null,
          lead_time_label: patch.lead_time_label ?? null,
          background_image_url: patch.background_image_url ?? null,
          status: patch.status,
          featured: patch.featured,
          enabled: patch.enabled,
          sort_order: patch.sort_order,
          case_study_json: patch.case_study_json ?? null,
          cta_config_json: patch.cta_config_json ?? null,
          meta_title: patch.meta_title ?? null,
          meta_description: patch.meta_description ?? null,
          og_image_url: patch.og_image_url ?? null,
          seo_noindex: patch.seo_noindex,
        });
        if (!created) throw new Error('Item was not created');
        result.itemId = created.id;
        result.url = catalogPublicPath(w.type, created.slug);
        if (w.mediaPlan) await applyMedia(created.id, [], w.mediaPlan);
        if (created.status === 'published') await clearRedirectFrom(result.url);
        result.status = 'created';
        continue;
      }

      if (!w.existing) continue;
      const updated = Object.keys(patch).length ? await updateCatalogItem(w.existing.id, patch) : null;
      if (w.mediaPlan) await applyMedia(w.existing.id, w.existing.media, w.mediaPlan);
      const after = updated ?? w.existing;
      result.url = catalogPublicPath(w.type, after.slug);
      if (updated && patch.slug && options.redirects) {
        const moved = await keepOldAddress(
          { slug: w.existing.slug, status: w.existing.status, enabled: w.existing.enabled ? 1 : 0, item_type: w.type },
          { slug: updated.slug, status: updated.status, enabled: updated.enabled, item_type: w.type },
          (i) => catalogPublicPath(i.item_type, i.slug)
        );
        if (moved) result.message = `301 from ${moved.from}`;
      }
      if (after.status === 'published') await clearRedirectFrom(result.url);
      result.status = w.action === 'archive' ? 'archived' : 'updated';
    } catch (err) {
      console.error('[catalog-transfer] row', w.key, err);
      result.status = 'failed';
      result.message = err instanceof Error ? err.message : 'Unexpected error';
    }
  }
  return { plan, results };
}

/* ================================================================ export / template */

function yesNo(v: boolean) {
  return v ? 'Yes' : 'No';
}

function itemRow(item: DbItem, type: CatalogItemType, categories: DbCategory[], index: MediaIndex): Partial<Record<TransferField, string>> {
  const primary = item.media.find((m) => m.is_primary && m.kind !== 'video') || item.media.find((m) => m.kind !== 'video');
  const cs = item.case_study_json || {};
  return {
    id: String(item.id),
    title: item.title,
    slug: item.slug,
    category: categories.find((c) => c.id === item.category_id)?.name || '',
    status: item.status === 'published' ? 'Published' : 'Draft',
    enabled: yesNo(item.enabled),
    featured: yesNo(item.featured),
    sort_order: String(item.sort_order),
    summary: item.summary || '',
    description: item.description || '',
    tags: item.tags_json.join(', '),
    specs: Object.entries(item.specs_json).map(([k, v]) => `${k}: ${v}`).join('\n'),
    price_label: item.price_label || '',
    availability_label: item.availability_label || '',
    lead_time_label: item.lead_time_label || '',
    brochure: getBrochureUrl(item) || '',
    primary_image: primary ? index.exportName(primary.url) : '',
    primary_alt: primary?.alt || '',
    gallery: item.media.filter((m) => m !== primary).map((m) => index.exportName(m.url)).join('\n'),
    background_image: item.background_image_url ? index.exportName(item.background_image_url) : '',
    meta_title: item.meta_title || '',
    meta_description: item.meta_description || '',
    og_image: item.og_image_url ? index.exportName(item.og_image_url) : '',
    seo_noindex: yesNo(item.seo_noindex),
    cs_client_name: cs.client_name || '',
    cs_client_sector: cs.client_sector || '',
    cs_location: cs.location || '',
    cs_delivery_year: cs.delivery_year || '',
    cs_challenge: cs.challenge || '',
    cs_solution: cs.solution || '',
    cs_scope: cs.scope || '',
    cs_outcomes: (cs.outcomes || []).join('\n'),
    cs_technologies: (cs.technologies || []).join(', '),
    cs_quote: cs.testimonial?.quote || '',
    cs_quote_author: cs.testimonial?.author || '',
    cs_quote_role: cs.testimonial?.role || '',
    cs_video_url: cs.video_url ? (cs.video_url.startsWith('/assets/') ? index.exportName(cs.video_url) : cs.video_url) : '',
    cs_video_title: cs.video_title || '',
    cs_oem_badges: (cs.oem_badges || []).join(', '),
    cs_before_image: cs.before_image_url ? index.exportName(toStorageMediaPath(cs.before_image_url)) : '',
    cs_after_image: cs.after_image_url ? index.exportName(toStorageMediaPath(cs.after_image_url)) : '',
    cs_pdf_url: cs.case_study_pdf_url || '',
    version: item.updated_at ? item.updated_at.toISOString() : '',
  };
}

const EXAMPLES: Record<CatalogItemType, Partial<Record<TransferField, string>>> = {
  product: {
    action: 'Example',
    title: 'Modular UPS 30–120 kVA',
    slug: 'modular-ups-30-120-kva',
    category: 'Power protection',
    status: 'Draft',
    enabled: 'Yes',
    featured: 'No',
    sort_order: '10',
    summary: 'Hot-swappable modular UPS for data centres: 96% online efficiency, N+1 redundancy and zero-downtime maintenance.',
    description:
      'Scale protection in 30 kVA steps without downtime. Each power module is hot-swappable, with a centralised bypass, lithium-ion ready battery management and remote monitoring over SNMP. Ideal for Tier III data centres, hospitals and BFSI branches that cannot afford a single second of interruption.',
    tags: 'UPS, Data centre, Modular',
    specs: 'Capacity: 30–120 kVA\nEfficiency: 96% online\nRedundancy: N+1',
    price_label: 'On request',
    availability_label: 'Made to order',
    lead_time_label: '3–4 weeks',
    primary_image: 'Modular UPS Front.jpg',
    primary_alt: 'Front view of a modular 120 kVA UPS cabinet with four power modules',
    gallery: 'Modular UPS Side.jpg\nModular UPS Install.mp4',
    meta_title: 'Modular UPS 30–120 kVA for Data Centres',
    meta_description: 'Hot-swappable modular UPS from 30 to 120 kVA with 96% efficiency and N+1 redundancy. Zero-downtime maintenance for data centres. Get a quote.',
    seo_noindex: 'No',
  },
  service: {
    action: 'Example',
    title: 'Annual Maintenance Contract (AMC) for UPS',
    category: 'Maintenance',
    status: 'Draft',
    enabled: 'Yes',
    summary: 'Preventive and breakdown maintenance for UPS and battery banks with 4-hour on-site response across India.',
    primary_image: 'AMC Engineer On Site.jpg',
    tags: 'AMC, UPS, Service',
  },
  project: {
    action: 'Example',
    title: '2 MW Data Centre Power Upgrade — Pune',
    category: 'Data centres',
    status: 'Draft',
    enabled: 'Yes',
    summary: 'Zero-downtime migration of a live Tier III data centre to modular UPS and lithium-ion storage.',
    primary_image: 'Pune DC Power Room.jpg',
    cs_client_name: 'Leading colocation provider',
    cs_client_sector: 'Data centre',
    cs_location: 'Pune',
    cs_delivery_year: '2025',
    cs_outcomes: '40% lower cooling load\nZero downtime during cut-over',
  },
};

function promptFor(hint: string, seoTip?: string) {
  const text = seoTip ? `${hint} SEO: ${seoTip}` : hint;
  return text.length > 255 ? `${text.slice(0, 252)}…` : text;
}

export async function buildCatalogWorkbook(input: {
  types: CatalogItemType[];
  withData: boolean;
  examples: boolean;
  /** Only these items (e.g. rows ticked in Inventory). */
  ids?: number[];
  companyName: string;
  actor: string;
}): Promise<{ buffer: Buffer; counts: Record<CatalogItemType, number>; fileName: string }> {
  const snapshot = await loadSnapshot();
  const { media: index } = snapshot;
  const only = input.ids?.length ? new Set(input.ids) : null;
  const counts = { product: 0, service: 0, project: 0 } as Record<CatalogItemType, number>;
  const used = new Map<string, string[]>();

  const listsColumns: XlsxColumn[] = [
    { header: 'Status', width: 14 },
    { header: 'Yes / No', width: 10 },
    { header: 'Action', width: 12 },
    ...CATALOG_TYPES.map((t) => ({ header: `${SHEET_NAME[t]} categories`, width: 28 })),
  ];
  const catLists = CATALOG_TYPES.map((t) => snapshot.categories.filter((c) => c.type === t).map((c) => c.name));
  const listsHeight = Math.max(STATUS_OPTIONS.length, YES_NO.length, TRANSFER_ACTIONS.length, ...catLists.map((l) => l.length), 1);
  const listsRows: XlsxCell[][] = Array.from({ length: listsHeight }, (_, i) => [
    STATUS_OPTIONS[i] ?? null,
    YES_NO[i] ?? null,
    TRANSFER_ACTIONS[i] ?? null,
    ...catLists.map((l) => l[i] ?? null),
  ]);
  const listRef = (col: number, n: number) => ({ ref: `${LISTS_SHEET}!$${String.fromCharCode(65 + col)}$2:$${String.fromCharCode(65 + col)}$${Math.max(2, n + 1)}` });

  const typeSheets: XlsxSheet[] = input.types.map((type) => {
    const cols = columnsForType(type);
    const catIndex = CATALOG_TYPES.indexOf(type);
    const columns: XlsxColumn[] = cols.map((c) => ({
      header: c.required ? `${c.header} *` : c.header,
      width: c.width,
      kind: c.wrap ? 'wrap' : 'text',
      hidden: c.hidden,
      muted: c.group === 'system' && c.field !== 'action',
      tone: c.required ? 'required' : c.group === 'system' ? 'system' : c.group === 'seo' ? 'seo' : c.group === 'media' ? 'media' : c.group === 'case' ? 'case' : undefined,
      prompt: { title: c.header.slice(0, 32), text: promptFor(c.hint, c.seoTip) },
      list:
        c.list === 'status'
          ? listRef(0, STATUS_OPTIONS.length)
          : c.list === 'yesno'
            ? listRef(1, YES_NO.length)
            : c.list === 'action'
              ? listRef(2, TRANSFER_ACTIONS.length)
              : c.list === 'category'
                ? listRef(3 + catIndex, catLists[catIndex].length)
                : undefined,
      listStrict: c.list === 'status' || c.list === 'yesno' || c.list === 'action',
      lengthRange: c.lengthRange,
    }));
    const items = input.withData ? snapshot.items.filter((i) => i.type === type && (!only || only.has(i.id))) : [];
    counts[type] = items.length;
    for (const item of items) {
      for (const m of item.media) used.set(m.url, [...(used.get(m.url) || []), `${CATALOG_TYPE_LABEL[type]}: ${item.title}`]);
      for (const u of [item.background_image_url, item.og_image_url]) if (u) used.set(u, [...(used.get(u) || []), `${CATALOG_TYPE_LABEL[type]}: ${item.title}`]);
    }
    const rows: XlsxCell[][] = items.map((item) => {
      const values = itemRow(item, type, snapshot.categories, index);
      return cols.map((c) => values[c.field] ?? '');
    });
    // Sample rows only on empty sheets, so nobody types real data into an ignored row.
    if (input.examples && !rows.length) rows.push(cols.map((c) => ({ value: EXAMPLES[type][c.field] ?? '', style: 'muted' as const })));
    return { name: SHEET_NAME[type], columns, rows, freezeCols: 3, tabColor: '#FF6B1A', templateRows: Math.max(1000, rows.length + 500) };
  });

  const origin = siteOrigin();
  const mediaRows: XlsxCell[][] = [...used.entries()].map(([url, uses]) => {
    const asset = index.byPath.get(url);
    return [
      index.exportName(url) === url ? asset?.original_name || baseName(url) : index.exportName(url),
      url,
      asset?.alt || '',
      (asset?.tags || []).join(', '),
      Array.from(new Set(uses)).join('; '),
      asset?.size ? `${Math.max(1, Math.round(asset.size / 1024))} KB` : '',
      { value: 'Open', link: `${origin}${url}` },
    ];
  });
  if (input.examples && !mediaRows.length) {
    mediaRows.push([
      { value: 'Modular UPS Front.jpg', style: 'muted' },
      { value: '(filled in after upload)', style: 'muted' },
      { value: 'Front view of a modular 120 kVA UPS cabinet with four power modules', style: 'muted' },
      { value: 'UPS, Product shots', style: 'muted' },
      null,
      null,
      null,
    ]);
  }
  const mediaSheet: XlsxSheet = {
    name: MEDIA_SHEET,
    columns: MEDIA_COLUMNS.map((c) => ({
      header: c.header,
      width: c.width,
      muted: c.system,
      tone: c.system ? 'system' : c.field === 'file_name' ? 'media' : c.field === 'alt' ? 'seo' : undefined,
      prompt: { title: c.header, text: c.hint },
      kind: c.field === 'alt' ? 'wrap' : 'text',
      lengthRange: c.field === 'alt' ? [5, ALT_TEXT_MAX] : undefined,
    })),
    rows: mediaRows,
    tabColor: '#4338CA',
    templateRows: Math.max(500, mediaRows.length + 300),
  };

  const generated = new Date();
  const readme: XlsxSheet = {
    name: README_SHEET,
    table: false,
    columns: [
      { header: '', width: 30 },
      { header: '', width: 110, kind: 'wrap' },
    ],
    rows: readmeRows(input, generated),
  };

  const lists: XlsxSheet = { name: LISTS_SHEET, columns: listsColumns, rows: listsRows, hidden: true };
  const buffer = buildXlsx([readme, ...typeSheets, mediaSheet, lists], { title: `${input.companyName} catalog data`, creator: input.actor });
  const stamp = generated.toISOString().slice(0, 10);
  const scope = input.types.length === 3 ? 'catalog' : input.types.map((t) => SHEET_NAME[t].toLowerCase()).join('-');
  const kind = !input.withData ? 'template' : only ? `${Object.values(counts).reduce((a, b) => a + b, 0)}-selected` : 'data';
  const fileName = `${slugify(input.companyName) || 'site'}_${scope}_${kind}_${stamp}.xlsx`;
  return { buffer, counts, fileName };
}

function readmeRows(input: { types: CatalogItemType[]; withData: boolean; companyName: string; actor: string }, generated: Date): XlsxCell[][] {
  const section = (text: string): XlsxCell[] => [{ value: text, style: 'section' }];
  const rows: XlsxCell[][] = [
    [{ value: `${input.companyName} · Catalog data workbook`, style: 'title' }],
    [
      { value: `Generated ${generated.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} by ${input.actor.replace(/\s*<.*>$/, '')}`, style: 'muted' },
      { value: `${input.withData ? 'Contains the current catalog — edit in place.' : 'Blank template.'} Sheets: ${input.types.map((t) => SHEET_NAME[t]).join(', ')}, Media.`, style: 'muted' },
    ],
    [],
    section('How it works'),
    ['1 · Fill the sheets', 'One row per product, service or project. Keep the header row. Hover a header cell or select a cell to see what to enter. Orange headers are required for new rows.'],
    ['2 · Collect the media', 'Put every image or video you mention in one folder. Type the file names exactly as they are on your computer (e.g. “UPS Front View.jpg”) — no need to rename anything.'],
    ['3 · Upload', 'Admin → Inventory → Excel import / export. Drop this workbook and the media folder together.'],
    ['Tip', 'You can delete columns you are not changing — e.g. keep only ID, Title and Price / key stat to update prices. Missing columns are left as they are.'],
    ['4 · Review', 'Nothing changes until you publish. The review shows every new item, every changed field (before → after), missing files and an SEO score per row.'],
    ['5 · Publish', 'Rows with errors are skipped and listed in a downloadable report you can send back for fixing.'],
    [],
    section('Updating existing items'),
    ['Keep the ID', 'Rows with an ID update that item. Without an ID, rows are matched by URL slug, then by exact title; anything else becomes a new item.'],
    ['Blank cells', 'By default a blank cell leaves the current value as it is. Type #clear to empty a field on purpose.'],
    ['Gallery', 'With “Sync” (default) the Primary image + Gallery media columns are the full gallery: files you remove from the cell are detached, order is kept.'],
    ['Action column', 'Skip = ignore the row · Archive = unpublish and hide · Delete = remove (only if allowed at import) · Example = sample row, always ignored.'],
    [],
    section('Colour code'),
    ['Orange header', 'Required for new rows.'],
    ['Indigo header', 'Media — file names of images and videos.'],
    ['Teal header', 'SEO — what Google and social networks show. Cells turn amber when the length is outside the ideal range.'],
    ['Purple header', 'Case study details (projects and services).'],
    ['Grey header', 'System — do not edit (ID, version).'],
    [],
    section('Media files'),
    ['Accepted', 'JPG, PNG, WebP, GIF, SVG, MP4, WebM.'],
    ['Names', 'Use the real file name, with its extension. Matching ignores upper/lower case. Files are stored under a clean web name automatically (“UPS Front View.JPG” → ups-front-view.jpg) and the original name is remembered.'],
    ['Same file twice', 'Uploading a file that is already in the library re-uses it — no duplicates.'],
    ['Media sheet', 'Lists every file in use. Give existing files a friendly File name and alt text here; item sheets can then refer to that name.'],
    [],
    section('SEO checklist'),
    ['Title', 'What buyers search for first, then a differentiator. Unique per item.'],
    ['URL slug', 'Short, lowercase, hyphenated, keyword-first, under 75 characters. Changing it on a live page adds a 301 redirect automatically.'],
    ['SEO title', '30–60 characters; the brand is appended automatically. Blank = Title.'],
    ['SEO description', '120–160 characters: benefit + proof + call to action. Blank = Card summary.'],
    ['Full description', 'At least 300 characters of original copy — thin or copied text ranks poorly.'],
    ['Alt text', 'Describe each image in plain words, under 125 characters. Blank alt text is generated from the title.'],
    ['Images', 'Prefer WebP under ~300 KB; 1200×630 for the social share image.'],
    ['Category & tags', 'Every item should have a category; tags power filters and internal links.'],
    [],
    section('Column guide'),
    ...TRANSFER_COLUMNS.filter((c) => !c.hidden).map((c) => [
      { value: `${c.header}${c.required ? ' *' : ''}`, bold: true },
      `${c.hint}${c.example ? `  Example: ${c.example.replace(/\n/g, ' / ')}` : ''}${c.seoTip ? `  SEO: ${c.seoTip}` : ''}`,
    ]),
  ];
  return rows;
}

/* ================================================================ jobs */

let jobsReady: Promise<void> | null = null;
function ensureJobsTable() {
  if (!jobsReady) {
    jobsReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS catalog_transfer_jobs (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          kind VARCHAR(12) NOT NULL DEFAULT 'import',
          actor VARCHAR(255) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          status VARCHAR(16) NOT NULL DEFAULT 'analysed',
          workbook_json LONGTEXT NULL,
          options_json JSON NULL,
          summary_json JSON NULL,
          report_json LONGTEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          committed_at TIMESTAMP NULL,
          INDEX idx_catalog_transfer_created (created_at)
        ) ENGINE=InnoDB`
      )
      .then(() => undefined)
      .catch((err) => {
        jobsReady = null;
        throw err;
      });
  }
  return jobsReady;
}

export type TransferJob = {
  id: number;
  kind: 'import' | 'export';
  actor: string;
  file_name: string;
  status: 'analysed' | 'committing' | 'committed' | 'exported';
  summary: Record<string, unknown> | null;
  created_at: string;
  committed_at: string | null;
};

export async function createImportJob(actor: string, workbook: ParsedWorkbook) {
  await ensureJobsTable();
  const [res] = await pool.query<ResultSetHeader>(
    'INSERT INTO catalog_transfer_jobs (kind, actor, file_name, status, workbook_json) VALUES (?, ?, ?, ?, ?)',
    ['import', actor.slice(0, 255), workbook.fileName.slice(0, 255), 'analysed', JSON.stringify(workbook)]
  );
  return res.insertId;
}

export async function loadImportJob(id: number): Promise<{ workbook: ParsedWorkbook; status: string; actor: string } | null> {
  await ensureJobsTable();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT workbook_json, status, actor FROM catalog_transfer_jobs WHERE id = ? AND kind = 'import' LIMIT 1", [id]);
  if (!rows[0]?.workbook_json) return null;
  return { workbook: JSON.parse(String(rows[0].workbook_json)) as ParsedWorkbook, status: String(rows[0].status), actor: String(rows[0].actor) };
}

export async function saveJobAnalysis(id: number, options: TransferOptions, plan: TransferPlan) {
  await pool.query("UPDATE catalog_transfer_jobs SET options_json = ?, summary_json = ?, report_json = ? WHERE id = ? AND status = 'analysed'", [
    JSON.stringify(options),
    JSON.stringify(plan.summary),
    JSON.stringify({ phase: 'analysis', rows: plan.rows }),
    id,
  ]);
}

/** Marks the job committed; false when another request already committed it. */
export async function claimJobCommit(id: number, options: TransferOptions) {
  const [res] = await pool.query<ResultSetHeader>(
    "UPDATE catalog_transfer_jobs SET status = 'committing', options_json = ? WHERE id = ? AND status = 'analysed'",
    [JSON.stringify(options), id]
  );
  return res.affectedRows === 1;
}

export async function finishJobCommit(id: number, plan: TransferPlan, results: ResultRow[]) {
  const tally = results.reduce<Record<string, number>>((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {});
  await pool.query("UPDATE catalog_transfer_jobs SET status = 'committed', committed_at = NOW(), summary_json = ?, report_json = ? WHERE id = ?", [
    JSON.stringify({ ...plan.summary, results: tally }),
    JSON.stringify({ phase: 'results', rows: plan.rows, results }),
    id,
  ]);
  return tally;
}

export async function releaseJobCommit(id: number) {
  await pool.query("UPDATE catalog_transfer_jobs SET status = 'analysed' WHERE id = ? AND status = 'committing'", [id]);
}

export async function logExportJob(actor: string, fileName: string, summary: Record<string, unknown>) {
  await ensureJobsTable();
  await pool.query('INSERT INTO catalog_transfer_jobs (kind, actor, file_name, status, summary_json) VALUES (?, ?, ?, ?, ?)', [
    'export',
    actor.slice(0, 255),
    fileName.slice(0, 255),
    'exported',
    JSON.stringify(summary),
  ]);
}

export async function listTransferJobs(limit = 12): Promise<TransferJob[]> {
  await ensureJobsTable();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, kind, actor, file_name, status, summary_json, created_at, committed_at
     FROM catalog_transfer_jobs ORDER BY id DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    kind: r.kind,
    actor: String(r.actor),
    file_name: String(r.file_name),
    status: r.status,
    summary: parseJsonField<Record<string, unknown> | null>(r.summary_json, null),
    created_at: new Date(r.created_at).toISOString(),
    committed_at: r.committed_at ? new Date(r.committed_at).toISOString() : null,
  }));
}

/* ================================================================ report */

const ACTION_LABEL: Record<RowAction, string> = {
  create: 'Will create',
  update: 'Will update',
  unchanged: 'No change',
  skip: 'Skipped',
  archive: 'Will archive',
  delete: 'Will delete',
  error: 'Needs fixing',
};
const RESULT_LABEL: Record<ResultRow['status'], string> = {
  created: 'Created',
  updated: 'Updated',
  unchanged: 'No change',
  archived: 'Archived',
  deleted: 'Deleted',
  skipped: 'Skipped',
  failed: 'Failed',
};

export async function buildJobReport(id: number): Promise<{ buffer: Buffer; fileName: string } | null> {
  await ensureJobsTable();
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM catalog_transfer_jobs WHERE id = ? LIMIT 1', [id]);
  const job = rows[0];
  if (!job?.report_json) return null;
  const report = JSON.parse(String(job.report_json)) as { phase: 'analysis' | 'results'; rows: PlannedRow[]; results?: ResultRow[] };
  const results = new Map((report.results || []).map((r) => [r.key, r]));
  const origin = siteOrigin();

  const sheet: XlsxSheet = {
    name: report.phase === 'results' ? 'Results' : 'Review',
    freezeCols: 3,
    columns: [
      { header: 'Sheet', width: 12 },
      { header: 'Row', width: 7, kind: 'number' },
      { header: 'Title', width: 36 },
      { header: report.phase === 'results' ? 'Result' : 'Outcome', width: 14 },
      { header: 'Item ID', width: 9, kind: 'number' },
      { header: 'Page', width: 40 },
      { header: 'Changes', width: 50, kind: 'wrap' },
      { header: 'Errors', width: 50, kind: 'wrap' },
      { header: 'Warnings', width: 50, kind: 'wrap' },
      { header: 'SEO score', width: 10, kind: 'number' },
      { header: 'SEO to improve', width: 50, kind: 'wrap' },
    ],
    rows: report.rows.map((r) => {
      const res = results.get(r.key);
      const url = res?.url || r.url;
      return [
        r.sheet,
        r.row,
        r.title || '(untitled)',
        { value: res ? RESULT_LABEL[res.status] : ACTION_LABEL[r.action], bold: true },
        res?.itemId ?? r.itemId ?? null,
        url ? { value: url, link: `${origin}${url}` } : '',
        r.changes.map((c) => `${c.label}: ${c.before} → ${c.after}${c.auto ? ' (auto)' : ''}`).join('\n'),
        [...r.issues.filter((i) => i.level === 'error').map((i) => i.message), ...(res?.status === 'failed' && res.message ? [res.message] : [])].join('\n'),
        r.issues.filter((i) => i.level === 'warning').map((i) => i.message).join('\n'),
        r.seo?.score ?? null,
        (r.seo?.checks || []).filter((c) => c.state !== 'pass').map((c) => `${c.label} — ${c.tip || ''}`).join('\n'),
      ];
    }),
  };
  const buffer = buildXlsx([sheet], { title: `Catalog import ${report.phase} #${id}`, creator: String(job.actor) });
  const stamp = new Date(job.created_at).toISOString().slice(0, 10);
  return { buffer, fileName: `catalog-import-${report.phase === 'results' ? 'results' : 'review'}-${id}_${stamp}.xlsx` };
}

export function catalogTypesFrom(raw: string | null | undefined): CatalogItemType[] {
  const list = String(raw || '')
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is CatalogItemType => (CATALOG_TYPES as string[]).includes(t));
  return list.length ? CATALOG_TYPES.filter((t) => list.includes(t)) : CATALOG_TYPES;
}

