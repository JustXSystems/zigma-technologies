import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { deleteTestimonial, updateTestimonial } from '@/lib/testimonials';

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  quote: z.string().min(1).optional(),
  author_name: z.string().min(1).optional(),
  author_role: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  locale: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  featured: z.boolean().optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().optional(),
});

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = schema.parse(await readJson(request));
    await updateTestimonial(Number(id), body);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Update failed', 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    await deleteTestimonial(Number(id));
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Delete failed', 500);
  }
}
