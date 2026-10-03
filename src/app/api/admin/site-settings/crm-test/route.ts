import { z } from 'zod';
import { requireScreen } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { getThemeSettings } from '@/lib/cms';
import { pushCrmLead } from '@/lib/crm';
import { mergeSiteSettings } from '@/lib/site-settings';

/** Uses the values on screen (saved or not), so a webhook can be checked before saving it. */
const schema = z.object({
  crmWebhookUrl: z
    .string()
    .trim()
    .url()
    .refine((url) => /^https?:\/\//i.test(url), 'Use an http(s) address'),
  crmWebhookSecret: z.string().optional(),
  crmProvider: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requireScreen('siteSettings');
    const body = schema.parse(await readJson(request));
    const { companyName } = mergeSiteSettings((await getThemeSettings()).site);
    const result = await pushCrmLead(
      {
        crmWebhookUrl: body.crmWebhookUrl,
        crmWebhookSecret: body.crmWebhookSecret ?? '',
        crmProvider: body.crmProvider ?? '',
        companyName,
      },
      {
        id: 0,
        kind: 'enquiry',
        source: 'admin_test',
        item_type: 'general',
        created_at: new Date().toISOString(),
        payload: {
          test: true,
          name: 'Test lead',
          email: 'test-lead@example.com',
          phone: '+91 00000 00000',
          subject: 'CRM connection test',
          message: 'Sent from Admin → Forms & CRM to check the webhook. Safe to delete.',
        },
      }
    );
    if ('ok' in result && result.ok) return jsonOk({ message: 'Test lead delivered.' });
    const status = 'status' in result && result.status ? ` (HTTP ${result.status})` : '';
    return jsonError(`The webhook did not accept the test lead${status}. Check the URL and secret.`, 502);
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Enter a full http(s) webhook URL first.', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Could not send the test lead', 500);
  }
}
