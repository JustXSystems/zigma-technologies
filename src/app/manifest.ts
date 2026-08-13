import type { MetadataRoute } from 'next';
import { getThemeSettings } from '@/lib/cms';
import { DEFAULT_FAVICON, DEFAULT_SITE_SETTINGS, mergeSiteSettings } from '@/lib/site-settings';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let settings = DEFAULT_SITE_SETTINGS;
  try {
    const theme = await getThemeSettings();
    settings = mergeSiteSettings(theme.site);
  } catch {
    // use defaults
  }

  return {
    name: settings.companyName,
    short_name: settings.companyName.split(/\s+/)[0] || 'Zigma',
    description: settings.defaultMetaDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1220',
    theme_color: '#0b1220',
    icons: [
      {
        src: DEFAULT_FAVICON,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: DEFAULT_FAVICON,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
