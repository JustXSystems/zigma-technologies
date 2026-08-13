import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { listEnquiries } from '@/lib/catalog';
import type { Enquiry } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requireSession();
    const status = (new URL(request.url).searchParams.get('status') || 'all') as
      | Enquiry['status']
      | 'all';
    const format = new URL(request.url).searchParams.get('format');
    const enquiries = await listEnquiries(status);

    if (format === 'csv') {
      const headers = ['id', 'created_at', 'status', 'item_type', 'item_title', 'name', 'email', 'phone', 'message', 'admin_notes'];
      const escape = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      };
      const lines = [headers.join(',')];
      for (const e of enquiries) {
        const p = e.payload_json || {};
        lines.push(
          [
            e.id,
            e.created_at,
            e.status,
            e.item_type || '',
            e.item_title || '',
            p.name || '',
            p.email || '',
            p.phone || p.tel || '',
            p.message || '',
            e.admin_notes || '',
          ]
            .map(escape)
            .join(',')
        );
      }
      return new Response(lines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="enquiries-${status}.csv"`,
        },
      });
    }

    return jsonOk({ enquiries });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    return jsonError('Failed to load enquiries', 500);
  }
}
