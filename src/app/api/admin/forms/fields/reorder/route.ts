import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { reorderFormFields } from '@/lib/catalog';

const schema = z.object({
  form_id: z.number(),
  ordered_ids: z.array(z.number()).min(1),
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = schema.parse(await readJson(request));
    await reorderFormFields(body.form_id, body.ordered_ids);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Reorder failed', 500);
  }
}
