import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createPressPost, listPressPosts, seedPressPosts } from '@/lib/press';

export async function GET() {
  try {
    await requireSession();
    const posts = await listPressPosts({ admin: true });
    return jsonOk({ posts });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to list press', 500);
  }
}

const schema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().nullable().optional(),
  body_html: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  source_name: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
  enabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = schema.parse(await readJson(request));
    const id = await createPressPost(body);
    return jsonOk({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
