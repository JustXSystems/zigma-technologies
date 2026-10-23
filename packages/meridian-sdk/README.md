# `@justx/meridian-sdk`

**Product Agent** client for Meridian SaaS (P4). Applies safe on-site patches queued from the Meridian desk.

## What agents may do

| Kind | Effect |
| --- | --- |
| `meta` | Title / meta description |
| `schema` | JSON-LD patch |
| `canonical` | Canonical URL |
| `sitemap-hint` | Include/exclude hint |
| `alt` | Image alt text |

## What agents never do

- Thin city auto-index / doorway pages  
- Auto-send review emails  
- Mass content-factory publish  

## Next.js (App Router)

```ts
// app/api/meridian-agent/route.ts
import { createAgentHandlers } from '@justx/meridian-sdk/next';

export const { GET, POST } = createAgentHandlers({
  baseUrl: process.env.MERIDIAN_SAAS_URL!, // e.g. https://justxsystems.com/jbt/tools/seo-meridian
  apiKey: process.env.MERIDIAN_SITE_API_KEY!, // jbt_…
  apply: async (patch) => {
    // Persist patch.path + patch.payload into your CMS / metadata store
  },
});
```

Cron or Vercel cron → `GET /api/meridian-agent` to poll.  
Optional: register that URL as the agent push endpoint in Meridian Connect.

## Generic poller

```js
import { createMeridianAgent } from '@justx/meridian-sdk';

const agent = createMeridianAgent({
  baseUrl: process.env.MERIDIAN_SAAS_URL,
  apiKey: process.env.MERIDIAN_SITE_API_KEY,
});

await agent.heartbeat({ kind: 'webhook', version: '0.1.0' });
await agent.sync(async (patch) => {
  // apply to CMS
});
```

## WordPress

See [`agents/wordpress/`](../../agents/wordpress/) — install plugin, paste site API key + Meridian base URL, enable WP-Cron poll.

## Auth

```http
Authorization: Bearer jbt_…
GET  /api/v1/agent/pending
POST /api/v1/agent/ack
POST /api/v1/agent/heartbeat
```
