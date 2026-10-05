import { jsonError, jsonOk } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import {
  TRANSFER_MAX_FILE_BYTES,
  createImportJob,
  loadImportJob,
  parseCatalogWorkbook,
  planCatalogImport,
  saveJobAnalysis,
  type ParsedWorkbook,
} from '@/lib/catalog-transfer';
import { sessionMediaMap, transferActor, transferOptions, transferRouteError } from '@/lib/catalog-transfer-route';
import type { CatalogItemType } from '@/lib/types';

const FALLBACK_TYPES = new Set<CatalogItemType>(['product', 'service', 'project']);

function jsonField(form: FormData, key: string): unknown {
  const raw = form.get(key);
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  return JSON.parse(raw);
}

/**
 * Dry run. multipart: `file` (xlsx/csv) to start a job, or `jobId` to re-check an existing one
 * (e.g. after media uploads); plus optional `options`, `mediaMap` (JSON) and `fallbackType`.
 * Nothing is written to the catalog here.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const form = await request.formData();
    const options = transferOptions(jsonField(form, 'options'));
    const mediaMap = sessionMediaMap(jsonField(form, 'mediaMap'));
    const fallbackRaw = String(form.get('fallbackType') || '') as CatalogItemType;
    const fallbackType = FALLBACK_TYPES.has(fallbackRaw) ? fallbackRaw : null;

    let jobId: number;
    let workbook: ParsedWorkbook;
    const file = form.get('file');
    if (file instanceof File && file.size > 0) {
      if (file.size > TRANSFER_MAX_FILE_BYTES) {
        return jsonError(`The workbook is larger than ${Math.round(TRANSFER_MAX_FILE_BYTES / 1024 / 1024)} MB. Remove embedded pictures or split it.`, 413);
      }
      if (!/\.(xlsx|xlsm|csv|xls)$/i.test(file.name)) return jsonError('Upload the Excel workbook (.xlsx) or a CSV file.', 400);
      workbook = parseCatalogWorkbook(Buffer.from(await file.arrayBuffer()), file.name, fallbackType);
      jobId = await createImportJob(transferActor(session), workbook);
    } else {
      jobId = Number(form.get('jobId'));
      if (!Number.isInteger(jobId) || jobId <= 0) return jsonError('Choose a workbook to analyse.', 400);
      const job = await loadImportJob(jobId);
      if (!job) return jsonError('This import has expired. Upload the workbook again.', 404);
      if (job.status !== 'analysed') return jsonError('This import has already been published. Upload the workbook again to make more changes.', 409);
      workbook = job.workbook;
    }

    const { plan } = await planCatalogImport(workbook, options, mediaMap);
    await saveJobAnalysis(jobId, options, plan);
    return jsonOk({ jobId, fileName: workbook.fileName, options, plan });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError('Invalid request', 400);
    return transferRouteError(error, 'analyse');
  }
}
