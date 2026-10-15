import { requireScreen } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { isHubTemplate } from '@/lib/blog-design';
import { applyHubScheme } from '@/lib/blog-hub-presets';
import { BLOG_SLUG } from '@/lib/blog-sections';
import { getPageBySlug, listSections, updateSection } from '@/lib/cms';

/** POST { template } — recolour every /blog section for that hub design (copy and spacing are kept). */
export async function POST(request: Request) {
  try {
    await requireScreen('pages');
    const body = (await readJson(request)) as { template?: unknown };
    if (!isHubTemplate(body.template)) return jsonError('Unknown blog design', 400);

    const page = await getPageBySlug(BLOG_SLUG, true);
    if (!page) return jsonError('The /blog page does not exist yet — create it under Page sections first.', 404);

    let updated = 0;
    for (const section of await listSections(page.id, true)) {
      const content = applyHubScheme(section.type, section.content_json || {}, body.template);
      if (!content) continue;
      await updateSection(section.id, { content_json: content });
      updated += 1;
    }
    return jsonOk({ updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    console.error(error);
    return jsonError('Failed to apply the design colours', 500);
  }
}
