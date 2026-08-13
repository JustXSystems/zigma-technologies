import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { deletePressPost, getPressPostById, updatePressPost } from '@/lib/press';

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  excerpt: z.string().nullable().optional(),
  body_html: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  source_name: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().optional(),
});

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = schema.parse(await readJson(request));
    const post = await updatePressPost(Number(id), body);
    if (!post) return jsonError('Not found', 404);
    return jsonOk({ post });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Update failed', 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const existing = await getPressPostById(Number(id));
    if (!existing) return jsonError('Not found', 404);
    await deletePressPost(Number(id));
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Delete failed', 500);
  }
}
