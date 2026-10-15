import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { blogPreviewKey } from '@/lib/blog-preview';
import { blogPostPath } from '@/lib/blog-sections';
import { createPreviewToken } from '@/lib/preview';
import { getResourcePostById } from '@/lib/resources';

type Ctx = { params: Promise<{ id: string }> };

/** A 12-hour link that opens the post on /blog even while it is a draft or hidden. */
export async function POST(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const post = await getResourcePostById(Number(id));
    if (!post) return jsonError('Not found', 404);

    const token = createPreviewToken(blogPreviewKey(post.slug));
    const url = `${blogPostPath(post.slug)}?preview=1&token=${encodeURIComponent(token)}`;
    return jsonOk({ url, expiresInHours: 12 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to create preview link', 500);
  }
}
