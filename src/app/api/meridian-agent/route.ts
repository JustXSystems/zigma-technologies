/**
 * Meridian Product Agent — App Router
 * Poll / push quality-gated SEO patches from Meridian SaaS.
 *
 * Cron or manual: GET /api/meridian-agent
 * Push: POST /api/meridian-agent with { event: 'agent.patch', patch }
 *
 * Handlers are created lazily so CI `next build` (no jbt_ key) does not throw
 * during "Collecting page data".
 */
import { createAgentHandlers } from '@justx/meridian-sdk/next';
import { applyMeridianAgentPatch } from '@/lib/meridian-agent-apply';
import {
  collectZigmaAgentInventory,
  ZIGMA_AGENT_CAPABILITIES,
} from '@/lib/meridian-agent-inventory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Patch = { kind: string; path?: string; payload?: Record<string, unknown>; id?: string };
type AgentHandlers = { GET: () => Promise<Response>; POST: (request: Request) => Promise<Response> };

let handlers: AgentHandlers | null = null;

function siteApiKey() {
  return (
    process.env.MERIDIAN_SITE_API_KEY?.trim() ||
    process.env.MERIDIAN_SAAS_API_KEY?.trim() ||
    ''
  );
}

function getHandlers(): AgentHandlers | null {
  const apiKey = siteApiKey();
  if (!apiKey.startsWith('jbt_')) return null;
  if (handlers) return handlers;

  const saasUrl =
    process.env.MERIDIAN_SAAS_URL?.trim() || 'https://justxsystems.com/jbt/tools/seo-meridian';

  handlers = createAgentHandlers({
    baseUrl: saasUrl,
    apiKey,
    kind: 'next',
    version: 'zigma-0.3.0',
    endpointUrl: 'https://zigma-technologies.com/api/meridian-agent',
    capabilities: ZIGMA_AGENT_CAPABILITIES,
    collectInventory: collectZigmaAgentInventory,
    apply: async (patch: Patch) => {
      const result = await applyMeridianAgentPatch(patch);
      console.info('[meridian-agent]', patch.kind, patch.path, result);
    },
  }) as AgentHandlers;

  return handlers;
}

function notConfigured() {
  return Response.json(
    {
      ok: false,
      error: 'Meridian Product Agent not configured — set MERIDIAN_SITE_API_KEY (jbt_…)',
    },
    { status: 503 }
  );
}

export async function GET() {
  const h = getHandlers();
  if (!h) return notConfigured();
  return h.GET();
}

export async function POST(request: Request) {
  const h = getHandlers();
  if (!h) return notConfigured();
  return h.POST(request);
}
