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

function isExternalOrSpecial(path: string): boolean {
  return (
    path.startsWith('#') ||
    path.startsWith('?') ||
    path.startsWith('tel:') ||
    path.startsWith('mailto:') ||
    path.startsWith('sms:') ||
    path.startsWith('javascript:') ||
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  );
}

/**
 * Prefix an app-absolute path with basePath.
 * Leaves hash-only, tel/mailto, http(s), and already-prefixed paths unchanged.
 * Use for plain <a href> — next/link already applies basePath itself.
 */
export function withBasePath(path: string): string {
  if (!path) return path;
  if (isExternalOrSpecial(path)) return path;

  const base = appBasePath();
  if (!base) return path.startsWith('/') ? path : `/${path}`;

  // Split query/hash so we only prefix the pathname segment
  const match = path.match(/^([^?#]*)([?#].*)?$/);
  const pathname = match?.[1] || path;
  const suffix = match?.[2] || '';
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (normalized === base || normalized.startsWith(`${base}/`)) {
    return `${normalized}${suffix}`;
  }
  return `${base}${normalized}${suffix}`;
}

/** Alias for templates — empty/undefined → "#". */
export function appHref(href: string | undefined | null): string {
  if (!href) return '#';
  return withBasePath(href);
}

/** Strip basePath for disk / DB path comparisons that store root-relative /assets/… paths. */
export function stripBasePath(path: string): string {
  const base = appBasePath();
  if (!base) return path;
  if (path === base) return '/';
  if (path.startsWith(`${base}/`)) return path.slice(base.length) || '/';
  return path;
}
