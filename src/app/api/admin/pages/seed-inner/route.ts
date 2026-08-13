import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { createPage, createSection, getPageBySlug, listSections, updatePage } from '@/lib/cms';
import {
  CONTACT_SEED_SECTIONS,
  CAREERS_SEED_SECTIONS,
  CERTIFICATIONS_SEED_SECTIONS,
} from '@/lib/inner-page-seeds';
import { PRIVACY_SEED_SECTIONS, TERMS_SEED_SECTIONS } from '@/lib/legal-page-seeds';

const SEEDS = {
  contact: {
    title: 'Contact',
    meta_title: 'Contact | Zigma Technologies',
    meta_description: 'Get in touch with Zigma Technologies for solar, UPS, BESS and EV charging support.',
    sections: CONTACT_SEED_SECTIONS,
  },
  careers: {
    title: 'Careers',
    meta_title: 'Careers | Zigma Technologies',
    meta_description: 'Join Zigma Technologies — careers in solar, power systems, and industrial engineering.',
    sections: CAREERS_SEED_SECTIONS,
  },
  certifications: {
    title: 'Certifications',
    meta_title: 'Certifications | Zigma Technologies',
    meta_description: 'OEM authorizations, ISO certification, and engineering partnerships.',
    sections: CERTIFICATIONS_SEED_SECTIONS,
  },
  privacy: {
    title: 'Privacy Policy',
    meta_title: 'Privacy Policy | Zigma Technologies',
    meta_description: 'How Zigma Technologies collects, uses, and protects personal information.',
    sections: PRIVACY_SEED_SECTIONS,
  },
  terms: {
    title: 'Terms of Use',
    meta_title: 'Terms of Use | Zigma Technologies',
    meta_description: 'Terms governing use of the Zigma Technologies website.',
    sections: TERMS_SEED_SECTIONS,
  },
} as const;

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = await request.json().catch(() => ({}));
    const slug = String(body.slug || '') as keyof typeof SEEDS;
    if (!SEEDS[slug]) {
      return jsonError('slug must be contact, careers, certifications, privacy, or terms');
    }

    const seedDef = SEEDS[slug];
    let page = await getPageBySlug(slug, true);
    if (!page) {
      page = await createPage({
        slug,
        title: seedDef.title,
        meta_title: seedDef.meta_title,
        meta_description: seedDef.meta_description,
        status: 'published',
        enabled: true,
      });
    } else {
      await updatePage(page.id, { status: 'published', enabled: true });
    }

    if (!page) return jsonError('Failed to ensure page', 500);

    const existing = await listSections(page.id, true);
    if (existing.length > 0) {
      return jsonOk({
        page,
        seeded: false,
        message: `${seedDef.title} already has ${existing.length} sections. Delete them first to re-seed.`,
        sections: existing,
      });
    }

    const created = [];
    for (let i = 0; i < seedDef.sections.length; i++) {
      const seed = seedDef.sections[i];
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
      message: `Seeded ${created.length} ${slug} sections.`,
      sections: created,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Seed failed', 500);
  }
}
