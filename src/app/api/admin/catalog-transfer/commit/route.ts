import { z } from 'zod';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import { applyCatalogImport, claimJobCommit, finishJobCommit, loadImportJob, releaseJobCommit } from '@/lib/catalog-transfer';
import { mediaMapSchema, sessionMediaMap, transferOptions, transferOptionsSchema, transferRouteError } from '@/lib/catalog-transfer-route';

const schema = z.object({
  jobId: z.number().int().positive(),
  options: transferOptionsSchema.optional(),
  mediaMap: mediaMapSchema.optional(),
});

/** Publishes an analysed import. The plan is rebuilt from live data so nothing stale is written. */
export async function POST(request: Request) {
  let claimed: number | null = null;
  try {
    await requireSession();
    const input = schema.parse(await readJson(request));
    const options = transferOptions(input.options);
    const mediaMap = sessionMediaMap(input.mediaMap);

    const job = await loadImportJob(input.jobId);
    if (!job) return jsonError('This import has expired. Upload the workbook again.', 404);
    if (!(await claimJobCommit(input.jobId, options))) {
      return jsonError('This import is already being published or was published. Refresh the history to see the result.', 409);
    }
    claimed = input.jobId;

    const { plan, results } = await applyCatalogImport(job.workbook, options, mediaMap);
    const tally = await finishJobCommit(input.jobId, plan, results);
    claimed = null;
    return jsonOk({ jobId: input.jobId, tally, results, plan });
  } catch (error) {
    if (claimed) await releaseJobCommit(claimed).catch(() => undefined);
    if (error instanceof SyntaxError) return jsonError('Invalid request', 400);
    return transferRouteError(error, 'commit');
  }
}
