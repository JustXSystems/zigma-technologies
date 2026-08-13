import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { createPage, createSection, getPageBySlug, listSections, updatePage } from '@/lib/cms';
import { HOMEPAGE_SEED_SECTIONS } from '@/lib/homepage-seed';

export async function POST() {
  try {
    await requireSession();

    let page = await getPageBySlug('home', true);
    if (!page) {
      page = await createPage({
        slug: 'home',
        title: 'Home',
        meta_title: 'Zigma Technologies',
        meta_description: 'Solar, UPS, BESS & EV Charging Infrastructure in India',
        status: 'published',
        enabled: true,
      });
    } else {
      await updatePage(page.id, { status: 'published', enabled: true });
    }

    if (!page) return jsonError('Failed to ensure home page', 500);

    const existing = await listSections(page.id, true);
    if (existing.length > 0) {
      return jsonOk({
        page,
        seeded: false,
        message: `Home already has ${existing.length} sections. Delete them first to re-seed.`,
        sections: existing,
      });
    }

    const created = [];
    for (let i = 0; i < HOMEPAGE_SEED_SECTIONS.length; i++) {
      const seed = HOMEPAGE_SEED_SECTIONS[i];
      const section = await createSection({
        page_id: page.id,
        type: seed.type,
        section_key: seed.section_key,
        title: seed.title,
        content_json: seed.content_json as Record<string, unknown>,
        sort_order: i,
        enabled: true,
      });
      created.push(section);
    }

    return jsonOk({
      page,
      seeded: true,
      message: `Seeded ${created.length} homepage sections.`,
      sections: created,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Seed failed', 500);
  }
}
