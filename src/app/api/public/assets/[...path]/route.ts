import { createReadStream, existsSync, statSync } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { NextResponse } from 'next/server';
import { isPrivateUploadPath } from '@/lib/media-paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

const CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800';

/**
 * Disk-backed CMS media fallback for the library folders that receive runtime
 * uploads (images / svg / video). Production nginx should serve the whole
 * public /assets/* tree from disk and 404 /assets/uploads/* (see
 * scripts/nginx-zigma-apex.conf). This route remains for local/dev and as a
 * safety net when the static location is not yet applied.
 *
 * Faststart is done at upload time only — never rewrite whole MP4s on GET
 * (that OOM'd the prod Node heap under concurrent video traffic).
 *
 * Not served here (nginx/static or blocked): css/, js/, uploads/.
 */
function resolveAssetsRoot(): string {
  const candidates = [
    process.env.ZIGMA_APP_DIR
      ? path.resolve(process.env.ZIGMA_APP_DIR, 'public', 'assets')
      : '',
    path.resolve(process.cwd(), 'public', 'assets'),
  ].filter(Boolean);
  for (const root of candidates) {
    if (existsSync(root)) return root;
  }
  return candidates[0] || path.resolve(process.cwd(), 'public', 'assets');
}

/** Single `bytes=` range → [start, end] inclusive; `null` = unsatisfiable; `undefined` = ignore header. */
function parseRange(header: string | null, size: number): [number, number] | null | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec((header || '').trim());
  if (!match) return undefined;
  const [, a, b] = match;
  if (!a && !b) return undefined;
  let start: number;
  let end: number;
  if (!a) {
    const suffix = Number(b);
    if (!suffix) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(a);
    end = b ? Math.min(Number(b), size - 1) : size - 1;
  }
  if (start >= size || start > end) return null;
  return [start, end];
}

async function serve(request: Request, context: { params: Promise<{ path: string[] }> }, includeBody: boolean) {
  const segments = (await context.params).path || [];
  if (!segments.length) {
    return new NextResponse('Not found', { status: 404 });
  }

  if (segments.some((s) => !s || s === '.' || s === '..' || s.includes('\\') || s.includes('\0'))) {
    return new NextResponse('Not found', { status: 404 });
  }

  const relUrlPath = `/assets/${segments.join('/')}`;
  if (isPrivateUploadPath(relUrlPath)) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Only allow CMS library folders (not private uploads)
  const top = segments[0];
  if (top !== 'images' && top !== 'svg' && top !== 'video') {
    return new NextResponse('Not found', { status: 404 });
  }

  const assetsRoot = resolveAssetsRoot();
  const diskPath = path.resolve(assetsRoot, ...segments);
  if (diskPath !== assetsRoot && !diskPath.startsWith(`${assetsRoot}${path.sep}`)) {
    return new NextResponse('Not found', { status: 404 });
  }

  if (!existsSync(diskPath)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const info = statSync(diskPath);
  if (!info.isFile()) {
    return new NextResponse('Not found', { status: 404 });
  }

  const ext = path.extname(diskPath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';

  const etag = `W/"${info.size.toString(36)}-${Math.floor(info.mtimeMs).toString(36)}"`;
  const baseHeaders: Record<string, string> = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': CACHE_CONTROL,
    'Last-Modified': info.mtime.toUTCString(),
    ETag: etag,
  };

  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch && ifNoneMatch.split(',').some((t) => t.trim() === etag || t.trim() === '*')) {
    return new NextResponse(null, { status: 304, headers: baseHeaders });
  }

  const ifRange = request.headers.get('if-range');
  const rangeAllowed = !ifRange || ifRange === etag || ifRange === baseHeaders['Last-Modified'];
  const range = rangeAllowed ? parseRange(request.headers.get('range'), info.size) : undefined;

  if (range === null) {
    return new NextResponse(null, {
      status: 416,
      headers: { ...baseHeaders, 'Content-Range': `bytes */${info.size}` },
    });
  }

  const [start, end] = range ?? [0, info.size - 1];
  const length = info.size ? end - start + 1 : 0;
  const headers: Record<string, string> = { ...baseHeaders, 'Content-Length': String(length) };
  if (range) headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;

  const body =
    includeBody && length > 0
      ? (Readable.toWeb(createReadStream(diskPath, { start, end })) as ReadableStream)
      : null;

  return new NextResponse(body, { status: range ? 206 : 200, headers });
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return serve(request, context, true);
}

export async function HEAD(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return serve(request, context, false);
}
