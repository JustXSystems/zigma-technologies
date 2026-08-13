import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { deleteSection, getSectionById, updateSection } from '@/lib/cms';

const updateSchema = z.object({
  type: z.string().optional(),
  section_key: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().optional(),
  content_json: z.record(z.string(), z.unknown()).optional(),
  style_json: z.record(z.string(), z.unknown()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const section = await getSectionById(Number(id));
    if (!section) return jsonError('Not found', 404);
    return jsonOk({ section });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to load section', 500);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = updateSchema.parse(await readJson(request));
    const section = await updateSection(Number(id), body);
    if (!section) return jsonError('Not found', 404);
    return jsonOk({ section });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError(error instanceof Error ? error.message : 'Update failed', 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    await deleteSection(Number(id));
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Delete failed', 500);
  }
}
