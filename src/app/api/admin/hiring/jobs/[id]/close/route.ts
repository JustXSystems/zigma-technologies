import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { closeCareerJob, getCareerJob } from '@/lib/career-hiring';

const schema = z.object({
  reason: z.enum(['filled', 'expired', 'cancelled', 'other']),
  notes: z.string().max(8000).optional(),
  hiredCandidateIds: z.array(z.number().int().positive()).optional(),
  joinedAt: z.string().nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const id = Number((await ctx.params).id);
    if (!id) return jsonError('Invalid id', 400);
    const body = schema.parse(await readJson(request));
    await closeCareerJob(id, body, session.name || session.email);
    return jsonOk({ job: await getCareerJob(id) });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(error.issues[0]?.message || 'Invalid close data', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Close failed', 500);
  }
}
