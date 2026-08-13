import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { getThemeSettings, upsertThemeSetting } from '@/lib/cms';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from '@/lib/site-settings';
import { DEFAULT_SITE_COPY, applyBrandToSiteCopy, mergeSiteCopy } from '@/lib/site-copy';
import { DEFAULT_THEME_TOKENS } from '@/lib/theme-tokens';
import { saveSiteCopy } from '@/lib/site-content';

/**
 * New-client bootstrap: apply brand identity, optional demo seeds, reset chrome copy.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = z
      .object({
        companyName: z.string().min(1),
        tagline: z.string().optional(),
        phone: z.string().optional(),
        emergencyPhone: z.string().optional(),
        email: z.string().optional(),
        whatsapp: z.string().optional(),
        footerBlurb: z.string().optional(),
        seedDemoContent: z.boolean().optional(),
        resetThemeTokens: z.boolean().optional(),
        resetSiteCopy: z.boolean().optional(),
      })
      .parse(await readJson(request));

    const theme = await getThemeSettings();
    const nextSettings = mergeSiteSettings({
      ...(theme.site as object),
      companyName: body.companyName,
      tagline: body.tagline ?? DEFAULT_SITE_SETTINGS.tagline,
      phone: body.phone ?? DEFAULT_SITE_SETTINGS.phone,
      emergencyPhone: body.emergencyPhone ?? DEFAULT_SITE_SETTINGS.emergencyPhone,
      email: body.email ?? DEFAULT_SITE_SETTINGS.email,
      supportEmail: body.email ?? DEFAULT_SITE_SETTINGS.supportEmail,
      whatsapp: body.whatsapp ?? DEFAULT_SITE_SETTINGS.whatsapp,
      footerBlurb: body.footerBlurb ?? `${body.companyName} — power & energy engineering.`,
      copyright: `© ${new Date().getFullYear()} ${body.companyName}. All rights reserved.`,
      enquiryNotifyEmail: body.email ?? DEFAULT_SITE_SETTINGS.enquiryNotifyEmail,
      defaultMetaDescription: `${body.companyName} delivers power, energy, and engineering solutions.`,
      logoAlt: `${body.companyName} logo`,
    });
    await upsertThemeSetting('site', nextSettings);

    if (body.resetSiteCopy !== false) {
      const branded = applyBrandToSiteCopy(mergeSiteCopy(DEFAULT_SITE_COPY), body.companyName);
      await saveSiteCopy(branded);
    }

    if (body.resetThemeTokens) {
      await upsertThemeSetting('tokens', { ...DEFAULT_THEME_TOKENS });
    }

    const seedResults: Array<{ action: string; ok: boolean; message: string }> = [];
    if (body.seedDemoContent) {
      const bootstrap = await import('@/app/api/admin/setup/bootstrap/route');
      const res = await bootstrap.POST(
        new Request('http://local/api/admin/setup/bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bootstrap' }),
        })
      );
      const data = await res.json();
      if (Array.isArray(data.results)) seedResults.push(...data.results);
      else seedResults.push({ action: 'bootstrap', ok: res.ok, message: data.message || data.error || '' });
    }

    return jsonOk({
      settings: nextSettings,
      seeded: body.seedDemoContent || false,
      seedResults,
      message: `Brand applied for ${body.companyName}. Configure Site Copy, Theme Studio, and Navigation next.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Bootstrap failed', 500);
  }
}
