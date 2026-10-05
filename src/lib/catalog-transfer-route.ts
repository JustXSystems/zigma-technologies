import { z } from 'zod';
import { jsonError } from '@/lib/api';
import { DEFAULT_TRANSFER_OPTIONS, TransferInputError, type SessionMediaMap, type TransferOptions } from '@/lib/catalog-transfer';

export const transferOptionsSchema = z
  .object({
    mode: z.enum(['upsert', 'create', 'update']),
    blankCells: z.enum(['keep', 'clear']),
    gallery: z.enum(['sync', 'append']),
    defaultStatus: z.enum(['draft', 'published']),
    createCategories: z.boolean(),
    seoAutopilot: z.boolean(),
    redirects: z.boolean(),
    allowDelete: z.boolean(),
  })
  .partial();

export const mediaMapSchema = z
  .record(
    z.string().min(1).max(500),
    z
      .string()
      .max(500)
      .regex(/^\/assets\/[^\\]+$/)
      .refine((p) => !p.split('/').includes('..'))
  )
  .refine((m) => Object.keys(m).length <= 5_000);

export function transferOptions(raw: unknown): TransferOptions {
  return { ...DEFAULT_TRANSFER_OPTIONS, ...transferOptionsSchema.parse(raw ?? {}) };
}

export function sessionMediaMap(raw: unknown): SessionMediaMap {
  const parsed = mediaMapSchema.parse(raw ?? {});
  return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k.trim().toLowerCase(), v]));
}

export function transferActor(session: { name: string; email: string }) {
  return `${session.name} <${session.email}>`;
}

export function xlsxResponse(buffer: Buffer, fileName: string, extra: Record<string, string> = {}) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Export-Filename': fileName,
      ...extra,
    },
  });
}

export function transferRouteError(error: unknown, scope: string) {
  if (error instanceof z.ZodError) return jsonError('Invalid request', 400);
  if (error instanceof TransferInputError) return jsonError(error.message, 400);
  if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
  if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
  console.error(`[catalog-transfer:${scope}]`, error);
  return jsonError(error instanceof Error ? error.message : 'Something went wrong', 500);
}
