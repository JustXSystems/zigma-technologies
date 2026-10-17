import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { createCandidate, listCandidates, type CandidateStage, type CandidateWriteInput } from '@/lib/career-hiring';

const writeSchema = z.object({
  jobId: z.number().int().positive(),
  name: z.string().min(1).max(160),
  email: z.string().max(255).optional(),
  phone: z.string().max(80).optional(),
  experience: z.string().max(120).optional(),
  resumeFile: z.string().max(255).optional(),
  resumeName: z.string().max(255).optional(),
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
  enquiryId: z.number().int().positive().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId') ? Number(searchParams.get('jobId')) : undefined;
    const stage = (searchParams.get('stage') || undefined) as CandidateStage | undefined;
    const q = searchParams.get('q') || undefined;
    const candidates = await listCandidates({ jobId, stage, q });
    return jsonOk({ candidates });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError('Failed to list candidates', 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = writeSchema.parse(await readJson(request));
    const id = await createCandidate(body as CandidateWriteInput, session.name || session.email);
    return jsonOk({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(error.issues[0]?.message || 'Invalid candidate', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
