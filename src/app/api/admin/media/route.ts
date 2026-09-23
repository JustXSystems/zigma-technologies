import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { addItemMedia } from '@/lib/catalog';
import pool from '@/lib/db';
import {
  adminCategoryFromMime,
  adminMediaDiskDir,
  adminMediaPublicPath,
  isManagedMediaPath,
  legacyAssetDiskPaths,
  resolvePublicAssetDiskPath,
} from '@/lib/media-paths';
import {
  findMediaById,
  listMediaLibrary,
  mediaKindFromMime,
  upsertMediaMetadata,
} from '@/lib/media-library';
import {
  MEDIA_UPLOAD_ACCEPT,
  MEDIA_UPLOAD_MAX_BYTES,
  MEDIA_UPLOAD_MIME_TYPES,
  MEDIA_UPLOAD_RESTRICTIONS,
  MEDIA_UPLOAD_TYPE_INFO,
  formatMediaBytes,
  validateMediaUploadFile,
} from '@/lib/media-upload-rules';

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const assets = await listMediaLibrary(q);
    return jsonOk({
      assets,
      uploadRules: {
        maxBytes: MEDIA_UPLOAD_MAX_BYTES,
        maxLabel: formatMediaBytes(MEDIA_UPLOAD_MAX_BYTES),
        accept: MEDIA_UPLOAD_ACCEPT,
        allowedTypes: [...MEDIA_UPLOAD_MIME_TYPES],
        typeInfo: MEDIA_UPLOAD_TYPE_INFO,
        restrictions: [...MEDIA_UPLOAD_RESTRICTIONS],
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    return jsonError('Failed to list media', 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const form = await request.formData();
    const file = form.get('file');
    const itemId = form.get('item_id');
    const alt = String(form.get('alt') || '');
    const isPrimary = String(form.get('is_primary') || '') === '1';

    if (!(file instanceof File)) {
      return jsonError('No file was received. Choose a file and try again.', 400, {
        code: 'FILE_REQUIRED',
      });
    }

    const invalid = validateMediaUploadFile(file);
    if (invalid) {
      return jsonError(invalid.message, 400, {
        code: invalid.code,
        ...invalid.details,
      });
    }

    const category = adminCategoryFromMime(file.type);
    const uploadsDir = adminMediaDiskDir(category);
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || '';
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const diskPath = path.join(uploadsDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(diskPath, buffer);

    const publicPath = adminMediaPublicPath(category, safeName);
    const id = await upsertMediaMetadata({ path: publicPath, alt: alt || null, mime: file.type });

    let mediaId: number | null = null;
    if (itemId) {
      mediaId = await addItemMedia({
        item_id: Number(itemId),
        kind: mediaKindFromMime(file.type),
        url: publicPath,
        alt,
        is_primary: isPrimary,
      });
    }

    return jsonOk({ id, path: publicPath, mediaId, category }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    const detail = error instanceof Error ? error.message : 'Unknown server error';
    return jsonError(`Upload failed: ${detail}`, 500, { code: 'UPLOAD_FAILED', detail });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    const assetPath = searchParams.get('path');

    let pathToDelete: string | null = null;

    if (id) {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, path FROM media_assets WHERE id = ? LIMIT 1',
        [id]
      );
      const asset = rows[0];
      if (!asset) return jsonError('Media asset not found for that id.', 404, { code: 'NOT_FOUND', id });
      pathToDelete = String(asset.path);
      await pool.query('DELETE FROM media_assets WHERE id = ?', [id]);
    } else if (assetPath && isManagedMediaPath(assetPath)) {
      pathToDelete = assetPath;
      await pool.query('DELETE FROM media_assets WHERE path = ?', [assetPath]);
    } else if (assetPath) {
      return jsonError(
        `Path “${assetPath}” is outside managed media folders (/assets/images, /assets/svg, /assets/video, or legacy /uploads).`,
        400,
        { code: 'UNMANAGED_PATH', path: assetPath }
      );
    } else {
      return jsonError('Provide a media id or a managed path to delete.', 400, {
        code: 'ID_OR_PATH_REQUIRED',
      });
    }

    if (pathToDelete && isManagedMediaPath(pathToDelete)) {
      const diskPaths = legacyAssetDiskPaths(pathToDelete);
      const primary = resolvePublicAssetDiskPath(pathToDelete);
      if (primary) diskPaths.unshift(primary);

      for (const diskPath of [...new Set(diskPaths)]) {
        try {
          await unlink(diskPath);
          break;
        } catch {
          /* try next legacy location */
        }
      }
    }

    return jsonOk({ deleted: true, id: id || null, path: pathToDelete });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    const detail = error instanceof Error ? error.message : 'Unknown server error';
    return jsonError(`Failed to delete media: ${detail}`, 500, { code: 'DELETE_FAILED', detail });
  }
}

const patchSchema = z
  .object({
    id: z.number().int().positive().optional(),
    path: z.string().min(1).optional(),
    alt: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine((body) => body.id != null || !!body.path, { message: 'id or path required' });

export async function PATCH(request: Request) {
  try {
    await requireSession();
    const body = patchSchema.parse(await request.json());

    let assetPath = body.path || null;
    if (body.id) {
      const existing = await findMediaById(body.id);
      if (!existing) {
        return jsonError(`Media asset not found for id ${body.id}.`, 404, {
          code: 'NOT_FOUND',
          id: body.id,
        });
      }
      assetPath = existing.path;
    }

    if (!assetPath) {
      return jsonError('Media asset not found — provide a valid id or path.', 404, {
        code: 'NOT_FOUND',
      });
    }

    const id = await upsertMediaMetadata({
      path: assetPath,
      alt: body.alt,
      tags: body.tags,
    });

    return jsonOk({ ok: true, id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const detail = error.issues.map((i) => i.message).join('; ') || 'Invalid payload';
      return jsonError(`Could not update media: ${detail}`, 400, {
        code: 'INVALID_PAYLOAD',
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    const detail = error instanceof Error ? error.message : 'Unknown server error';
    return jsonError(`Failed to update media: ${detail}`, 500, { code: 'UPDATE_FAILED', detail });
  }
}
