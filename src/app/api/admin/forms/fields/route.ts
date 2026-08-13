import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createFormField, getDefaultForm } from '@/lib/catalog';

const schema = z.object({
  form_id: z.number().optional(),
  field_name: z.string().min(1).regex(/^[a-z0-9_]+$/),
  label: z.string().min(1),
  field_type: z.enum(['text', 'email', 'tel', 'textarea', 'select', 'number', 'checkbox']),
  required: z.boolean().optional(),
  options_json: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  sort_order: z.number().optional(),
  enabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = schema.parse(await readJson(request));
    let formId = body.form_id;
    if (!formId) {
      const form = await getDefaultForm();
      if (!form) return jsonError('No form found', 404);
      formId = form.id;
    }
    const id = await createFormField({ ...body, form_id: formId });
    return jsonOk({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400, { details: error.issues });
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
