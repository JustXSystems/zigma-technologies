import type { MetadataRoute } from 'next';
import { withBasePath } from '@/lib/base-path';
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

  // Next does not prefix icon/start_url with basePath in the generated
  // webmanifest — without this, subdirectory deploys resolve icons against the
  // host root (e.g. justxsystems.com/assets/…) and get HTML instead of PNG.
  const iconSrc = withBasePath(DEFAULT_FAVICON);

  return {
    name: settings.companyName,
    short_name: settings.companyName.split(/\s+/)[0] || 'Zigma',
    description: settings.defaultMetaDescription,
    start_url: withBasePath('/'),
    display: 'standalone',
    background_color: '#0b1220',
    theme_color: '#0b1220',
    icons: [
      {
        src: iconSrc,
        sizes: '300x300',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: iconSrc,
        sizes: '300x300',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
