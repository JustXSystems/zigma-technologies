import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import {
  addItemMedia,
  copyItemMedia,
  deleteItemMedia,
  getCatalogItemById,
  listItemMedia,
  mediaKindFromUrl,
  reorderItemMedia,
  setItemMediaPrimary,
} from '@/lib/catalog';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const item = await getCatalogItemById(Number(id));
    if (!item) return jsonError('Not found', 404);
    const media = await listItemMedia(item.id);
    return jsonOk({ media });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to load media', 500);
  }
}

const postSchema = z.object({
  url: z.string().min(1),
  alt: z.string().optional(),
  is_primary: z.boolean().optional(),
  kind: z.enum(['image', 'video', 'svg']).optional(),
});

export async function POST(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const item = await getCatalogItemById(Number(id));
    if (!item) return jsonError('Not found', 404);
    const body = postSchema.parse(await readJson(request));
    const kind = body.kind || mediaKindFromUrl(body.url);
    const mediaId = await addItemMedia({
      item_id: item.id,
      kind,
      url: body.url,
      alt: body.alt,
      is_primary: body.is_primary,
    });
    return jsonOk({ mediaId }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Attach failed', 500);
  }
}

const patchSchema = z.object({
  action: z.enum(['set_primary', 'reorder', 'copy_from']),
  media_id: z.number().int().positive().optional(),
  ordered_ids: z.array(z.number().int().positive()).optional(),
  from_item_id: z.number().int().positive().optional(),
});

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const itemId = Number(id);
    const item = await getCatalogItemById(itemId);
    if (!item) return jsonError('Not found', 404);

    const body = patchSchema.parse(await readJson(request));

    if (body.action === 'set_primary') {
      if (!body.media_id) return jsonError('media_id required', 400);
      try {
        await setItemMediaPrimary(itemId, body.media_id);
      } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') return jsonError('Not found', 404);
        if (err instanceof Error && err.message.includes('thumbnail')) return jsonError(err.message, 400);
        throw err;
      }
    } else if (body.action === 'reorder') {
      if (!body.ordered_ids?.length) return jsonError('ordered_ids required', 400);
      await reorderItemMedia(itemId, body.ordered_ids);
    } else if (body.action === 'copy_from') {
      if (!body.from_item_id) return jsonError('from_item_id required', 400);
      await copyItemMedia(body.from_item_id, itemId);
    }

    const media = await listItemMedia(itemId);
    return jsonOk({ media });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Update failed', 500);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const itemId = Number(id);
    const mediaId = Number(new URL(request.url).searchParams.get('media_id'));
    if (!mediaId) return jsonError('media_id required');

    const media = await listItemMedia(itemId);
    const target = media.find((m) => m.id === mediaId);
    if (!target) return jsonError('Not found', 404);

    await deleteItemMedia(mediaId);

    const remaining = media.filter((m) => m.id !== mediaId);
    if (target.is_primary && remaining.length) {
      const nextThumb = remaining.find((m) => m.kind !== 'video') || remaining[0];
      if (nextThumb && nextThumb.kind !== 'video') {
        await setItemMediaPrimary(itemId, nextThumb.id);
      }
    }

    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Delete failed', 500);
  }
}
