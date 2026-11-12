/**
 * Conservative unused-media detection for the admin Media library.
 *
 * A file is "unused" only when it appears in neither:
 *  1) any CMS database string/JSON column (except media_assets itself), nor
 *  2) runtime source / public static defaults under src/ and public/.
 *
 * Prefer false "used" over false "unused" — deletes are permanent.
 * If the DB scan cannot complete cleanly, the API fails open (no unused marks).
 */
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import type { RowDataPacket } from 'mysql2';
import { appBasePath, stripBasePath } from '@/lib/base-path';
import pool from '@/lib/db';
import { toStorageMediaPath } from '@/lib/media-url';

/**
 * Captures managed library paths in these forms:
 * - /assets/images/foo.png
 * - /{basePath}/assets/images/foo.png
 * - https://host/assets/images/foo.png
 * - https://host/{basePath}/assets/images/foo.png
 * - assets/images/foo.png (legacy relative, no leading slash)
 */
const ASSET_REF_RE =
  /(?:https?:\/\/[^\s"'\\)]+)?(?:\/[\w.-]+)*\/assets\/(?:images|svg|video)\/[A-Za-z0-9._-]+|(?:^|[^a-zA-Z0-9_/])assets\/(?:images|svg|video)\/[A-Za-z0-9._-]+/gi;

const STRING_COLUMN_TYPES = new Set([
  'varchar',
  'char',
  'tinytext',
  'text',
  'mediumtext',
  'longtext',
  'json',
]);

/** Tables whose path columns are the asset registry, not live usage. */
const SKIP_TABLES = new Set(['media_assets']);

type CodeScanRoot =
  | { dir: string; recursive: boolean; extensions: string[]; skipDirNames?: Set<string> }
  | { dir: string; recursive: false; files: string[] };

const CODE_SCAN_ROOTS: CodeScanRoot[] = [
  { dir: 'src', recursive: true, extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css'] },
  {
    dir: 'public',
    recursive: true,
    extensions: ['.js', '.css', '.html'],
    skipDirNames: new Set(['uploads', 'resumes', 'documents']),
  },
  { dir: '.', recursive: false, files: ['next.config.ts', 'next.config.js', 'next.config.mjs'] },
];

export type MediaUsageSummary = {
  unusedCount: number;
  usedCount: number;
  scannedAt: string;
  dbRefCount: number;
  codeRefCount: number;
};

type ColumnRef = { table: string; column: string };

/** Normalize any matched ref to root-relative `/assets/{images|svg|video}/file`. */
export function normalizeAssetRef(raw: string): string | null {
  let value = String(raw || '').trim();
  if (!value) return null;

  // Drop absolute origin so pathname handling can run.
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      value = value.replace(/^https?:\/\/[^/]+/i, '');
    }
  }

  // Legacy relative "assets/images/…" → "/assets/images/…"
  if (value.startsWith('assets/')) value = `/${value}`;

  // Keep from /assets/ onward (drops /basePath or accidental prefixes).
  const assetsAt = value.indexOf('/assets/');
  if (assetsAt >= 0) value = value.slice(assetsAt);

  value = stripBasePath(value.split(/[?#]/)[0] || '');
  // stripBasePath is a no-op when NEXT_PUBLIC_BASE_PATH is empty; also strip a
  // known configured basePath if the match still includes it.
  const base = appBasePath();
  if (base && value.startsWith(`${base}/`)) value = value.slice(base.length) || '/';

  const storage = toStorageMediaPath(value);
  if (
    storage.startsWith('/assets/images/') ||
    storage.startsWith('/assets/svg/') ||
    storage.startsWith('/assets/video/')
  ) {
    return storage;
  }
  return null;
}

/** Extract normalized managed media paths from arbitrary text. */
export function extractMediaPathsFromText(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  ASSET_REF_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ASSET_REF_RE.exec(text))) {
    // Relative-form matches may include a leading delimiter character.
    const raw = match[0].replace(/^[^a-zA-Z/]+/, '');
    const normalized = normalizeAssetRef(raw);
    if (normalized) found.add(normalized);
  }
  return [...found];
}

function addPathsFromValue(value: unknown, into: Set<string>) {
  if (value == null) return;
  if (typeof value === 'string') {
    for (const p of extractMediaPathsFromText(value)) into.add(p);
    return;
  }
  if (typeof value === 'object') {
    try {
      for (const p of extractMediaPathsFromText(JSON.stringify(value))) into.add(p);
    } catch {
      /* ignore non-serializable */
    }
  }
}

async function listScannableColumns(): Promise<ColumnRef[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, DATA_TYPE AS data_type
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME, ORDINAL_POSITION`
  );

  const cols: ColumnRef[] = [];
  for (const row of rows) {
    const table = String(row.table_name);
    const column = String(row.column_name);
    const dataType = String(row.data_type || '').toLowerCase();
    if (SKIP_TABLES.has(table)) continue;
    if (!STRING_COLUMN_TYPES.has(dataType)) continue;
    cols.push({ table, column });
  }
  return cols;
}

function quoteIdent(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``;
}

/**
 * Scan every string/JSON column in the DB for managed media path references.
 * Throws if any column cannot be scanned — callers must fail open (no unused marks)
 * rather than silently omitting refs (which would create false "unused").
 */
export async function collectDatabaseMediaRefs(): Promise<Set<string>> {
  const refs = new Set<string>();
  const columns = await listScannableColumns();
  const errors: string[] = [];

  for (const { table, column } of columns) {
    const t = quoteIdent(table);
    const c = quoteIdent(column);
    // Explicit CHAR length avoids MySQL's default CAST(... AS CHAR) truncation
    // on non-string/JSON values (default can be as low as 30 chars).
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT ${c} AS v FROM ${t}
         WHERE ${c} IS NOT NULL
           AND (
             CAST(${c} AS CHAR(16777215)) LIKE '%/assets/images/%'
             OR CAST(${c} AS CHAR(16777215)) LIKE '%/assets/svg/%'
             OR CAST(${c} AS CHAR(16777215)) LIKE '%/assets/video/%'
             OR CAST(${c} AS CHAR(16777215)) LIKE '%assets/images/%'
             OR CAST(${c} AS CHAR(16777215)) LIKE '%assets/svg/%'
             OR CAST(${c} AS CHAR(16777215)) LIKE '%assets/video/%'
           )`
      );
      for (const row of rows) addPathsFromValue(row.v, refs);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      errors.push(`${table}.${column}: ${detail}`);
    }
  }

  if (errors.length) {
    throw new Error(
      `media-usage DB scan incomplete (${errors.length} column error(s)); refusing unused marks. First: ${errors[0]}`
    );
  }

  return refs;
}

async function collectFilesUnder(
  dir: string,
  recursive: boolean,
  extensions: Set<string>,
  skipDirNames?: Set<string>
): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === 'dist') continue;
    if (skipDirNames?.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (recursive) out.push(...(await collectFilesUnder(full, true, extensions, skipDirNames)));
      continue;
    }
    if (!ent.isFile()) continue;
    if (!extensions.has(path.extname(ent.name).toLowerCase())) continue;
    out.push(full);
  }
  return out;
}

/** Scan runtime source + public static files for hardcoded media defaults/fallbacks. */
export async function collectCodeMediaRefs(projectRoot = process.cwd()): Promise<Set<string>> {
  const refs = new Set<string>();
  const files = new Set<string>();

  for (const root of CODE_SCAN_ROOTS) {
    const absDir = path.join(projectRoot, root.dir);
    if ('files' in root) {
      for (const name of root.files) files.add(path.join(absDir, name));
      continue;
    }
    const extensions = new Set(root.extensions);
    for (const f of await collectFilesUnder(absDir, root.recursive, extensions, root.skipDirNames)) {
      files.add(f);
    }
  }

  for (const file of files) {
    try {
      const info = await stat(file);
      if (!info.isFile() || info.size > 2_000_000) continue;
      const text = await readFile(file, 'utf8');
      for (const p of extractMediaPathsFromText(text)) refs.add(p);
    } catch {
      /* missing optional config files are fine */
    }
  }

  return refs;
}

export async function collectAllMediaRefs(): Promise<{
  used: Set<string>;
  dbRefs: Set<string>;
  codeRefs: Set<string>;
}> {
  const [dbRefs, codeRefs] = await Promise.all([collectDatabaseMediaRefs(), collectCodeMediaRefs()]);
  const used = new Set<string>([...dbRefs, ...codeRefs]);
  return { used, dbRefs, codeRefs };
}

export function annotateMediaUsage<T extends { path: string }>(
  assets: T[],
  used: Set<string>
): Array<T & { unused: boolean }> {
  return assets.map((asset) => {
    const normalized = normalizeAssetRef(asset.path) || toStorageMediaPath(asset.path);
    return {
      ...asset,
      unused: Boolean(normalized) && !used.has(normalized),
    };
  });
}

export function summarizeMediaUsage(
  assets: Array<{ unused: boolean }>,
  dbRefs: Set<string>,
  codeRefs: Set<string>
): MediaUsageSummary {
  const unusedCount = assets.filter((a) => a.unused).length;
  return {
    unusedCount,
    usedCount: assets.length - unusedCount,
    scannedAt: new Date().toISOString(),
    dbRefCount: dbRefs.size,
    codeRefCount: codeRefs.size,
  };
}
