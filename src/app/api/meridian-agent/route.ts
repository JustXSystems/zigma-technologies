/**
 * Meridian Product Agent — App Router
 * Poll / push quality-gated SEO patches from Meridian SaaS.
 *
 * Cron or manual: GET /api/meridian-agent
 * Push: POST /api/meridian-agent with { event: 'agent.patch', patch }
 */
import { createAgentHandlers } from '@justx/meridian-sdk/next';
import { applyMeridianAgentPatch } from '@/lib/meridian-agent-apply';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const saasUrl =
  process.env.MERIDIAN_SAAS_URL?.trim() || 'https://justxsystems.com/jbt/tools/seo-meridian';
/** Product Agent key (kit) — also accepted as MERIDIAN_SAAS_API_KEY for P5 bridge parity */
const apiKey =
  process.env.MERIDIAN_SITE_API_KEY?.trim() || process.env.MERIDIAN_SAAS_API_KEY?.trim() || '';

export const { GET, POST } = createAgentHandlers({
  baseUrl: saasUrl,
  apiKey,
  kind: 'next',
  version: 'zigma-0.1.0',
  apply: async (patch: { kind: string; path?: string; payload?: Record<string, unknown>; id?: string }) => {
    const result = await applyMeridianAgentPatch(patch);
    console.info('[meridian-agent]', patch.kind, patch.path, result);
  },
});
