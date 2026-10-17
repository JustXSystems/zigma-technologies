import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { addCandidateNote, getCandidate, updateCandidate } from '@/lib/career-hiring';

const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  email: z.string().max(255).optional(),
  phone: z.string().max(80).optional(),
  experience: z.string().max(120).optional(),
  stage: z
    .enum(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn', 'on_hold'])
    .optional(),
  source: z.string().max(80).optional(),
  interviewer: z.string().max(160).optional(),
  interviewAt: z.string().nullable().optional(),
  offerAt: z.string().nullable().optional(),
  joinedAt: z.string().nullable().optional(),
  rejectedAt: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(8000).optional(),
  tags: z.array(z.string()).optional(),
  addNote: z.string().max(2000).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const id = Number((await ctx.params).id);
    if (!id) return jsonError('Invalid id', 400);
    const candidate = await getCandidate(id);
    if (!candidate) return jsonError('Candidate not found', 404);
    return jsonOk({ candidate });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError('Failed to load candidate', 500);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const id = Number((await ctx.params).id);
    if (!id) return jsonError('Invalid id', 400);
    const body = patchSchema.parse(await readJson(request));
    const actor = session.name || session.email;
    if (body.addNote) {
      await addCandidateNote(id, body.addNote, actor);
    }
    const rest = { ...body };
    delete rest.addNote;
    if (Object.keys(rest).length) {
      await updateCandidate(id, rest, actor);
    }
    return jsonOk({ candidate: await getCandidate(id) });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(error.issues[0]?.message || 'Invalid candidate', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Update failed', 500);
  }
}
