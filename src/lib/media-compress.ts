/**
 * Compress Media library assets without touching originals or CMS references.
 * - Images: sharp → WebP (same settings as scripts/meridian-image-optimize.mjs)
 * - Video: ffmpeg → H.264 MP4 (same profile family as scripts/optimize-videos-in-place.sh)
 */

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import {
  adminMediaDiskDir,
  adminMediaPublicPath,
  isManagedMediaPath,
  resolvePublicAssetDiskPath,
  toStorageMediaPath,
} from '@/lib/media-paths';
import { baseName, seoFileName, seoStem } from '@/lib/media-naming';
import { findMediaById, upsertMediaMetadata } from '@/lib/media-library';
import {
  MEDIA_COMPRESS_MAX_IMAGES,
  MEDIA_COMPRESS_MAX_VIDEOS,
} from '@/lib/media-compress-shared';

export { MEDIA_COMPRESS_MAX_IMAGES, MEDIA_COMPRESS_MAX_VIDEOS } from '@/lib/media-compress-shared';

/** Match Meridian image-optimize defaults. */
export const MEDIA_COMPRESS_WEBP_QUALITY = 78;
export const MEDIA_COMPRESS_WEBP_EFFORT = 4;
/** Image: skip when savings under this fraction. */
export const MEDIA_COMPRESS_IMAGE_MIN_SAVINGS = 0.02;
/** Video: match shell script (~15% smaller required). */
export const MEDIA_COMPRESS_VIDEO_MIN_SAVINGS = 0.15;
/** Combined batch ceiling (images + videos) for one API call. */
export const MEDIA_COMPRESS_MAX_BATCH = MEDIA_COMPRESS_MAX_IMAGES + MEDIA_COMPRESS_MAX_VIDEOS;

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.m4v']);

const VIDEO_HEIGHT = Number(process.env.MEDIA_COMPRESS_VIDEO_HEIGHT || 1080) || 1080;
const VIDEO_CRF = Number(process.env.MEDIA_COMPRESS_VIDEO_CRF || 26) || 26;
const VIDEO_PRESET = String(process.env.MEDIA_COMPRESS_FFMPEG_PRESET || 'medium').trim() || 'medium';
const VIDEO_TIMEOUT_MS = Number(process.env.MEDIA_COMPRESS_VIDEO_TIMEOUT_MS || 8 * 60 * 1000) || 8 * 60 * 1000;

export type MediaCompressRequestItem = {
  id?: number | null;
  path?: string | null;
};

export type MediaCompressOptions = {
  /** Hero/background loops: drop audio track (default keeps audio). */
  stripAudio?: boolean;
};

export type MediaCompressResult = {
  sourcePath: string;
  kind?: 'image' | 'video';
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  path?: string;
  id?: number;
  beforeBytes?: number;
  afterBytes?: number;
  savedBytes?: number;
};

export type MediaCompressKind = 'image' | 'video' | null;

export function mediaCompressKind(publicPath: string, mime?: string | null): MediaCompressKind {
  const ext = path.extname(publicPath).toLowerCase();
  if (IMAGE_EXT.has(ext) || (mime != null && /^image\/(jpeg|png|webp|gif)$/i.test(mime))) return 'image';
  if (VIDEO_EXT.has(ext) || (mime != null && /^video\/(mp4|webm|quicktime)$/i.test(mime))) return 'video';
  return null;
}

async function fileExists(diskPath: string) {
  return access(diskPath).then(
    () => true,
    () => false
  );
}

async function hashFile(diskPath: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(diskPath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolvePromise(hash.digest('hex')));
  });
}

async function resolveSource(
  item: MediaCompressRequestItem
): Promise<{ path: string; alt: string | null; tags: string[]; originalName: string | null } | { error: string }> {
  if (item.id != null && Number.isFinite(Number(item.id)) && Number(item.id) > 0) {
    const row = await findMediaById(Number(item.id));
    if (!row) return { error: `Media asset not found for id ${item.id}.` };
    return {
      path: row.path,
      alt: row.alt,
      tags: row.tags_json || [],
      originalName: row.original_name,
    };
  }

  const raw = String(item.path || '').trim();
  if (!raw) return { error: 'Provide a media id or path.' };
  const assetPath = toStorageMediaPath(raw);
  if (!isManagedMediaPath(assetPath)) {
    return { error: `Path “${assetPath}” is outside managed media folders.` };
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT alt, tags_json, original_name FROM media_assets WHERE path = ? LIMIT 1',
    [assetPath]
  );
  const row = rows[0];
  let tags: string[] = [];
  if (row?.tags_json != null) {
    if (Array.isArray(row.tags_json)) tags = row.tags_json.map(String);
    else if (typeof row.tags_json === 'string') {
      try {
        const parsed = JSON.parse(row.tags_json);
        if (Array.isArray(parsed)) tags = parsed.map(String);
      } catch {
        tags = [];
      }
    }
  }
  return {
    path: assetPath,
    alt: row?.alt != null ? String(row.alt) : null,
    tags,
    originalName: row?.original_name ? String(row.original_name) : null,
  };
}

function compressedName(sourcePath: string, originalName: string | null, ext: '.webp' | '.mp4'): string {
  const from = originalName || baseName(sourcePath);
  const sourceExt = path.extname(from);
  const stem = seoStem(sourceExt ? from.slice(0, -sourceExt.length) : from) || 'media';
  return `${stem}-compressed${ext}`;
}

async function claimUniqueName(dir: string, desiredName: string, write: (fullPath: string) => Promise<void>): Promise<string> {
  await mkdir(dir, { recursive: true });
  const taken = new Set((await readdir(dir).catch(() => [] as string[])).map((n) => n.toLowerCase()));
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = seoFileName(desiredName, (c) => taken.has(c.toLowerCase()));
    const full = path.join(dir, candidate);
    try {
      await write(full);
      return candidate;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      taken.add(candidate.toLowerCase());
    }
  }
  throw new Error('Could not find a free file name for the compressed copy.');
}

async function setDimensions(id: number, width: number | null, height: number | null) {
  if (width == null && height == null) return;
  try {
    await pool.query('UPDATE media_assets SET width = COALESCE(?, width), height = COALESCE(?, height) WHERE id = ?', [
      width,
      height,
      id,
    ]);
  } catch {
    /* optional columns */
  }
}

type RunResult = { code: number | null; stdout: string; stderr: string };

function runCommand(
  command: string,
  args: string[],
  opts: { timeoutMs: number; cwd?: string } = { timeoutMs: 30_000 }
): Promise<RunResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: opts.cwd || process.cwd(),
      env: process.env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch {
        try {
          child.kill();
        } catch {
          /* ignore */
        }
      }
      reject(new Error(`Timed out after ${Math.round(opts.timeoutMs / 1000)}s`));
    }, opts.timeoutMs);

    child.stdout.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    });
  });
}

let ffmpegReady: Promise<boolean> | null = null;

/** Cached probe — false when ffmpeg/ffprobe are missing from PATH. */
export async function isFfmpegAvailable(): Promise<boolean> {
  if (!ffmpegReady) {
    ffmpegReady = (async () => {
      try {
        const ff = await runCommand('ffmpeg', ['-version'], { timeoutMs: 8_000 });
        const probe = await runCommand('ffprobe', ['-version'], { timeoutMs: 8_000 });
        return ff.code === 0 && probe.code === 0;
      } catch {
        return false;
      }
    })();
  }
  return ffmpegReady;
}

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default;
  } catch {
    throw new Error('SHARP_UNAVAILABLE');
  }
}

async function compressImage(
  sourcePath: string,
  meta: { alt: string | null; tags: string[]; originalName: string | null },
  diskPath: string,
  beforeBytes: number
): Promise<MediaCompressResult> {
  let sharp: Awaited<ReturnType<typeof loadSharp>>;
  try {
    sharp = await loadSharp();
  } catch {
    return {
      sourcePath,
      kind: 'image',
      ok: false,
      reason: 'Image compressor (sharp) is not available on this server.',
    };
  }

  let buffer: Buffer;
  let width: number | null = null;
  let height: number | null = null;
  try {
    const { data, info } = await sharp(diskPath)
      .rotate()
      .webp({
        quality: MEDIA_COMPRESS_WEBP_QUALITY,
        effort: MEDIA_COMPRESS_WEBP_EFFORT,
      })
      .toBuffer({ resolveWithObject: true });
    buffer = data;
    width = info.width ?? null;
    height = info.height ?? null;
  } catch (e) {
    return {
      sourcePath,
      kind: 'image',
      ok: false,
      reason: `Compress failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const afterBytes = buffer.length;
  const savedBytes = beforeBytes - afterBytes;
  if (afterBytes >= beforeBytes * (1 - MEDIA_COMPRESS_IMAGE_MIN_SAVINGS)) {
    return {
      sourcePath,
      kind: 'image',
      ok: true,
      skipped: true,
      reason: 'Already small enough — compressed copy would not save meaningful size.',
      beforeBytes,
      afterBytes,
      savedBytes,
    };
  }

  const desiredName = compressedName(sourcePath, meta.originalName, '.webp');
  let safeName: string;
  try {
    safeName = await claimUniqueName(adminMediaDiskDir('images'), desiredName, async (full) => {
      await writeFile(full, buffer, { flag: 'wx' });
    });
  } catch (e) {
    return {
      sourcePath,
      kind: 'image',
      ok: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }

  const publicPath = adminMediaPublicPath('images', safeName);
  const contentHash = createHash('sha256').update(buffer).digest('hex');
  const tags = Array.from(new Set([...(meta.tags || []), 'compressed']));
  const id = await upsertMediaMetadata({
    path: publicPath,
    alt: meta.alt,
    tags,
    mime: 'image/webp',
    original_name: desiredName,
    content_hash: contentHash,
    size_bytes: afterBytes,
  });
  await setDimensions(id, width, height);

  return {
    sourcePath,
    kind: 'image',
    ok: true,
    path: publicPath,
    id,
    beforeBytes,
    afterBytes,
    savedBytes,
  };
}

async function compressVideo(
  sourcePath: string,
  meta: { alt: string | null; tags: string[]; originalName: string | null },
  diskPath: string,
  beforeBytes: number,
  opts: MediaCompressOptions
): Promise<MediaCompressResult> {
  if (!(await isFfmpegAvailable())) {
    return {
      sourcePath,
      kind: 'video',
      ok: false,
      reason:
        'ffmpeg/ffprobe not found on this server. Install ffmpeg (VPS: apt/static build; Windows: winget install Gyan.FFmpeg), then retry.',
    };
  }

  const videoDir = adminMediaDiskDir('video');
  await mkdir(videoDir, { recursive: true });
  const desiredName = compressedName(sourcePath, meta.originalName, '.mp4');
  const tmpName = `.${seoStem(desiredName.replace(/\.mp4$/i, '')) || 'media'}-${Date.now()}.compressing.mp4`;
  const tmpPath = path.join(videoDir, tmpName);

  const scale = `scale=-2:'min(${VIDEO_HEIGHT},ih)':flags=lanczos,format=yuv420p`;
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    diskPath,
    '-map',
    '0:v:0',
    '-vf',
    scale,
    '-c:v',
    'libx264',
    '-preset',
    VIDEO_PRESET,
    '-profile:v',
    'high',
    '-crf',
    String(VIDEO_CRF),
    '-maxrate',
    '4M',
    '-bufsize',
    '8M',
    '-g',
    '48',
    '-keyint_min',
    '24',
    '-movflags',
    '+faststart',
    '-map_metadata',
    '-1',
  ];

  if (opts.stripAudio) {
    args.push('-an', '-sn', '-dn');
  } else {
    // Keep audio when present; still drop subtitles/data.
    args.push('-map', '0:a?', '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-sn', '-dn');
  }
  args.push(tmpPath);

  try {
    const ran = await runCommand('ffmpeg', args, { timeoutMs: VIDEO_TIMEOUT_MS });
    if (ran.code !== 0) {
      await unlink(tmpPath).catch(() => undefined);
      const detail = (ran.stderr || ran.stdout || `exit ${ran.code}`).trim().slice(0, 240);
      return {
        sourcePath,
        kind: 'video',
        ok: false,
        reason: `ffmpeg failed: ${detail || 'unknown error'}`,
      };
    }
  } catch (e) {
    await unlink(tmpPath).catch(() => undefined);
    return {
      sourcePath,
      kind: 'video',
      ok: false,
      reason: `Video compress failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  let afterBytes: number;
  try {
    afterBytes = (await stat(tmpPath)).size;
  } catch {
    return { sourcePath, kind: 'video', ok: false, reason: 'ffmpeg produced no output file.' };
  }

  const savedBytes = beforeBytes - afterBytes;
  if (afterBytes >= beforeBytes * (1 - MEDIA_COMPRESS_VIDEO_MIN_SAVINGS)) {
    await unlink(tmpPath).catch(() => undefined);
    return {
      sourcePath,
      kind: 'video',
      ok: true,
      skipped: true,
      reason: 'Already small enough — compressed copy would not save at least ~15%.',
      beforeBytes,
      afterBytes,
      savedBytes,
    };
  }

  let safeName = '';
  try {
    const taken = new Set((await readdir(videoDir).catch(() => [] as string[])).map((n) => n.toLowerCase()));
    for (let attempt = 0; attempt < 20 && !safeName; attempt++) {
      const candidate = seoFileName(desiredName, (c) => taken.has(c.toLowerCase()));
      const finalPath = path.join(videoDir, candidate);
      if (await fileExists(finalPath)) {
        taken.add(candidate.toLowerCase());
        continue;
      }
      await rename(tmpPath, finalPath);
      safeName = candidate;
    }
  } catch (e) {
    await unlink(tmpPath).catch(() => undefined);
    return {
      sourcePath,
      kind: 'video',
      ok: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
  if (!safeName) {
    await unlink(tmpPath).catch(() => undefined);
    return { sourcePath, kind: 'video', ok: false, reason: 'Could not find a free file name for the compressed copy.' };
  }

  const finalPath = path.join(videoDir, safeName);
  const publicPath = adminMediaPublicPath('video', safeName);
  const contentHash = await hashFile(finalPath);
  const tags = Array.from(
    new Set([...(meta.tags || []), 'compressed', ...(opts.stripAudio ? ['no-audio'] : [])])
  );
  const id = await upsertMediaMetadata({
    path: publicPath,
    alt: meta.alt,
    tags,
    mime: 'video/mp4',
    original_name: desiredName,
    content_hash: contentHash,
    size_bytes: afterBytes,
  });

  // Best-effort height from ffprobe (non-fatal).
  try {
    const probe = await runCommand(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', finalPath],
      { timeoutMs: 15_000 }
    );
    if (probe.code === 0) {
      const [w, h] = String(probe.stdout || '')
        .trim()
        .split(/[x,]/)
        .map((n) => Number(n));
      await setDimensions(id, Number.isFinite(w) ? w : null, Number.isFinite(h) ? h : null);
    }
  } catch {
    /* optional */
  }

  return {
    sourcePath,
    kind: 'video',
    ok: true,
    path: publicPath,
    id,
    beforeBytes,
    afterBytes,
    savedBytes,
  };
}

/**
 * Create a compressed copy of one library asset. Leaves the source file and all CMS references unchanged.
 */
export async function compressMediaAsset(
  item: MediaCompressRequestItem,
  opts: MediaCompressOptions = {}
): Promise<MediaCompressResult> {
  const resolved = await resolveSource(item);
  if ('error' in resolved) {
    return { sourcePath: String(item.path || item.id || ''), ok: false, reason: resolved.error };
  }

  const sourcePath = resolved.path;
  const kind = mediaCompressKind(sourcePath);
  if (!kind) {
    return {
      sourcePath,
      ok: false,
      skipped: true,
      reason: 'Only JPEG, PNG, WebP, GIF, MP4, and WebM can be compressed. SVG is skipped.',
    };
  }

  const diskPath = resolvePublicAssetDiskPath(sourcePath);
  if (!diskPath || !(await fileExists(diskPath))) {
    return { sourcePath, kind, ok: false, reason: 'Source file is missing on disk.' };
  }

  const beforeBytes = (await stat(diskPath)).size;
  if (beforeBytes <= 0) {
    return { sourcePath, kind, ok: false, skipped: true, reason: 'Empty file.' };
  }

  const meta = {
    alt: resolved.alt,
    tags: resolved.tags,
    originalName: resolved.originalName,
  };

  if (kind === 'image') return compressImage(sourcePath, meta, diskPath, beforeBytes);
  return compressVideo(sourcePath, meta, diskPath, beforeBytes, opts);
}

async function resolveItemKind(item: MediaCompressRequestItem): Promise<MediaCompressKind> {
  if (item.path) return mediaCompressKind(String(item.path));
  if (item.id != null && Number(item.id) > 0) {
    const row = await findMediaById(Number(item.id));
    return row ? mediaCompressKind(row.path, row.mime) : null;
  }
  return null;
}

export async function compressMediaAssets(
  items: MediaCompressRequestItem[],
  opts: MediaCompressOptions = {}
): Promise<{
  results: MediaCompressResult[];
  created: number;
  skipped: number;
  failed: number;
  savedBytes: number;
  ffmpegAvailable: boolean | null;
}> {
  const kinds = await Promise.all(items.map((item) => resolveItemKind(item)));
  const images = kinds.filter((k) => k === 'image').length;
  const videos = kinds.filter((k) => k === 'video').length;

  if (images > MEDIA_COMPRESS_MAX_IMAGES) {
    throw Object.assign(new Error(`Too many images (max ${MEDIA_COMPRESS_MAX_IMAGES} per request).`), {
      code: 'BATCH_TOO_LARGE',
    });
  }
  if (videos > MEDIA_COMPRESS_MAX_VIDEOS) {
    throw Object.assign(
      new Error(
        `Too many videos (max ${MEDIA_COMPRESS_MAX_VIDEOS} per request — encode is slow; select fewer or run in smaller batches).`
      ),
      { code: 'BATCH_TOO_LARGE' }
    );
  }

  const ffmpegAvailable = videos > 0 ? await isFfmpegAvailable() : null;

  const results: MediaCompressResult[] = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;
  let savedBytes = 0;

  for (const item of items) {
    const result = await compressMediaAsset(item, opts);
    results.push(result);
    if (result.ok && result.path) {
      created++;
      savedBytes += result.savedBytes || 0;
    } else if (result.skipped) {
      skipped++;
    } else {
      failed++;
    }
  }

  return { results, created, skipped, failed, savedBytes, ffmpegAvailable };
}
