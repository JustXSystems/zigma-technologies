import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runMeridian } from './orchestrator.mjs';
import { inspectPriorityUrls, submitSitemap } from './connectors/gsc-act.mjs';
import { googleEnvStatus } from './connectors/google-auth.mjs';
import { inspectSitemapDelta } from './connectors/sitemap-delta.mjs';
import { applyMeta, draftMeta } from './connectors/meta-automation.mjs';

/**
 * Maximum automation loop for an indexable production profile:
 * 1) Full Meridian scan (technical + connectors + CMS gaps)
 * 2) Auto-draft meta for CMS SEO gaps (Appendix B) → meta-drafts.json
 * 3) Optionally apply drafts to DB (MERIDIAN_AUTO_APPLY_META=1 or --apply-meta)
 * 4) If Google OAuth ready and profile.indexable: submit sitemap + inspect priority + new sitemap URLs
 * 5) Persist autopilot-latest.json + optional webhook
 *
 * @param {object} profile
 * @param {{ outDir?: string, skipAct?: boolean, inspectLimit?: number, applyMeta?: boolean }} [opts]
 */
export async function runAutopilot(profile, opts = {}) {
  const started = Date.now();
  const scan = await runMeridian(profile, { outDir: opts.outDir });
  const actions = [];
  const google = googleEnvStatus();
  const canAct = !!profile.indexable && google.ok && !opts.skipAct;
  const outDir = scan.paths.outDir;

  // Always draft meta when host scripts exist (safe: JSON only)
  const draftOut = resolve(outDir, 'meta-drafts.json');
  const drafted = await draftMeta(profile, { outFile: draftOut });
  actions.push({ id: 'draft-meta', ...drafted });

  const wantApply =
    opts.applyMeta === true ||
    process.env.MERIDIAN_AUTO_APPLY_META === '1' ||
    profile.autopilot?.autoApplyMeta === true;

  if (wantApply && drafted.data?.count > 0) {
    const applied = await applyMeta(profile, { apply: true, file: draftOut });
    actions.push({ id: 'apply-meta', ...applied });
  } else if (drafted.data?.count > 0) {
    actions.push({
      id: 'apply-meta',
      ok: true,
      status: 'skipped',
      message: 'Drafts ready — set MERIDIAN_AUTO_APPLY_META=1 or pass --apply-meta to write to CMS',
      data: { outPath: draftOut, count: drafted.data.count },
    });
  }

  if (!profile.indexable) {
    actions.push({
      id: 'act-skipped',
      ok: true,
      message: 'Non-indexable profile — Act (GSC) skipped by design',
    });
  } else if (!google.ok) {
    actions.push({
      id: 'act-auth',
      ok: false,
      status: 'auth_required',
      message: `Act skipped — missing ${google.missing.join(', ')}. See SETUP.md`,
    });
  } else if (!canAct) {
    actions.push({
      id: 'act-skipped',
      ok: true,
      message: 'Act skipped (--skip-act)',
    });
  } else {
    const sitemap = await submitSitemap(profile);
    actions.push({ id: 'submit-sitemap', ...sitemap });
    const inspect = await inspectPriorityUrls(profile, { limit: opts.inspectLimit ?? 5 });
    actions.push({ id: 'inspect-priority', ...inspect });
    const delta = await inspectSitemapDelta(profile, {
      outDir,
      limit: opts.deltaLimit ?? profile.autopilot?.deltaLimit ?? 10,
    });
    actions.push({ id: 'inspect-sitemap-delta', ...delta });
  }

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
    actionsOk: actions.every((a) => a.ok !== false || a.status === 'auth_required' || a.status === 'skipped'),
    paths: scan.paths,
  };

  const autopilotPath = resolve(outDir, 'autopilot-latest.json');
  await writeFile(autopilotPath, JSON.stringify(autopilot, null, 2), 'utf8');
  autopilot.paths = { ...scan.paths, autopilotPath, metaDrafts: draftOut };

  await maybeWebhook(autopilot);

  const failOnRegression = process.env.MERIDIAN_FAIL_ON_REGRESSION === '1';
  const regressed = trend?.status === 'regressed';
  const ok = scan.ok && (!failOnRegression || !regressed);

  return { ...scan, autopilot, ok, regressed };
}

async function maybeWebhook(autopilot) {
  const url = (process.env.MERIDIAN_WEBHOOK_URL || '').trim();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Meridian autopilot ${autopilot.profile?.displayName || autopilot.profile?.id}: score ${autopilot.scorecard?.overall} (${autopilot.scorecard?.grade}) · ${autopilot.trend?.message || ''} · actions ${autopilot.actions.map((a) => a.id + ':' + (a.ok ? 'ok' : a.status || 'fail')).join(', ')}`,
        meridian: {
          score: autopilot.scorecard?.overall,
          grade: autopilot.scorecard?.grade,
          trend: autopilot.trend?.status,
          hardFails: autopilot.hardFailCount,
          actions: autopilot.actions,
        },
      }),
    });
  } catch {
    /* webhook best-effort */
  }
}
