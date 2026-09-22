import { INDUSTRY_DEFS, industryPageSlug, industryPublicPath } from '@/lib/industries';
import { INDUSTRIES_HUB_SEED_SECTIONS, INDUSTRY_HUB_IMAGES } from '@/lib/industry-hub-seed';
import { createPage, createSection, getPageBySlug, listSections, updatePage } from '@/lib/cms';

async function seedIndustriesHubPage() {
  let page = await getPageBySlug('industries', true);
  if (!page) {
    page = await createPage({
      slug: 'industries',
      title: 'Industries',
      meta_title: 'Industries | Zigma Technologies',
      meta_description:
        'Explore tailored UPS, solar, BESS, and service pathways for healthcare, data centres, manufacturing, banking, education, and airports.',
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

  const cards = INDUSTRY_DEFS.map((ind) => ({
    key: ind.key,
    eyebrow: ind.eyebrow,
    name: ind.name,
    lead: ind.lead,
    image: INDUSTRY_HUB_IMAGES[ind.key] || '/assets/images/city-skyline-with-solar-panels-and-indus.jpg',
    href: industryPublicPath(ind.key),
  }));

  for (let i = 0; i < INDUSTRIES_HUB_SEED_SECTIONS.length; i++) {
    const seed = INDUSTRIES_HUB_SEED_SECTIONS[i];
    const content =
      seed.type === 'industry_hub'
        ? { ...seed.content_json, cards }
        : { ...seed.content_json };
    await createSection({
      page_id: page.id,
      type: seed.type,
      section_key: seed.section_key,
      title: seed.title,
      content_json: content as Record<string, unknown>,
      sort_order: i,
      enabled: true,
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
          image: INDUSTRY_HUB_IMAGES[ind.key] || '/assets/images/city-skyline-with-solar-panels-and-indus.jpg',
          primaryCta: 'Request industry consultation →',
          primaryHref: `/contact?consult=1&consult_subject=${encodeURIComponent(ind.subject)}`,
          secondaryCta: 'Browse projects',
          secondaryHref: '/projects',
        },
      },
      {
        type: 'rich_text',
        section_key: 'overview',
        title: 'Overview',
        content_json: {
          html: `<p>${ind.lead}</p><p>Public landing: <a href="${industryPublicPath(ind.key)}">${industryPublicPath(ind.key)}</a></p>`,
        },
      },
      {
        type: 'cta',
        section_key: 'cta',
        title: 'CTA',
        content_json: {
          variant: 'inner',
          title: `Talk to us about ${ind.name}`,
          body: 'Share your load profile, site constraints, and timeline — we will propose a clear path.',
          primaryCta: 'Request consultation',
          primaryHref: `/contact?consult=1&consult_subject=${encodeURIComponent(ind.subject)}`,
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
  return {
    created,
    skipped,
    total: INDUSTRY_DEFS.length,
    hubSeeded: hub.hubSeeded,
    hubSkipped: hub.hubSkipped,
  };
}
