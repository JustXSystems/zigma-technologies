import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://plausible.io https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://plausible.io https://challenges.cloudflare.com",
  "frame-src 'self' https://www.google.com https://maps.google.com https://challenges.cloudflare.com https://www.youtube.com https://player.vimeo.com",
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

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  // CI packages .next/standalone into a release tarball for VPS apply (see scripts/package-release.sh).
  output: 'standalone',
  images: {
    remotePatterns: [],
    unoptimized: false,
  },
  async rewrites() {
    // beforeFiles: always serve CMS media from disk via API (PreProd + Prod).
    // Next production does not reliably expose files added to public/ after start;
    // admin MediaPicker + catalog backgrounds depend on this.
    // With basePath, Next prefixes source/destination automatically.
    return {
      beforeFiles: [
        { source: '/assets/images/:path*', destination: '/api/public/assets/images/:path*' },
        { source: '/assets/svg/:path*', destination: '/api/public/assets/svg/:path*' },
        { source: '/assets/video/:path*', destination: '/api/public/assets/video/:path*' },
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
        ],
      },
    ];
  },
};

export default nextConfig;
