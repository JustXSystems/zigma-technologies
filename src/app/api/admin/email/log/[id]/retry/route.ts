import { jsonError, jsonOk } from '@/lib/api';
import { retryLoggedMail } from '@/lib/mail';
import { emailRouteError, requireEmailAdmin } from '../../../_shared';

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireEmailAdmin();
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) return jsonError('Invalid id');
    const result = await retryLoggedMail(id);
    return jsonOk(result.ok ? { ok: true, message: 'Re-sent successfully.' } : { ok: false, message: result.error });
  } catch (error) {
    return emailRouteError(error, 'Retry failed');
  }
}
