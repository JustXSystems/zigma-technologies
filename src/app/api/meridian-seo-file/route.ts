import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function safeName(raw: string) {
  const name = String(raw || '').trim();
  if (name === 'BingSiteAuth.xml') return name;
  if (/^[a-f0-9]{8,64}\.txt$/i.test(name)) return name;
  return '';
}

function resolveName(request: Request, pathName?: string) {
  const url = new URL(request.url);
  const fromQuery = safeName(url.searchParams.get('name') || '');
  if (fromQuery) return fromQuery;

  const fromPath = safeName(pathName || url.pathname.split('/').pop() || '');
  if (fromPath) return fromPath;

  // Next beforeFiles rewrite may drop destination query; recover from rewrite headers
  for (const key of [
    'x-middleware-rewrite',
    'x-invoke-path',
    'x-matched-path',
    'next-url',
    'x-forwarded-uri',
  ]) {
    const raw = request.headers.get(key);
    if (!raw) continue;
    try {
      const u = new URL(raw, 'http://local');
      const q = safeName(u.searchParams.get('name') || '');
      if (q) return q;
      const base = safeName(u.pathname.split('/').pop() || '');
      if (base) return base;
    } catch {
      const base = safeName(String(raw).split('/').pop() || '');
      if (base) return base;
    }
  }

  const orig = request.headers.get('x-url') || request.headers.get('referer') || '';
  try {
    const u = new URL(orig, 'http://local');
    const base = safeName(u.pathname.split('/').pop() || '');
    if (base) return base;
  } catch {
    /* ignore */
  }

  return '';
}

function readPublic(name: string) {
  const file = resolve(process.cwd(), 'public', name);
  if (!existsSync(file)) return null;
  return readFileSync(file);
}

/**
 * Serve Agent-written SEO proof files at request time.
 * Supports:
 *   GET /api/meridian-seo-file?name=BingSiteAuth.xml
 *   GET /api/meridian-seo-file/BingSiteAuth.xml  (preferred for rewrites)
 */
export async function GET(
  request: Request,
  ctx?: { params?: Promise<{ name?: string | string[] }> },
) {
  const params = ctx?.params ? await ctx.params : undefined;
  const pathPart = Array.isArray(params?.name)
    ? params.name.join('/')
    : params?.name || '';
  const safe = resolveName(request, pathPart);
  if (!safe) return new Response('Not found', { status: 404 });
  const body = readPublic(safe);
  if (!body) return new Response('Not found', { status: 404 });
  const type = safe.endsWith('.xml') ? 'application/xml' : 'text/plain; charset=utf-8';
  return new Response(body, {
    headers: { 'Content-Type': type, 'Cache-Control': 'no-cache' },
  });
}
