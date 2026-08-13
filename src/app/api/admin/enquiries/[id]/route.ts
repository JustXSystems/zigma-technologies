import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { deleteEnquiry, updateEnquiry } from '@/lib/catalog';

const schema = z.object({
  status: z.enum(['new', 'in_progress', 'closed']).optional(),
  admin_notes: z.string().nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = schema.parse(await readJson(request));
    await updateEnquiry(Number(id), body);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    return jsonError(
      error instanceof Error && /Unknown column 'admin_notes'/.test(error.message)
        ? 'Run scripts/migrate-enquiry-notes.sql to enable admin notes'
        : 'Update failed',
      500
    );
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    await deleteEnquiry(Number(id));
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Delete failed', 500);
  }
}
