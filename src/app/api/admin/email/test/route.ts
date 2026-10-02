import { z } from 'zod';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { MAIL_EVENTS, type MailEventKey } from '@/lib/mail-config';
import { sendTestEmail } from '@/lib/mail';
import { getMailSettings } from '@/lib/mail-store';
import { effectiveProvider, verifyConnection } from '@/lib/mail-transport';
import { emailRouteError, requireEmailAdmin } from '../_shared';

const schema = z.object({
  action: z.enum(['connection', 'send']),
  to: z.string().max(500).optional(),
  event: z
    .string()
    .refine((v) => MAIL_EVENTS.some((e) => e.key === v), 'Unknown template')
    .optional(),
  submissionId: z.number().int().positive().optional(),
});

/** Tests run against the *saved* settings, so Save first, then Test. */
export async function POST(request: Request) {
  try {
    await requireEmailAdmin();
    const body = schema.parse(await readJson(request));
    if (body.action === 'connection') {
      const stored = await getMailSettings();
      try {
        const message = await verifyConnection(effectiveProvider(stored.config, stored.saved), stored.config, stored.secrets);
        return jsonOk({ ok: true, message });
      } catch (err) {
        return jsonOk({ ok: false, message: err instanceof Error ? err.message : String(err) });
      }
    }
    if (!body.to) return jsonError('Test recipient is required');
    const result = await sendTestEmail(body.to, body.event as MailEventKey | undefined, body.submissionId);
    if (!result.ok) return jsonOk({ ok: false, message: result.error });
    const parts = [`Test email sent to ${body.to} from ${result.from}. Check the inbox (and Junk) in a minute.`];
    if (result.fromCheck) parts.push(result.fromCheck.note);
    if (result.note) parts.push(result.note);
    return jsonOk({
      ok: result.fromCheck?.status !== 'rewritten',
      message: parts.join(' '),
      fromCheck: result.fromCheck,
    });
  } catch (error) {
    return emailRouteError(error, 'Test failed');
  }
}
