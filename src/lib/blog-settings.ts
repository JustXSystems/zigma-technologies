import { getThemeSettings, upsertThemeSetting } from '@/lib/cms';
import { DEFAULT_BLOG_SETTINGS, mergeBlogSettings, type BlogSettings } from '@/lib/blog-design';

/** Blog-wide design settings (theme_settings.blog); defaults when unset or the DB is unreachable. */
export async function getBlogSettings(): Promise<BlogSettings> {
  try {
    return mergeBlogSettings((await getThemeSettings()).blog);
  } catch {
    return DEFAULT_BLOG_SETTINGS;
  }
}

export async function saveBlogSettings(settings: unknown): Promise<BlogSettings> {
  const merged = mergeBlogSettings(settings);
  await upsertThemeSetting('blog', merged);
  return merged;
}
