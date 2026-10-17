import path from 'path';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import {
  CANDIDATE_SOURCES,
  createCandidate,
  listCandidates,
  type CandidateStage,
  type CandidateWriteInput,
} from '@/lib/career-hiring';
import { saveResumeFile } from '@/lib/resumes';

const ALLOWED_RESUME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

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

function hasAllowedExt(filename: string) {
  return /\.(pdf|doc|docx)$/i.test(filename);
}

function guessMime(filename: string) {
  if (/\.pdf$/i.test(filename)) return 'application/pdf';
  if (/\.docx$/i.test(filename)) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (/\.doc$/i.test(filename)) return 'application/msword';
  return '';
}

function looksLikeResume(buf: Buffer, filename: string) {
  if (buf.length < 5) return false;
  if (buf.subarray(0, 5).toString('utf8') === '%PDF-') return true;
  if (buf[0] === 0x50 && buf[1] === 0x4b) return /\.docx$/i.test(filename);
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return /\.doc$/i.test(filename);
  return false;
}

function normalizeSource(raw: string | undefined): string {
  const s = (raw || 'other').trim().toLowerCase().replace(/\s+/g, '_');
  if ((CANDIDATE_SOURCES as readonly string[]).includes(s)) return s;
  if (s === 'whatsapp' || s === 'email_whatsapp') return 'email';
  return 'other';
}

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
    const actor = session.name || session.email;
    const contentType = request.headers.get('content-type') || '';

    let body: CandidateWriteInput;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const jobId = Number(form.get('jobId'));
      const name = String(form.get('name') || '').trim();
      if (!jobId || !name) return jsonError('Role and candidate name are required', 400);

      let resumeFile: string | undefined;
      let resumeName: string | undefined;
      const resume = form.get('resume');
      if (resume instanceof File && resume.size > 0) {
        if (resume.size > MAX_RESUME_BYTES) return jsonError('Resume too large (max 5MB)', 400);
        if (!hasAllowedExt(resume.name)) return jsonError('Resume must be PDF or Word (.pdf, .doc, .docx)', 400);
        const mime = resume.type || guessMime(resume.name);
        if (mime && !ALLOWED_RESUME.has(mime)) {
          return jsonError('Resume must be PDF or Word (.pdf, .doc, .docx)', 400);
        }
        const buffer = Buffer.from(await resume.arrayBuffer());
        if (!looksLikeResume(buffer, resume.name)) {
          return jsonError('Resume file content does not look like a PDF or Word document', 400);
        }
        const ext = path.extname(resume.name).toLowerCase() || '.pdf';
        const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
        await saveResumeFile(storedName, buffer);
        resumeFile = storedName;
        resumeName = resume.name;
      }

      const stageRaw = String(form.get('stage') || 'applied');
      body = {
        jobId,
        name,
        email: String(form.get('email') || '').trim() || undefined,
        phone: String(form.get('phone') || '').trim() || undefined,
        experience: String(form.get('experience') || '').trim() || undefined,
        notes: String(form.get('notes') || '').trim() || undefined,
        source: normalizeSource(String(form.get('source') || '')),
        stage: (
          [
            'applied',
            'screening',
            'interview',
            'offer',
            'hired',
            'rejected',
            'withdrawn',
            'on_hold',
          ] as CandidateStage[]
        ).includes(stageRaw as CandidateStage)
          ? (stageRaw as CandidateStage)
          : 'applied',
        resumeFile,
        resumeName,
        tags: ['manual-entry'],
      };
    } else {
      const parsed = writeSchema.parse(await readJson(request));
      body = {
        ...parsed,
        source: normalizeSource(parsed.source),
      } as CandidateWriteInput;
    }

    const id = await createCandidate(body, actor);
    return jsonOk({ id, candidate: { id, ...body } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(error.issues[0]?.message || 'Invalid candidate', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
