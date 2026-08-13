import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createResourcePost, listResourcePosts } from '@/lib/resources';

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || undefined;
    const posts = await listResourcePosts({ admin: true, q });
    return jsonOk({ posts });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError('Failed to list resources', 500);
  }
}

const createSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().nullable().optional(),
  body_html: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  tags_json: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).optional(),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = createSchema.parse(await readJson(request));
    const id = await createResourcePost(body);
    return jsonOk({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
