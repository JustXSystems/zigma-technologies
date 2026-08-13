import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createSection, listSections, SECTION_TYPES } from '@/lib/cms';

const createSchema = z.object({
  page_id: z.number(),
  type: z.string().min(1),
  section_key: z.string().nullish(),
  title: z.string().optional(),
  content_json: z.record(z.string(), z.unknown()).optional(),
  style_json: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().optional(),
});

export async function GET(request: Request) {
  try {
    await requireSession();
    const pageId = Number(new URL(request.url).searchParams.get('page_id'));
    if (!pageId) return jsonError('page_id required');
    const sections = await listSections(pageId, true);
    return jsonOk({ sections, types: SECTION_TYPES });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to list sections', 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = createSchema.parse(await readJson(request));
    const section = await createSection(body);
    return jsonOk({ section }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400, { details: error.issues });
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
