/** App URL prefix for subdirectory deploys (e.g. /zigma-technologies). Empty for domain root. */

export function appBasePath(): string {
  const raw = (process.env.NEXT_PUBLIC_BASE_PATH || '').trim();
  if (!raw || raw === '/') return '';
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/$/, '');
}

/** Cookie Path attribute — scoped to the app when using a subdirectory. */
export function cookiePath(): string {
  return appBasePath() || '/';
}

/**
 * Prefix an app-absolute path with basePath.
 * Leaves http(s), protocol-relative, and already-prefixed paths unchanged.
 */
export function withBasePath(path: string): string {
  if (!path) return path;
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }
  const base = appBasePath();
  if (!base) return path.startsWith('/') ? path : `/${path}`;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === base || normalized.startsWith(`${base}/`)) return normalized;
  return `${base}${normalized}`;
}

/** Strip basePath for disk / DB path comparisons that store root-relative /assets/… paths. */
export function stripBasePath(path: string): string {
  const base = appBasePath();
  if (!base) return path;
  if (path === base) return '/';
  if (path.startsWith(`${base}/`)) return path.slice(base.length) || '/';
  return path;
}
