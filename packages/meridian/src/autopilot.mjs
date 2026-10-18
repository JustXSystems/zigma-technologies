import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runMeridian } from './orchestrator.mjs';
import { inspectPriorityUrls, submitSitemap } from './connectors/gsc-act.mjs';
import { googleEnvStatus } from './connectors/google-auth.mjs';
import { inspectSitemapDelta } from './connectors/sitemap-delta.mjs';
import { applyAlt, applyMeta, draftAlt, draftMeta } from './connectors/meta-automation.mjs';
import { crawlSitemapHealth } from './connectors/sitemap-health.mjs';
import { submitBingSitemap } from './connectors/bing-act.mjs';
import { writeWeeklyDigest } from './connectors/weekly-digest.mjs';

/**
 * Maximum automation loop:
 * 1) Full scan (technical + connectors + CMS gaps)
 * 2) Draft (+ optional apply) meta + image alt
 * 3) Sitemap health crawl (no auth)
 * 4) Bing sitemap submit (if API key)
 * 5) GSC act: submit + inspect priority + sitemap delta (if OAuth)
 * 6) Weekly Phase 9 digest
 * 7) autopilot-latest.json + webhook
 *
 * @param {object} profile
 * @param {{ outDir?: string, skipAct?: boolean, inspectLimit?: number, applyMeta?: boolean, applyAlt?: boolean, skipHealth?: boolean }} [opts]
 */
export async function runAutopilot(profile, opts = {}) {
  const started = Date.now();
  const scan = await runMeridian(profile, { outDir: opts.outDir });
  const actions = [];
  const google = googleEnvStatus();
  const canGscAct = !!profile.indexable && google.ok && !opts.skipAct;
  const outDir = scan.paths.outDir;

  // --- Meta drafts ---
  const draftOut = resolve(outDir, 'meta-drafts.json');
  const drafted = await draftMeta(profile, { outFile: draftOut });
  actions.push({ id: 'draft-meta', ...drafted });

  const wantApplyMeta =
    opts.applyMeta === true ||
    process.env.MERIDIAN_AUTO_APPLY_META === '1' ||
    profile.autopilot?.autoApplyMeta === true;

  if (wantApplyMeta && drafted.data?.count > 0) {
    actions.push({ id: 'apply-meta', ...(await applyMeta(profile, { apply: true, file: draftOut })) });
  } else if (drafted.data?.count > 0) {
    actions.push({
      id: 'apply-meta',
      ok: true,
      status: 'skipped',
      message: 'Drafts ready — set MERIDIAN_AUTO_APPLY_META=1 or pass --apply-meta',
      data: { outPath: draftOut, count: drafted.data.count },
    });
  }

  // --- Alt drafts ---
  const altOut = resolve(outDir, 'alt-drafts.json');
  const altDrafted = await draftAlt(profile, { outFile: altOut });
  actions.push({ id: 'draft-alt', ...altDrafted });

  const wantApplyAlt =
    opts.applyAlt === true ||
    opts.applyMeta === true ||
    process.env.MERIDIAN_AUTO_APPLY_ALT === '1' ||
    process.env.MERIDIAN_AUTO_APPLY_META === '1' ||
    profile.autopilot?.autoApplyAlt === true;

  if (wantApplyAlt && altDrafted.data?.count > 0) {
    actions.push({ id: 'apply-alt', ...(await applyAlt(profile, { apply: true, file: altOut })) });
  } else if (altDrafted.data?.count > 0) {
    actions.push({
      id: 'apply-alt',
      ok: true,
      status: 'skipped',
      message: 'Alt drafts ready — set MERIDIAN_AUTO_APPLY_ALT=1 or pass --apply-meta/--apply-alt',
      data: { outPath: altOut, count: altDrafted.data.count },
    });
  }

  // --- Sitemap health (always on indexable; capped crawl, no auth) ---
  if (!opts.skipHealth && profile.autopilot?.skipHealth !== true) {
    const health = await crawlSitemapHealth(profile, {
      outDir,
      limit: opts.healthLimit ?? profile.autopilot?.healthLimit ?? 120,
    });
    actions.push({ id: 'sitemap-health', ...health });
    // Merge health findings into scan report for digest/hard-fail awareness
    if (Array.isArray(health.findings) && health.findings.length && scan.report?.findings) {
      scan.report.findings.push(...health.findings);
      const hard = health.findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
      if (hard.length) {
        scan.hardFailCount = (scan.hardFailCount || 0) + hard.length;
        scan.ok = false;
      }
    }
  }

  // --- Bing act (independent of Google) ---
  if (profile.indexable && !opts.skipAct) {
    const bing = await submitBingSitemap(profile);
    actions.push({ id: 'bing-submit-sitemap', ...bing });
  }

  // --- GSC act ---
  if (!profile.indexable) {
    actions.push({
      id: 'act-skipped',
      ok: true,
      message: 'Non-indexable profile — GSC Act skipped by design',
    });
  } else if (!google.ok) {
    actions.push({
      id: 'act-auth',
      ok: false,
      status: 'auth_required',
      message: `GSC Act skipped — missing ${google.missing.join(', ')}. See SETUP.md`,
    });
  } else if (!canGscAct) {
    actions.push({ id: 'act-skipped', ok: true, message: 'GSC Act skipped (--skip-act)' });
  } else {
    actions.push({ id: 'submit-sitemap', ...(await submitSitemap(profile)) });
    actions.push({
      id: 'inspect-priority',
      ...(await inspectPriorityUrls(profile, { limit: opts.inspectLimit ?? 5 })),
    });
    actions.push({
      id: 'inspect-sitemap-delta',
      ...(await inspectSitemapDelta(profile, {
        outDir,
        limit: opts.deltaLimit ?? profile.autopilot?.deltaLimit ?? 10,
      })),
    });
  }

  // --- Weekly digest (Phase 9) ---
  const digest = await writeWeeklyDigest(profile, { scan, actions, outDir });
  actions.push({ id: 'weekly-digest', ...digest });

  const trend = scan.report.trend || null;
  const autopilot = {
    meta: {
      mode: 'autopilot',
      startedAt: new Date(started).toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      meridianVersion: scan.report.meta?.meridianVersion,
      runId: scan.report.meta?.runId,
    },
    profile: scan.report.profile,
    scorecard: scan.report.scorecard,
    trend,
    scanOk: scan.ok,
    hardFailCount: scan.hardFailCount,
    findingCount: scan.report.findings?.length ?? 0,
    actions,
    actionsOk: actions.every((a) => a.ok !== false || a.status === 'auth_required' || a.status === 'skipped' || a.status === 'degraded'),
    paths: scan.paths,
  };

  const autopilotPath = resolve(outDir, 'autopilot-latest.json');
  await writeFile(autopilotPath, JSON.stringify(autopilot, null, 2), 'utf8');
  autopilot.paths = {
    ...scan.paths,
    autopilotPath,
    metaDrafts: draftOut,
    altDrafts: altOut,
    weeklyDigest: digest.data?.paths?.mdPath,
  };

  await maybeWebhook(autopilot, digest);

  const failOnRegression = process.env.MERIDIAN_FAIL_ON_REGRESSION === '1';
  const regressed = trend?.status === 'regressed';
  const ok = scan.ok && (!failOnRegression || !regressed);

  return { ...scan, autopilot, ok, regressed };
}

async function maybeWebhook(autopilot, digest) {
  const url = (process.env.MERIDIAN_WEBHOOK_URL || '').trim();
  if (!url) return;
  try {
    const humanLeft = digest?.data?.humanChecklist?.length ?? 0;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Meridian autopilot ${autopilot.profile?.displayName || autopilot.profile?.id}: score ${autopilot.scorecard?.overall} (${autopilot.scorecard?.grade}) · ${autopilot.trend?.message || ''} · human tasks ${humanLeft} · ${autopilot.actions.map((a) => a.id + ':' + (a.ok ? 'ok' : a.status || 'fail')).join(', ')}`,
        meridian: {
          score: autopilot.scorecard?.overall,
          grade: autopilot.scorecard?.grade,
          trend: autopilot.trend?.status,
          hardFails: autopilot.hardFailCount,
          actions: autopilot.actions,
          humanChecklist: digest?.data?.humanChecklist,
        },
      }),
    });
  } catch {
    /* webhook best-effort */
  }
}
