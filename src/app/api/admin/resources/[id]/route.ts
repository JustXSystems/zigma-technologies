import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { deleteResourcePost, getResourcePostById, updateResourcePost } from '@/lib/resources';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const post = await getResourcePostById(Number(id));
    if (!post) return jsonError('Not found', 404);
    return jsonOk({ post });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to load', 500);
  }
}

const patchSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  excerpt: z.string().nullable().optional(),
  body_html: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  tags_json: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).optional(),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().optional(),
});

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = patchSchema.parse(await readJson(request));
    await updateResourcePost(Number(id), body);
    const post = await getResourcePostById(Number(id));
    return jsonOk({ post });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Update failed', 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    await deleteResourcePost(Number(id));
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Delete failed', 500);
  }
}
