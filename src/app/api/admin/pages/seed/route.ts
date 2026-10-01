import { requireScreen } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { PageSeedError, getPageSeedStatuses, restorePageSeed, syncPageSeed, syncPageSeeds } from '@/lib/page-seeds';

function fail(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
  if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
  if (error instanceof PageSeedError) return jsonError(error.message, error.status);
  console.error(error);
  return jsonError(error instanceof Error ? error.message : fallback, 500);
}

/** Seed status of every built-in page: what a Seed run would do, and what can be restored. */
export async function GET() {
  try {
    await requireScreen('pages');
    return jsonOk({ pages: await getPageSeedStatuses() });
  } catch (error) {
    return fail(error, 'Failed to load seed status');
  }
}

/**
 * POST { action: 'sync', slug?: string }  — seed one built-in page, or every built-in page when slug is omitted.
 * POST { action: 'restore', slug: string } — restore the page's upgraded sections to their pre-upgrade version.
 * Both are safe to repeat; the response carries the per-page results and the refreshed status list.
 */
export async function POST(request: Request) {
  try {
    const session = await requireScreen('pages');
    const body = (await request.json().catch(() => ({}))) as { action?: string; slug?: string };
    const action = String(body.action || 'sync');
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const actor = session.email || session.name || null;

    let results;
    if (action === 'sync') {
      results = slug ? [await syncPageSeed(slug, actor)] : await syncPageSeeds(undefined, actor);
    } else if (action === 'restore') {
      if (!slug) return jsonError('slug is required to restore a page');
      results = [await restorePageSeed(slug, actor)];
    } else {
      return jsonError('action must be sync or restore');
    }

    const changed = results.filter((r) => r.changed).length;
    const failed = results.filter((r) => !r.ok).length;
    const message =
      results.length === 1
        ? results[0].message
        : `Seeded ${results.length} built-in pages: ${changed} changed, ${results.length - changed - failed} already up to date${
            failed ? `, ${failed} failed` : ''
          }.`;
    return jsonOk({ message, results, pages: await getPageSeedStatuses() });
  } catch (error) {
    return fail(error, 'Seed failed');
  }
}
