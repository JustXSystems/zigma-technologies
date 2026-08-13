/** Client-safe CSS helpers (no Node fs). */

export const SITE_CSS_MAX_BYTES = 2_000_000;

export type CssSection = {
  id: string;
  title: string;
  /** 0-based line index where section starts */
  startLine: number;
};

const TAILWIND_HEADER_RE =
  /^[\s\S]*?\/\*\s*Synced from public\/assets\/css\/globals\.css[^*]*\*\/\s*/i;

const IMPORT_LAYER_RE =
  /^[\s\S]*?(?:@import\s+["']tailwindcss\/utilities\.css["'][^\n]*\n+)/i;

/** Strip Next/Tailwind preamble so Theme Studio edits only site chrome CSS. */
export function stripTailwindPreamble(raw: string): string {
  let css = raw.replace(/^\uFEFF/, '');
  if (TAILWIND_HEADER_RE.test(css)) {
    css = css.replace(TAILWIND_HEADER_RE, '');
  } else if (IMPORT_LAYER_RE.test(css)) {
    css = css.replace(IMPORT_LAYER_RE, '');
  } else {
    css = css.replace(/^(?:\s*(?:@layer\b[^\n]*|@import\b[^\n]*|\/\*[^*]*\*\/)\s*\n)+/i, '');
  }
  return css.replace(/^\s+/, '');
}

export function parseCssSections(css: string): CssSection[] {
  const lines = css.split(/\r?\n/);
  const sections: CssSection[] = [{ id: 'preamble', title: 'Preamble / :root', startLine: 0 }];
  const single = /^\s*\/\*\s*[-=]{3,}\s*(.+?)\s*[-=]{0,}\s*\*\/\s*$/;
  const multiStart = /^\s*\/\*\s*[-=]{5,}\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(single);
    if (m) {
      const title = m[1].replace(/\s*[-=]+\s*$/, '').trim();
      if (title) {
        sections.push({
          id: `s-${i}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}`,
          title,
          startLine: i,
        });
      }
      continue;
    }
    if (multiStart.test(line) && i + 1 < lines.length) {
      const next = lines[i + 1].replace(/^\s*\*?\s*/, '').replace(/\s*\*\/\s*$/, '').trim();
      if (next && !/^[=-]+$/.test(next)) {
        sections.push({
          id: `s-${i}-${next.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}`,
          title: next,
          startLine: i,
        });
      }
    }
  }

  return sections.filter(
    (s, idx, arr) => idx === 0 || s.title !== arr[idx - 1].title || s.startLine !== arr[idx - 1].startLine
  );
}

export function lineOffsetToIndex(css: string, lineIndex: number): number {
  if (lineIndex <= 0) return 0;
  const lines = css.split(/\r?\n/);
  let pos = 0;
  for (let i = 0; i < Math.min(lineIndex, lines.length); i++) {
    pos += lines[i].length + 1;
  }
  return Math.min(pos, css.length);
}
