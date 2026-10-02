import crypto from 'crypto';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { humanizeKey } from '@/lib/mail-template';
import { locateResumeFile } from '@/lib/resumes';
import { parseJsonField, type Enquiry } from '@/lib/types';
import { buildXlsx, type XlsxCell, type XlsxColumn } from '@/lib/xlsx-writer';
import type { ZipEntry } from '@/lib/zip-stream';

/* ---------------------------------------------------------------- model */

export const EXPORT_TYPES = ['enquiry', 'careers', 'callback', 'brochure'] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];
export type ExportFormat = 'zip' | 'xlsx' | 'csv' | 'json';

export const EXPORT_TYPE_LABEL: Record<ExportType, string> = {
  enquiry: 'Enquiry',
  careers: 'Job application',
  callback: 'Callback request',
  brochure: 'Brochure request',
};

export type ExportFilters = {
  status?: 'all' | Enquiry['status'];
  type?: 'all' | ExportType;
  q?: string;
  from?: string;
  to?: string;
  ids?: number[];
  /** Only enquiries received after this instant (resolved from the last completed export). */
  since?: Date | null;
};

export type ExportAttachment = {
  field: string;
  stored: string;
  name: string;
  mime: string;
  zipPath: string;
  absolute: string | null;
  size: number;
};

export type ExportRecord = {
  id: number;
  receivedAt: Date;
  status: Enquiry['status'];
  type: ExportType;
  typeLabel: string;
  itemType: string;
  itemTitle: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  message: string;
  notes: string;
  /** Every visible submitted field, in submission order. */
  fields: Array<[string, string]>;
  folder: string;
  attachments: ExportAttachment[];
};

export const EXPORT_MAX_ROWS = 10_000;
const TIME_ZONE = 'Asia/Kolkata';
const HIDDEN_KEYS = new Set(['_hp', 'turnstileToken', 'form_id', 'item_id', 'resume_url', 'source']);
const CORE_KEYS = new Set(['name', 'full_name', 'email', 'phone', 'tel', 'mobile', 'company', 'subject', 'role', 'message']);

export function enquiryType(payload: Record<string, unknown>): ExportType {
  switch (String(payload.source || '')) {
    case 'careers_apply':
      return 'careers';
    case 'callback_request':
      return 'callback';
    case 'brochure_download':
      return 'brochure';
    default:
      return 'enquiry';
  }
}

const str = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)).trim();

function slug(value: string, max = 40) {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max) || ''
  );
}

function safeFileName(name: string, fallbackExt: string) {
  let clean = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!clean || clean === '.' || clean === '..') clean = 'attachment';
  if (!path.extname(clean) && fallbackExt) clean += fallbackExt;
  return clean;
}

/** `*_file` (+ `*_name`, `*_mime`) pairs, plus legacy `resume_url`. */
export function attachmentRefs(payload: Record<string, unknown>) {
  const refs: Array<{ field: string; stored: string; name: string; mime: string }> = [];
  for (const [key, value] of Object.entries(payload)) {
    const m = key.match(/^(.+)_file$/);
    if (!m || typeof value !== 'string' || !value.trim()) continue;
    refs.push({
      field: m[1],
      stored: value,
      name: str(payload[`${m[1]}_name`]) || path.basename(value),
      mime: str(payload[`${m[1]}_mime`]) || 'application/octet-stream',
    });
  }
  if (!refs.some((r) => r.field === 'resume') && typeof payload.resume_url === 'string' && payload.resume_url) {
    refs.push({ field: 'resume', stored: payload.resume_url, name: str(payload.resume_name) || path.basename(payload.resume_url), mime: str(payload.resume_mime) });
  }
  return refs;
}

function visibleFields(payload: Record<string, unknown>) {
  const fileBases = new Set(attachmentRefs(payload).map((r) => r.field));
  return Object.entries(payload)
    .filter(([key, value]) => {
      if (HIDDEN_KEYS.has(key)) return false;
      const base = key.replace(/_(file|name|mime)$/, '');
      if (base !== key && fileBases.has(base)) return false;
      return str(value) !== '';
    })
    .map(([key, value]) => [key, str(value)] as [string, string]);
}

/* ---------------------------------------------------------------- query */

let notesColumn: Promise<boolean> | null = null;
function hasNotesColumn() {
  notesColumn ??= pool
    .query<RowDataPacket[]>(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'enquiries' AND COLUMN_NAME = 'admin_notes' LIMIT 1"
    )
    .then(([rows]) => rows.length > 0)
    .catch(() => {
      notesColumn = null;
      return false;
    });
  return notesColumn;
}

function whereClause(filters: ExportFilters, withNotes: boolean) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.ids?.length) {
    where.push('e.id IN (?)');
    params.push(filters.ids.slice(0, EXPORT_MAX_ROWS));
  }
  if (filters.status && filters.status !== 'all') {
    where.push('e.status = ?');
    params.push(filters.status);
  }
  if (filters.type && filters.type !== 'all') {
    const source = "JSON_UNQUOTE(JSON_EXTRACT(e.payload_json, '$.source'))";
    if (filters.type === 'enquiry') {
      where.push(`(${source} IS NULL OR ${source} NOT IN ('careers_apply','callback_request','brochure_download'))`);
    } else {
      where.push(`${source} = ?`);
      params.push({ careers: 'careers_apply', callback: 'callback_request', brochure: 'brochure_download' }[filters.type]);
    }
  }
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
    where.push('e.created_at >= ?');
    params.push(`${filters.from} 00:00:00`);
  }
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
    where.push('e.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(`${filters.to} 00:00:00`);
  }
  if (filters.since) {
    where.push('e.created_at > ?');
    params.push(filters.since);
  }
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const notes = withNotes ? " OR LOWER(COALESCE(e.admin_notes, '')) LIKE ?" : '';
    where.push(`(LOWER(CAST(e.payload_json AS CHAR)) LIKE ?${notes} OR LOWER(COALESCE(i.title, '')) LIKE ?)`);
    params.push(...(withNotes ? [like, like, like] : [like, like]));
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export async function countEnquiries(filters: ExportFilters) {
  const { sql, params } = whereClause(filters, await hasNotesColumn());
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM enquiries e LEFT JOIN catalog_items i ON i.id = e.item_id ${sql}`,
    params
  );
  return Number(rows[0]?.c || 0);
}

export async function loadExportRecords(filters: ExportFilters, opts: { resolveFiles: boolean }): Promise<ExportRecord[]> {
  const withNotes = await hasNotesColumn();
  const { sql, params } = whereClause(filters, withNotes);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id, e.item_type, e.payload_json, e.status, ${withNotes ? 'e.admin_notes' : 'NULL AS admin_notes'}, e.created_at, i.title AS item_title
     FROM enquiries e
     LEFT JOIN catalog_items i ON i.id = e.item_id
     ${sql}
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT ${EXPORT_MAX_ROWS}`,
    params
  );

  const records: ExportRecord[] = [];
  for (const row of rows) {
    const payload = parseJsonField<Record<string, unknown>>(row.payload_json, {});
    const type = enquiryType(payload);
    const name = str(payload.name) || str(payload.full_name);
    const folder = `attachments/${String(row.id).padStart(5, '0')}_${slug(name) || 'enquiry'}`;
    const attachments: ExportAttachment[] = [];
    for (const ref of attachmentRefs(payload)) {
      const fileName = safeFileName(ref.name, path.extname(ref.stored));
      const att: ExportAttachment = { ...ref, zipPath: `${folder}/${fileName}`, absolute: null, size: 0 };
      if (opts.resolveFiles) {
        att.absolute = await locateResumeFile(ref.stored);
        if (att.absolute) att.size = (await stat(att.absolute).catch(() => null))?.size ?? 0;
      }
      attachments.push(att);
    }
    records.push({
      id: Number(row.id),
      receivedAt: new Date(row.created_at),
      status: row.status,
      type,
      typeLabel: EXPORT_TYPE_LABEL[type],
      itemType: str(row.item_type) || 'general',
      itemTitle: str(row.item_title),
      name,
      email: str(payload.email),
      phone: str(payload.phone) || str(payload.tel) || str(payload.mobile),
      company: str(payload.company),
      subject: type === 'careers' ? str(payload.role) : str(payload.subject),
      message: str(payload.message),
      notes: str(row.admin_notes),
      fields: visibleFields(payload),
      folder,
      attachments,
    });
  }
  return records;
}

/* ---------------------------------------------------------------- audit */

let auditReady: Promise<void> | null = null;
function ensureAuditTable() {
  if (!auditReady) {
    auditReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS enquiry_exports (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          actor VARCHAR(255) NOT NULL,
          format VARCHAR(8) NOT NULL,
          scope_json JSON NULL,
          enquiry_count INT UNSIGNED NOT NULL DEFAULT 0,
          attachment_count INT UNSIGNED NOT NULL DEFAULT 0,
          bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
          status VARCHAR(12) NOT NULL DEFAULT 'started',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP NULL,
          INDEX idx_enquiry_exports_created (created_at)
        ) ENGINE=InnoDB`
      )
      .then(() => undefined)
      .catch((err) => {
        auditReady = null;
        throw err;
      });
  }
  return auditReady;
}

export type ExportHistoryRow = {
  id: number;
  actor: string;
  format: string;
  enquiry_count: number;
  attachment_count: number;
  bytes: number;
  status: string;
  created_at: string;
};

export async function startExportAudit(entry: { actor: string; format: ExportFormat; scope: unknown; enquiries: number; attachments: number }) {
  await ensureAuditTable();
  const [res] = await pool.query<ResultSetHeader>(
    'INSERT INTO enquiry_exports (actor, format, scope_json, enquiry_count, attachment_count) VALUES (?, ?, ?, ?, ?)',
    [entry.actor.slice(0, 255), entry.format, JSON.stringify(entry.scope ?? null), entry.enquiries, entry.attachments]
  );
  return res.insertId;
}

export async function finishExportAudit(id: number, status: 'completed' | 'failed', bytes: number) {
  await pool.query('UPDATE enquiry_exports SET status = ?, bytes = ?, completed_at = NOW() WHERE id = ?', [status, bytes, id]);
}

export async function exportHistory(limit = 8) {
  await ensureAuditTable();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, actor, format, enquiry_count, attachment_count, bytes, status, created_at
     FROM enquiry_exports ORDER BY id DESC LIMIT ?`,
    [limit]
  );
  return rows as ExportHistoryRow[];
}

export async function lastCompletedExportAt(): Promise<Date | null> {
  await ensureAuditTable();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT created_at FROM enquiry_exports WHERE status = 'completed' ORDER BY id DESC LIMIT 1"
  );
  return rows[0] ? new Date(rows[0].created_at) : null;
}

export async function markExportedAsInProgress(ids: number[]) {
  if (!ids.length) return 0;
  const [res] = await pool.query<ResultSetHeader>("UPDATE enquiries SET status = 'in_progress' WHERE status = 'new' AND id IN (?)", [ids]);
  return res.affectedRows;
}

/* ---------------------------------------------------------------- renderers */

export type ExportMeta = {
  companyName: string;
  actor: string;
  exportedAt: Date;
  scopeLabel: string;
  /** Attachments are bundled in the package (false for single-file formats). */
  includeAttachments: boolean;
};

function wall(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

function extraKeys(records: ExportRecord[]) {
  const keys: string[] = [];
  for (const r of records) for (const [k] of r.fields) if (!CORE_KEYS.has(k) && !keys.includes(k)) keys.push(k);
  return keys;
}

const STATUS_LABEL: Record<Enquiry['status'], string> = { new: 'New', in_progress: 'In progress', closed: 'Closed' };

function tableColumns(extras: string[]): XlsxColumn[] {
  return [
    { header: 'ID', width: 8, kind: 'number' },
    { header: 'Received (IST)', width: 18, kind: 'date' },
    { header: 'Status', width: 12 },
    { header: 'Type', width: 17 },
    { header: 'Catalog item', width: 24 },
    { header: 'Name', width: 22 },
    { header: 'Email', width: 28 },
    { header: 'Phone', width: 16 },
    { header: 'Company', width: 20 },
    { header: 'Subject / role', width: 30, kind: 'wrap' },
    { header: 'Message', width: 50, kind: 'wrap' },
    { header: 'Attachments', width: 34 },
    { header: 'Admin notes', width: 30, kind: 'wrap' },
    ...extras.map((k) => ({ header: humanizeKey(k), width: 20, kind: 'wrap' as const })),
  ];
}

function fieldValue(r: ExportRecord, key: string) {
  return r.fields.find(([k]) => k === key)?.[1] ?? '';
}

export function buildWorkbook(records: ExportRecord[], meta: ExportMeta, opts: { linkAttachments: boolean }) {
  const extras = extraKeys(records);
  const rows: XlsxCell[][] = records.map((r) => {
    const att = r.attachments.filter((a) => !opts.linkAttachments || a.absolute);
    const first = att[0];
    return [
      r.id,
      r.receivedAt,
      STATUS_LABEL[r.status] || r.status,
      r.typeLabel,
      r.itemTitle || (r.itemType !== 'general' ? r.itemType : ''),
      r.name,
      r.email ? { value: r.email, link: `mailto:${r.email}` } : '',
      r.phone,
      r.company,
      r.subject,
      r.message,
      first
        ? opts.linkAttachments
          ? { value: att.map((a) => a.name).join(', '), link: first.zipPath.split('/').map(encodeURIComponent).join('/') }
          : att.map((a) => a.name).join(', ')
        : '',
      r.notes,
      ...extras.map((k) => fieldValue(r, k)),
    ];
  });

  const count = <K extends string>(keyOf: (r: ExportRecord) => K) => {
    const m = new Map<K, number>();
    for (const r of records) m.set(keyOf(r), (m.get(keyOf(r)) || 0) + 1);
    return [...m.entries()];
  };
  const months = count((r) => wall(r.receivedAt).slice(0, 7)).sort((a, b) => b[0].localeCompare(a[0]));
  const summary: XlsxCell[][] = [
    [{ value: 'Generated', bold: true }, meta.exportedAt],
    [{ value: 'Generated by', bold: true }, meta.actor],
    [{ value: 'Scope', bold: true }, meta.scopeLabel],
    [{ value: 'Enquiries', bold: true }, records.length],
    [{ value: 'Attachments', bold: true }, records.reduce((n, r) => n + r.attachments.length, 0)],
    [],
    [{ value: 'By type', bold: true }],
    ...count((r) => r.typeLabel).map(([k, v]) => [k, v] as XlsxCell[]),
    [],
    [{ value: 'By status', bold: true }],
    ...count((r) => STATUS_LABEL[r.status] || r.status).map(([k, v]) => [k, v] as XlsxCell[]),
    [],
    [{ value: 'By month', bold: true }],
    ...months.map(([k, v]) => [k, v] as XlsxCell[]),
  ];

  return buildXlsx(
    [
      { name: 'Enquiries', columns: tableColumns(extras), rows },
      { name: 'Summary', columns: [{ header: `${meta.companyName} — enquiry export`, width: 28 }, { header: '', width: 40, kind: 'date' }], rows: summary, table: false },
    ],
    { title: `${meta.companyName} enquiries`, creator: meta.actor, timeZone: TIME_ZONE }
  );
}

/** Excel / Sheets treat cells starting with these as formulas — neutralise visitor input. */
function csvCell(value: unknown) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv(records: ExportRecord[]) {
  const extras = extraKeys(records);
  const header = tableColumns(extras).map((c) => c.header);
  const lines = [header.map(csvCell).join(',')];
  for (const r of records) {
    lines.push(
      [
        r.id,
        wall(r.receivedAt),
        STATUS_LABEL[r.status] || r.status,
        r.typeLabel,
        r.itemTitle,
        r.name,
        r.email,
        r.phone,
        r.company,
        r.subject,
        r.message,
        r.attachments.map((a) => a.zipPath).join(' | '),
        r.notes,
        ...extras.map((k) => fieldValue(r, k)),
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return Buffer.from(`\uFEFF${lines.join('\r\n')}\r\n`, 'utf8');
}

function jsonRecord(r: ExportRecord, included: boolean) {
  return {
    id: r.id,
    received_at: r.receivedAt.toISOString(),
    received_local: wall(r.receivedAt),
    status: r.status,
    type: r.type,
    type_label: r.typeLabel,
    item_type: r.itemType,
    item_title: r.itemTitle || null,
    contact: { name: r.name, email: r.email, phone: r.phone, company: r.company },
    subject: r.subject,
    message: r.message,
    fields: Object.fromEntries(r.fields),
    admin_notes: r.notes || null,
    attachments: r.attachments.map((a) => ({
      name: a.name,
      path: included ? a.zipPath : null,
      bytes: a.size,
      included: included && Boolean(a.absolute),
      missing_on_server: !a.absolute,
    })),
  };
}

export function buildJson(records: ExportRecord[], meta: ExportMeta) {
  return Buffer.from(
    JSON.stringify(
      {
        schema: 'zigma.enquiry-export/v1',
        company: meta.companyName,
        exported_at: meta.exportedAt.toISOString(),
        exported_by: meta.actor,
        scope: meta.scopeLabel,
        count: records.length,
        enquiries: records.map((r) => jsonRecord(r, meta.includeAttachments)),
      },
      null,
      2
    ),
    'utf8'
  );
}

function htmlEscape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Self-contained offline inbox: open index.html from the extracted folder, no internet needed. */
export function buildHtmlReport(records: ExportRecord[], meta: ExportMeta) {
  const data = records.map((r) => ({
    ...jsonRecord(r, meta.includeAttachments),
    attachments: r.attachments.map((a) => ({
      name: a.name,
      path: a.zipPath.split('/').map(encodeURIComponent).join('/'),
      bytes: a.size,
      state: !meta.includeAttachments ? 'excluded' : a.absolute ? 'ok' : 'missing',
    })),
    fields: r.fields.map(([k, v]) => [humanizeKey(k), v]),
  }));
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const title = `${meta.companyName} — enquiries`;
  return Buffer.from(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${htmlEscape(title)}</title>
<style>
:root{--navy:#0a1628;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--bg:#f1f5f9;--accent:#ff6b1a;--blue:#0078d4;--ok:#047857}
*{box-sizing:border-box}body{margin:0;font:14px/1.5 "Segoe UI",system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg)}
header{background:radial-gradient(120% 160% at 100% 0,rgba(0,120,212,.35),transparent 55%),linear-gradient(135deg,#0a1628,#13203b);color:#fff;padding:22px 28px;border-bottom:3px solid var(--accent)}
header small{display:block;color:#93c5fd;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:11px}
header h1{margin:4px 0 2px;font-size:22px}header p{margin:0;color:#cbd5e1;font-size:13px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;padding:16px 28px 0}
.kpi{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 14px}.kpi b{display:block;font-size:22px}.kpi span{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.bar{display:flex;gap:8px;flex-wrap:wrap;padding:14px 28px}
.bar input,.bar select{font:inherit;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:#fff}.bar input{flex:1;min-width:200px}
.bar button{font:inherit;padding:8px 14px;border-radius:10px;border:1px solid var(--line);background:#fff;cursor:pointer}
main{display:grid;grid-template-columns:minmax(280px,380px) 1fr;gap:14px;padding:0 28px 28px;align-items:start}
#list{display:flex;flex-direction:column;gap:6px;max-height:calc(100vh - 240px);overflow:auto}
.item{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer;text-align:left;font:inherit;color:inherit;width:100%}
.item:hover{border-color:var(--blue)}.item.on{border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,120,212,.15)}
.item .t{display:flex;justify-content:space-between;gap:8px}.item b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.item small{color:var(--muted)}
.chip{display:inline-block;font-size:11px;font-weight:700;padding:1px 8px;border-radius:999px;background:#e2e8f0;color:#334155;white-space:nowrap}
.chip.careers{background:#ede9fe;color:#5b21b6}.chip.callback{background:#dcfce7;color:#166534}.chip.brochure{background:#e0f2fe;color:#075985}
.chip.new{background:#ffedd5;color:#9a3412}.chip.closed{background:#e2e8f0;color:#475569}.chip.in_progress{background:#dbeafe;color:#1e40af}
#detail{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px 22px;min-height:300px;position:sticky;top:14px}
#detail h2{margin:0 0 4px;font-size:20px}.meta{color:var(--muted);font-size:13px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.actions a,.actions button{font:inherit;text-decoration:none;padding:8px 14px;border-radius:10px;border:1px solid var(--line);color:var(--ink);background:#fff;cursor:pointer}
.actions a.primary{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}
table{border-collapse:collapse;width:100%;margin-top:6px}td{border-bottom:1px solid var(--line);padding:8px 10px;vertical-align:top}td:first-child{color:var(--muted);width:30%;font-weight:600}
td{white-space:pre-wrap;word-break:break-word}.files a{display:flex;gap:10px;align-items:center;padding:9px 12px;border:1px solid var(--line);border-radius:10px;margin-top:6px;color:var(--blue);text-decoration:none;font-weight:600}
.files .miss{color:#b91c1c;font-size:13px;margin-top:6px}.notes{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;white-space:pre-wrap;margin-top:10px}
.empty{color:var(--muted);text-align:center;padding:40px}footer{color:var(--muted);font-size:12px;padding:0 28px 24px}
@media (max-width:820px){main{grid-template-columns:1fr}#list{max-height:none}#detail{position:static}}
@media print{header,.kpis,.bar,#list,.actions,footer{display:none!important}main{display:block;padding:0}#detail{border:0;position:static}body{background:#fff}}
</style></head><body>
<header><small>Enquiry export · offline copy</small><h1>${htmlEscape(meta.companyName)}</h1>
<p>${records.length} record(s) · ${htmlEscape(meta.scopeLabel)} · generated ${htmlEscape(wall(meta.exportedAt))} IST by ${htmlEscape(meta.actor)}</p></header>
<section class="kpis" id="kpis"></section>
<div class="bar"><input id="q" type="search" placeholder="Search name, email, phone, message, notes…" autofocus>
<select id="type"><option value="">All types</option><option value="enquiry">Enquiries</option><option value="careers">Job applications</option><option value="callback">Callbacks</option><option value="brochure">Brochure requests</option></select>
<select id="status"><option value="">Any status</option><option value="new">New</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select>
<button type="button" onclick="window.print()">Print selected</button></div>
<main><div id="list"></div><article id="detail"><div class="empty">Select a record</div></article></main>
<footer>Attachments are in the <code>attachments/</code> folder next to this file. Integrity checksums: <code>manifest.json</code>.</footer>
<script id="data" type="application/json">${json}</script>
<script>
(function(){
var D=JSON.parse(document.getElementById('data').textContent),cur=null;
function e(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function kb(n){return n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'}
function k(label,v){return '<div class="kpi"><b>'+v+'</b><span>'+label+'</span></div>'}
document.getElementById('kpis').innerHTML=k('Records',D.length)+k('New',D.filter(function(r){return r.status==='new'}).length)+k('Job applications',D.filter(function(r){return r.type==='careers'}).length)+k('With attachments',D.filter(function(r){return r.attachments.length}).length);
function match(r){var q=document.getElementById('q').value.trim().toLowerCase(),t=document.getElementById('type').value,s=document.getElementById('status').value;
if(t&&r.type!==t)return false;if(s&&r.status!==s)return false;if(!q)return true;return JSON.stringify(r).toLowerCase().indexOf(q)>-1}
function list(){var rows=D.filter(match),el=document.getElementById('list');
el.innerHTML=rows.length?rows.map(function(r){return '<button class="item'+(cur===r.id?' on':'')+'" data-id="'+r.id+'"><div class="t"><b>'+e(r.contact.name||'(no name)')+'</b><small>#'+r.id+'</small></div><small>'+e(r.received_local)+' · '+e(r.contact.email||r.contact.phone)+'</small><div style="margin-top:4px"><span class="chip '+r.type+'">'+e(r.type_label)+'</span> <span class="chip '+r.status+'">'+e(r.status.replace('_',' '))+'</span>'+(r.attachments.length?' 📎':'')+'</div></button>'}).join(''):'<div class="empty">No matches</div>';
if(rows.length&&!rows.some(function(r){return r.id===cur}))show(rows[0].id)}
function show(id){cur=id;var r=D.find(function(x){return x.id===id});if(!r)return;
var subj=encodeURIComponent('Re: your '+r.type_label.toLowerCase()+' #'+r.id),body=encodeURIComponent('Dear '+(r.contact.name||'')+',\\n\\n');
document.getElementById('detail').innerHTML='<h2>'+e(r.contact.name||'(no name)')+'</h2><div class="meta"><span class="chip '+r.type+'">'+e(r.type_label)+'</span><span class="chip '+r.status+'">'+e(r.status.replace('_',' '))+'</span><span>#'+r.id+' · '+e(r.received_local)+' IST</span>'+(r.item_title?'<span>· '+e(r.item_title)+'</span>':'')+'</div>'+
'<div class="actions">'+(r.contact.email?'<a class="primary" href="mailto:'+e(r.contact.email)+'?subject='+subj+'&body='+body+'">Reply by email</a>':'')+(r.contact.phone?'<a href="tel:'+e(r.contact.phone.replace(/[^+\\d]/g,''))+'">Call '+e(r.contact.phone)+'</a>':'')+'<button onclick="window.print()">Print</button></div>'+
'<table>'+r.fields.map(function(f){return '<tr><td>'+e(f[0])+'</td><td>'+e(f[1])+'</td></tr>'}).join('')+'</table>'+
(r.attachments.length?'<h3 style="margin:18px 0 4px;font-size:14px">Attachments</h3><div class="files">'+r.attachments.map(function(a){return a.state==='excluded'?'<div class="miss" style="color:#64748b">📎 '+e(a.name)+' — not included in this export (download from Admin → Enquiries)</div>':a.state==='missing'?'<div class="miss">⚠ '+e(a.name)+' — file was missing on the server at export time</div>':'<a href="'+a.path+'" target="_blank">📎 '+e(a.name)+' <small style="color:#64748b;font-weight:400">'+kb(a.bytes)+'</small></a>'}).join('')+'</div>':'')+
(r.admin_notes?'<div class="notes"><b>Admin notes</b><br>'+e(r.admin_notes)+'</div>':'');list()}
document.getElementById('list').addEventListener('click',function(ev){var b=ev.target.closest('.item');if(b)show(+b.dataset.id)});
['q','type','status'].forEach(function(id){document.getElementById(id).addEventListener('input',list)});
list();
})();
</script></body></html>`,
    'utf8'
  );
}

function readme(records: ExportRecord[], meta: ExportMeta, includeAttachments: boolean) {
  const attached = records.reduce((n, r) => n + r.attachments.filter((a) => a.absolute).length, 0);
  const missing = records.reduce((n, r) => n + r.attachments.filter((a) => !a.absolute).length, 0);
  return Buffer.from(
    [
      `${meta.companyName} - enquiry export`,
      '='.repeat(60),
      `Generated : ${wall(meta.exportedAt)} IST`,
      `By        : ${meta.actor}`,
      `Scope     : ${meta.scopeLabel}`,
      `Records   : ${records.length}`,
      `Files     : ${includeAttachments ? `${attached} attachment(s)${missing ? `, ${missing} missing on server` : ''}` : 'not included'}`,
      '',
      'CONTENTS',
      '  index.html       Offline inbox - open in any browser; search, reply by email, call, print.',
      '  enquiries.xlsx   Excel workbook (Enquiries + Summary). Attachment cells link to the files below.',
      '  enquiries.csv    UTF-8 CSV for any CRM / Google Sheets import.',
      '  enquiries.json   Complete structured data (schema zigma.enquiry-export/v1).',
      '  attachments/     One folder per enquiry: <id>_<name>/<original file name>.',
      '  manifest.json    SHA-256 checksum of every file, for integrity verification.',
      '',
      'TIP: Extract the whole ZIP first so links in Excel and index.html resolve.',
      'VERIFY: PowerShell  Get-FileHash .\\enquiries.xlsx -Algorithm SHA256  (compare with manifest.json)',
      '',
      'This file contains personal data. Store it securely and delete it when no longer needed.',
      '',
    ].join('\r\n'),
    'utf8'
  );
}

/* ---------------------------------------------------------------- package */

export async function* exportPackageEntries(
  records: ExportRecord[],
  meta: ExportMeta,
  opts: { includeAttachments: boolean }
): AsyncGenerator<ZipEntry> {
  const manifest: Array<{ path: string; bytes: number; sha256: string }> = [];
  const track = (entry: ZipEntry) => {
    manifest.push({ path: entry.name, bytes: entry.data.length, sha256: crypto.createHash('sha256').update(entry.data).digest('hex') });
    return entry;
  };
  const date = meta.exportedAt;

  yield track({ name: 'README.txt', data: readme(records, meta, opts.includeAttachments), date });
  yield track({ name: 'index.html', data: buildHtmlReport(records, meta), date });
  yield track({ name: 'enquiries.xlsx', data: buildWorkbook(records, meta, { linkAttachments: opts.includeAttachments }), date });
  yield track({ name: 'enquiries.csv', data: buildCsv(records), date });
  yield track({ name: 'enquiries.json', data: buildJson(records, meta), date });

  if (opts.includeAttachments) {
    for (const r of records) {
      for (const a of r.attachments) {
        if (!a.absolute) continue;
        const data = await readFile(a.absolute).catch(() => null);
        if (!data) {
          a.absolute = null;
          continue;
        }
        yield track({ name: a.zipPath, data, date: r.receivedAt });
      }
    }
  }

  yield {
    name: 'manifest.json',
    data: Buffer.from(
      JSON.stringify({ generator: 'zigma-admin', exported_at: date.toISOString(), algorithm: 'sha256', files: manifest }, null, 2)
    ),
    date,
  };
}

export function exportFileName(companyName: string, at: Date, ext: string) {
  const stamp = wall(at).replace(' ', '_').replace(':', '');
  return `${slug(companyName, 30) || 'enquiries'}-enquiries_${stamp}.${ext}`;
}
