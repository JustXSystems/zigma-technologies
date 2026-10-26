import { createMeridianAgent, DEFAULT_AGENT_CAPABILITIES } from './client.mjs';
import { isPatchAllowed } from './quality.mjs';

/**
 * Default apply for Next App Router.
 * Persists meta/schema/etc in-memory; writes IndexNow key to public/{key}.txt when fs is available.
 *
 * @param {object} patch
 * @param {{ store?: Map<string, object>, publicDir?: string }} [ctx]
 */
export async function defaultNextApply(patch, ctx = {}) {
  const store = ctx.store || globalThis.__meridianAgentStore || (globalThis.__meridianAgentStore = new Map());
  const key = String(patch.path || '/');
  const prev = store.get(key) || {};
  const next = { ...prev, kind: patch.kind, updatedAt: new Date().toISOString() };
  if (patch.kind === 'meta') {
    if (patch.payload?.title) next.title = patch.payload.title;
    if (patch.payload?.description) next.description = patch.payload.description;
    if (patch.payload?.ogTitle) next.ogTitle = patch.payload.ogTitle;
    if (patch.payload?.ogDescription) next.ogDescription = patch.payload.ogDescription;
    if (patch.payload?.ogImage) next.ogImage = patch.payload.ogImage;
  } else if (patch.kind === 'canonical') {
    next.canonical = patch.payload?.canonical;
  } else if (patch.kind === 'schema') {
    next.schemaJsonLd = patch.payload?.schemaJsonLd;
  } else if (patch.kind === 'sitemap-hint') {
    next.sitemapInclude = patch.payload?.include;
  } else if (patch.kind === 'alt') {
    next.alt = { ...(next.alt || {}), [patch.payload?.imageSrc || patch.payload?.imageId]: patch.payload?.alt };
  } else if (patch.kind === 'verify-meta') {
    next.googleSiteVerification =
      patch.payload?.googleSiteVerification || patch.payload?.content || null;
  } else if (patch.kind === 'bing-verify') {
    const code =
      patch.payload?.msvalidate ||
      patch.payload?.authenticationCode ||
      patch.payload?.content ||
      null;
    next.msvalidate = code;
    // XML file verify works without editing root layout <head>
    if (code) {
      try {
        const { writeFileSync, mkdirSync } = await import('node:fs');
        const { resolve } = await import('node:path');
        const publicDir = ctx.publicDir || resolve(process.cwd(), 'public');
        mkdirSync(publicDir, { recursive: true });
        const xml = `<?xml version="1.0"?>\n<users>\n\t<user>${String(code).trim()}</user>\n</users>\n`;
        writeFileSync(resolve(publicDir, 'BingSiteAuth.xml'), xml, 'utf8');
        next.bingAuthFile = '/BingSiteAuth.xml';
      } catch (e) {
        next.bingAuthWriteError = e instanceof Error ? e.message : String(e);
      }
    }
  } else if (patch.kind === 'indexnow-key') {
    const hex = String(patch.payload?.key || '').trim();
    next.indexNowKey = hex;
    if (hex && /^[a-f0-9]{8,64}$/i.test(hex)) {
      try {
        const { writeFileSync, mkdirSync } = await import('node:fs');
        const { resolve } = await import('node:path');
        const publicDir = ctx.publicDir || resolve(process.cwd(), 'public');
        mkdirSync(publicDir, { recursive: true });
        writeFileSync(resolve(publicDir, `${hex}.txt`), hex, 'utf8');
        next.indexNowKeyFile = `/${hex}.txt`;
      } catch (e) {
        next.indexNowWriteError = e instanceof Error ? e.message : String(e);
      }
    }
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
  const capabilities = opts.capabilities || {
    ...DEFAULT_AGENT_CAPABILITIES,
    cms: kind === 'next' ? 'next' : kind,
  };

  async function heartbeatAndSync() {
    let inventory = null;
    if (typeof opts.collectInventory === 'function') {
      try {
        inventory = await opts.collectInventory();
      } catch {
        inventory = null;
      }
    }
    await agent.heartbeat({
      kind,
      version: opts.version || '0.2.0',
      endpointUrl: opts.endpointUrl || null,
      capabilities,
      inventory,
    });
    return agent.sync(apply);
  }

  async function GET() {
    const result = await heartbeatAndSync();
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
    const result = await heartbeatAndSync();
    return Response.json({ ok: true, ...result });
  }

  return { GET, POST, agent };
}
