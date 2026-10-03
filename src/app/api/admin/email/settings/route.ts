import { z } from 'zod';
import { jsonOk, readJson } from '@/lib/api';
import { getThemeSettings } from '@/lib/cms';
import { normalizeMailConfig, resolveNotifyEmails, type MailConfig } from '@/lib/mail-config';
import { deleteMailAttachment, getMailSettings, saveMailSettings, type StoredMailSettings } from '@/lib/mail-store';
import { effectiveProvider } from '@/lib/mail-transport';
import { mergeSiteSettings } from '@/lib/site-settings';
import { emailRouteError, requireEmailAdmin } from '../_shared';

async function view(stored: StoredMailSettings) {
  const site = mergeSiteSettings((await getThemeSettings()).site);
  const config = stored.config;
  if (!stored.saved) {
    // First visit: reflect what the site does today (SMTP_* env).
    config.provider = effectiveProvider(config, false);
    config.fromName = config.fromName || site.companyName;
  }
  // Carry the notify list over from Site Settings; the next save stores it here for good.
  config.notifyEmails = resolveNotifyEmails(config, site.enquiryNotifyEmail);
  return {
    config,
    saved: stored.saved,
    updatedAt: stored.updatedAt,
    secretsUnreadable: stored.secretsUnreadable,
    hasGraphSecret: Boolean(stored.secrets.graphClientSecret),
    hasSmtpPassword: Boolean(stored.secrets.smtpPassword),
    activeProvider: effectiveProvider(stored.config, stored.saved),
    legacyEnvSmtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
    site: {
      companyName: site.companyName,
      phone: site.phone,
      supportEmail: site.supportEmail,
      siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, ''),
    },
  };
}

export async function GET() {
  try {
    await requireEmailAdmin();
    return jsonOk(await view(await getMailSettings()));
  } catch (error) {
    return emailRouteError(error, 'Failed to load email settings');
  }
}

const secretSchema = z.string().max(2000).optional();

const putSchema = z.object({
  config: z.record(z.string(), z.unknown()),
  secrets: z.object({ graphClientSecret: secretSchema, smtpPassword: secretSchema }).optional(),
});

function attachmentIds(config: MailConfig) {
  return new Set(Object.values(config.templates).flatMap((t) => t.attachments.map((a) => a.id)));
}

export async function PUT(request: Request) {
  try {
    await requireEmailAdmin();
    const body = putSchema.parse(await readJson(request));
    const previous = await getMailSettings();
    const config = normalizeMailConfig(body.config);
    const saved = await saveMailSettings(config, {
      graphClientSecret: body.secrets?.graphClientSecret?.trim(),
      smtpPassword: body.secrets?.smtpPassword,
    });
    const keep = attachmentIds(saved.config);
    for (const id of attachmentIds(previous.config)) {
      if (!keep.has(id)) await deleteMailAttachment(id);
    }
    return jsonOk(await view(saved));
  } catch (error) {
    return emailRouteError(error, 'Failed to save email settings');
  }
}
