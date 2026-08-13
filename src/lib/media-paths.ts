import path from 'path';

/** Public URL prefix for all site media (env override for CDN later). */
export function mediaBaseUrl(): string {
  return (process.env.MEDIA_BASE_URL || '/assets').replace(/\/$/, '');
}

/** Admin CMS library: images, SVG, video. */
export type AdminMediaCategory = 'images' | 'svg' | 'video';

/** Visitor / form uploads grouped by purpose. */
export type PublicUploadCategory = 'resumes' | 'documents';

const ADMIN_CATEGORIES: AdminMediaCategory[] = ['images', 'svg', 'video'];
const PUBLIC_UPLOAD_CATEGORIES: PublicUploadCategory[] = ['resumes', 'documents'];

/** Paths under /assets/uploads that must never be served as static files. */
export const PRIVATE_UPLOAD_PREFIXES = [
  '/assets/uploads/resumes',
  '/assets/uploads/documents',
] as const;

export function adminCategoryFromMime(mime: string): AdminMediaCategory {
  if (mime === 'image/svg+xml') return 'svg';
  if (mime.startsWith('video/')) return 'video';
  return 'images';
}

export function adminMediaPublicPath(category: AdminMediaCategory, filename: string): string {
  return `${mediaBaseUrl()}/${category}/${path.basename(filename)}`;
}

export function adminMediaDiskDir(category: AdminMediaCategory): string {
  return path.join(process.cwd(), 'public', 'assets', category);
}

export function publicUploadPublicPath(category: PublicUploadCategory, filename: string): string {
  return `${mediaBaseUrl()}/uploads/${category}/${path.basename(filename)}`;
}

export function publicUploadDiskDir(category: PublicUploadCategory): string {
  return path.join(process.cwd(), 'public', 'assets', 'uploads', category);
}

export function isPrivateUploadPath(publicPath: string): boolean {
  const normalized = publicPath.split('?')[0];
  return PRIVATE_UPLOAD_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/** Map a stored public path to an on-disk file (supports legacy /uploads and storage/). */
export function resolvePublicAssetDiskPath(publicPath: string): string | null {
  if (!publicPath || !publicPath.startsWith('/')) return null;
  const clean = publicPath.split('?')[0];

  if (clean.startsWith('/assets/')) {
    return path.join(process.cwd(), 'public', clean.slice(1));
  }

  if (clean.startsWith('/uploads/')) {
    const rest = clean.slice('/uploads/'.length);
    if (rest.startsWith('resumes/') || rest.startsWith('documents/')) {
      return path.join(process.cwd(), 'public', 'assets', 'uploads', rest);
    }
    return path.join(process.cwd(), 'public', 'uploads', rest);
  }

  return null;
}

/** Legacy flat /uploads and old storage/resumes locations for reads/deletes. */
export function legacyAssetDiskPaths(publicPath: string): string[] {
  const paths: string[] = [];
  const disk = resolvePublicAssetDiskPath(publicPath);
  if (disk) paths.push(disk);

  if (publicPath.startsWith('/uploads/')) {
    paths.push(path.join(process.cwd(), 'public', publicPath.slice(1)));
  }

  const name = path.basename(publicPath);
  paths.push(path.join(process.cwd(), 'storage', 'resumes', name));
  paths.push(path.join(process.cwd(), 'public', 'uploads', 'resumes', name));

  return [...new Set(paths)];
}

export function ensureAssetDirectories() {
  const dirs = [
    ...ADMIN_CATEGORIES.map((c) => adminMediaDiskDir(c)),
    ...PUBLIC_UPLOAD_CATEGORIES.map((c) => publicUploadDiskDir(c)),
  ];
  return dirs;
}

export function isManagedMediaPath(publicPath: string): boolean {
  const base = mediaBaseUrl();
  if (publicPath.startsWith(`${base}/images/`) || publicPath.startsWith(`${base}/svg/`) || publicPath.startsWith(`${base}/video/`)) {
    return true;
  }
  if (publicPath.startsWith('/uploads/')) return true;
  return false;
}
