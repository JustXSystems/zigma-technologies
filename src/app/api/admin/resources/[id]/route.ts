import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { blogPostPath } from '@/lib/blog-sections';
import { keepOldAddress } from '@/lib/redirects';
import { resourcePostSchema, schemaMessage } from '@/lib/resource-post-schema';
import { deleteResourcePost, getResourcePostById, getResourcePostBySlug, updateResourcePost } from '@/lib/resources';

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

const patchSchema = resourcePostSchema.partial();

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = patchSchema.parse(await readJson(request));
    const before = await getResourcePostById(Number(id));
    if (!before) return jsonError('Not found', 404);
    if (body.slug && body.slug !== before.slug) {
      const clash = await getResourcePostBySlug(body.slug, { admin: true });
      if (clash && clash.id !== before.id) return jsonError(`Another post already uses /blog/${body.slug}`, 409);
    }
    await updateResourcePost(Number(id), body);
    const post = await getResourcePostById(Number(id));
    const redirect = await keepOldAddress(before, post, (p) => blogPostPath(p.slug));
    return jsonOk({ post, redirect });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(schemaMessage(error), 400);
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
