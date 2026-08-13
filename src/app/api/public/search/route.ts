import { jsonError, jsonOk } from '@/lib/api';
import { listCatalogItems } from '@/lib/catalog';
import { listPages } from '@/lib/cms';
import { listResourcePosts } from '@/lib/resources';
import { INDUSTRY_DEFS } from '@/lib/industries';
import { isReservedSiteSlug } from '@/lib/reserved-slugs';
import { catalogPublicPath } from '@/lib/catalog-case-study';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    if (q.length < 2) return jsonOk({ results: [], q });

    const [pages, resources, projects, products, services] = await Promise.all([
      listPages(false),
      listResourcePosts({ q, limit: 12 }),
      listCatalogItems({ itemType: 'project', q, limit: 12 }),
      listCatalogItems({ itemType: 'product', q, limit: 12 }),
      listCatalogItems({ itemType: 'service', q, limit: 12 }),
    ]);

    const ql = q.toLowerCase();
    const results: Array<{ type: string; title: string; href: string; excerpt?: string }> = [];

    for (const ind of INDUSTRY_DEFS) {
      if (ind.name.toLowerCase().includes(ql) || ind.lead.toLowerCase().includes(ql)) {
        results.push({ type: 'Industry', title: ind.name, href: `/industries/${ind.key}`, excerpt: ind.lead });
      }
    }

    for (const page of pages) {
      if (isReservedSiteSlug(page.slug)) continue;
      if (
        page.title.toLowerCase().includes(ql) ||
        page.slug.toLowerCase().includes(ql) ||
        (page.meta_description || '').toLowerCase().includes(ql)
      ) {
        results.push({
          type: 'Page',
          title: page.title,
          href: `/${page.slug}`,
          excerpt: page.meta_description || undefined,
        });
      }
    }

    for (const post of resources) {
      results.push({
        type: 'Resource',
        title: post.title,
        href: `/resources/${post.slug}`,
        excerpt: post.excerpt || undefined,
      });
    }

    for (const item of projects) {
      results.push({
        type: 'Project',
        title: item.title,
        href: catalogPublicPath('project', item.slug),
        excerpt: item.summary || undefined,
      });
    }
    for (const item of products) {
      results.push({
        type: 'Product',
        title: item.title,
        href: catalogPublicPath('product', item.slug),
        excerpt: item.summary || undefined,
      });
    }
    for (const item of services) {
      results.push({
        type: 'Service',
        title: item.title,
        href: catalogPublicPath('service', item.slug),
        excerpt: item.summary || undefined,
      });
    }

    return jsonOk({ q, results: results.slice(0, 40) });
  } catch (error) {
    console.error(error);
    return jsonError('Search failed', 500);
  }
}
