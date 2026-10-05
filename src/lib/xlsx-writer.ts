import { zipToBuffer, type ZipEntry } from '@/lib/zip-stream';

/** Dependency-free Office Open XML (.xlsx) writer for tabular exports and fill-in templates. */

export type XlsxValue = string | number | Date | null | undefined;
export type XlsxCellStyle = 'title' | 'section' | 'muted';
export type XlsxCell = XlsxValue | { value: XlsxValue; link?: string; bold?: boolean; style?: XlsxCellStyle };
/** Header colour group, so people filling a template can tell required, SEO, media and system columns apart. */
export type XlsxHeaderTone = 'required' | 'system' | 'seo' | 'media' | 'case';
export type XlsxColumn = {
  header: string;
  width?: number;
  kind?: 'text' | 'wrap' | 'date' | 'number';
  tone?: XlsxHeaderTone;
  hidden?: boolean;
  /** Grey "do not edit" body cells. */
  muted?: boolean;
  /** Hint Excel shows when a cell in the column is selected (title ≤ 32, text ≤ 255 chars). */
  prompt?: { title: string; text: string };
  /** Dropdown: literal options, or a range such as `Lists!$A$2:$A$20`. */
  list?: string[] | { ref: string };
  /** Reject values outside the list instead of only warning. */
  listStrict?: boolean;
  /** Highlight non-empty cells whose length falls outside [min, max]. */
  lengthRange?: [number, number];
};
export type XlsxSheet = {
  name: string;
  columns: XlsxColumn[];
  rows: XlsxCell[][];
  /** Header row styling, frozen pane and auto-filter (default true). */
  table?: boolean;
  /** Columns kept visible while scrolling sideways. */
  freezeCols?: number;
  tabColor?: string;
  hidden?: boolean;
  /** How many body rows get dropdowns, hints and highlighting (default: rows + 500). */
  templateRows?: number;
};

const STYLE = {
  default: 0,
  header: 1,
  date: 2,
  wrap: 3,
  link: 4,
  bold: 5,
  headerRequired: 6,
  headerSystem: 7,
  headerSeo: 8,
  headerMedia: 9,
  muted: 10,
  title: 11,
  section: 12,
  headerCase: 13,
} as const;

const HEADER_STYLE: Record<XlsxHeaderTone, number> = {
  required: STYLE.headerRequired,
  system: STYLE.headerSystem,
  seo: STYLE.headerSeo,
  media: STYLE.headerMedia,
  case: STYLE.headerCase,
};

const CELL_STYLE: Record<XlsxCellStyle, number> = { title: STYLE.title, section: STYLE.section, muted: STYLE.muted };

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

function validationsXml(sheet: XlsxSheet, lastRow: number) {
  const items: string[] = [];
  sheet.columns.forEach((c, i) => {
    if (!c.list && !c.prompt) return;
    const sqref = `${colName(i)}2:${colName(i)}${lastRow}`;
    const prompt = c.prompt
      ? ` showInputMessage="1" promptTitle="${xmlEscape(c.prompt.title.slice(0, 32))}" prompt="${xmlEscape(c.prompt.text.slice(0, 255))}"`
      : '';
    if (c.list) {
      const formula = Array.isArray(c.list) ? `"${c.list.join(',').replace(/"/g, '""')}"` : c.list.ref;
      const error = c.listStrict
        ? ' showErrorMessage="1" errorStyle="stop" errorTitle="Choose from the list" error="Pick one of the options in the dropdown."'
        : ' showErrorMessage="1" errorStyle="information" errorTitle="New value" error="Not in the list yet. It will be added on import if new values are allowed."';
      items.push(
        `<dataValidation type="list" allowBlank="1"${prompt}${error} sqref="${sqref}"><formula1>${xmlEscape(formula)}</formula1></dataValidation>`
      );
    } else {
      items.push(`<dataValidation allowBlank="1"${prompt} sqref="${sqref}"/>`);
    }
  });
  return items.length ? `<dataValidations count="${items.length}">${items.join('')}</dataValidations>` : '';
}

function conditionalXml(sheet: XlsxSheet, lastRow: number) {
  let priority = 1;
  return sheet.columns
    .map((c, i) => {
      if (!c.lengthRange) return '';
      const cell = `${colName(i)}2`;
      const [min, max] = c.lengthRange;
      const formula = `OR(AND(LEN(${cell})>0,LEN(${cell})<${min}),LEN(${cell})>${max})`;
      return `<conditionalFormatting sqref="${colName(i)}2:${colName(i)}${lastRow}"><cfRule type="expression" dxfId="0" priority="${priority++}"><formula>${xmlEscape(formula)}</formula></cfRule></conditionalFormatting>`;
    })
    .join('');
}

function sheetXml(sheet: XlsxSheet, timeZone: string) {
  const table = sheet.table !== false;
  const links: Array<{ ref: string; target: string }> = [];
  const lastCol = colName(Math.max(0, sheet.columns.length - 1));
  const rowsXml: string[] = [];

  const headerCells = sheet.columns
    .map((c, i) => {
      const style = table ? (c.tone ? HEADER_STYLE[c.tone] : STYLE.header) : STYLE.bold;
      return `<c r="${colName(i)}1" t="inlineStr" s="${style}"><is><t>${xmlEscape(c.header)}</t></is></c>`;
    })
    .join('');
  const headerHeight = sheet.columns.some((c) => c.tone) ? 34 : 22;
  rowsXml.push(`<row r="1"${table ? ` ht="${headerHeight}" customHeight="1"` : ''}>${headerCells}</row>`);

  sheet.rows.forEach((row, r) => {
    const rowNum = r + 2;
    const cells = row
      .map((cell, c) => {
        const ref = `${colName(c)}${rowNum}`;
        const obj = cell !== null && typeof cell === 'object' && !(cell instanceof Date) ? cell : { value: cell as XlsxValue };
        const value = obj.value;
        if (value === null || value === undefined || value === '') return '';
        const column = sheet.columns[c];
        if (value instanceof Date) {
          return `<c r="${ref}" s="${STYLE.date}"><v>${excelSerial(value, timeZone)}</v></c>`;
        }
        const style = obj.style
          ? CELL_STYLE[obj.style]
          : obj.link
            ? STYLE.link
            : obj.bold
              ? STYLE.bold
              : column?.muted
                ? STYLE.muted
                : column?.kind === 'wrap'
                  ? STYLE.wrap
                  : STYLE.default;
        if (typeof value === 'number' && Number.isFinite(value)) {
          return `<c r="${ref}"${style ? ` s="${style}"` : ''}><v>${value}</v></c>`;
        }
        if (obj.link) links.push({ ref, target: obj.link });
        const text = String(value).slice(0, 32_000);
        return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
      })
      .join('');
    rowsXml.push(`<row r="${rowNum}">${cells}</row>`);
  });

  const cols = sheet.columns
    .map(
      (c, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${c.width ?? 16}" customWidth="1"${c.hidden ? ' hidden="1"' : ''}${
          c.kind === 'wrap' && !c.muted ? ` style="${STYLE.wrap}"` : ''
        }/>`
    )
    .join('');
  const lastRow = sheet.rows.length + 1;
  const templateLast = Math.max(lastRow, sheet.templateRows ?? sheet.rows.length + 500);
  const freezeCols = table ? Math.max(0, sheet.freezeCols ?? 0) : 0;
  const topLeft = `${colName(freezeCols)}2`;
  const pane = !table
    ? ''
    : freezeCols
      ? `<pane xSplit="${freezeCols}" ySplit="1" topLeftCell="${topLeft}" activePane="bottomRight" state="frozen"/><selection pane="topRight"/><selection pane="bottomLeft"/><selection pane="bottomRight" activeCell="${topLeft}" sqref="${topLeft}"/>`
      : '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>';
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${sheet.tabColor ? `<sheetPr><tabColor rgb="FF${sheet.tabColor.replace('#', '').toUpperCase()}"/></sheetPr>` : ''}
<dimension ref="A1:${lastCol}${lastRow}"/>
<sheetViews><sheetView workbookViewId="0"${table ? '' : ' showGridLines="0"'}>${pane}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${rowsXml.join('')}</sheetData>
${table && sheet.rows.length ? `<autoFilter ref="A1:${lastCol}${lastRow}"/>` : ''}
${table ? conditionalXml(sheet, templateLast) : ''}
${table ? validationsXml(sheet, templateLast) : ''}
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

const HEADER_XF = (fill: number) =>
  `<xf numFmtId="0" fontId="1" fillId="${fill}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd-mmm-yyyy hh:mm"/></numFmts>
<fonts count="7">
<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
<font><u/><sz val="11"/><color rgb="FF0563C1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
<font><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
<font><b/><sz val="18"/><color rgb="FF0A1628"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
<font><b/><sz val="12"/><color rgb="FFC2410C"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
</fonts>
<fills count="9">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0A1628"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFC2410C"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF475569"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF4338CA"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF7C3AED"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="medium"><color rgb="FFFF6B1A"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="14">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top"/></xf>
${HEADER_XF(3)}
${HEADER_XF(4)}
${HEADER_XF(5)}
${HEADER_XF(6)}
<xf numFmtId="0" fontId="4" fillId="7" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="bottom"/></xf>
${HEADER_XF(8)}
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="1"><dxf><font><color rgb="FF9C5700"/></font><fill><patternFill><bgColor rgb="FFFFEB9C"/></patternFill></fill></dxf></dxfs>
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
<bookViews><workbookView activeTab="${Math.max(0, sheets.findIndex((s) => !s.hidden))}"/></bookViews>
<sheets>${sheets
        .map((s, i) => `<sheet name="${xmlEscape(sheetName(s))}" sheetId="${i + 1}"${s.hidden ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`)
        .join('')}</sheets>
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
