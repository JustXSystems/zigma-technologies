import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { googleEnvStatus } from './google-auth.mjs';
import { inspectUrl } from './gsc-act.mjs';

/**
 * Phase 1.7 — priority URL indexing queue; auto-inspect when GSC OAuth present.
 */
export async function writeIndexingQueue(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  const paths = (
    opts.paths?.length
      ? opts.paths
      : [
          ...(profile.samplePaths || ['/', '/projects', '/products', '/services', '/contact']),
          profile.sampleDetailPath,
          '/locations/bengaluru',
        ]
  ).filter(Boolean);
  const unique = [...new Set(paths)].slice(0, opts.limit || profile.autopilot?.indexingLimit || 12);
  const queue = unique.map((path) => ({
    path,
    url: `${origin}${path === '/' ? '/' : path}`,
    gscInspectUi: `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(
      profile.connectors?.gsc?.siteUrl || `sc-domain:${new URL(origin).hostname}`
    )}&id=${encodeURIComponent(`${origin}${path === '/' ? '/' : path}`)}`,
  }));

  const auth = googleEnvStatus();
  const inspections = [];
  if (auth.ok && profile.indexable && !opts.skipInspect) {
    for (const item of queue.slice(0, opts.inspectLimit ?? 5)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const r = await inspectUrl(profile, item.url);
        inspections.push({ url: item.url, ...r.data, ok: r.ok, message: r.message });
      } catch (e) {
        inspections.push({ url: item.url, ok: false, message: String(e.message || e) });
      }
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '1.7',
    authOk: auth.ok,
    queue,
    inspections,
    sitemap: `${origin}/sitemap.xml`,
  };

  const md = [
    `# Indexing queue (Phase 1.7)`,
    '',
    `Generated: ${payload.generatedAt} · GSC auth ${auth.ok ? 'OK' : 'required'}`,
    '',
    auth.ok
      ? 'Autopilot inspected the first URLs when possible. Request indexing in GSC UI for any “Discovered/Crawled – not indexed”.'
      : 'Set MERIDIAN_GOOGLE_* (phase0-wizard / SETUP.md), then re-run autopilot to auto-inspect.',
    '',
    '| URL | Coverage (if inspected) |',
    '| --- | --- |',
    ...queue.map((q) => {
      const ins = inspections.find((i) => i.url === q.url);
      return `| ${q.url} | ${ins?.coverageState || ins?.message || (auth.ok ? '—' : 'auth_required')} |`;
    }),
    '',
    `Sitemap: ${payload.sitemap}`,
    '',
  ].join('\n');

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'indexing-queue.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'indexing-queue.md'), md, 'utf8');

  return {
    ok: true,
    status: auth.ok ? 'ok' : 'degraded',
    message: auth.ok
      ? `Indexing queue: ${queue.length} URLs · inspected ${inspections.length}`
      : `Indexing queue: ${queue.length} URLs ready (GSC auth required to auto-inspect)`,
    data: { ...payload, paths: { md: resolve(outDir, 'indexing-queue.md') } },
    findings: [
      {
        code: 'INDEXING_QUEUE',
        severity: auth.ok ? 'low' : 'medium',
        title: auth.ok ? 'Priority URLs inspected / queued' : 'Indexing queue waiting on Google OAuth',
        remediation: auth.ok
          ? 'Request indexing in GSC for any non-indexed priority URL (indexing-queue.md).'
          : 'Complete phase0-wizard OAuth steps, then autopilot will inspect automatically.',
        owner: auth.ok ? 'marketing' : 'developer',
        pillar: 'technical',
      },
    ],
  };
}
