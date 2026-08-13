import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { getThemeSettings, upsertThemeSetting } from '@/lib/cms';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from '@/lib/site-settings';

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

const schema = z.object({
  companyName: z.string().min(1).optional(),
  tagline: z.string().optional(),
  footerBlurb: z.string().optional(),
  phone: z.string().optional(),
  emergencyPhone: z.string().optional(),
  email: z.string().optional(),
  supportEmail: z.string().optional(),
  whatsapp: z.string().optional(),
  headerCtaLabel: z.string().optional(),
  headerCtaHref: z.string().optional(),
  copyright: z.string().optional(),
  defaultMetaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  enquiryNotifyEmail: z.string().optional(),
  enquiryNotifyEnabled: z.string().optional(),
  visitorAutoReplyEnabled: z.string().optional(),
  logoUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  privacyUrl: z.string().optional(),
  termsUrl: z.string().optional(),
});

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
