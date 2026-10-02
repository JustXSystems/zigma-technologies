import path from 'path';
import { after } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { createEnquiry, getDefaultForm } from '@/lib/catalog';
import { guardPublicForm } from '@/lib/form-guard';
import { notifySubmission } from '@/lib/mail';
import { saveResumeFile } from '@/lib/resumes';

const ALLOWED_RESUME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MAX_ROLE_LEN = 120;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const guard = guardPublicForm(request, 'careers-apply', form.get('_hp'));
    if (guard.action === 'honeypot') {
      return jsonOk({ id: 0, message: 'Application submitted successfully' }, { status: 201 });
    }
    if (guard.action === 'rate_limited') {
      return jsonError(`Too many submissions. Please try again in ${guard.retryAfterSec} seconds.`, 429);
    }

    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const phone = String(form.get('phone') || '').trim();
    const experience = String(form.get('experience') || '').trim();
    const role = String(form.get('role') || '').trim();
    const message = String(form.get('message') || '').trim();
    const resume = form.get('resume');

    if (!name) return jsonError('Full Name is required');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError('Valid Email is required');
    if (!phone) return jsonError('Phone is required');
    if (!role || role.length > MAX_ROLE_LEN) return jsonError('Please select a valid position');
    if (!(resume instanceof File) || resume.size === 0) return jsonError('Resume / CV is required');
    if (resume.size > MAX_RESUME_BYTES) return jsonError('Resume too large (max 5MB)');
    if (!hasAllowedExt(resume.name)) return jsonError('Resume must be PDF or Word (.pdf, .doc, .docx)');

    const mime = resume.type || guessMime(resume.name);
    if (mime && !ALLOWED_RESUME.has(mime)) {
      return jsonError('Resume must be PDF or Word (.pdf, .doc, .docx)');
    }

    const buffer = Buffer.from(await resume.arrayBuffer());
    if (!looksLikeResume(buffer, resume.name)) {
      return jsonError('Resume file content does not look like a PDF or Word document');
    }

    const ext = path.extname(resume.name).toLowerCase() || extFromMime(mime);
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    await saveResumeFile(storedName, buffer);

    const defaultForm = await getDefaultForm();
    const payload = {
      source: 'careers_apply',
      name,
      email,
      phone,
      experience: experience || null,
      role,
      message: message || null,
      resume_file: storedName,
      resume_name: resume.name,
      resume_mime: mime || guessMime(resume.name),
    };

    const id = await createEnquiry({
      form_id: defaultForm?.id ?? null,
      item_id: null,
      item_type: 'general',
      payload_json: payload,
    });

    after(() =>
      notifySubmission({
        kind: 'careers',
        id,
        itemType: 'careers',
        payload,
        resume: { stored: storedName, name: resume.name, mime: payload.resume_mime },
      })
    );

    return jsonOk({ id, message: 'Application submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Submit failed', 500);
  }
}

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

function extFromMime(mime: string) {
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'application/msword') return '.doc';
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '.docx';
  return '';
}

function looksLikeResume(buf: Buffer, filename: string) {
  if (buf.length < 5) return false;
  if (buf.subarray(0, 5).toString('utf8') === '%PDF-') return true;
  if (buf[0] === 0x50 && buf[1] === 0x4b) return /\.docx$/i.test(filename);
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return /\.doc$/i.test(filename);
  return false;
}
