import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { deletePage, getPageById, updatePage } from '@/lib/cms';
import { isBlockedCustomPageSlug } from '@/lib/reserved-slugs';

const updateSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const page = await getPageById(Number(id));
    if (!page) return jsonError('Not found', 404);
    return jsonOk({ page });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to load page', 500);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = updateSchema.parse(await readJson(request));
    if (body.slug) {
      const slug = body.slug.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
      if (isBlockedCustomPageSlug(slug)) {
        return jsonError(`Slug "${slug}" is reserved for a system route`, 400);
      }
      body.slug = slug;
    }
    const page = await updatePage(Number(id), body);
    if (!page) return jsonError('Not found', 404);
    return jsonOk({ page });
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
    await deletePage(Number(id));
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Delete failed', 500);
  }
}
