import { createMeridianAgent } from './client.mjs';
import { isPatchAllowed } from './quality.mjs';

/**
 * Default in-memory / file-less apply for Next App Router demos.
 * Real sites should persist title/description into CMS or metadata store.
 *
 * @param {object} patch
 * @param {{ store?: Map<string, object> }} [ctx]
 */
export async function defaultNextApply(patch, ctx = {}) {
  const store = ctx.store || globalThis.__meridianAgentStore || (globalThis.__meridianAgentStore = new Map());
  const key = String(patch.path || '/');
  const prev = store.get(key) || {};
  const next = { ...prev, kind: patch.kind, updatedAt: new Date().toISOString() };
  if (patch.kind === 'meta') {
    if (patch.payload?.title) next.title = patch.payload.title;
    if (patch.payload?.description) next.description = patch.payload.description;
  } else if (patch.kind === 'canonical') {
    next.canonical = patch.payload?.canonical;
  } else if (patch.kind === 'schema') {
    next.schemaJsonLd = patch.payload?.schemaJsonLd;
  } else if (patch.kind === 'sitemap-hint') {
    next.sitemapInclude = patch.payload?.include;
  } else if (patch.kind === 'alt') {
    next.alt = { ...(next.alt || {}), [patch.payload?.imageSrc || patch.payload?.imageId]: patch.payload?.alt };
  }
  store.set(key, next);
  return next;
}

/**
 * Create App Router handlers for a Product Agent endpoint.
 *
 * Usage (app/api/meridian-agent/route.ts):
 *   import { createAgentHandlers } from '@justx/meridian-sdk/next';
 *   export const { GET, POST } = createAgentHandlers({
 *     baseUrl: process.env.MERIDIAN_SAAS_URL!,
 *     apiKey: process.env.MERIDIAN_SITE_API_KEY!,
 *     apply: async (patch) => { ... persist to CMS ... },
 *   });
 */
export function createAgentHandlers(opts) {
  const agent = createMeridianAgent({
    baseUrl: opts.baseUrl,
    apiKey: opts.apiKey,
    fetchImpl: opts.fetchImpl,
  });
  const apply = opts.apply || defaultNextApply;
  const kind = opts.kind || 'next';

  async function GET() {
    await agent.heartbeat({ kind, version: opts.version || '0.1.0', endpointUrl: opts.endpointUrl || null });
    const result = await agent.sync(apply);
    return Response.json({ ok: true, ...result });
  }

  async function POST(request) {
    const body = await request.json().catch(() => ({}));
    if (body.event === 'agent.patch' && body.patch) {
      const gate = isPatchAllowed(body.patch);
      if (!gate.ok) {
        await agent.ack(body.patch.id, 'rejected', gate.reason);
        return Response.json({ ok: false, reason: gate.reason }, { status: 400 });
      }
      try {
        await apply(body.patch);
        await agent.ack(body.patch.id, 'applied');
        return Response.json({ ok: true, status: 'applied', id: body.patch.id });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await agent.ack(body.patch.id, 'rejected', msg);
        return Response.json({ ok: false, error: msg }, { status: 500 });
      }
    }
    // Manual sync trigger
    await agent.heartbeat({ kind, version: opts.version || '0.1.0', endpointUrl: opts.endpointUrl || null });
    const result = await agent.sync(apply);
    return Response.json({ ok: true, ...result });
  }

  return { GET, POST, agent };
}
