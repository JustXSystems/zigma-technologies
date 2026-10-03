import { getThemeSettings } from '@/lib/cms';
import { parseCrmLeadKinds, type CrmLeadKind } from '@/lib/crm-kinds';
import { mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';

export type CrmLeadPayload = {
  id: number;
  kind?: CrmLeadKind;
  source: string;
  item_type?: string;
  payload: Record<string, unknown>;
  created_at?: string;
};

type CrmWebhookConfig = Pick<SiteSettings, 'crmWebhookUrl' | 'crmWebhookSecret' | 'crmProvider' | 'companyName'>;

/** Server-only details that must not leave this server (stored file names, MIME sniffing). */
const INTERNAL_PAYLOAD_KEYS = ['resume_file', 'resume_mime'];

/** Push lead to generic CRM webhook (HubSpot/Zapier/Make/custom). Never throws to caller. */
export async function pushCrmLead(settings: CrmWebhookConfig, lead: CrmLeadPayload) {
  const url = settings.crmWebhookUrl?.trim();
  if (!url) return { skipped: true as const };

  try {
    const score = scoreLead(lead.payload);
    const body = {
      provider: settings.crmProvider || 'webhook',
      event: 'lead.created',
      lead_score: score,
      ...lead,
      company: settings.companyName,
    };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (settings.crmWebhookSecret?.trim()) {
      headers.Authorization = `Bearer ${settings.crmWebhookSecret.trim()}`;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error('[crm-webhook]', res.status, await res.text().catch(() => ''));
      return { ok: false as const, status: res.status };
    }
    return { ok: true as const };
  } catch (err) {
    console.error('[crm-webhook]', err);
    return { ok: false as const };
  }
}

/**
 * Forward a stored website submission when Site Settings → CRM has its kind switched on.
 * Call from `after()` so the visitor never waits on the webhook. Never throws.
 */
export async function sendLeadToCrm(kind: CrmLeadKind, lead: Omit<CrmLeadPayload, 'kind'>) {
  try {
    const settings = mergeSiteSettings((await getThemeSettings()).site);
    if (!parseCrmLeadKinds(settings.crmLeadKinds).has(kind)) return { skipped: true as const };
    const payload = Object.fromEntries(
      Object.entries(lead.payload).filter(([key]) => !INTERNAL_PAYLOAD_KEYS.includes(key))
    );
    return await pushCrmLead(settings, { ...lead, kind, payload });
  } catch (err) {
    console.error(`[crm-${kind}]`, err);
    return { ok: false as const };
  }
}

export function scoreLead(payload: Record<string, unknown>) {
  let score = 10;
  const subject = String(payload.subject || '').toLowerCase();
  const urgency = String(payload.urgency || '').toLowerCase();
  const capacity = String(payload.capacity || '');
  if (subject.includes('emergency')) score += 40;
  if (subject.includes('quote') || subject.includes('ups') || subject.includes('solar')) score += 15;
  if (urgency.includes('urgent') || urgency.includes('emergency')) score += 25;
  if (capacity.includes('500') || capacity.toLowerCase().includes('utility')) score += 20;
  if (payload.company) score += 10;
  if (payload.email && payload.phone) score += 10;
  return Math.min(100, score);
}
