import path from 'path';
import { requireSession } from '@/lib/auth';
import { jsonError } from '@/lib/api';
import { getCandidate } from '@/lib/career-hiring';
import { getEnquiry } from '@/lib/catalog';
import { readResumeFile } from '@/lib/resumes';

type Ctx = { params: Promise<{ id: string }> };

function guessMime(filename: string) {
  if (/\.pdf$/i.test(filename)) return 'application/pdf';
  if (/\.docx$/i.test(filename)) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (/\.doc$/i.test(filename)) return 'application/msword';
  return 'application/octet-stream';
}

/** Serve a candidate CV from Hiring (candidate.resume_file, else linked enquiry). */
export async function GET(request: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const candidate = await getCandidate(Number(id));
    if (!candidate) return jsonError('Not found', 404);

    let stored = candidate.resumeFile;
    let downloadName = candidate.resumeName || (stored ? path.basename(stored) : '');
    let mime = stored ? guessMime(downloadName || stored) : 'application/octet-stream';

    if (!stored && candidate.enquiryId) {
      const enquiry = await getEnquiry(candidate.enquiryId);
      const payload = enquiry?.payload_json || {};
      stored =
        (typeof payload.resume_file === 'string' && payload.resume_file) ||
        (typeof payload.resume_url === 'string' ? path.basename(payload.resume_url) : '');
      if (typeof payload.resume_name === 'string' && payload.resume_name) downloadName = payload.resume_name;
      if (typeof payload.resume_mime === 'string' && payload.resume_mime) mime = payload.resume_mime;
    }

    if (!stored) return jsonError('No resume attached', 404);

    const file = await readResumeFile(stored);
    if (!file) return jsonError('Resume file missing on disk', 404);

    const url = new URL(request.url);
    const asDownload = url.searchParams.get('download') === '1';
    const safeName = (downloadName || path.basename(stored)).replace(/"/g, '');
    const inline = !asDownload && mime === 'application/pdf';

    return new Response(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`,
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
