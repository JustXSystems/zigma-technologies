/**
 * Media file naming shared by the upload API, the catalog importer and the admin UI (no Node imports).
 *
 * Stored files get a readable, search-friendly name derived from what the uploader called them
 * ("UPS Front View (Final).JPG" → "ups-front-view-final.jpg"); the exact original name is kept in
 * media_assets.original_name so spreadsheets can keep referring to files by the name people know.
 */

const MAX_STEM = 80;

export const MEDIA_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.mp4', '.webm'] as const;

export function fileExtension(name: string): string {
  const base = baseName(name);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot).toLowerCase() : '';
}

/** Last path segment of a file name, relative path or URL (query and hash removed). */
export function baseName(name: string): string {
  const clean = String(name || '').trim().split(/[?#]/)[0].replace(/\\/g, '/');
  const last = clean.slice(clean.lastIndexOf('/') + 1);
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export function hasMediaExtension(name: string): boolean {
  return (MEDIA_EXTENSIONS as readonly string[]).includes(fileExtension(name));
}

/** Lowercase ASCII words joined by hyphens — the form search engines read best in URLs. */
export function seoStem(text: string): string {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_STEM)
    .replace(/-+$/g, '');
}

/** SEO-friendly stored file name for an upload; `taken` decides when a numeric suffix is needed. */
export function seoFileName(originalName: string, taken: (candidate: string) => boolean = () => false): string {
  const ext = fileExtension(originalName) || '';
  const base = baseName(originalName);
  const stem = seoStem(ext ? base.slice(0, -ext.length) : base) || 'media';
  let candidate = `${stem}${ext}`;
  for (let n = 2; taken(candidate); n++) candidate = `${stem}-${n}${ext}`;
  return candidate;
}

/** Case-, space- and punctuation-insensitive key used to match a spreadsheet reference to a file. */
export function mediaMatchKey(name: string): string {
  const base = baseName(name);
  const ext = fileExtension(base);
  return `${seoStem(ext ? base.slice(0, -ext.length) : base)}${ext === '.jpeg' ? '.jpg' : ext}`;
}

export function mediaKindFromName(name: string): 'image' | 'svg' | 'video' {
  const ext = fileExtension(name);
  if (ext === '.mp4' || ext === '.webm') return 'video';
  if (ext === '.svg') return 'svg';
  return 'image';
}
