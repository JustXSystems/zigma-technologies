import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import {
  bootstrapHiringFromCareersCms,
  createCareerJob,
  hiringStats,
  listCareerJobs,
  type JobStatus,
  type JobWriteInput,
} from '@/lib/career-hiring';

const writeSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().max(160).optional(),
  department: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  jobType: z.string().max(80).optional(),
  experience: z.string().max(120).optional(),
  education: z.string().max(255).optional(),
  badge: z.string().max(80).optional(),
  summary: z.string().max(4000).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['draft', 'open', 'paused', 'closed']).optional(),
  opensAt: z.string().nullable().optional(),
  closesAt: z.string().nullable().optional(),
  vacancies: z.number().int().min(1).max(99).optional(),
  sortOrder: z.number().int().optional(),
  durationDays: z.number().int().min(1).max(365).optional(),
  allowDuplicateTitle: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    await requireSession();
    const boot = await bootstrapHiringFromCareersCms('system');
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'active') as JobStatus | 'active' | 'archive' | 'all';
    const q = searchParams.get('q') || undefined;
    const department = searchParams.get('department') || undefined;
    const [jobs, stats] = await Promise.all([listCareerJobs({ status, q, department }), hiringStats()]);
    return jsonOk({
      jobs,
      stats,
      bootstrapped: boot.imported,
      message: boot.imported
        ? `Loaded ${boot.imported} role(s) from the Careers page into Hiring automatically.`
        : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Failed to list jobs', 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = writeSchema.parse(await readJson(request));
    const id = await createCareerJob(body as JobWriteInput, session.name || session.email);
    return jsonOk({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(error.issues[0]?.message || 'Invalid job', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
