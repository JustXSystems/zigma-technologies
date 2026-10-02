import { after } from 'next/server';
import { z } from 'zod';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createEnquiry, getDefaultForm } from '@/lib/catalog';
import { guardPublicForm } from '@/lib/form-guard';
import { notifySubmission } from '@/lib/mail';

const schema = z.object({
  brochure_url: z.string().min(1),
  item_id: z.number().nullable().optional(),
  item_type: z.enum(['project', 'product', 'service', 'general']).optional(),
  item_title: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  _hp: z.string().optional(),
});

function isSafeBrochureUrl(url: string) {
  if (url.startsWith('/assets/')) return true;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await readJson(request));
    const guard = guardPublicForm(request, 'brochure', body._hp);
    if (guard.action === 'honeypot') {
      return jsonOk({ download_url: body.brochure_url, message: 'OK' }, { status: 201 });
    }
    if (guard.action === 'rate_limited') {
      return jsonError(`Too many submissions. Please try again in ${guard.retryAfterSec} seconds.`, 429);
    }
    if (!isSafeBrochureUrl(body.brochure_url)) {
      return jsonError('Invalid brochure URL', 400);
    }

    const form = await getDefaultForm();
    if (!form) return jsonError('Form not configured', 500);

    const payload = {
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      company: body.company || '',
      subject: 'Brochure download',
      message: `Requested brochure for: ${body.item_title || 'catalog item'}\nURL: ${body.brochure_url}`,
      source: 'brochure_download',
      brochure_url: body.brochure_url,
    };

    const itemType = body.item_type || 'general';
    const id = await createEnquiry({
      form_id: form.id,
      item_id: body.item_id ?? null,
      item_type: itemType,
      payload_json: payload,
    });

    after(() => notifySubmission({ kind: 'enquiry', id, itemType, itemId: body.item_id, itemTitle: body.item_title, payload }));

    return jsonOk(
      { id, download_url: body.brochure_url, message: 'Brochure unlocked' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Submit failed', 500);
  }
}