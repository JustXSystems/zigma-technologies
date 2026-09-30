import { INDUSTRY_DEFS, industryPageSlug } from '@/lib/industries';
import { INDUSTRIES_SEED_SECTIONS_V2 } from '@/lib/industries-sections';
import { industryPageSeedSections } from '@/lib/industry-page-sections';
import { createPage, createSection, getPageBySlug, listSections, updatePage } from '@/lib/cms';

async function seedIndustriesHubPage() {
  let page = await getPageBySlug('industries', true);
  if (!page) {
    // Meta fields stay empty so Site Copy → SEO supplies the search title/description.
    page = await createPage({
      slug: 'industries',
      title: 'Industries',
      status: 'published',
      enabled: true,
    });
  } else {
    await updatePage(page.id, { status: 'published', enabled: true });
  }
  if (!page) return { hubCreated: false, hubSeeded: false, hubSkipped: true };

  const existing = await listSections(page.id, true);
  if (existing.length > 0) {
    return { hubCreated: false, hubSeeded: false, hubSkipped: true, page };
  }

  for (let i = 0; i < INDUSTRIES_SEED_SECTIONS_V2.length; i++) {
    const seed = INDUSTRIES_SEED_SECTIONS_V2[i];
    await createSection({
      page_id: page.id,
      type: seed.type,
      section_key: seed.section_key,
      title: seed.title,
      content_json: seed.content_json,
      sort_order: i,
      enabled: seed.enabled !== false,
    });
  }

  return { hubCreated: true, hubSeeded: true, hubSkipped: false, page };
}

/** Seed CMS page for /industries hub + stubs for each industry landing (editable SEO + sections). */
export async function seedIndustryPages() {
  const hub = await seedIndustriesHubPage();

  let created = 0;
  let skipped = 0;
  for (const ind of INDUSTRY_DEFS) {
    const slug = industryPageSlug(ind.key);
    let page = await getPageBySlug(slug, true);
    if (!page) {
      page = await createPage({
        slug,
        title: ind.name,
        status: 'published',
        enabled: true,
      });
      created += 1;
    } else {
      await updatePage(page.id, { status: 'published', enabled: true });
    }
    if (!page) continue;

    const existing = await listSections(page.id, true);
    if (existing.length > 0) {
      skipped += 1;
      continue;
    }

    const sections = industryPageSeedSections(ind.key);
    for (let i = 0; i < sections.length; i++) {
      const seed = sections[i];
      await createSection({
        page_id: page.id,
        type: seed.type,
        section_key: seed.section_key,
        title: seed.title,
        content_json: seed.content_json,
        sort_order: i,
        enabled: true,
      });
    }
  }
  return {
    created,
    skipped,
    total: INDUSTRY_DEFS.length,
    hubSeeded: hub.hubSeeded,
    hubSkipped: hub.hubSkipped,
  };
}
