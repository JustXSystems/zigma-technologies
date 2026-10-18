import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual } from '../lib/html.mjs';

/**
 * Phase 4 lite — find oversized images on key pages (no PSI key required).
 */
export async function scanImageWeight(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const paths = opts.paths || profile.autopilot?.imagePaths || profile.samplePaths || ['/', '/projects', '/products', '/services', '/contact'];
  const maxBytes = opts.maxBytes ?? profile.autopilot?.maxImageBytes ?? 350_000;
  const concurrency = 4;
  const heavy = [];
  const checked = [];

  async function scanPage(path) {
    const pageUrl = path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      const res = await fetchManual(pageUrl, { forceBody: true });
      if (res.status < 200 || res.status >= 300) {
        checked.push({ page: pageUrl, status: res.status, images: 0 });
        return;
      }
      const srcs = new Set();
      for (const m of (res.body || '').matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
        srcs.add(m[1]);
      }
      for (const m of (res.body || '').matchAll(/srcset=["']([^"']+)["']/gi)) {
        for (const part of m[1].split(',')) {
          const u = part.trim().split(/\s+/)[0];
          if (u) srcs.add(u);
        }
      }
      let pageHeavy = 0;
      const list = [...srcs].slice(0, 40);
      for (let i = 0; i < list.length; i += concurrency) {
        const batch = list.slice(i, i + concurrency);
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(
          batch.map(async (src) => {
            let abs;
            try {
              abs = new URL(src, pageUrl).href;
            } catch {
              return;
            }
            if (!/^https?:/i.test(abs)) return;
            try {
              const h = await fetch(abs, {
                method: 'HEAD',
                redirect: 'follow',
                headers: { 'user-agent': 'MeridianSEO/0.1' },
              });
              const len = Number(h.headers.get('content-length') || 0);
              if (len >= maxBytes) {
                pageHeavy++;
                heavy.push({
                  page: pageUrl,
                  src: abs,
                  bytes: len,
                  kb: Math.round(len / 1024),
                });
              }
            } catch {
              /* skip */
            }
          })
        );
      }
      checked.push({ page: pageUrl, status: res.status, images: srcs.size, heavy: pageHeavy });
    } catch (e) {
      checked.push({ page: pageUrl, error: String(e.message || e) });
    }
  }

  for (const p of paths) {
    // eslint-disable-next-line no-await-in-loop
    await scanPage(p);
  }

  const findings =
    heavy.length === 0
      ? []
      : [
          {
            code: 'HEAVY_IMAGES',
            severity: heavy.length >= 5 ? 'medium' : 'low',
            title: `${heavy.length} image(s) over ${Math.round(maxBytes / 1024)}KB on key pages`,
            detail: heavy
              .slice(0, 6)
              .map((h) => `${h.kb}KB ${h.src}`)
              .join('; '),
            remediation: 'Compress / convert to WebP; set width/height; lazy-load below fold. See image-weight.json.',
            owner: 'developer',
            pillar: 'technical',
          },
        ];

  const payload = {
    generatedAt: new Date().toISOString(),
    maxBytes,
    checked,
    heavy: heavy.slice(0, 80),
    heavyCount: heavy.length,
  };

  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'image-weight.json'), JSON.stringify(payload, null, 2), 'utf8');
  }

  return {
    ok: true,
    status: heavy.length ? 'degraded' : 'ok',
    message: heavy.length
      ? `${heavy.length} heavy image(s) ≥${Math.round(maxBytes / 1024)}KB on key pages`
      : `No images over ${Math.round(maxBytes / 1024)}KB on ${paths.length} key pages`,
    data: payload,
    findings,
  };
}
