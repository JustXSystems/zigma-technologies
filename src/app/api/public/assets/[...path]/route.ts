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

/**
 * Disk-backed CMS media. Used via next.config beforeFiles rewrite from
 * /assets/{images,svg,video}/* so runtime uploads work in production
 * (Next's public/ index does not pick up files added after process start).
 * Safe for both PreProd (basePath) and Production (domain root).
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
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
  const stream = Readable.toWeb(createReadStream(diskPath)) as ReadableStream;

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Content-Length': String(info.size),
      'Cache-Control': 'public, max-age=86400',
      'Last-Modified': info.mtime.toUTCString(),
    },
  });
}
