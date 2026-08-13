import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createRedirect, deleteRedirect, listRedirects, updateRedirect } from '@/lib/redirects';

export async function GET() {
  try {
    await requireAdmin();
    const redirects = await listRedirects(true);
    return jsonOk({ redirects });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Failed to list redirects', 500);
  }
}

const createSchema = z.object({
  from_path: z.string().min(1),
  to_path: z.string().min(1),
  status_code: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).optional(),
  enabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await readJson(request));
    const id = await createRedirect(body);
    return jsonOk({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}

const patchSchema = z.object({
  id: z.number().int().positive(),
  from_path: z.string().min(1).optional(),
  to_path: z.string().min(1).optional(),
  status_code: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = patchSchema.parse(await readJson(request));
    await updateRedirect(body.id, body);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Update failed', 500);
  }
}

const deleteSchema = z.object({ id: z.number().int().positive() });

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = deleteSchema.parse(await readJson(request));
    await deleteRedirect(body.id);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Delete failed', 500);
  }
}
