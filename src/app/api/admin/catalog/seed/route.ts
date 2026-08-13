import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createCatalogItem, listCategories, listCatalogItems, addItemMedia, mediaKindFromUrl } from '@/lib/catalog';
import { CATALOG_SEED } from '@/lib/catalog-seed';
import type { CatalogItemType } from '@/lib/types';

const FALLBACK_MEDIA: Record<CatalogItemType, string> = {
  project: '/assets/images/solar-farm-with-wind-turbines-at-sunset-.jpg',
  product: '/assets/images/engineers-reviewing-electrical-design-dr.jpg',
  service: '/assets/images/zigma-technologies-engineers-monitoring-.jpg',
};

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = (await readJson(request).catch(() => ({}))) as { type?: string };
    const type = (body.type || 'product') as CatalogItemType;
    if (!['product', 'project', 'service'].includes(type)) {
      return jsonError('type must be product, project, or service');
    }

    const existing = await listCatalogItems({ itemType: type, admin: true });
    if (existing.length > 0) {
      return jsonOk({
        seeded: false,
        message: `${type}s already has ${existing.length} items. Delete them first to re-seed samples.`,
      });
    }

    const categories = await listCategories(type, true);
    const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
    const seeds = CATALOG_SEED[type];
    const created = [];

    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      const item = await createCatalogItem({
        item_type: type,
        title: seed.title,
        slug: seed.slug,
        summary: seed.summary,
        description: seed.description,
        category_id: bySlug[seed.category_slug] || null,
        tags_json: [...seed.tags_json],
        specs_json: { ...seed.specs_json },
        price_label: 'price_label' in seed ? seed.price_label ?? null : null,
        status: 'published',
        featured: seed.featured,
        enabled: true,
        sort_order: i,
        case_study_json: 'case_study_json' in seed ? seed.case_study_json ?? null : null,
      });
      if (item) {
        const imageUrl = seed.image_url || FALLBACK_MEDIA[type];
        await addItemMedia({
          item_id: item.id,
          kind: mediaKindFromUrl(imageUrl),
          url: imageUrl,
          alt: seed.title,
          is_primary: true,
        });
      }
      created.push(item);
    }

    return jsonOk({
      seeded: true,
      message: `Seeded ${created.length} ${type}s from live Zigma inventory.`,
      items: created,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Seed failed', 500);
  }
}
