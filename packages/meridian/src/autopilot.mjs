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
import { writeMonthlyDigest } from './connectors/monthly-digest.mjs';
import { probeFormHealth } from './connectors/form-health.mjs';
import { scanImageWeight } from './connectors/image-weight.mjs';
import { remediateOrphans } from './connectors/orphan-remediate.mjs';
import { optimizeHeavyImages } from './connectors/image-optimize.mjs';
import { writeContentBriefs } from './connectors/content-briefs.mjs';
import { validateSchema } from './connectors/schema-validate.mjs';
import { validateHreflang } from './connectors/hreflang-validate.mjs';
import { auditNap } from './connectors/nap-audit.mjs';
import { buildKeywordMap } from './connectors/keyword-map.mjs';
import { seedThinContent } from './connectors/content-seed.mjs';
import { runClosedLoop } from './connectors/closed-loop.mjs';
import { writeCitationsPlaybook } from './connectors/citations-playbook.mjs';
import { assessCityPages } from './connectors/city-pages-readiness.mjs';
import { writeBacklinkOutreach } from './connectors/backlink-outreach.mjs';
import { assessUnlockReadiness } from './connectors/unlock-readiness.mjs';
import { writeRichResultsPack } from './connectors/rich-results-pack.mjs';
import { writeTop20MetaPack } from './connectors/top20-meta-pack.mjs';
import { writeReviewKit } from './connectors/review-kit.mjs';
import { writeContentCalendar } from './connectors/content-calendar.mjs';
import { writeSpeedBaseline } from './connectors/speed-baseline.mjs';
import { writePreprodRemovals } from './connectors/preprod-removals.mjs';
import { writeQuarterlyDigest } from './connectors/quarterly-digest.mjs';
import { polishMeta } from './connectors/meta-polish.mjs';
import { writePhase0Wizard } from './connectors/phase0-wizard.mjs';
import { writeOgSharePack } from './connectors/og-share-pack.mjs';
import { writeIndexingQueue } from './connectors/indexing-queue.mjs';
import { assessLocaleDecision } from './connectors/locale-decision.mjs';
import { writeOpsCockpit } from './connectors/ops-cockpit.mjs';
import { advancePhase2 } from './connectors/phase2-advance.mjs';
import { advancePhase3 } from './connectors/phase3-advance.mjs';
import { advancePhase5 } from './connectors/phase5-advance.mjs';
import { advancePhase4 } from './connectors/phase4-advance.mjs';
import { advancePhase6 } from './connectors/phase6-advance.mjs';
import { advancePhase7 } from './connectors/phase7-advance.mjs';
import { advancePhase8 } from './connectors/phase8-advance.mjs';
import { advancePhase9 } from './connectors/phase9-advance.mjs';
import { advancePhase10 } from './connectors/phase10-advance.mjs';
import { advancePhase11 } from './connectors/phase11-advance.mjs';
import { advancePhase12 } from './connectors/phase12-advance.mjs';
import { advancePhase13 } from './connectors/phase13-advance.mjs';
import { advancePhase14 } from './connectors/phase14-advance.mjs';
import { hydrateMeridianSecrets } from './lib/hydrate-secrets.mjs';

function mergeFindings(scan, result) {
  if (!Array.isArray(result?.findings) || !result.findings.length || !scan.report?.findings) return;
  scan.report.findings.push(...result.findings);
  const hard = result.findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  if (hard.length) {
    scan.hardFailCount = (scan.hardFailCount || 0) + hard.length;
    scan.ok = false;
  }
}

/**
 * Maximum automation loop (M5–M11):
 * scan → remediate → Phase 0–14 packs → meta polish → unlock → perpetual signals → webhook
 */
export async function runAutopilot(profile, opts = {}) {
  hydrateMeridianSecrets();
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

  // --- Meta polish (Phase 3 length/brand) ---
  if (profile.autopilot?.skipMetaPolish !== true) {
    const polished = await polishMeta(profile, {
      outDir,
      apply:
        opts.polishMeta === true ||
        process.env.MERIDIAN_AUTO_POLISH_META === '1' ||
        profile.autopilot?.autoPolishMeta === true,
    });
    actions.push({ id: 'meta-polish', ...polished });
    mergeFindings(scan, polished);
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

  // --- Sitemap health + link graph ---
  if (!opts.skipHealth && profile.autopilot?.skipHealth !== true) {
    const health = await crawlSitemapHealth(profile, {
      outDir,
      limit: opts.healthLimit ?? profile.autopilot?.healthLimit ?? 120,
    });
    actions.push({ id: 'sitemap-health', ...health });
    mergeFindings(scan, health);
  }

  // --- Form / enquiry health (Phase 9.1) ---
  if (profile.autopilot?.skipFormHealth !== true) {
    const form = await probeFormHealth(profile, { outDir });
    actions.push({ id: 'form-health', ...form });
    mergeFindings(scan, form);
  }

  // --- Image weight on key pages (Phase 4 lite) ---
  if (profile.autopilot?.skipImageWeight !== true) {
    const images = await scanImageWeight(profile, { outDir });
    actions.push({ id: 'image-weight', ...images });
    mergeFindings(scan, images);

    // Optimize heavy images (sharp) when flagged
    if ((images.data?.heavyCount || 0) > 0 && profile.autopilot?.skipImageOptimize !== true) {
      const opt = await optimizeHeavyImages(profile, {
        outDir,
        apply:
          opts.optimizeImages === true ||
          process.env.MERIDIAN_AUTO_OPTIMIZE_IMAGES === '1' ||
          profile.autopilot?.autoOptimizeImages === true,
      });
      actions.push({ id: 'image-optimize', ...opt });
    }
  }

  // --- Orphan prescriptions (+ optional catalog hub footer apply) ---
  if (profile.autopilot?.skipOrphanRemediate !== true) {
    const orphans = await remediateOrphans(profile, {
      outDir,
      orphans: actions.find((a) => a.id === 'sitemap-health')?.data?.linkGraph?.orphans,
      apply:
        opts.applyOrphans === true ||
        process.env.MERIDIAN_AUTO_APPLY_ORPHANS === '1' ||
        profile.autopilot?.autoApplyOrphans === true,
    });
    actions.push({ id: 'orphan-remediate', ...orphans });
    mergeFindings(scan, orphans);
  }

  // --- Content briefs for thin/orphan pages ---
  if (profile.autopilot?.skipContentBriefs !== true) {
    const briefs = await writeContentBriefs(profile, { outDir });
    actions.push({ id: 'content-briefs', ...briefs });
    mergeFindings(scan, briefs);

    // Seed FAQ stubs into thin catalog pages
    if (profile.autopilot?.skipContentSeed !== true) {
      const seeded = await seedThinContent(profile, {
        outDir,
        apply:
          opts.seedContent === true ||
          process.env.MERIDIAN_AUTO_SEED_CONTENT === '1' ||
          profile.autopilot?.autoSeedContent === true,
      });
      actions.push({ id: 'content-seed', ...seeded });
    }
  }

  // --- JSON-LD / Rich Results readiness ---
  if (profile.autopilot?.skipSchemaValidate !== true) {
    const schema = await validateSchema(profile, { outDir });
    actions.push({ id: 'schema-validate', ...schema });
    mergeFindings(scan, schema);
  }

  // --- hreflang (Phase 6) ---
  if (profile.autopilot?.skipHreflang !== true) {
    const hf = await validateHreflang(profile, { outDir });
    actions.push({ id: 'hreflang-validate', ...hf });
    mergeFindings(scan, hf);
  }

  // --- NAP / GBP checklist (Phase 5) ---
  if (profile.autopilot?.skipNapAudit !== true) {
    const nap = await auditNap(profile, { outDir });
    actions.push({ id: 'nap-audit', ...nap });
    mergeFindings(scan, nap);
  }

  // --- Keyword map (Phase 7) ---
  if (profile.autopilot?.skipKeywordMap !== true) {
    const kw = await buildKeywordMap(profile, { outDir });
    actions.push({ id: 'keyword-map', ...kw });
    mergeFindings(scan, kw);
  }

  // --- Closed-loop recheck after remediations ---
  if (profile.autopilot?.skipClosedLoop !== true) {
    const healthBefore = actions.find((a) => a.id === 'sitemap-health');
    const imagesBefore = actions.find((a) => a.id === 'image-weight');
    const loop = await runClosedLoop(profile, {
      outDir,
      before: {
        heavyCount: imagesBefore?.data?.heavyCount,
        orphanCount: healthBefore?.data?.linkGraph?.orphanCount,
        thinCount: healthBefore?.data?.linkGraph?.thinCount,
      },
    });
    actions.push({ id: 'closed-loop', ...loop });
  }

  // --- Citations playbook (Phase 5.5) — skipped when Phase 5 advance bundles it ---
  if (profile.autopilot?.skipCitations !== true && profile.autopilot?.skipPhase5Advance === true) {
    const napAction = actions.find((a) => a.id === 'nap-audit');
    const cites = await writeCitationsPlaybook(profile, {
      outDir,
      nap: napAction?.data?.nap,
    });
    actions.push({ id: 'citations-playbook', ...cites });
    mergeFindings(scan, cites);
  }

  // --- City × service readiness (Phase 6) — skipped when Phase 6 advance bundles it ---
  if (profile.autopilot?.skipCityPages !== true && profile.autopilot?.skipPhase6Advance === true) {
    const city = await assessCityPages(profile, { outDir });
    actions.push({ id: 'city-pages-readiness', ...city });
    mergeFindings(scan, city);
  }

  // --- Backlink outreach pack (Phase 8) — skipped when Phase 8 advance bundles it ---
  if (profile.autopilot?.skipBacklinks !== true && profile.autopilot?.skipPhase8Advance === true) {
    const bl = await writeBacklinkOutreach(profile, { outDir });
    actions.push({ id: 'backlink-outreach', ...bl });
    mergeFindings(scan, bl);
  }

  // --- Secrets / human-gate unlock score ---
  if (profile.autopilot?.skipUnlock !== true) {
    const unlock = await assessUnlockReadiness(profile, { outDir });
    actions.push({ id: 'unlock-readiness', ...unlock });
    mergeFindings(scan, unlock);
  }

  // --- Phase 0 unlock wizard ---
  if (profile.autopilot?.skipPhase0Wizard !== true) {
    const wiz = await writePhase0Wizard(profile, { outDir });
    actions.push({ id: 'phase0-wizard', ...wiz });
    mergeFindings(scan, wiz);
  }

  // --- Indexing queue (Phase 1.7) ---
  if (profile.autopilot?.skipIndexingQueue !== true) {
    const iq = await writeIndexingQueue(profile, {
      outDir,
      skipInspect: opts.skipAct === true || !profile.indexable,
    });
    actions.push({ id: 'indexing-queue', ...iq });
    mergeFindings(scan, iq);
  }

  // --- Phase 2 advance (sameAs apply + NAP + Rich Results) ---
  if (profile.autopilot?.skipPhase2Advance !== true) {
    const p2 = await advancePhase2(profile, {
      outDir,
      apply:
        opts.applySameAs === true ||
        process.env.MERIDIAN_AUTO_APPLY_SAMEAS === '1' ||
        profile.autopilot?.autoApplySameAs === true,
    });
    actions.push({ id: 'phase2-advance', ...p2 });
    mergeFindings(scan, p2);
  } else if (profile.autopilot?.skipRichResults !== true) {
    const rr = await writeRichResultsPack(profile, { outDir });
    actions.push({ id: 'rich-results-pack', ...rr });
    mergeFindings(scan, rr);
  }

  // --- Phase 3 advance (meta polish apply + alt + top audit) ---
  if (profile.autopilot?.skipPhase3Advance !== true) {
    const p3 = await advancePhase3(profile, {
      outDir,
      apply: profile.autopilot?.autoPolishMeta === true || process.env.MERIDIAN_AUTO_POLISH_META === '1',
      applyAlt: profile.autopilot?.autoApplyAlt === true || process.env.MERIDIAN_AUTO_APPLY_ALT === '1',
    });
    actions.push({ id: 'phase3-advance', ...p3 });
    mergeFindings(scan, p3);
  } else if (profile.autopilot?.skipTop20Meta !== true) {
    const top = await writeTop20MetaPack(profile, { outDir });
    actions.push({ id: 'top20-meta-pack', ...top });
    mergeFindings(scan, top);
  }

  // --- Phase 5 advance (GBP ops HTML + citations CSV + review kit) ---
  if (profile.autopilot?.skipPhase5Advance !== true) {
    const p5 = await advancePhase5(profile, { outDir });
    actions.push({ id: 'phase5-advance', ...p5 });
    mergeFindings(scan, p5);
  } else if (profile.autopilot?.skipReviewKit !== true) {
    const napAction = actions.find((a) => a.id === 'nap-audit');
    const rk = await writeReviewKit(profile, { outDir, nap: napAction?.data?.nap });
    actions.push({ id: 'review-kit', ...rk });
    mergeFindings(scan, rk);
  }

  // --- Phase 7 advance (calendar ICS/CSV + ops; keywords/briefs/seed already ran) ---
  if (profile.autopilot?.skipPhase7Advance !== true) {
    const p7 = await advancePhase7(profile, {
      outDir,
      skipKeywordMap: true,
      skipBriefs: true,
      seed: false,
    });
    actions.push({ id: 'phase7-advance', ...p7 });
    mergeFindings(scan, p7);
  } else if (profile.autopilot?.skipContentCalendar !== true) {
    const cal = await writeContentCalendar(profile, { outDir });
    actions.push({ id: 'content-calendar', ...cal });
    mergeFindings(scan, cal);
  }

  // --- Phase 8 advance (outreach mailto + CSV + ops) ---
  if (profile.autopilot?.skipPhase8Advance !== true) {
    const p8 = await advancePhase8(profile, { outDir });
    actions.push({ id: 'phase8-advance', ...p8 });
    mergeFindings(scan, p8);
  }

  // --- Phase 4 advance (PSI + TTFB + ops HTML; images already scanned earlier) ---
  if (profile.autopilot?.skipPhase4Advance !== true) {
    const heavyCount = actions.find((a) => a.id === 'image-weight')?.data?.heavyCount;
    const p4 = await advancePhase4(profile, {
      outDir,
      skipImages: true,
      heavyCount,
      runPsi:
        opts.runPsi === true ||
        process.env.MERIDIAN_AUTO_PSI === '1' ||
        profile.autopilot?.autoPsi === true,
    });
    actions.push({ id: 'phase4-advance', ...p4 });
    mergeFindings(scan, p4);
  } else if (profile.autopilot?.skipSpeedBaseline !== true) {
    const speed = await writeSpeedBaseline(profile, {
      outDir,
      skipApi:
        opts.runPsi !== true &&
        process.env.MERIDIAN_AUTO_PSI !== '1' &&
        profile.autopilot?.autoPsi !== true,
    });
    actions.push({ id: 'speed-baseline', ...speed });
    mergeFindings(scan, speed);
  }

  // --- OG / social share pack (Phase 2.4) ---
  if (profile.autopilot?.skipOgShare !== true) {
    const og = await writeOgSharePack(profile, { outDir });
    actions.push({ id: 'og-share-pack', ...og });
    mergeFindings(scan, og);
  }

  // --- Phase 6 advance (city briefs + locale decision) ---
  if (profile.autopilot?.skipPhase6Advance !== true) {
    const p6 = await advancePhase6(profile, { outDir });
    actions.push({ id: 'phase6-advance', ...p6 });
    mergeFindings(scan, p6);
  } else if (profile.autopilot?.skipLocaleDecision !== true) {
    const loc = await assessLocaleDecision(profile, { outDir });
    actions.push({ id: 'locale-decision', ...loc });
    mergeFindings(scan, loc);
  }

  // --- PreProd removals checklist (Phase 1.8) ---
  if (profile.autopilot?.skipPreprodRemovals !== true) {
    const rem = await writePreprodRemovals(profile, { outDir });
    actions.push({ id: 'preprod-removals', ...rem });
    mergeFindings(scan, rem);
  }

  // --- Bing act ---
  if (profile.indexable && !opts.skipAct) {
    actions.push({ id: 'bing-submit-sitemap', ...(await submitBingSitemap(profile)) });
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

  // --- Phase 12 score lift (meta + calendar) then Phase 11 convergence ---
  let digest = { data: { paths: {} } };
  let monthly = { data: { paths: {} } };
  if (profile.autopilot?.skipPhase12Advance !== true) {
    const p12 = await advancePhase12(profile, {
      outDir,
      scan,
      apply: true,
      // Avoid double full-site scan inside autopilot (already scanned at start)
      skipScan: true,
      skipPhase11: true,
      skipVerify: true,
    });
    actions.push({ id: 'phase12-advance', ...p12 });
    mergeFindings(scan, p12);
  }
  let digestsDone = false;
  if (profile.autopilot?.skipPhase14Advance !== true) {
    const p14 = await advancePhase14(profile, {
      outDir,
      scan,
      apply: true,
      skipHeal: false,
    });
    actions.push({ id: 'phase14-advance', ...p14 });
    mergeFindings(scan, p14);
    digest = { data: { paths: { mdPath: resolve(outDir, 'weekly-digest.md') } }, message: p14.data?.digests?.weekly };
    monthly = { data: { paths: { mdPath: resolve(outDir, 'monthly-digest.md') } } };
    digestsDone = true;
  } else if (profile.autopilot?.skipPhase13Advance !== true) {
    const p13 = await advancePhase13(profile, {
      outDir,
      scan,
      apply: true,
      skipPhase11: true,
      skipVerify: true,
      skipAct: true,
    });
    actions.push({ id: 'phase13-advance', ...p13 });
    mergeFindings(scan, p13);
  }

  if (!digestsDone && profile.autopilot?.skipPhase11Advance !== true) {
    const p11 = await advancePhase11(profile, {
      outDir,
      scan,
      actions,
      skipForm: true,
      skipPhase10: profile.autopilot?.skipPhase10Advance === true,
    });
    actions.push({ id: 'phase11-advance', ...p11 });
    mergeFindings(scan, p11);
    digest = { data: { paths: { mdPath: resolve(outDir, 'weekly-digest.md') } }, message: p11.data?.phase9?.message };
    monthly = { data: { paths: { mdPath: resolve(outDir, 'monthly-digest.md') } } };
    digestsDone = true;
  } else if (!digestsDone && profile.autopilot?.skipPhase9Advance !== true) {
    const p9 = await advancePhase9(profile, {
      outDir,
      scan,
      actions,
      skipForm: true,
    });
    actions.push({ id: 'phase9-advance', ...p9 });
    mergeFindings(scan, p9);
    digest = { data: { paths: { mdPath: resolve(outDir, 'weekly-digest.md') } }, message: p9.data?.digests?.weekly };
    monthly = { data: { paths: { mdPath: resolve(outDir, 'monthly-digest.md') } } };
    digestsDone = true;
  } else if (!digestsDone) {
    digest = await writeWeeklyDigest(profile, { scan, actions, outDir });
    actions.push({ id: 'weekly-digest', ...digest });
    monthly = await writeMonthlyDigest(profile, { scan, actions, outDir });
    actions.push({ id: 'monthly-digest', ...monthly });
    if (profile.autopilot?.skipQuarterly !== true) {
      const q = await writeQuarterlyDigest(profile, { outDir, scan, actions });
      actions.push({ id: 'quarterly-digest', ...q });
    }
    if (profile.autopilot?.skipOpsCockpit !== true) {
      const unlockAction = actions.find((a) => a.id === 'unlock-readiness');
      const cockpit = await writeOpsCockpit(profile, {
        outDir,
        scan,
        actions,
        unlock: unlockAction?.data,
        scorecard: scan.report.scorecard,
      });
      actions.push({ id: 'ops-cockpit', ...cockpit });
    }
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
    actionsOk: actions.every(
      (a) => a.ok !== false || a.status === 'auth_required' || a.status === 'skipped' || a.status === 'degraded'
    ),
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
    monthlyDigest: monthly.data?.paths?.mdPath,
    opsCockpit:
      actions.find((a) => a.id === 'phase9-advance')?.data?.paths?.cockpit ||
      actions.find((a) => a.id === 'ops-cockpit')?.data?.paths?.html,
    phase9Ops: actions.find((a) => a.id === 'phase9-advance')?.data?.paths?.html,
    phase10Ops: actions.find((a) => a.id === 'phase10-advance')?.data?.paths?.html,
    phase11Ops: actions.find((a) => a.id === 'phase11-advance')?.data?.paths?.html,
    phase12Ops: actions.find((a) => a.id === 'phase12-advance')?.data?.paths?.html,
    phase13Ops: actions.find((a) => a.id === 'phase13-advance')?.data?.paths?.html,
    phase14Ops: actions.find((a) => a.id === 'phase14-advance')?.data?.paths?.html,
    unlockReadiness: actions.find((a) => a.id === 'unlock-readiness')?.data?.paths?.md,
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
