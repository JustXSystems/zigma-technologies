import { jsonError, jsonOk } from '@/lib/api';
import { getPageBySlug } from '@/lib/cms';
import { HOMEPAGE_SEED_SECTIONS } from '@/lib/homepage-seed';
import { CONTACT_SEED_SECTIONS, CAREERS_SEED_SECTIONS, CERTIFICATIONS_SEED_SECTIONS } from '@/lib/inner-page-seeds';
import { PRIVACY_SEED_SECTIONS, TERMS_SEED_SECTIONS } from '@/lib/legal-page-seeds';
import { verifyPreviewToken } from '@/lib/preview';

type Ctx = { params: Promise<{ slug: string }> };

function seedForSlug(slug: string) {
  if (slug === 'home') return HOMEPAGE_SEED_SECTIONS;
  if (slug === 'contact') return CONTACT_SEED_SECTIONS;
  if (slug === 'careers') return CAREERS_SEED_SECTIONS;
  if (slug === 'certifications') return CERTIFICATIONS_SEED_SECTIONS;
  if (slug === 'privacy') return PRIVACY_SEED_SECTIONS;
  if (slug === 'terms') return TERMS_SEED_SECTIONS;
  return null;
}

export async function GET(request: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const preview = searchParams.get('preview') === '1';
    const token = searchParams.get('token');
    const allowPreview = preview && verifyPreviewToken(slug, token);

    const page = await getPageBySlug(slug, allowPreview);

    if (page?.sections?.length) {
      return jsonOk({
        page,
        source: 'database',
        preview: allowPreview,
      });
    }

    const seed = seedForSlug(slug);
    if (seed) {
      return jsonOk({
        page: {
          id: 0,
          slug,
          title: slug === 'home' ? 'Home' : slug.charAt(0).toUpperCase() + slug.slice(1),
          meta_title: null,
          meta_description: null,
          status: 'published',
          sort_order: 0,
          enabled: 1,
          sections: seed.map((s, i) => ({
            id: i + 1,
            page_id: 0,
            type: s.type,
            section_key: s.section_key,
            title: s.title,
            sort_order: i,
            enabled: 1,
            content_json: s.content_json,
            style_json: {},
          })),
        },
        source: 'seed',
        preview: allowPreview,
      });
    }

    return jsonError('Page not found', 404);
  } catch (error) {
    console.error(error);
    return jsonError('Failed to load page', 500);
  }
}
