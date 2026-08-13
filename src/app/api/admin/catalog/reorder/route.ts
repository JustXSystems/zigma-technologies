import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { reorderCatalogItems } from '@/lib/catalog';

const schema = z.object({
  item_type: z.enum(['project', 'product', 'service']),
  ordered_ids: z.array(z.number()).min(1),
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = schema.parse(await readJson(request));
    await reorderCatalogItems(body.item_type, body.ordered_ids);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Reorder failed', 500);
  }
}
