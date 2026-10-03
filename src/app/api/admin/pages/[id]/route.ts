import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { deletePage, getPageById, pagePublicPath, updatePage } from '@/lib/cms';
import { keepOldAddress } from '@/lib/redirects';
import { isBlockedCustomPageSlug, isReservedSiteSlug } from '@/lib/reserved-slugs';

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
    const before = body.slug ? await getPageById(Number(id)) : null;
    const page = await updatePage(Number(id), body);
    if (!page) return jsonError('Not found', 404);
    // Dedicated routes (home, contact, careers…) keep their own URL; a redirect there would hide them.
    const systemRoute = [before?.slug, page.slug].some((s) => s && isReservedSiteSlug(s));
    const redirect = systemRoute ? null : await keepOldAddress(before, page, (p) => pagePublicPath(p.slug));
    return jsonOk({ page, redirect });
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
