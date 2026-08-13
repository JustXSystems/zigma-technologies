import { jsonError, jsonOk } from '@/lib/api';
import { getResourcePostBySlug } from '@/lib/resources';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const post = await getResourcePostBySlug(slug);
    if (!post) return jsonError('Not found', 404);
    return jsonOk({ post });
  } catch (error) {
    console.error(error);
    return jsonError('Failed to load resource', 500);
  }
}
