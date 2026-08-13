import path from 'path';
import { requireSession } from '@/lib/auth';
import { jsonError } from '@/lib/api';
import { getEnquiry } from '@/lib/catalog';
import { readResumeFile } from '@/lib/resumes';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const enquiry = await getEnquiry(Number(id));
    if (!enquiry) return jsonError('Not found', 404);

    const payload = enquiry.payload_json || {};
    const stored =
      (typeof payload.resume_file === 'string' && payload.resume_file) ||
      (typeof payload.resume_url === 'string' ? path.basename(payload.resume_url) : '');
    if (!stored) return jsonError('No resume attached', 404);

    const file = await readResumeFile(stored);
    if (!file) return jsonError('Resume file missing on disk', 404);

    const downloadName =
      (typeof payload.resume_name === 'string' && payload.resume_name) || path.basename(stored);
    const mime =
      (typeof payload.resume_mime === 'string' && payload.resume_mime) || 'application/octet-stream';

    return new Response(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${downloadName.replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    return jsonError('Download failed', 500);
  }
}
