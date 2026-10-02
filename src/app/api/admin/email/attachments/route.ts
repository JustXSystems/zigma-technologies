import { jsonError, jsonOk } from '@/lib/api';
import { saveMailAttachment } from '@/lib/mail-store';
import { emailRouteError, requireEmailAdmin } from '../_shared';

/** Uploads a static template attachment; it is linked to a template (and kept) when settings are saved. */
export async function POST(request: Request) {
  try {
    await requireEmailAdmin();
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) return jsonError('Choose a file to upload');
    const attachment = await saveMailAttachment(file.name, Buffer.from(await file.arrayBuffer()));
    return jsonOk({ attachment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /not allowed|too large/i.test(error.message)) return jsonError(error.message, 400);
    return emailRouteError(error, 'Upload failed');
  }
}
