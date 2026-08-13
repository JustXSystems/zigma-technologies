import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createTestimonial, listTestimonials } from '@/lib/testimonials';

export async function GET() {
  try {
    await requireSession();
    const items = await listTestimonials({ admin: true });
    return jsonOk({ items });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to list testimonials', 500);
  }
}

const schema = z.object({
  quote: z.string().min(1),
  author_name: z.string().min(1),
  author_role: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  locale: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  featured: z.boolean().optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = schema.parse(await readJson(request));
    const id = await createTestimonial(body);
    return jsonOk({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Create failed', 500);
  }
}
