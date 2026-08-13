import type { MetadataRoute } from 'next';

function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zigma-technologies.com').replace(/\/$/, '');
}

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/admin/'],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
