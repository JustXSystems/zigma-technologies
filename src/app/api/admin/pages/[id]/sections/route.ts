import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { clearPageSections, getPageById } from '@/lib/cms';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const page = await getPageById(Number(id));
    if (!page) return jsonError('Not found', 404);
    await clearPageSections(page.id);
    return jsonOk({ ok: true, message: `Cleared all sections for ${page.title}.` });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to clear sections', 500);
  }
}
