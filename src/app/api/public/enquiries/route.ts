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

const META_KEYS = new Set(['form_id', 'item_id', 'item_type', '_hp', 'turnstileToken', 'payload']);

const schema = z.object({
  form_id: z.number().optional(),
  item_id: z.number().nullable().optional(),
  item_type: z.enum(['project', 'product', 'service', 'general']).nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
  _hp: z.string().optional(),
  turnstileToken: z.string().optional(),
});

/**
 * Accept both:
 * - Canonical: { payload: { name, email, … }, item_type?, turnstileToken? }
 * - Flat shorthand: { name, email, subject, … } (wraps non-meta keys into payload)
 * Also coerces item_type: null (sent by several public forms) into undefined.
 */
function normalizeEnquiryBody(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = { ...(raw as Record<string, unknown>) };

  if (obj.item_type === null) delete obj.item_type;
  if (obj.item_id === null) obj.item_id = null;

  const existing =
    obj.payload && typeof obj.payload === 'object' && !Array.isArray(obj.payload)
      ? { ...(obj.payload as Record<string, unknown>) }
      : null;

  if (existing) {
    return { ...obj, payload: existing };
  }

  const payload: Record<string, unknown> = {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (META_KEYS.has(key)) out[key] = value;
    else payload[key] = value;
  }
  return { ...out, payload };
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(normalizeEnquiryBody(await readJson(request)));
    const guard = guardPublicForm(request, 'enquiry', body._hp);
    if (guard.action === 'honeypot') {
      return jsonOk({ id: 0, message: 'Enquiry submitted successfully' }, { status: 201 });
    }
    if (guard.action === 'rate_limited') {
      return jsonError(`Too many submissions. Please try again in ${guard.retryAfterSec} seconds.`, 429);
    }
    if (!(await verifyTurnstile(body.turnstileToken, request))) {
      return jsonError(
        'Captcha verification failed. Complete the captcha and try again, or refresh if it expired.',
        400,
        { code: 'CAPTCHA_FAILED' }
      );
    }

    const form = await getDefaultForm();
    if (!form) return jsonError('Form not configured', 500);

    const fields = (form.fields || []).filter((f) => f.enabled);
    for (const field of fields) {
      if (!field.required) continue;
      const value = body.payload[field.field_name];
      if (value == null || String(value).trim() === '') {
        return jsonError(`${field.label} is required`, 400, {
          code: 'FIELD_REQUIRED',
          field: field.field_name,
        });
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
    if (error instanceof z.ZodError) {
      const detail = error.issues
        .map((issue) => {
          const path = issue.path.length ? issue.path.join('.') : 'body';
          return `${path}: ${issue.message}`;
        })
        .join('; ');
      return jsonError(
        detail
          ? `Invalid enquiry payload (${detail}). Expected { payload: { name, email, … } } or flat fields.`
          : 'Invalid payload',
        400,
        { code: 'INVALID_PAYLOAD', issues: error.issues }
      );
    }
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
