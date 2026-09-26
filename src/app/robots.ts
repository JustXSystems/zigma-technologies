import type { MetadataRoute } from 'next';
import { isIndexable, siteOrigin } from '@/lib/seo';

const PRIVATE_PATHS = ['/admin/', '/api/admin/', '/api/partner/', '/api/ztools/', '/ztools/', '/partner/'];

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) {
    // Non-production builds stay crawlable so bots can see the noindex meta / X-Robots-Tag
    // and drop any URLs that were indexed earlier; no sitemap is advertised.
    return { rules: { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS } };
  }
  const origin = siteOrigin();
  return {
    rules: { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
