import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { getPageBySlug, listSections, updateSection } from '@/lib/cms';
import {
  INDUSTRY_PAGE_UPGRADE_MAP,
  INDUSTRY_PAGE_UPGRADE_SLUGS,
  isIndustryPageSectionType,
  upgradeIndustryPageSection,
} from '@/lib/industry-page-sections';

/** Old section (type + content) kept inside the upgraded section so the upgrade can be reverted. */
type Previous = { type: string; content: Record<string, unknown> };

function previousOf(content: unknown): Previous | null {
  const prev = (content as { _previous?: Previous } | null)?._previous;
  return prev && typeof prev.type === 'string' && prev.content && typeof prev.content === 'object' ? prev : null;
}

/**
 * POST { action: 'upgrade' | 'revert' | 'status', slug?: 'industries-healthcare' }
 * upgrade: converts an industry page's generic sections (page_hero, rich_text, cta) in place to the configurable
 *   industry_page_* types, keeping order, visibility, key, title, custom CSS and every content field.
 *   Only the given industry page is touched (the same types on other pages stay as they are).
 * revert: restores the saved previous type + content of upgraded sections.
 */
export async function POST(request: Request) {
  try {
    await requireSession();
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'status');
    const slug = String(body.slug || INDUSTRY_PAGE_UPGRADE_SLUGS[0]);
    if (!(INDUSTRY_PAGE_UPGRADE_SLUGS as readonly string[]).includes(slug)) {
      return jsonError(`slug must be ${INDUSTRY_PAGE_UPGRADE_SLUGS.join(' or ')}`);
    }
    const page = await getPageBySlug(slug, true);
    if (!page) return jsonError(`The ${slug} page does not exist yet. Use "Seed industries" first.`, 404);
    const sections = await listSections(page.id, true);
    const upgradable = sections.filter((s) => INDUSTRY_PAGE_UPGRADE_MAP[s.type]);
    const revertable = sections.filter((s) => isIndustryPageSectionType(s.type) && previousOf(s.content_json));

    if (action === 'status') {
      return jsonOk({ page, upgradable: upgradable.length, revertable: revertable.length });
    }

    if (action === 'upgrade') {
      if (!upgradable.length) return jsonOk({ page, changed: 0, message: `The ${slug} page has no older sections left to upgrade.` });
      for (const s of upgradable) {
        const next = upgradeIndustryPageSection(s.type, s.content_json, slug);
        if (!next) continue;
        await updateSection(s.id, {
          type: next.type,
          content_json: { ...next.content, _previous: { type: s.type, content: s.content_json || {} } },
        });
      }
      return jsonOk({
        page,
        changed: upgradable.length,
        message: `Upgraded ${upgradable.length} ${slug} section${upgradable.length === 1 ? '' : 's'}. The previous version is kept and can be restored.`,
      });
    }

    if (action === 'revert') {
      if (!revertable.length) return jsonOk({ page, changed: 0, message: `No upgraded ${slug} sections with a saved previous version.` });
      for (const s of revertable) {
        const prev = previousOf(s.content_json);
        if (!prev) continue;
        await updateSection(s.id, { type: prev.type, content_json: prev.content });
      }
      return jsonOk({
        page,
        changed: revertable.length,
        message: `Restored ${revertable.length} ${slug} section${revertable.length === 1 ? '' : 's'} to the previous version.`,
      });
    }

    return jsonError('action must be upgrade, revert or status');
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Industry page upgrade failed', 500);
  }
}
