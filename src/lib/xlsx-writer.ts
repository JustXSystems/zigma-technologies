import { zipToBuffer, type ZipEntry } from '@/lib/zip-stream';

/** Dependency-free Office Open XML (.xlsx) writer for tabular exports. */

export type XlsxValue = string | number | Date | null | undefined;
export type XlsxCell = XlsxValue | { value: XlsxValue; link?: string; bold?: boolean };
export type XlsxColumn = { header: string; width?: number; kind?: 'text' | 'wrap' | 'date' | 'number' };
export type XlsxSheet = {
  name: string;
  columns: XlsxColumn[];
  rows: XlsxCell[][];
  /** Header row styling, frozen pane and auto-filter (default true). */
  table?: boolean;
};

const STYLE = { default: 0, header: 1, date: 2, wrap: 3, link: 4, bold: 5 } as const;

function xmlEscape(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colName(index: number) {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Excel serial date for the wall-clock time in `timeZone` (Excel dates carry no zone). */
function excelSerial(d: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return wall / 86_400_000 + 25_569;
}

function sheetXml(sheet: XlsxSheet, timeZone: string) {
  const table = sheet.table !== false;
  const links: Array<{ ref: string; target: string }> = [];
  const lastCol = colName(Math.max(0, sheet.columns.length - 1));
  const rowsXml: string[] = [];

  const headerCells = sheet.columns
    .map((c, i) => `<c r="${colName(i)}1" t="inlineStr" s="${table ? STYLE.header : STYLE.bold}"><is><t>${xmlEscape(c.header)}</t></is></c>`)
    .join('');
  rowsXml.push(`<row r="1"${table ? ' ht="22" customHeight="1"' : ''}>${headerCells}</row>`);

  sheet.rows.forEach((row, r) => {
    const rowNum = r + 2;
    const cells = row
      .map((cell, c) => {
        const ref = `${colName(c)}${rowNum}`;
        const obj = cell !== null && typeof cell === 'object' && !(cell instanceof Date) ? cell : { value: cell as XlsxValue };
        const value = obj.value;
        if (value === null || value === undefined || value === '') return '';
        const kind = sheet.columns[c]?.kind;
        if (value instanceof Date) {
          return `<c r="${ref}" s="${STYLE.date}"><v>${excelSerial(value, timeZone)}</v></c>`;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
          return `<c r="${ref}"${obj.bold ? ` s="${STYLE.bold}"` : ''}><v>${value}</v></c>`;
        }
        if (obj.link) links.push({ ref, target: obj.link });
        const style = obj.link ? STYLE.link : obj.bold ? STYLE.bold : kind === 'wrap' ? STYLE.wrap : STYLE.default;
        const text = String(value).slice(0, 32_000);
        return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
      })
      .join('');
    rowsXml.push(`<row r="${rowNum}">${cells}</row>`);
  });

  const cols = sheet.columns
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width ?? 16}" customWidth="1"/>`)
    .join('');
  const lastRow = sheet.rows.length + 1;
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="A1:${lastCol}${lastRow}"/>
<sheetViews><sheetView workbookViewId="0"${table ? '' : ' showGridLines="0"'}>${
    table ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' : ''
  }</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${rowsXml.join('')}</sheetData>
${table && sheet.rows.length ? `<autoFilter ref="A1:${lastCol}${lastRow}"/>` : ''}
${links.length ? `<hyperlinks>${links.map((l, i) => `<hyperlink ref="${l.ref}" r:id="rId${i + 1}"/>`).join('')}</hyperlinks>` : ''}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
  const rels = links.length
    ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${links
        .map(
          (l, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xmlEscape(l.target)}" TargetMode="External"/>`
        )
        .join('')}</Relationships>`
    : null;
  return { xml, rels, filterRef: table && sheet.rows.length ? `$A$1:$${lastCol}$${lastRow}` : null };
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd-mmm-yyyy hh:mm"/></numFmts>
<fonts count="4">
<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
<font><u/><sz val="11"/><color rgb="FF0563C1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0A1628"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="medium"><color rgb="FFFF6B1A"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function buildXlsx(sheets: XlsxSheet[], meta: { title: string; creator: string; timeZone?: string }): Buffer {
  const tz = meta.timeZone || 'Asia/Kolkata';
  const built = sheets.map((s) => sheetXml(s, tz));
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const sheetName = (s: XlsxSheet) => s.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);

  const entries: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`),
    },
    {
      name: 'docProps/core.xml',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xmlEscape(meta.title)}</dc:title><dc:creator>${xmlEscape(meta.creator)}</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`),
    },
    {
      name: 'docProps/app.xml',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application></Properties>`),
    },
    {
      name: 'xl/workbook.xml',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView activeTab="0"/></bookViews>
<sheets>${sheets.map((s, i) => `<sheet name="${xmlEscape(sheetName(s))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
${
  built.some((b) => b.filterRef)
    ? `<definedNames>${built
        .map((b, i) =>
          b.filterRef
            ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xmlEscape(sheetName(sheets[i]).replace(/'/g, "''"))}'!${b.filterRef}</definedName>`
            : ''
        )
        .join('')}</definedNames>`
    : ''
}
</workbook>`),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    },
    { name: 'xl/styles.xml', data: Buffer.from(STYLES_XML) },
  ];
  built.forEach((b, i) => {
    entries.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: Buffer.from(b.xml) });
    if (b.rels) entries.push({ name: `xl/worksheets/_rels/sheet${i + 1}.xml.rels`, data: Buffer.from(b.rels) });
  });
  return zipToBuffer(entries.map((e) => ({ ...e, compress: true })));
}
