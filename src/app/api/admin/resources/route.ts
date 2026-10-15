import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { resourcePostSchema, schemaMessage } from '@/lib/resource-post-schema';
import { createResourcePost, getResourcePostBySlug, listResourcePosts } from '@/lib/resources';

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || undefined;
    const posts = await listResourcePosts({ admin: true, q });
    return jsonOk({ posts });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError('Failed to list posts', 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = resourcePostSchema.parse(await readJson(request));
    if (await getResourcePostBySlug(body.slug, { admin: true })) {
      return jsonError(`Another post already uses /blog/${body.slug}`, 409);
    }
    const id = await createResourcePost(body);
    return jsonOk({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(schemaMessage(error), 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
