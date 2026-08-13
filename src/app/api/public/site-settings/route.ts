import { jsonError, jsonOk } from '@/lib/api';
import { getThemeSettings } from '@/lib/cms';
import { mergeSiteSettings } from '@/lib/site-settings';

export async function GET() {
  try {
    const theme = await getThemeSettings();
    return jsonOk({ settings: mergeSiteSettings(theme.site) });
  } catch (error) {
    console.error(error);
    return jsonError('Failed to load site settings', 500);
  }
}
