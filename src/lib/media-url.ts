import { stripBasePath, withBasePath } from '@/lib/base-path';

/**
 * Root-relative prefix stored in DB (never includes Next.js basePath).
 * Optional MEDIA_BASE_URL may be `/assets` or an absolute CDN origin.
 * Safe for client + server (no Node `path` import).
 */
export function mediaStoragePrefix(): string {
  const raw = (process.env.MEDIA_BASE_URL || '/assets').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw === '/assets' || raw.endsWith('/assets')) return '/assets';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

/** Browser-facing media prefix (adds basePath on subdirectory deploys). */
export function mediaBaseUrl(): string {
  const storage = mediaStoragePrefix();
  if (/^https?:\/\//i.test(storage)) return storage;
  return withBasePath(storage);
}

/** Browser URL for a stored media path (adds basePath on subdirectory deploys). */
export function publicMediaUrl(publicPath: string): string {
  const storage = toStorageMediaPath(publicPath);
  if (!storage) return '';
  if (/^https?:\/\//i.test(storage) || storage.startsWith('data:') || storage.startsWith('blob:')) {
    return storage;
  }
  return withBasePath(storage);
}

/** Normalize any stored / displayed media path to root-relative `/assets/...` (or absolute CDN). */
export function toStorageMediaPath(publicPath: string): string {
  const trimmed = (publicPath || '').trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  const clean = stripBasePath(trimmed.split('?')[0]);
  return clean.startsWith('/') ? clean : `/${clean}`;
}
