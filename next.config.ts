import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://www.google-analytics.com https://plausible.io https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // GA4 hosts per Google's CSP guidance (collection endpoints vary by region / Google signals).
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://plausible.io https://challenges.cloudflare.com",
  "frame-src 'self' https://www.google.com https://maps.google.com https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "media-src 'self' blob: https:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** Subdirectory deploy (e.g. https://justxsystems.com/zigma-technologies). Must be set at build time. */
function resolveBasePath(): string | undefined {
  const raw = (process.env.NEXT_PUBLIC_BASE_PATH || '').trim();
  if (!raw || raw === '/') return undefined;
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/$/, '') || undefined;
}

const basePath = resolveBasePath();

/** Next SizeLimit template literal (e.g. `100mb`). Keep ≥ nginx client_max_body_size. */
function resolveUploadBodyLimit(): `${number}mb` {
  const raw = (process.env.MEDIA_UPLOAD_MAX_MB || '').trim();
  const mb = raw ? Number(raw) : 100;
  const safe = Number.isFinite(mb) && mb > 0 ? Math.round(mb) : 100;
  return `${safe}mb` as `${number}mb`;
}

const uploadBodyLimit = resolveUploadBodyLimit();

/**
 * Only production builds may be indexed.
 * basePath is set on PreProd (subdirectory deploy) — never index those builds,
 * even if NEXT_PUBLIC_SEO_INDEXABLE was set by mistake.
 */
const seoIndexable = process.env.NEXT_PUBLIC_SEO_INDEXABLE === 'true' && !basePath;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  // CI packages .next/standalone into a release tarball for VPS apply (see scripts/package-release.sh).
  output: 'standalone',
  images: {
    remotePatterns: [],
    unoptimized: false,
  },
  experimental: {
    // Allow CMS media uploads up to MEDIA_UPLOAD_MAX_MB (must match nginx client_max_body_size).
    proxyClientMaxBodySize: uploadBodyLimit,
    serverActions: {
      bodySizeLimit: uploadBodyLimit,
    },
  },
  async redirects() {
    // Apex-only canonical host (Phase 1.6 / P4). Prefer nginx for the same rule when
    // sudo is available; this app-level 301 covers www until nginx is updated.
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.zigma-technologies.com' }],
        destination: 'https://zigma-technologies.com/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // beforeFiles: always serve CMS media from disk via API (PreProd + Prod).
    // Next production does not reliably expose files added to public/ after start;
    // admin MediaPicker + catalog backgrounds depend on this.
    // With basePath, Next prefixes source/destination automatically.
    //
    // Command Brief relative hrefs (ops-cockpit.html) → /api/admin/ops-cockpit.html.
    // Catch-all rewrite onto the Meridian format=file API (no dotted dynamic segments).
    return {
      beforeFiles: [
        { source: '/assets/images/:path*', destination: '/api/public/assets/images/:path*' },
        { source: '/assets/svg/:path*', destination: '/api/public/assets/svg/:path*' },
        { source: '/assets/video/:path*', destination: '/api/public/assets/video/:path*' },
        // Meridian Product Agent — Bing verify + IndexNow keys (runtime public/ reads).
        // Prefer path destinations — Next may drop ?name= on beforeFiles rewrites.
        {
          source: '/BingSiteAuth.xml',
          destination: '/api/meridian-seo-file/BingSiteAuth.xml',
        },
        {
          source: '/:key([a-fA-F0-9]{8,64}).txt',
          destination: '/api/meridian-seo-file/:key.txt',
        },
        // Phase-ops relative ../../SEO-GUIDE.md resolves to apex /SEO-GUIDE.md (not in product tarball).
        {
          source: '/SEO-GUIDE.md',
          destination: '/api/admin/meridian?env=prod&format=guide',
        },
        {
          source: '/api/admin/:name([^/]+\\.(?:html|md|json|ics))',
          destination: '/api/admin/meridian?env=prod&format=file&name=:name',
        },
      ],
      afterFiles: [{ source: '/favicon.ico', destination: '/assets/images/zigma.png' }],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
          ...(seoIndexable ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
