/** App URL prefix for subdirectory deploys (e.g. /zigma-technologies). Empty for domain root. */

export function appBasePath(): string {
  const raw = (process.env.NEXT_PUBLIC_BASE_PATH || '').trim();
  if (!raw || raw === '/') return '';
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/$/, '');
}

/**
 * Cookie Path attribute — scoped to the app when using a subdirectory.
 * Prefer the basePath so the session is not sent to sibling apps on the same host.
 */
export function cookiePath(): string {
  return appBasePath() || '/';
}

/**
 * Paths to write/clear for the session cookie.
 * Always include `/` as well as basePath so older logins (Path=/) and new ones
 * (Path=/zigma-technologies) both work after deploys that changed cookie scoping.
 */
export function cookiePathsForAuth(): string[] {
  const base = appBasePath();
  if (!base) return ['/'];
  return ['/', base];
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

/** Inline script source that patches window.fetch before React hydrates (basePath deploys). */
export function basePathFetchPatchScript(): string {
  const base = appBasePath();
  if (!base) return '';
  // Keep this self-contained — no imports. Runs in <head> before any useEffect fetch.
  return `(function(){var b=${JSON.stringify(base)};if(!b||window.__zigmaFetchPatched)return;window.__zigmaFetchPatched=1;var o=window.fetch.bind(window);function pref(u){if(!u||u.charAt(0)==='#'||u.charAt(0)==='?'||/^(tel:|mailto:|sms:|javascript:|data:|blob:|\\/\\/)/.test(u))return u;try{if(/^https?:\\/\\//i.test(u)){var x=new URL(u);if(x.origin===location.origin){if(x.pathname!==b&&x.pathname.indexOf(b+'/')!==0)x.pathname=b+x.pathname;return x.toString();}return u;}}catch(e){}var m=String(u).match(/^([^?#]*)([?#].*)?$/);var p=m&&m[1]?m[1]:u;var s=m&&m[2]?m[2]:'';if(p.charAt(0)!=='/')p='/'+p;if(p!==b&&p.indexOf(b+'/')!==0)p=b+p;return p+s;}window.fetch=function(i,n){n=n?Object.assign({},n):{};if(n.credentials==null)n.credentials='same-origin';if(typeof i==='string')return o(pref(i),n);if(i&&typeof URL!=='undefined'&&i instanceof URL)return o(pref(i.toString()),n);if(i&&typeof Request!=='undefined'&&i instanceof Request){var nu=pref(i.url);if(nu!==i.url)return o(new Request(nu,i),n);}return o(i,n);};})();`;
}
