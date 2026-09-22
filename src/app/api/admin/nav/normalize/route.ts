import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { normalizeNavTreeSortOrders } from '@/lib/cms';
import { revalidatePublicShell } from '@/lib/revalidate-public-shell';

const schema = z.object({
  location: z.enum(['header', 'footer']),
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = schema.parse(await readJson(request));
    const result = await normalizeNavTreeSortOrders(body.location);
    revalidatePublicShell();
    return jsonOk({
      ok: true,
      updated: result.updated,
      message: `Repaired ${body.location} tree order (${result.updated} rows).`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to repair nav order', 500);
  }
}
