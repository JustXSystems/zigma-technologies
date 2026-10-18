import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inspectUrl } from './gsc-act.mjs';
import { googleEnvStatus } from './google-auth.mjs';
import { fetchManual } from '../lib/html.mjs';

/**
 * Fetch live sitemap, diff against last snapshot, inspect new URLs in GSC.
 * @param {object} profile
 * @param {{ outDir: string, limit?: number }} opts
 */
export async function inspectSitemapDelta(profile, opts) {
  const auth = googleEnvStatus();
  if (!auth.ok) {
    return {
      ok: false,
      status: 'auth_required',
      message: `Sitemap delta inspect skipped — missing ${auth.missing.join(', ')}`,
      data: { newUrls: [] },
    };
  }

  const origin = profile.origin.replace(/\/$/, '');
  const sitemapUrl = `${origin}/sitemap.xml`;
  let locs = [];
  try {
    const res = await fetchManual(sitemapUrl, { forceBody: true });
    const matches = [...(res.body || '').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)];
    locs = matches.map((m) => m[1].trim()).filter(Boolean);
  } catch (e) {
    return { ok: false, status: 'error', message: String(e.message || e), data: { newUrls: [] } };
  }

  const snapPath = resolve(opts.outDir, 'sitemap-locs-latest.json');
  let previous = [];
  try {
    previous = JSON.parse(await readFile(snapPath, 'utf8')).locs || [];
  } catch {
    previous = [];
  }

  const prevSet = new Set(previous);
  const newUrls = locs.filter((u) => !prevSet.has(u));
  const limit = opts.limit ?? 10;
  const toInspect = (previous.length === 0 ? locs.slice(0, limit) : newUrls.slice(0, limit));

  const inspections = [];
  for (const url of toInspect) {
    // eslint-disable-next-line no-await-in-loop
    inspections.push(await inspectUrl(profile, url));
  }

  await mkdir(opts.outDir, { recursive: true });
  await writeFile(
    snapPath,
    JSON.stringify({ updatedAt: new Date().toISOString(), count: locs.length, locs }, null, 2),
    'utf8'
  );

  const failed = inspections.filter((i) => !i.ok).length;
  return {
    ok: failed === 0,
    status: failed ? 'degraded' : 'ok',
    message:
      previous.length === 0
        ? `Baseline sitemap snapshot (${locs.length} URLs); inspected ${inspections.length}`
        : `${newUrls.length} new sitemap URL(s); inspected ${inspections.length}`,
    data: {
      sitemapUrl,
      totalLocs: locs.length,
      newUrlCount: newUrls.length,
      newUrls: newUrls.slice(0, 50),
      inspected: inspections.map((i) => ({
        url: i.data?.inspectionUrl,
        ok: i.ok,
        coverage: i.data?.coverageState || i.message,
      })),
    },
  };
}
