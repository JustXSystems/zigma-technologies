import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import {
  getCareerJob,
  listCandidates,
  listJobEvents,
  reopenCareerJob,
  updateCareerJob,
  type JobWriteInput,
} from '@/lib/career-hiring';

const writeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  slug: z.string().max(160).optional(),
  department: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  jobType: z.string().max(80).optional(),
  experience: z.string().max(120).optional(),
  education: z.string().max(255).optional(),
  badge: z.string().max(80).optional(),
  summary: z.string().max(4000).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['draft', 'open', 'paused']).optional(),
  opensAt: z.string().nullable().optional(),
  closesAt: z.string().nullable().optional(),
  vacancies: z.number().int().min(1).max(99).optional(),
  sortOrder: z.number().int().optional(),
  durationDays: z.number().int().min(1).max(365).optional(),
  allowDuplicateTitle: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const id = Number((await ctx.params).id);
    if (!id) return jsonError('Invalid id', 400);
    const job = await getCareerJob(id);
    if (!job) return jsonError('Job not found', 404);
    const [candidates, events] = await Promise.all([listCandidates({ jobId: id }), listJobEvents(id)]);
    return jsonOk({ job, candidates, events });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError('Failed to load job', 500);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const id = Number((await ctx.params).id);
    if (!id) return jsonError('Invalid id', 400);
    const body = writeSchema.parse(await readJson(request));
    await updateCareerJob(id, body as Partial<JobWriteInput>, session.name || session.email);
    const job = await getCareerJob(id);
    return jsonOk({ job });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(error.issues[0]?.message || 'Invalid job', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Update failed', 500);
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const id = Number((await ctx.params).id);
    if (!id) return jsonError('Invalid id', 400);
    const body = z.object({ action: z.literal('reopen'), durationDays: z.number().int().min(1).max(365).optional() }).parse(await readJson(request));
    await reopenCareerJob(id, session.name || session.email, body.durationDays);
    return jsonOk({ job: await getCareerJob(id) });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(error.issues[0]?.message || 'Invalid request', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Reopen failed', 500);
  }
}
