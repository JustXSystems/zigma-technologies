import { z } from 'zod';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createEnquiry, getDefaultForm } from '@/lib/catalog';
import { getThemeSettings } from '@/lib/cms';
import { guardPublicForm } from '@/lib/form-guard';
import { formatEnquiryEmail, sendMail } from '@/lib/mail';
import { pushCrmLead } from '@/lib/crm';
import { mergeSiteSettings } from '@/lib/site-settings';
import { verifyTurnstile } from '@/lib/turnstile';

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(7),
  preferred_time: z.string().optional(),
  note: z.string().optional(),
  _hp: z.string().optional(),
  turnstileToken: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await readJson(request));
    const guard = guardPublicForm(request, 'callback', body._hp);
    if (guard.action === 'honeypot') {
      return jsonOk({ id: 0, message: 'OK' }, { status: 201 });
    }
    if (guard.action === 'rate_limited') {
      return jsonError(`Too many submissions. Please try again in ${guard.retryAfterSec} seconds.`, 429);
    }
    if (!(await verifyTurnstile(body.turnstileToken, request))) {
      return jsonError('Captcha verification failed', 400);
    }

    const form = await getDefaultForm();
    if (!form) return jsonError('Form not configured', 500);

    const payload = {
      name: body.name,
      phone: body.phone,
      email: '',
      subject: 'Callback request',
      message: `Preferred time: ${body.preferred_time || 'ASAP'}\n${body.note || ''}`.trim(),
      source: 'callback_request',
      preferred_time: body.preferred_time || '',
    };

    const id = await createEnquiry({
      form_id: form.id,
      item_id: null,
      item_type: 'general',
      payload_json: payload,
    });

    try {
      const theme = await getThemeSettings();
      const settings = mergeSiteSettings(theme.site);
      if (settings.enquiryNotifyEnabled.trim().toLowerCase() !== 'false') {
        const recipients = settings.enquiryNotifyEmail.split(',').map((s) => s.trim()).filter(Boolean);
        if (recipients.length) {
          const mail = formatEnquiryEmail(payload, { id, item_type: 'general' });
          await sendMail({ to: recipients, ...mail });
        }
      }
      await pushCrmLead(settings, { id, source: 'callback_request', item_type: 'general', payload });
    } catch (err) {
      console.error('[callback-notify]', err);
    }

    return jsonOk({ id, message: 'Callback requested' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Submit failed', 500);
  }
}
