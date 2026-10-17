import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { assignEnquiryToJob, ingestEnquiryIntoPipeline } from '@/lib/career-enquiry-bridge';

const schema = z.object({
  enquiryId: z.number().int().positive(),
  jobId: z.number().int().positive().optional(),
});

/** Link a careers enquiry into Hiring — auto-match/holding, or force-assign to jobId. */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const actor = session.name || session.email || 'admin';
    const body = schema.parse(await readJson(request));

    if (body.jobId) {
      const candidate = await assignEnquiryToJob(body.enquiryId, body.jobId, actor);
      return jsonOk({
        candidate,
        hiringUrl: `/admin/hiring?tab=pipeline&job=${candidate.jobId}&candidate=${candidate.id}`,
      });
    }

    const result = await ingestEnquiryIntoPipeline(body.enquiryId, actor);
    if (!result.candidateId || !result.job) {
      return jsonError('Could not place this application in the pipeline', 422);
    }
    return jsonOk({
      ...result,
      hiringUrl: `/admin/hiring?tab=pipeline&job=${result.job.id}&candidate=${result.candidateId}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(error.issues[0]?.message || 'Invalid request', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Failed to add to pipeline', 500);
  }
}
