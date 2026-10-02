import { z } from 'zod';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { requireScreen } from '@/lib/auth';
import { getThemeSettings } from '@/lib/cms';
import {
  EXPORT_MAX_ROWS,
  EXPORT_TYPES,
  buildCsv,
  buildJson,
  buildWorkbook,
  countEnquiries,
  exportFileName,
  exportHistory,
  exportPackageEntries,
  finishExportAudit,
  lastCompletedExportAt,
  loadExportRecords,
  markExportedAsInProgress,
  startExportAudit,
  type ExportFilters,
  type ExportFormat,
  type ExportMeta,
} from '@/lib/enquiry-export';
import { mergeSiteSettings } from '@/lib/site-settings';
import { zipReadableStream } from '@/lib/zip-stream';

const day = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]).optional();

const schema = z.object({
  action: z.enum(['preview', 'download']),
  scope: z.enum(['view', 'selected', 'new', 'range', 'all']),
  status: z.enum(['all', 'new', 'in_progress', 'closed']).optional(),
  type: z.enum(['all', ...EXPORT_TYPES]).optional(),
  q: z.string().max(200).optional(),
  from: day,
  to: day,
  ids: z.array(z.number().int().positive()).max(EXPORT_MAX_ROWS).optional(),
  format: z.enum(['zip', 'xlsx', 'csv', 'json']).default('zip'),
  includeAttachments: z.boolean().default(true),
  markInProgress: z.boolean().default(false),
});

type Input = z.infer<typeof schema>;

async function resolveScope(input: Input): Promise<{ filters: ExportFilters; label: string }> {
  switch (input.scope) {
    case 'selected':
      return { filters: { ids: input.ids?.length ? input.ids : [0] }, label: `${input.ids?.length || 0} selected enquiries` };
    case 'new': {
      const since = await lastCompletedExportAt();
      return { filters: { since }, label: since ? `New since last export (${since.toISOString().slice(0, 16).replace('T', ' ')} UTC)` : 'Everything (first export)' };
    }
    case 'range': {
      const label = `Received ${input.from || 'start'} → ${input.to || 'today'}`;
      return { filters: { from: input.from || undefined, to: input.to || undefined }, label };
    }
    case 'all':
      return { filters: {}, label: 'All enquiries' };
    default: {
      const parts = [
        input.status && input.status !== 'all' ? `status ${input.status.replace('_', ' ')}` : '',
        input.type && input.type !== 'all' ? `type ${input.type}` : '',
        input.q?.trim() ? `matching “${input.q.trim()}”` : '',
      ].filter(Boolean);
      return {
        filters: { status: input.status, type: input.type, q: input.q },
        label: parts.length ? `Current view: ${parts.join(', ')}` : 'Current view: all enquiries',
      };
    }
  }
}

function routeError(error: unknown) {
  if (error instanceof z.ZodError) return jsonError('Invalid export request', 400);
  if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
  if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
  console.error('[enquiry-export]', error);
  return jsonError(error instanceof Error ? error.message : 'Export failed', 500);
}

export async function POST(request: Request) {
  try {
    const session = await requireScreen('enquiries');
    const input = schema.parse(await readJson(request));
    const { filters, label } = await resolveScope(input);
    const withFiles = input.format === 'zip' && input.includeAttachments;

    if (input.action === 'preview') {
      const records = await loadExportRecords(filters, { resolveFiles: withFiles });
      const files = records.flatMap((r) => r.attachments);
      const present = files.filter((a) => a.absolute);
      const tally = (key: (r: (typeof records)[number]) => string) =>
        records.reduce<Record<string, number>>((acc, r) => ((acc[key(r)] = (acc[key(r)] || 0) + 1), acc), {});
      const [history, lastAt] = await Promise.all([exportHistory(6), lastCompletedExportAt()]);
      const attachmentBytes = present.reduce((n, a) => n + a.size, 0);
      return jsonOk({
        scopeLabel: label,
        count: records.length,
        capped: records.length >= EXPORT_MAX_ROWS,
        byType: tally((r) => r.type),
        byStatus: tally((r) => r.status),
        attachments: { total: files.length, present: present.length, missing: withFiles ? files.length - present.length : 0, bytes: attachmentBytes },
        estimatedBytes: withFiles ? attachmentBytes + records.length * 2200 + 40_000 : records.length * 900 + 8_000,
        newestAt: records[0]?.receivedAt ?? null,
        oldestAt: records[records.length - 1]?.receivedAt ?? null,
        newSinceLastExport: await countEnquiries({ since: lastAt }),
        lastExportAt: lastAt,
        history,
      });
    }

    const records = await loadExportRecords(filters, { resolveFiles: withFiles });
    if (!records.length) return jsonError('Nothing to export for this selection.', 400);

    const site = mergeSiteSettings((await getThemeSettings()).site);
    const actor = `${session.name} <${session.email}>`;
    const meta: ExportMeta = { companyName: site.companyName, actor, exportedAt: new Date(), scopeLabel: label, includeAttachments: withFiles };
    const format = input.format as ExportFormat;
    const attachmentCount = withFiles ? records.reduce((n, r) => n + r.attachments.filter((a) => a.absolute).length, 0) : 0;
    const auditId = await startExportAudit({
      actor,
      format,
      scope: { ...input, action: undefined, ids: input.ids?.length },
      enquiries: records.length,
      attachments: attachmentCount,
    });
    const ids = records.map((r) => r.id);
    const fileName = exportFileName(site.companyName, meta.exportedAt, format);
    const headers: Record<string, string> = {
      'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Export-Filename': fileName,
      'X-Export-Count': String(records.length),
      'X-Export-Attachments': String(attachmentCount),
    };
    const complete = async (bytes: number) => {
      await finishExportAudit(auditId, 'completed', bytes).catch((e) => console.error('[enquiry-export] audit', e));
      if (input.markInProgress) await markExportedAsInProgress(ids).catch((e) => console.error('[enquiry-export] mark', e));
    };

    if (format !== 'zip') {
      const body =
        format === 'xlsx' ? buildWorkbook(records, meta, { linkAttachments: false }) : format === 'csv' ? buildCsv(records) : buildJson(records, meta);
      await complete(body.length);
      const type =
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : format === 'csv'
            ? 'text/csv; charset=utf-8'
            : 'application/json; charset=utf-8';
      return new Response(new Uint8Array(body), { headers: { ...headers, 'Content-Type': type, 'Content-Length': String(body.length) } });
    }

    let bytes = 0;
    const counted = zipReadableStream(exportPackageEntries(records, meta, { includeAttachments: withFiles })).pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          bytes += chunk.byteLength;
          controller.enqueue(chunk);
        },
        async flush() {
          await complete(bytes);
        },
      })
    );
    return new Response(counted, {
      headers: { ...headers, 'Content-Type': 'application/zip', 'X-Export-Estimated-Bytes': String(records.reduce((n, r) => n + r.attachments.reduce((m, a) => m + a.size, 0), 0) + records.length * 2200 + 40_000) },
    });
  } catch (error) {
    return routeError(error);
  }
}
