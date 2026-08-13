import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { reorderNavItems } from '@/lib/cms';

const schema = z.object({
  location: z.enum(['header', 'footer']),
  ordered_ids: z.array(z.number().int().positive()).min(1),
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = schema.parse(await readJson(request));
    await reorderNavItems(body.location, body.ordered_ids);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to reorder nav', 500);
  }
}
