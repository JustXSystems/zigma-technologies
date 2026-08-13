import fs from 'fs';
import path from 'path';
import { stripTailwindPreamble } from '@/lib/site-css-parse';

export { stripTailwindPreamble, parseCssSections, lineOffsetToIndex, SITE_CSS_MAX_BYTES } from '@/lib/site-css-parse';
export type { CssSection } from '@/lib/site-css-parse';

export function readRepoSiteCss(): string {
  const filePath = path.join(process.cwd(), 'src', 'app', 'globals.css');
  const raw = fs.readFileSync(filePath, 'utf8');
  return stripTailwindPreamble(raw);
}

/** Rebuild src/app/globals.css with Tailwind header + edited site CSS (local/self-host only). */
export function buildGlobalsFile(siteCss: string): string {
  return [
    '@layer theme, base, components, utilities;',
    '@import "tailwindcss/theme.css" layer(theme);',
    '@import "tailwindcss/utilities.css" layer(utilities);',
    '',
    '/* Synced from public/assets/css/globals.css - keep in sync when updating static CSS */',
    '/* Tailwind preflight omitted so site chrome matches the static homepage CSS. */',
    '',
    siteCss.trimEnd(),
    '',
  ].join('\n');
}

export function tryWritePublishedSiteCss(siteCss: string): { wroteApp: boolean; wrotePublic: boolean } {
  const result = { wroteApp: false, wrotePublic: false };
  const publicPath = path.join(process.cwd(), 'public', 'assets', 'css', 'globals.css');
  const appPath = path.join(process.cwd(), 'src', 'app', 'globals.css');

  try {
    fs.mkdirSync(path.dirname(publicPath), { recursive: true });
    fs.writeFileSync(
      publicPath,
      `/* Published from Theme Studio — ${new Date().toISOString()} */\n${siteCss.trimEnd()}\n`,
      'utf8'
    );
    result.wrotePublic = true;
  } catch {
    /* read-only FS */
  }

  try {
    fs.writeFileSync(appPath, buildGlobalsFile(siteCss), 'utf8');
    result.wroteApp = true;
  } catch {
    /* read-only FS / serverless */
  }

  return result;
}
