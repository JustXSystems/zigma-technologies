import { jsonOk } from '@/lib/api';
import { listMailLog } from '@/lib/mail-store';
import { emailRouteError, requireEmailAdmin } from '../_shared';

export async function GET(request: Request) {
  try {
    await requireEmailAdmin();
    const params = new URL(request.url).searchParams;
    const status = params.get('status') || undefined;
    const data = await listMailLog({
      status: status && ['sent', 'failed', 'skipped'].includes(status) ? status : undefined,
      limit: Number(params.get('limit')) || 100,
    });
    return jsonOk(data);
  } catch (error) {
    return emailRouteError(error, 'Failed to load delivery log');
  }
}
