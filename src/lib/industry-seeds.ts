import { INDUSTRY_DEFS, industryPageSlug } from '@/lib/industries';
import { createPage, createSection, getPageBySlug, listSections, updatePage } from '@/lib/cms';

/** Seed CMS page stubs for each industry (editable SEO + rich text). Public UI uses /industries/[slug]. */
export async function seedIndustryPages() {
  let created = 0;
  let skipped = 0;
  for (const ind of INDUSTRY_DEFS) {
    const slug = industryPageSlug(ind.key);
    let page = await getPageBySlug(slug, true);
    if (!page) {
      page = await createPage({
        slug,
        title: ind.name,
        meta_title: `${ind.name} | Zigma Technologies`,
        meta_description: ind.lead,
        status: 'published',
        enabled: true,
      });
      created += 1;
    } else {
      await updatePage(page.id, {
        status: 'published',
        enabled: true,
        meta_title: `${ind.name} | Zigma Technologies`,
        meta_description: ind.lead,
      });
    }
    if (!page) continue;

    const existing = await listSections(page.id, true);
    if (existing.length > 0) {
      skipped += 1;
      continue;
    }

    const sections = [
      {
        type: 'page_hero',
        section_key: 'hero',
        title: ind.name,
        content_json: {
          eyebrow: ind.eyebrow,
          title: ind.name,
          lead: ind.lead,
          breadcrumb: 'Industries',
        },
      },
      {
        type: 'rich_text',
        section_key: 'overview',
        title: 'Overview',
        content_json: {
          html: `<p>${ind.lead}</p><p>Public landing: <a href="/industries/${ind.key}">/industries/${ind.key}</a></p>`,
        },
      },
      {
        type: 'cta',
        section_key: 'cta',
        title: 'CTA',
        content_json: {
          title: `Talk to us about ${ind.name}`,
          body: 'Share your load profile, site constraints, and timeline — we will propose a clear path.',
          ctaLabel: 'Request consultation',
          ctaHref: `/contact?consult=1&consult_subject=${encodeURIComponent(ind.subject)}`,
        },
      },
    ];

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
  return { created, skipped, total: INDUSTRY_DEFS.length };
}
