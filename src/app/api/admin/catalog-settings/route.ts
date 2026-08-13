import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { getPageSettings, updatePageSettings } from '@/lib/catalog';
import type { CatalogItemType } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requireSession();
    const type = new URL(request.url).searchParams.get('type') as CatalogItemType | null;
    if (!type || !['project', 'product', 'service'].includes(type)) {
      return jsonError('type required');
    }
    const settings = await getPageSettings(type);
    return jsonOk({ settings });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to load settings', 500);
  }
}

const putSchema = z.object({
  item_type: z.enum(['project', 'product', 'service']),
  layout: z.enum(['grid', 'list']).optional(),
  grid_columns: z.number().min(1).max(4).optional(),
  filters_json: z.array(z.string()).optional(),
  search_fields_json: z.array(z.string()).optional(),
  card_fields_json: z.array(z.string()).optional(),
  modal_fields_json: z.array(z.string()).optional(),
  hero_enabled: z.boolean().optional(),
  hero_autoplay_ms: z.number().int().min(2500).max(30000).optional(),
  hero_item_ids_json: z.array(z.number().int().positive()).max(12).optional(),
  hero_eyebrow: z.string().max(160).nullable().optional(),
  hero_title: z.string().max(255).nullable().optional(),
  hero_lead: z.string().max(2000).nullable().optional(),
  visual_style: z.enum(['classic', 'premium', 'glass', 'minimal', 'bold-corporate']).optional(),
  hero_variant: z.enum(['standard', 'spotlight']).optional(),
  loading_skeleton_enabled: z.boolean().optional(),
  reveal_animation_enabled: z.boolean().optional(),
  premium_borders_enabled: z.boolean().optional(),
});

export async function PUT(request: Request) {
  try {
    await requireSession();
    const body = putSchema.parse(await readJson(request));
    const {
      item_type,
      hero_enabled,
      loading_skeleton_enabled,
      reveal_animation_enabled,
      premium_borders_enabled,
      ...rest
    } = body;
    const settings = await updatePageSettings(body.item_type, {
      ...rest,
      hero_enabled: hero_enabled === undefined ? undefined : hero_enabled ? 1 : 0,
      loading_skeleton_enabled:
        loading_skeleton_enabled === undefined ? undefined : loading_skeleton_enabled ? 1 : 0,
      reveal_animation_enabled:
        reveal_animation_enabled === undefined ? undefined : reveal_animation_enabled ? 1 : 0,
      premium_borders_enabled:
        premium_borders_enabled === undefined ? undefined : premium_borders_enabled ? 1 : 0,
    });
    return jsonOk({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError(error instanceof Error ? error.message : 'Save failed', 500);
  }
}
