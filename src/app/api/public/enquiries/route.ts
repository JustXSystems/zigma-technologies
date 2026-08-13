import { z } from 'zod';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createEnquiry, getDefaultForm } from '@/lib/catalog';
import { getThemeSettings } from '@/lib/cms';
import { guardPublicForm } from '@/lib/form-guard';
import {
  formatEnquiryEmail,
  formatVisitorEnquiryReply,
  sendMail,
  sendVisitorAutoReply,
} from '@/lib/mail';
import { pushCrmLead } from '@/lib/crm';
import { mergeSiteSettings } from '@/lib/site-settings';
import { verifyTurnstile } from '@/lib/turnstile';

const schema = z.object({
  form_id: z.number().optional(),
  item_id: z.number().nullable().optional(),
  item_type: z.enum(['project', 'product', 'service', 'general']).optional(),
  payload: z.record(z.string(), z.unknown()),
  _hp: z.string().optional(),
  turnstileToken: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await readJson(request));
    const guard = guardPublicForm(request, 'enquiry', body._hp);
    if (guard.action === 'honeypot') {
      return jsonOk({ id: 0, message: 'Enquiry submitted successfully' }, { status: 201 });
    }
    if (guard.action === 'rate_limited') {
      return jsonError(`Too many submissions. Please try again in ${guard.retryAfterSec} seconds.`, 429);
    }
    if (!(await verifyTurnstile(body.turnstileToken, request))) {
      return jsonError('Captcha verification failed', 400);
    }

    const form = await getDefaultForm();
    if (!form) return jsonError('Form not configured', 500);

    const fields = (form.fields || []).filter((f) => f.enabled);
    for (const field of fields) {
      if (!field.required) continue;
      const value = body.payload[field.field_name];
      if (value == null || String(value).trim() === '') {
        return jsonError(`${field.label} is required`);
      }
    }

    const itemType = body.item_type || 'general';
    const id = await createEnquiry({
      form_id: body.form_id || form.id,
      item_id: body.item_id ?? null,
      item_type: itemType,
      payload_json: body.payload,
    });

    void notifyEnquiry(id, itemType, body.payload);

    return jsonOk({ id, message: 'Enquiry submitted successfully' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Submit failed', 500);
  }
}

async function notifyEnquiry(id: number, itemType: string, payload: Record<string, unknown>) {
  try {
    const theme = await getThemeSettings();
    const settings = mergeSiteSettings(theme.site);

    if (settings.enquiryNotifyEnabled.trim().toLowerCase() !== 'false') {
      const recipients = settings.enquiryNotifyEmail
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (recipients.length) {
        const mail = formatEnquiryEmail(payload, { id, item_type: itemType });
        await sendMail({ to: recipients, ...mail });
      }
    }

    const visitorEmail = typeof payload.email === 'string' ? payload.email.trim() : '';
    const visitorName = typeof payload.name === 'string' ? payload.name : undefined;
    if (visitorEmail) {
      await sendVisitorAutoReply(settings, visitorEmail, formatVisitorEnquiryReply(settings, visitorName));
    }

    await pushCrmLead(settings, {
      id,
      source: String(payload.source || 'enquiry'),
      item_type: itemType,
      payload,
    });
  } catch (err) {
    console.error('[enquiry-notify]', err);
  }
}
