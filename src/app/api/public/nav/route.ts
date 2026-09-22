import { jsonError, jsonOk } from '@/lib/api';
import { getPublicNavRows, resolvePublicFooterColumns, resolvePublicHeaderNav } from '@/lib/nav-data';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const locationParam = url.searchParams.get('location') || 'header';
    const location = locationParam === 'footer' ? 'footer' : 'header';
    const format = url.searchParams.get('format');

    if (format === 'columns' && location === 'footer') {
      const columns = await resolvePublicFooterColumns();
      return jsonOk({ columns: columns || [] });
    }

    if (format === 'tree' && location === 'header') {
      const tree = await resolvePublicHeaderNav();
      return jsonOk({ tree: tree || [] });
    }

    const rows = await getPublicNavRows(location);
    return jsonOk({
      items: rows.map((row) => ({
        id: row.id,
        label: row.label,
        href: row.href,
        parent_id: row.parent_id,
        sort_order: row.sort_order,
        enabled: row.enabled !== false,
        meta_json: row.meta_json || {},
      })),
    });
  } catch (error) {
    console.error(error);
    return jsonError('Failed to load nav', 500);
  }
}
