import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import {
  MEDIA_COMPRESS_MAX_BATCH,
  MEDIA_COMPRESS_MAX_IMAGES,
  MEDIA_COMPRESS_MAX_VIDEOS,
  compressMediaAssets,
  type MediaCompressRequestItem,
} from '@/lib/media-compress';
import { formatMediaBytes } from '@/lib/media-upload-rules';

export const runtime = 'nodejs';
/** Video encodes can take several minutes; client also sends videos one-at-a-time. */
export const maxDuration = 600;

const bodySchema = z.object({
  items: z
    .array(
      z
        .object({
          id: z.number().int().positive().optional().nullable(),
          path: z.string().min(1).optional().nullable(),
        })
        .refine((row) => row.id != null || !!row.path, { message: 'id or path required' })
    )
    .min(1)
    .max(MEDIA_COMPRESS_MAX_BATCH),
  stripAudio: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = bodySchema.parse(await request.json());
    const items: MediaCompressRequestItem[] = body.items.map((row) => ({
      id: row.id ?? null,
      path: row.path ?? null,
    }));

    const summary = await compressMediaAssets(items, { stripAudio: body.stripAudio === true });
    const kinds = summary.results.reduce(
      (acc, r) => {
        if (r.kind === 'video') acc.videos++;
        else if (r.kind === 'image') acc.images++;
        return acc;
      },
      { images: 0, videos: 0 }
    );

    const messageParts: string[] = [];
    if (summary.created) {
      messageParts.push(
        `Created ${summary.created} compressed cop${summary.created === 1 ? 'y' : 'ies'}`
      );
    } else {
      messageParts.push('No new compressed copies');
    }
    if (summary.savedBytes > 0) messageParts.push(`saved ${formatMediaBytes(summary.savedBytes)}`);
    if (summary.skipped) messageParts.push(`${summary.skipped} skipped`);
    if (summary.failed) messageParts.push(`${summary.failed} failed`);
    if (kinds.videos && body.stripAudio) messageParts.push('audio stripped on video');
    messageParts.push('Originals left unchanged — verify the new files, then delete unused originals when ready');

    return jsonOk({
      ...summary,
      limits: {
        maxImages: MEDIA_COMPRESS_MAX_IMAGES,
        maxVideos: MEDIA_COMPRESS_MAX_VIDEOS,
      },
      message: messageParts.join(' · '),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const detail = error.issues.map((i) => i.message).join('; ') || 'Invalid payload';
      return jsonError(`Could not compress media: ${detail}`, 400, {
        code: 'INVALID_PAYLOAD',
        maxBatch: MEDIA_COMPRESS_MAX_BATCH,
        maxImages: MEDIA_COMPRESS_MAX_IMAGES,
        maxVideos: MEDIA_COMPRESS_MAX_VIDEOS,
        issues: error.issues,
      });
    }
    if (error instanceof Error && (error as { code?: string }).code === 'BATCH_TOO_LARGE') {
      return jsonError(error.message, 400, {
        code: 'BATCH_TOO_LARGE',
        maxImages: MEDIA_COMPRESS_MAX_IMAGES,
        maxVideos: MEDIA_COMPRESS_MAX_VIDEOS,
      });
    }
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    const detail = error instanceof Error ? error.message : 'Unknown server error';
    return jsonError(`Failed to compress media: ${detail}`, 500, { code: 'COMPRESS_FAILED', detail });
  }
}
