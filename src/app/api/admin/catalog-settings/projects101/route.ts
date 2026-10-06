import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { getPageSettings } from '@/lib/catalog';
import { createSection, getPageBySlug, reorderSections } from '@/lib/cms';
import type { CmsPage } from '@/lib/cms-types';
import { PageSeedError, syncPageSeed } from '@/lib/page-seeds';
import { PROJECTS101_SEED_SECTIONS, PROJECTS101_SLUG } from '@/lib/projects101-sections';

function fail(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
  if (error instanceof PageSeedError) return jsonError(error.message, error.status);
  console.error(error);
  return jsonError(error instanceof Error ? error.message : fallback, 500);
}

async function snapshot() {
  const [page, settings] = await Promise.all([getPageBySlug(PROJECTS101_SLUG, true), getPageSettings('project')]);
  return { page, listing_design: settings?.listing_design ?? 'classic' };
}

/** Re-adds design sections whose key is no longer on the page, each next to its design neighbour. */
async function restoreMissing(page: CmsPage) {
  const sections = page.sections || [];
  const present = new Set(sections.map((s) => s.section_key).filter(Boolean));
  const missing = PROJECTS101_SEED_SECTIONS.filter((s) => s.section_key && !present.has(s.section_key));
  if (!missing.length) return 'Every design section is already on the page. Nothing changed.';

  const order = sections.map((s) => ({ id: s.id, key: s.section_key }));
  for (const seed of missing) {
    const created = await createSection({
      page_id: page.id,
      type: seed.type,
      section_key: seed.section_key,
      title: seed.title,
      content_json: seed.content_json,
    });
    if (!created) continue;
    const before = new Set(PROJECTS101_SEED_SECTIONS.slice(0, PROJECTS101_SEED_SECTIONS.indexOf(seed)).map((s) => s.section_key));
    let at = 0;
    order.forEach((o, i) => {
      if (o.key && before.has(o.key)) at = i + 1;
    });
    order.splice(at, 0, { id: created.id, key: seed.section_key });
  }
  await reorderSections(page.id, order.map((o) => o.id));
  return `Added ${missing.length} design section${missing.length === 1 ? '' : 's'}: ${missing.map((s) => s.title).join(', ')}.`;
}

/** Projects 101 page (with every section) and whether /projects currently serves it. */
export async function GET() {
  try {
    await requireSession();
    return jsonOk(await snapshot());
  } catch (error) {
    return fail(error, 'Failed to load Projects 101');
  }
}

/**
 * POST { action: 'seed' } creates the page from the design, or re-adds any design section that is
 * missing. Existing sections are never changed, so it is safe to repeat.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJson<{ action?: string }>(request).catch(() => ({}) as { action?: string });
    if ((body.action || 'seed') !== 'seed') return jsonError('action must be seed');
    const page = await getPageBySlug(PROJECTS101_SLUG, true);
    const message =
      page && page.sections?.length
        ? await restoreMissing(page)
        : (await syncPageSeed(PROJECTS101_SLUG, session.email || session.name || null)).message;
    return jsonOk({ message, ...(await snapshot()) });
  } catch (error) {
    return fail(error, 'Seed failed');
  }
}
