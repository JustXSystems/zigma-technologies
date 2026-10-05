import { readZip } from '@/lib/zip-reader';

/**
 * Dependency-free reader for .xlsx (Excel, Google Sheets, LibreOffice, Numbers exports) and .csv.
 * Returns every sheet as a grid of trimmed-on-demand values; formulas yield their cached result.
 */

export type SheetCell = string | number | boolean | null;
export type SheetGrid = { name: string; hidden: boolean; rows: SheetCell[][] };

const ENTITY: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeXml(text: string): string {
  return text
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : '';
      }
      return ENTITY[e.toLowerCase()] ?? '';
    })
    .replace(/_x([0-9a-f]{4})_/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs);
  return m ? decodeXml(m[1]) : null;
}

/** Concatenated text of an <si>/<is> node, ignoring phonetic hints. */
function richText(xml: string): string {
  const clean = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  let out = '';
  for (const m of clean.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)) out += m[1] ? decodeXml(m[1]) : '';
  return out;
}

function columnIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, '').toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function resolveTarget(base: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function parseSheet(xml: string, shared: string[]): SheetCell[][] {
  const rows: SheetCell[][] = [];
  const data = /<sheetData\b[^>]*>([\s\S]*?)<\/sheetData>/.exec(xml)?.[1] ?? '';
  let nextRow = 0;
  for (const rowMatch of data.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = attr(rowMatch[1], 'r');
    const rowIndex = r ? Number(r) - 1 : nextRow;
    nextRow = rowIndex + 1;
    const cells: SheetCell[] = [];
    let nextCol = 0;
    for (const c of (rowMatch[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(c[1], 'r');
      const col = ref ? columnIndex(ref) : nextCol;
      nextCol = col + 1;
      const type = attr(c[1], 't') || 'n';
      const body = c[2] ?? '';
      const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value: SheetCell = null;
      if (type === 'inlineStr') {
        const is = /<is>([\s\S]*?)<\/is>/.exec(body)?.[1];
        value = is != null ? richText(is) : null;
      } else if (raw != null) {
        const text = decodeXml(raw);
        if (type === 's') value = shared[Number(text)] ?? '';
        else if (type === 'b') value = text === '1';
        else if (type === 'str' || type === 'e' || type === 'd') value = text;
        else {
          const n = Number(text);
          value = Number.isFinite(n) ? n : text;
        }
      }
      if (value !== null && value !== '') cells[col] = value;
    }
    if (cells.length) rows[rowIndex] = cells;
  }
  for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
  return rows;
}

export function readXlsx(buf: Buffer): SheetGrid[] {
  const zip = readZip(buf, { maxEntries: 2_000, maxTotalBytes: 150 * 1024 * 1024 });
  const text = (name: string) => {
    const get = zip.get(name);
    return get ? get().toString('utf8') : null;
  };

  const rootRels = text('_rels/.rels') ?? '';
  const workbookPath =
    /Type="[^"]*\/officeDocument"[^>]*Target="([^"]+)"/.exec(rootRels)?.[1]?.replace(/^\//, '') ??
    /Target="([^"]+)"[^>]*Type="[^"]*\/officeDocument"/.exec(rootRels)?.[1]?.replace(/^\//, '') ??
    'xl/workbook.xml';
  const workbook = text(workbookPath);
  if (!workbook) throw new Error('NOT_A_WORKBOOK');

  const relsPath = workbookPath.replace(/([^/]+)$/, '_rels/$1.rels');
  const rels = new Map<string, string>();
  for (const m of (text(relsPath) ?? '').matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = attr(m[1], 'Id');
    const target = attr(m[1], 'Target');
    if (id && target) rels.set(id, resolveTarget(workbookPath, target));
  }

  const sharedPath = [...rels.values()].find((t) => /sharedStrings\.xml$/i.test(t)) ?? 'xl/sharedStrings.xml';
  const shared: string[] = [];
  for (const m of (text(sharedPath) ?? '').matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)) shared.push(m[1] ? richText(m[1]) : '');

  const sheets: SheetGrid[] = [];
  for (const m of workbook.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const name = attr(m[1], 'name') ?? `Sheet${sheets.length + 1}`;
    const rid = attr(m[1], 'r:id') ?? /\s[\w]+:id="([^"]+)"/.exec(m[1])?.[1] ?? null;
    const target = rid ? rels.get(rid) : null;
    const xml = target ? text(target) : null;
    if (!xml) continue;
    sheets.push({ name, hidden: /state="(hidden|veryHidden)"/.test(m[1]), rows: parseSheet(xml, shared) });
  }
  return sheets;
}

/** RFC 4180 CSV (comma, semicolon or tab — whichever the header row uses most). */
export function readCsv(text: string, name = 'Sheet1'): SheetGrid {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/, 1)[0];
  const delimiter = [',', ';', '\t'].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ',');
  const rows: SheetCell[][] = [];
  let row: SheetCell[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return { name, hidden: false, rows: rows.map((r) => r.map((v) => (v === '' ? null : v))) };
}
