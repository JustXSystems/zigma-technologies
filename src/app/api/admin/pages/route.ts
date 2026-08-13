import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createPage, listPages } from '@/lib/cms';
import { isBlockedCustomPageSlug } from '@/lib/reserved-slugs';

const createSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().optional(),
});

export async function GET() {
  try {
    await requireSession();
    const pages = await listPages(true);
    return jsonOk({ pages });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to list pages', 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = createSchema.parse(await readJson(request));
    const slug = body.slug.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
    if (isBlockedCustomPageSlug(slug)) {
      return jsonError(`Slug "${slug}" is reserved for a system route`, 400);
    }
    const page = await createPage({ ...body, slug });
    return jsonOk({ page }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400, { details: error.issues });
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
