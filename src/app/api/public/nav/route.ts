import { jsonError, jsonOk } from '@/lib/api';
import { getThemeSettings } from '@/lib/cms';
import { napValues, resolveNapDeep } from '@/lib/nap';
import { getPublicNavRows, resolvePublicFooterColumns, resolvePublicHeaderNav } from '@/lib/nav-data';
import { mergeSiteSettings } from '@/lib/site-settings';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const locationParam = url.searchParams.get('location') || 'header';
    const location = locationParam === 'footer' ? 'footer' : 'header';
    const format = url.searchParams.get('format');
    const nap = napValues(mergeSiteSettings((await getThemeSettings()).site));

    if (format === 'columns' && location === 'footer') {
      const columns = await resolvePublicFooterColumns();
      return jsonOk({ columns: resolveNapDeep(columns || [], nap) });
    }

    if (format === 'tree' && location === 'header') {
      const tree = await resolvePublicHeaderNav();
      return jsonOk({ tree: resolveNapDeep(tree || [], nap) });
    }

    const rows = await getPublicNavRows(location);
    return jsonOk({
      items: rows.map((row) => ({
        id: row.id,
        label: resolveNapDeep(row.label, nap),
        href: row.href ? resolveNapDeep(row.href, nap) : row.href,
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
