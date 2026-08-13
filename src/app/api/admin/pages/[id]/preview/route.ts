import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { getPageById } from '@/lib/cms';
import { createPreviewToken } from '@/lib/preview';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const page = await getPageById(Number(id));
    if (!page) return jsonError('Not found', 404);

    const token = createPreviewToken(page.slug);
    const path = page.slug === 'home' ? '/' : `/${page.slug}`;
    const url = `${path}?preview=1&token=${encodeURIComponent(token)}`;

    return jsonOk({
      url,
      token,
      slug: page.slug,
      expiresInHours: 12,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to create preview link', 500);
  }
}
