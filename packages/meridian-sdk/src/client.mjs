import { isPatchAllowed } from './quality.mjs';

/**
 * Meridian Product Agent HTTP client.
 *
 * @param {{ baseUrl: string, apiKey: string, fetchImpl?: typeof fetch }} opts
 */
export function createMeridianAgent(opts) {
  const baseUrl = String(opts.baseUrl || '').replace(/\/$/, '');
  const apiKey = String(opts.apiKey || '').trim();
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  if (!baseUrl) throw new Error('baseUrl required');
  if (!apiKey.startsWith('jbt_')) throw new Error('apiKey must be a jbt_… site key');

  async function request(path, init = {}) {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  return {
    async heartbeat({ kind = 'custom', version = '0.1.0', endpointUrl = null, meta = null } = {}) {
      return request('/api/v1/agent/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ kind, version, endpointUrl, meta }),
      });
    },

    async pending({ limit = 20 } = {}) {
      return request(`/api/v1/agent/pending?limit=${limit}`);
    },

    async ack(patchId, status = 'applied', error = null) {
      return request('/api/v1/agent/ack', {
        method: 'POST',
        body: JSON.stringify({ patchId, status, error }),
      });
    },

    /**
     * Poll pending patches and run `applyFn(patch)` for each allowed patch.
     * @param {(patch: object) => Promise<void>|void} applyFn
     */
    async sync(applyFn, { limit = 20 } = {}) {
      const { patches = [], origin } = await this.pending({ limit });
      const results = [];
      for (const patch of patches) {
        const gate = isPatchAllowed(patch);
        if (!gate.ok) {
          await this.ack(patch.id, 'rejected', gate.reason);
          results.push({ id: patch.id, status: 'rejected', reason: gate.reason });
          continue;
        }
        try {
          await applyFn({ ...patch, origin });
          await this.ack(patch.id, 'applied');
          results.push({ id: patch.id, status: 'applied' });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await this.ack(patch.id, 'rejected', msg);
          results.push({ id: patch.id, status: 'rejected', reason: msg });
        }
      }
      return { origin, results };
    },
  };
}
