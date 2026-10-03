import { mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';

/** Edited keys with their new values, plus the values they replaced (for the server's conflict check). */
export function diffSettings(saved: SiteSettings, current: SiteSettings) {
  const changes: Partial<SiteSettings> = {};
  const base: Partial<SiteSettings> = {};
  for (const key of Object.keys(current) as Array<keyof SiteSettings>) {
    if (current[key] === saved[key]) continue;
    changes[key] = current[key];
    base[key] = saved[key];
  }
  return { changes, base };
}

/**
 * Sends only the keys edited since `saved` was loaded. Resolves to the stored settings and the number
 * of keys written; rejects with a readable message when someone else changed one of them meanwhile.
 */
export async function saveSiteSettingsChanges(
  saved: SiteSettings,
  current: SiteSettings,
  fieldLabel: (key: string) => string = (key) => key
): Promise<{ settings: SiteSettings; changed: number }> {
  const { changes, base } = diffSettings(saved, mergeSiteSettings(current));
  const changed = Object.keys(changes).length;
  if (!changed) return { settings: saved, changed };
  const res = await fetch('/api/admin/site-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes, base }),
  });
  const data = await res.json();
  if (res.status === 409 && Array.isArray(data.conflicts)) {
    throw new Error(
      `${data.error} Changed elsewhere: ${data.conflicts.map(fieldLabel).join(', ')}. ` +
        'Reload the page to see the latest values, then reapply your edits.'
    );
  }
  if (!res.ok) throw new Error(data.error || 'Save failed');
  return { settings: mergeSiteSettings(data.settings), changed };
}
