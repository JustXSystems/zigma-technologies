/**
 * Optional Meridian SaaS bridge (P5).
 * Default MERIDIAN_MODE=local — Zigma forever ops unchanged.
 *
 * - local: GitHub Actions + local desk only
 * - dual:  local forever ops + Admin link to SaaS desk
 * - saas:  Admin Generate report enqueues SaaS job (GitHub optional fallback)
 */

export type MeridianSaasMode = 'local' | 'saas' | 'dual';

export type MeridianSaasConfig = {
  mode: MeridianSaasMode;
  url: string;
  apiKeySet: boolean;
  siteId: string | null;
  configured: boolean;
  deskUrl: string | null;
  message: string;
};

function envTrim(name: string) {
  return (process.env[name] || '').trim();
}

export function meridianSaasMode(): MeridianSaasMode {
  const raw = envTrim('MERIDIAN_MODE').toLowerCase();
  if (raw === 'saas' || raw === 'dual') return raw;
  return 'local';
}

export function meridianSaasConfig(): MeridianSaasConfig {
  const mode = meridianSaasMode();
  const url = envTrim('MERIDIAN_SAAS_URL').replace(/\/$/, '');
  const apiKey = envTrim('MERIDIAN_SAAS_API_KEY');
  const siteId = envTrim('MERIDIAN_SAAS_SITE_ID') || null;
  const apiKeySet = !!apiKey;
  const wantsBridge = mode === 'saas' || mode === 'dual';
  const configured = wantsBridge && !!url && apiKeySet;
  const deskUrl =
    configured && siteId
      ? `${url}/sites/${siteId}`
      : configured
        ? url
        : null;

  let message: string;
  if (mode === 'local') {
    message = 'Local Meridian (GitHub Actions / CLI) — SaaS bridge off';
  } else if (!url) {
    message = 'Set MERIDIAN_SAAS_URL to enable the SaaS bridge';
  } else if (!apiKeySet) {
    message = 'Set MERIDIAN_SAAS_API_KEY (jbt_… site key from Meridian Connect)';
  } else if (mode === 'dual') {
    message = 'Dual — local forever ops + SaaS desk link';
  } else {
    message = 'SaaS mode — Admin Generate report dispatches Meridian SaaS worker';
  }

  return { mode, url, apiKeySet, siteId, configured, deskUrl, message };
}

async function saasFetch(path: string, init: RequestInit = {}) {
  const cfg = meridianSaasConfig();
  if (!cfg.configured) {
    throw new Error(cfg.message);
  }
  const apiKey = envTrim('MERIDIAN_SAAS_API_KEY');
  const res = await fetch(`${cfg.url}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data.error || `Meridian SaaS HTTP ${res.status}`));
  }
  return data;
}

/** Resolve desk URL (prefers /me so siteId env is optional). */
export async function resolveMeridianSaasDesk(): Promise<{
  ok: boolean;
  deskUrl: string | null;
  siteId: string | null;
  error?: string;
}> {
  const cfg = meridianSaasConfig();
  if (!cfg.configured) {
    return { ok: false, deskUrl: null, siteId: cfg.siteId, error: cfg.message };
  }
  try {
    const me = await saasFetch('/api/v1/me');
    const deskUrl = typeof me.deskUrl === 'string' ? me.deskUrl : cfg.deskUrl;
    const siteId = typeof me.siteId === 'string' ? me.siteId : cfg.siteId;
    return { ok: true, deskUrl, siteId };
  } catch (e) {
    return {
      ok: false,
      deskUrl: cfg.deskUrl,
      siteId: cfg.siteId,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function enqueueMeridianSaasJob(
  type: 'seo-report' | 'observe' | 'verify' = 'seo-report'
): Promise<{
  ok: boolean;
  jobId?: string;
  status?: string;
  deskUrl?: string | null;
  message: string;
  error?: string;
}> {
  const cfg = meridianSaasConfig();
  if (!cfg.configured) {
    return { ok: false, message: cfg.message, error: cfg.message, deskUrl: cfg.deskUrl };
  }
  try {
    const data = await saasFetch('/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
    const job = data.job as { id?: string; status?: string } | undefined;
    const desk = await resolveMeridianSaasDesk();
    return {
      ok: true,
      jobId: job?.id,
      status: job?.status || 'queued',
      deskUrl: desk.deskUrl,
      message: `Queued ${type} on Meridian SaaS${job?.id ? ` · ${job.id}` : ''}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg, error: msg, deskUrl: cfg.deskUrl };
  }
}

export async function pollMeridianSaasJob(jobId: string): Promise<{
  ok: boolean;
  status?: string;
  error?: string;
  finishedAt?: string | null;
}> {
  try {
    const data = await saasFetch(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
    const job = data.job as {
      status?: string;
      error?: string | null;
      finishedAt?: string | null;
    };
    return {
      ok: true,
      status: job?.status,
      error: job?.error || undefined,
      finishedAt: job?.finishedAt,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Map SaaS job status → Admin job-status.json shape. */
export function mapSaasJobToAdminStatus(saasStatus: string | undefined): 'running' | 'ok' | 'error' {
  if (saasStatus === 'ok') return 'ok';
  if (saasStatus === 'error') return 'error';
  return 'running'; // queued | running
}
