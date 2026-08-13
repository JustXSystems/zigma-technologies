/** Visitor preference cookie for industry / city personalization. */

export const PREF_COOKIE = 'zigma_prefs';

export type VisitorPrefs = {
  industry?: string;
  city?: string;
  updatedAt?: number;
};

export function parsePrefs(raw: string | undefined | null): VisitorPrefs {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as VisitorPrefs;
    return {
      industry: typeof parsed.industry === 'string' ? parsed.industry : undefined,
      city: typeof parsed.city === 'string' ? parsed.city : undefined,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : undefined,
    };
  } catch {
    return {};
  }
}

export function serializePrefs(prefs: VisitorPrefs) {
  return encodeURIComponent(JSON.stringify({ ...prefs, updatedAt: Date.now() }));
}

export function readPrefsFromDocument(): VisitorPrefs {
  if (typeof document === 'undefined') return {};
  const match = document.cookie.match(new RegExp(`(?:^|; )${PREF_COOKIE}=([^;]*)`));
  return parsePrefs(match?.[1]);
}

export function writePrefsToDocument(prefs: VisitorPrefs) {
  if (typeof document === 'undefined') return;
  const value = serializePrefs(prefs);
  const maxAge = 60 * 60 * 24 * 180;
  document.cookie = `${PREF_COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
