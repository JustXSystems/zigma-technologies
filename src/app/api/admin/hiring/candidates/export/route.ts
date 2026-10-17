import { requireSession } from '@/lib/auth';
import { jsonError } from '@/lib/api';
import { candidatesToCsv } from '@/lib/career-csv';
import { listCandidates, type CandidateStage } from '@/lib/career-hiring';

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId') ? Number(searchParams.get('jobId')) : undefined;
    const stage = (searchParams.get('stage') || undefined) as CandidateStage | undefined;
    const q = searchParams.get('q') || undefined;
    const candidates = await listCandidates({
      jobId: jobId && Number.isFinite(jobId) ? jobId : undefined,
      stage,
      q,
    });
    const csv = candidatesToCsv(candidates);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = jobId ? `candidates-job-${jobId}-${stamp}.csv` : `candidates-${stamp}.csv`;
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError('Failed to export candidates', 500);
  }
}
