import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_FAVICON } from '@/lib/site-settings';

/** Always serve the square white-Z company mark for tab / PWA icons. */
export async function loadFaviconAsset() {
  const relative = DEFAULT_FAVICON.replace(/^\//, '');
  const filePath = path.join(process.cwd(), 'public', ...relative.split('/'));
  const buffer = await readFile(filePath);
  return { buffer, contentType: 'image/png' as const, src: DEFAULT_FAVICON };
}
