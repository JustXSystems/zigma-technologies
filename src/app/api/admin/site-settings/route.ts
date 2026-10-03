import { z } from 'zod';
import { hasScreenAccess } from '@/lib/admin-screens';
import { requireScreen, requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { getThemeSettings, upsertThemeSetting } from '@/lib/cms';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';

/** Only Site Settings editors see secrets; page editors read settings for previews. */
const SECRET_KEYS: Array<keyof SiteSettings> = ['crmWebhookSecret'];

export async function GET() {
  try {
    const session = await requireSession();
    const theme = await getThemeSettings();
    const settings = mergeSiteSettings(theme.site);
    if (!hasScreenAccess(session.screens, 'siteSettings')) {
      for (const key of SECRET_KEYS) settings[key] = '';
    }
    return jsonOk({ settings });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to load site settings', 500);
  }
}

const settingKeys = Object.keys(DEFAULT_SITE_SETTINGS) as Array<keyof SiteSettings>;
const partialSettings = z
  .object(
    Object.fromEntries(
      settingKeys.map((key) => [key, key === 'companyName' ? z.string().min(1).optional() : z.string().optional()])
    )
  )
  .strict() as unknown as z.ZodType<Partial<SiteSettings>>;

/**
 * `changes` holds only the edited keys; `base` holds their values as the editor last loaded them.
 * A key conflicts when someone else saved a different value for it in the meantime.
 */
const schema = z.object({ changes: partialSettings, base: partialSettings });

export async function PUT(request: Request) {
  try {
    await requireScreen('siteSettings');
    const { changes, base } = schema.parse(await readJson(request));
    const theme = await getThemeSettings();
    const current = mergeSiteSettings(theme.site);

    const keys = Object.keys(changes) as Array<keyof SiteSettings>;
    const conflicts = keys.filter(
      (key) => key in base && current[key] !== base[key] && current[key] !== changes[key]
    );
    if (conflicts.length) {
      return jsonError('Some fields were changed by someone else since you opened this page.', 409, {
        code: 'STALE',
        conflicts,
        settings: current,
      });
    }

    const next = mergeSiteSettings({ ...(theme.site as object), ...changes });
    if (keys.length) await upsertThemeSetting('site', next);
    return jsonOk({ settings: next, saved: keys });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload — reload the page and try again.', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Failed to save site settings', 500);
  }
}

export { DEFAULT_SITE_SETTINGS };
