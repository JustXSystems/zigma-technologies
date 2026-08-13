import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { deleteFormField, updateFormField } from '@/lib/catalog';

const schema = z.object({
  label: z.string().min(1).optional(),
  field_type: z.enum(['text', 'email', 'tel', 'textarea', 'select', 'number', 'checkbox']).optional(),
  required: z.boolean().optional(),
  options_json: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  sort_order: z.number().optional(),
  enabled: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = schema.parse(await readJson(request));
    await updateFormField(Number(id), body);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Update failed', 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    await deleteFormField(Number(id));
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Delete failed', 500);
  }
}
