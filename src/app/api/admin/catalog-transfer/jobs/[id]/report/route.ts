import { jsonError } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import { buildJobReport } from '@/lib/catalog-transfer';
import { transferRouteError, xlsxResponse } from '@/lib/catalog-transfer-route';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) return jsonError('Not found', 404);
    const report = await buildJobReport(id);
    if (!report) return jsonError('No report for this job', 404);
    return xlsxResponse(report.buffer, report.fileName);
  } catch (error) {
    return transferRouteError(error, 'report');
  }
}
