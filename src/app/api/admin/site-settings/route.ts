import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { getThemeSettings, upsertThemeSetting } from '@/lib/cms';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';

export async function GET() {
  try {
    await requireSession();
    const theme = await getThemeSettings();
    return jsonOk({ settings: mergeSiteSettings(theme.site) });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to load site settings', 500);
  }
}

const settingKeys = Object.keys(DEFAULT_SITE_SETTINGS) as Array<keyof SiteSettings>;
const schema = z.object(
  Object.fromEntries(
    settingKeys.map((key) => [key, key === 'companyName' ? z.string().min(1).optional() : z.string().optional()])
  )
) as z.ZodType<Partial<SiteSettings>>;

export async function PUT(request: Request) {
  try {
    await requireSession();
    const body = schema.parse(await readJson(request));
    const theme = await getThemeSettings();
    const next = mergeSiteSettings({ ...(theme.site as object), ...body });
    await upsertThemeSetting('site', next);
    return jsonOk({ settings: next });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to save site settings', 500);
  }
}

export { DEFAULT_SITE_SETTINGS };
