import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { scanImageWeight } from './image-weight.mjs';
import { crawlSitemapHealth } from './sitemap-health.mjs';

/**
 * After remediations, re-check key metrics and record before→after delta.
 */
export async function runClosedLoop(profile, { outDir, before = {} } = {}) {
  const imagesAfter = await scanImageWeight(profile, { outDir: undefined });
  // Light health recheck — cap lower for speed
  const healthAfter = await crawlSitemapHealth(profile, {
    outDir: undefined,
    limit: profile.autopilot?.closedLoopHealthLimit ?? 40,
  });

  const delta = {
    heavyImages: {
      before: before.heavyCount ?? null,
      after: imagesAfter.data?.heavyCount ?? null,
    },
    orphans: {
      before: before.orphanCount ?? null,
      after: healthAfter.data?.linkGraph?.orphanCount ?? null,
    },
    thin: {
      before: before.thinCount ?? null,
      after: healthAfter.data?.linkGraph?.thinCount ?? null,
    },
    healthHardOk: healthAfter.ok,
  };

  const improved =
    (delta.heavyImages.before != null &&
      delta.heavyImages.after != null &&
      delta.heavyImages.after < delta.heavyImages.before) ||
    (delta.orphans.before != null && delta.orphans.after != null && delta.orphans.after < delta.orphans.before);

  const payload = {
    generatedAt: new Date().toISOString(),
    delta,
    improved,
    imagesAfter: { heavyCount: imagesAfter.data?.heavyCount, message: imagesAfter.message },
    healthAfter: {
      ok: healthAfter.ok,
      orphanCount: healthAfter.data?.linkGraph?.orphanCount,
      thinCount: healthAfter.data?.linkGraph?.thinCount,
      message: healthAfter.message,
    },
  };

  if (outDir) {
    await mkdir(outDir, { recursive: true });
    await writeFile(resolve(outDir, 'closed-loop.json'), JSON.stringify(payload, null, 2), 'utf8');
  }

  return {
    ok: true,
    status: 'ok',
    message: improved
      ? `Closed-loop improved · heavy ${delta.heavyImages.before}→${delta.heavyImages.after} · orphans ${delta.orphans.before}→${delta.orphans.after}`
      : `Closed-loop recheck · heavy ${delta.heavyImages.after} · orphans ${delta.orphans.after}`,
    data: payload,
  };
}
