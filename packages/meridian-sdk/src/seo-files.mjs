import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function safeSeoFileName(raw) {
  const name = String(raw || '').trim();
  if (name === 'BingSiteAuth.xml') return name;
  if (/^[a-f0-9]{8,64}\.txt$/i.test(name)) return name;
  return '';
}

/**
 * App Router handlers that serve Agent-written public SEO files at request time.
 * Pair with next.config rewrites so /BingSiteAuth.xml and /{hex}.txt hit this route
 * (Next standalone often only serves public/ files present at process start).
 *
 * Prefer path destinations (`/api/meridian-seo-file/BingSiteAuth.xml`) — Next may
 * drop `?name=` on beforeFiles rewrites. Query `?name=` still works for direct calls.
 *
 * @param {{ publicDir?: string }} [opts]
 */
export function createSeoPublicFileHandlers(opts = {}) {
  const publicDir = opts.publicDir || resolve(process.cwd(), 'public');

  async function GET(request, ctx) {
    const url = new URL(request.url);
    let name = safeSeoFileName(url.searchParams.get('name') || '');
    if (!name && ctx?.params) {
      const params = await ctx.params;
      const part = Array.isArray(params?.name) ? params.name.join('/') : params?.name;
      name = safeSeoFileName(part || '');
    }
    if (!name) {
      name = safeSeoFileName(url.pathname.split('/').pop() || '');
    }
    if (!name) return new Response('Not found', { status: 404 });
    const file = resolve(publicDir, name);
    if (!existsSync(file)) return new Response('Not found', { status: 404 });
    const body = readFileSync(file);
    const type = name.endsWith('.xml') ? 'application/xml' : 'text/plain; charset=utf-8';
    return new Response(body, {
      headers: { 'Content-Type': type, 'Cache-Control': 'no-cache' },
    });
  }

  return { GET };
}

/** Suggested next.config beforeFiles rewrites (path-based; query form is unreliable). */
export const SEO_PUBLIC_FILE_REWRITES = [
  { source: '/BingSiteAuth.xml', destination: '/api/meridian-seo-file/BingSiteAuth.xml' },
  {
    source: '/:key([a-fA-F0-9]{8,64}).txt',
    destination: '/api/meridian-seo-file/:key.txt',
  },
];
