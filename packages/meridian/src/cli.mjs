import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProfile, runMeridian } from './orchestrator.mjs';
import { runAutopilot } from './autopilot.mjs';
import { inspectPriorityUrls, inspectUrl, submitSitemap } from './connectors/gsc-act.mjs';
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
import { writeCitationsPlaybook } from './connectors/citations-playbook.mjs';
import { assessCityPages } from './connectors/city-pages-readiness.mjs';
import { writeBacklinkOutreach } from './connectors/backlink-outreach.mjs';
import { assessUnlockReadiness } from './connectors/unlock-readiness.mjs';
import { writeOpsCockpit } from './connectors/ops-cockpit.mjs';
import { writeRichResultsPack } from './connectors/rich-results-pack.mjs';
import { writeTop20MetaPack } from './connectors/top20-meta-pack.mjs';
import { writeReviewKit } from './connectors/review-kit.mjs';
import { writeCityDraft } from './connectors/city-draft.mjs';
import { writeContentCalendar } from './connectors/content-calendar.mjs';
import { writeSpeedBaseline } from './connectors/speed-baseline.mjs';
import { writePreprodRemovals } from './connectors/preprod-removals.mjs';
import { writeQuarterlyDigest } from './connectors/quarterly-digest.mjs';
import { polishMeta } from './connectors/meta-polish.mjs';
import { writePhase0Wizard } from './connectors/phase0-wizard.mjs';
import { writeOgSharePack } from './connectors/og-share-pack.mjs';
import { writeIndexingQueue } from './connectors/indexing-queue.mjs';
import { assessLocaleDecision } from './connectors/locale-decision.mjs';
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
import { advancePhase15 } from './connectors/phase15-advance.mjs';
import { advancePhase16 } from './connectors/phase16-advance.mjs';
import { advancePhase17 } from './connectors/phase17-advance.mjs';
import { advancePhase18 } from './connectors/phase18-advance.mjs';
import { advancePhase19 } from './connectors/phase19-advance.mjs';
import { advancePhase20 } from './connectors/phase20-advance.mjs';
import { advancePhase21 } from './connectors/phase21-advance.mjs';
import { advancePhase22 } from './connectors/phase22-advance.mjs';
import { advancePhase23 } from './connectors/phase23-advance.mjs';
import { advancePhase24 } from './connectors/phase24-advance.mjs';
import { advancePhase25 } from './connectors/phase25-advance.mjs';
import { advancePhase26 } from './connectors/phase26-advance.mjs';
import { advancePhase27 } from './connectors/phase27-advance.mjs';
import { advancePhase28 } from './connectors/phase28-advance.mjs';
import { advancePhase29 } from './connectors/phase29-advance.mjs';
import { advancePhase30 } from './connectors/phase30-advance.mjs';
import { advancePhase31 } from './connectors/phase31-advance.mjs';
import { syncSeoGuideCanon } from './connectors/canon-sync.mjs';
import { readFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(__dirname, '..');

export async function runCli(argv) {
  const cmd = argv[0] || 'help';
  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printHelp();
    return;
  }

  if (cmd === 'run' || cmd === 'verify') {
    const profilePath = argValue(argv, '--profile');
    if (!profilePath) {
      console.error('Missing --profile path/to/site.json');
      process.exit(2);
    }
    const profile = await loadProfile(resolve(profilePath));
    const outDir = argValue(argv, '--out');
    console.log(`Meridian ${cmd} → ${profile.displayName || profile.id}`);
    console.log(`  origin: ${profile.origin}`);
    const result = await runMeridian(profile, { outDir: outDir ? resolve(outDir) : undefined });
    console.log(`  score:  ${result.report.scorecard.overall} (${result.report.scorecard.grade})`);
    if (result.report.trend) console.log(`  trend:  ${result.report.trend.message}`);
    console.log(`  findings: ${result.report.findings.length} (hard: ${result.hardFailCount})`);
    console.log(`  report: ${result.paths.latestHtml}`);
    console.log(`  json:   ${result.paths.latestJson}`);
    for (const c of result.report.connectors) {
      console.log(`  connector ${c.id}: ${c.status}`);
    }
    if (cmd === 'verify' && !result.ok) {
      console.error('\nVERIFY FAILED — critical/high findings present.');
      process.exit(1);
    }
    return;
  }

  if (cmd === 'autopilot') {
    const profilePath = argValue(argv, '--profile');
    if (!profilePath) {
      console.error('Missing --profile path/to/site.json');
      process.exit(2);
    }
    const profile = await loadProfile(resolve(profilePath));
    const outDir = argValue(argv, '--out');
    const skipAct = argv.includes('--skip-act');
    const applyMetaFlag = argv.includes('--apply-meta');
    console.log(`Meridian autopilot → ${profile.displayName || profile.id}`);
    const result = await runAutopilot(profile, {
      outDir: outDir ? resolve(outDir) : undefined,
      skipAct,
      applyMeta: applyMetaFlag,
      applyAlt: applyMetaFlag || argv.includes('--apply-alt'),
      inspectLimit: Number(argValue(argv, '--limit') || 5),
    });
    console.log(`  score:  ${result.report.scorecard.overall} (${result.report.scorecard.grade})`);
    if (result.report.trend) console.log(`  trend:  ${result.report.trend.message}`);
    console.log(`  findings: ${result.report.findings.length} (hard: ${result.hardFailCount})`);
    for (const a of result.autopilot.actions) {
      console.log(`  action ${a.id}: ${a.ok === false ? a.status || 'fail' : 'ok'} — ${a.message || ''}`);
    }
    console.log(`  autopilot: ${result.autopilot.paths.autopilotPath}`);
    console.log(`  report: ${result.paths.latestHtml}`);
    if (!result.ok) {
      console.error(
        '\nAUTOPILOT FAILED —' +
          (result.regressed ? ' score regression' : ' hard findings') +
          (result.softHard ? ' (CI soft-hard was on but still failed)' : '') +
          '.'
      );
      process.exit(1);
    }
    if (result.softHard && (result.hardFailCount || 0) > 0) {
      console.warn(
        `\nAUTOPILOT OK (CI soft-hard) — ${result.hardFailCount} hard finding(s) recorded; artifacts uploaded.`
      );
    }
    return;
  }

  if (cmd === 'act') {
    const action = argv[1];
    const profilePath = argValue(argv, '--profile');
    if (!profilePath) {
      console.error('Missing --profile path/to/site.json');
      process.exit(2);
    }
    const profile = await loadProfile(resolve(profilePath));
    if (action === 'submit-sitemap') {
      const feed = argValue(argv, '--feed');
      const result = await submitSitemap(profile, feed);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'bing-submit-sitemap') {
      const feed = argValue(argv, '--feed');
      const result = await submitBingSitemap(profile, feed);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'inspect-url') {
      const url = argValue(argv, '--url') || profile.origin;
      const result = await inspectUrl(profile, url);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'inspect-priority') {
      const limit = Number(argValue(argv, '--limit') || 5);
      const result = await inspectPriorityUrls(profile, { limit });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'inspect-sitemap-delta') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const limit = Number(argValue(argv, '--limit') || 10);
      const result = await inspectSitemapDelta(profile, { outDir: resolve(outDir), limit });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'sitemap-health') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const limit = Number(argValue(argv, '--limit') || 120);
      const result = await crawlSitemapHealth(profile, { outDir: resolve(outDir), limit });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'draft-meta') {
      const outFile = argValue(argv, '--out');
      const result = await draftMeta(profile, outFile ? { outFile: resolve(outFile) } : {});
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'apply-meta') {
      const file = argValue(argv, '--file');
      const force = argv.includes('--force');
      const dry = argv.includes('--dry-run');
      const result = await applyMeta(profile, {
        apply: !dry,
        force,
        file: file ? resolve(file) : undefined,
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'draft-alt') {
      const outFile = argValue(argv, '--out');
      const result = await draftAlt(profile, outFile ? { outFile: resolve(outFile) } : {});
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'apply-alt') {
      const file = argValue(argv, '--file');
      const force = argv.includes('--force');
      const dry = argv.includes('--dry-run');
      const result = await applyAlt(profile, {
        apply: !dry,
        force,
        file: file ? resolve(file) : undefined,
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'weekly-digest') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const scan = await runMeridian(profile, { outDir: resolve(outDir) });
      const result = await writeWeeklyDigest(profile, { scan, actions: [], outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'monthly-digest') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const scan = await runMeridian(profile, { outDir: resolve(outDir) });
      const result = await writeMonthlyDigest(profile, { scan, actions: [], outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'form-health') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await probeFormHealth(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'image-weight') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await scanImageWeight(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'image-optimize') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await optimizeHeavyImages(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--dry-run'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'orphan-remediate') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await remediateOrphans(profile, {
        outDir: resolve(outDir),
        apply: argv.includes('--apply'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'content-briefs') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeContentBriefs(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'schema-validate') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await validateSchema(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'hreflang-validate') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await validateHreflang(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'nap-audit') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await auditNap(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'keyword-map') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await buildKeywordMap(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'content-seed') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await seedThinContent(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--dry-run'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'citations-playbook') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeCitationsPlaybook(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'city-pages-readiness') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await assessCityPages(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'backlink-outreach') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeBacklinkOutreach(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'unlock-readiness') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await assessUnlockReadiness(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'ops-cockpit') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeOpsCockpit(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'rich-results-pack') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeRichResultsPack(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'top20-meta-pack') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeTop20MetaPack(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'review-kit') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeReviewKit(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'city-draft') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeCityDraft(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'content-calendar') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeContentCalendar(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'speed-baseline') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeSpeedBaseline(profile, {
        outDir: resolve(outDir),
        skipApi: argv.includes('--skip-api'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'preprod-removals') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writePreprodRemovals(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase2-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase2(profile, {
        outDir: resolve(outDir),
        apply: argv.includes('--apply') || profile.autopilot?.autoApplySameAs === true,
        force: argv.includes('--force'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase3-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase3(profile, {
        outDir: resolve(outDir),
        apply: argv.includes('--apply') || profile.autopilot?.autoPolishMeta === true,
        applyAlt: argv.includes('--apply') || profile.autopilot?.autoApplyAlt === true,
        force: argv.includes('--force'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase5-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase5(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase4-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase4(profile, {
        outDir: resolve(outDir),
        apply: argv.includes('--apply') || profile.autopilot?.autoOptimizeImages === true,
        runPsi: !argv.includes('--skip-api'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase6-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase6(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase7-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase7(profile, {
        outDir: resolve(outDir),
        apply: argv.includes('--apply') || profile.autopilot?.autoSeedContent === true,
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase8-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase8(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase9-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase9(profile, {
        outDir: resolve(outDir),
        skipForm: argv.includes('--skip-form'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase10-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase10(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        skipAct: argv.includes('--skip-act'),
        syncGh: argv.includes('--sync-gh'),
        force: argv.includes('--force'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase11-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase11(profile, {
        outDir: resolve(outDir),
        skipVerify: argv.includes('--skip-verify'),
        skipPhase10: argv.includes('--skip-phase10'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase12-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase12(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        triggerDeploy: argv.includes('--trigger-deploy'),
        skipScan: argv.includes('--skip-scan'),
        skipVerify: argv.includes('--skip-verify'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase13-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase13(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        restart: !argv.includes('--no-restart'),
        skipAct: argv.includes('--skip-act'),
        skipVerify: argv.includes('--skip-verify'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase14-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase14(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        skipHeal: argv.includes('--skip-heal'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase15-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase15(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        dispatch: argv.includes('--dispatch'),
        skipHeal: argv.includes('--skip-heal'),
        skipPhase14: argv.includes('--skip-phase14'),
        skipPhase9: argv.includes('--skip-phase9'),
        skipAct: argv.includes('--skip-act'),
        target: argValue(argv, '--target') || 'prod',
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase16-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase16(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipScan: argv.includes('--skip-scan'),
        skipMeta: argv.includes('--skip-meta'),
        skipPhase15: argv.includes('--skip-phase15'),
        skipPhase14: !argv.includes('--with-phase14'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase17-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase17(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipScan: argv.includes('--skip-scan'),
        skipMeta: argv.includes('--skip-meta'),
        skipPhase16: argv.includes('--skip-phase16'),
        skipPhase15: !argv.includes('--with-phase15'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase18-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase18(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'canon') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await syncSeoGuideCanon(profile, { outDir: resolve(outDir), root: process.cwd() });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase19-advance') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase19(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipObserve: argv.includes('--skip-observe'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase20-advance' || action === 'desk') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase20(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipObserve: argv.includes('--skip-observe'),
        skipCanon: argv.includes('--skip-canon'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'ack-gbp') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase27(profile, {
        outDir: resolve(outDir),
        ack: true,
        skipObserve: true,
        apply: !argv.includes('--no-apply'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase21-advance' || action === 'presence') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase21(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipObserve: argv.includes('--skip-observe'),
        skipCanon: argv.includes('--skip-canon'),
        skipDesk: argv.includes('--skip-desk'),
        ack: argv.includes('--ack-gbp'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase22-advance' || action === 'throne') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase22(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipObserve: argv.includes('--skip-observe'),
        skipDesk: argv.includes('--skip-desk'),
        skipPresence: argv.includes('--skip-presence'),
        ack: argv.includes('--ack-gbp'),
        parkGbp: !argv.includes('--no-park-gbp'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase23-advance' || action === 'horizon') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase23(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipObserve: argv.includes('--skip-observe'),
        skipDesk: argv.includes('--skip-desk'),
        skipPresence: argv.includes('--skip-presence'),
        skipThrone: argv.includes('--skip-throne'),
        skipDeploy: argv.includes('--skip-deploy'),
        triggerDeploy: argv.includes('--trigger-deploy'),
        ack: argv.includes('--ack-gbp'),
        parkGbp: !argv.includes('--no-park-gbp'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase24-advance' || action === 'courier') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase24(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipObserve: argv.includes('--skip-observe'),
        skipDesk: argv.includes('--skip-desk'),
        skipPresence: argv.includes('--skip-presence'),
        skipThrone: argv.includes('--skip-throne'),
        skipHorizon: argv.includes('--skip-horizon'),
        skipHotpatch: argv.includes('--skip-hotpatch'),
        skipBuild: argv.includes('--skip-build'),
        skipDeploy: argv.includes('--skip-deploy'),
        triggerDeploy: argv.includes('--trigger-deploy'),
        forceGhDeploy: argv.includes('--force-gh-deploy'),
        ack: argv.includes('--ack-gbp'),
        parkGbp: !argv.includes('--no-park-gbp'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase25-advance' || action === 'forge') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase25(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipObserve: argv.includes('--skip-observe'),
        skipDesk: argv.includes('--skip-desk'),
        skipPresence: argv.includes('--skip-presence'),
        skipThrone: argv.includes('--skip-throne'),
        skipHorizon: argv.includes('--skip-horizon'),
        skipCourier: argv.includes('--skip-courier'),
        skipHotpatch: argv.includes('--skip-hotpatch'),
        skipCloser: argv.includes('--skip-closer'),
        skipIndex: argv.includes('--skip-index'),
        skipDeploy: argv.includes('--skip-deploy'),
        triggerDeploy: argv.includes('--trigger-deploy'),
        ack: argv.includes('--ack-gbp'),
        parkGbp: !argv.includes('--no-park-gbp'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase26-advance' || action === 'yield') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase26(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipObserve: argv.includes('--skip-observe'),
        skipDesk: argv.includes('--skip-desk'),
        skipPresence: argv.includes('--skip-presence'),
        skipThrone: argv.includes('--skip-throne'),
        skipHorizon: argv.includes('--skip-horizon'),
        skipCourier: argv.includes('--skip-courier'),
        skipForge: argv.includes('--skip-forge'),
        skipHotpatch: argv.includes('--skip-hotpatch'),
        skipCloser: argv.includes('--skip-closer'),
        skipIndex: argv.includes('--skip-index'),
        skipYield: argv.includes('--skip-yield'),
        skipSitemap: argv.includes('--skip-sitemap'),
        skipDeploy: argv.includes('--skip-deploy'),
        triggerDeploy: argv.includes('--trigger-deploy'),
        ack: argv.includes('--ack-gbp'),
        parkGbp: !argv.includes('--no-park-gbp'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase27-advance' || action === 'lattice') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase27(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipLatticeHeal: argv.includes('--skip-lattice-heal'),
        skipObserve: argv.includes('--skip-observe'),
        skipDesk: argv.includes('--skip-desk'),
        skipPresence: argv.includes('--skip-presence'),
        skipThrone: argv.includes('--skip-throne'),
        skipHorizon: argv.includes('--skip-horizon'),
        skipCourier: argv.includes('--skip-courier'),
        skipForge: argv.includes('--skip-forge'),
        skipHotpatch: argv.includes('--skip-hotpatch'),
        skipCloser: argv.includes('--skip-closer'),
        skipIndex: argv.includes('--skip-index'),
        skipYield: argv.includes('--skip-yield'),
        skipSitemap: argv.includes('--skip-sitemap'),
        skipDeploy: argv.includes('--skip-deploy'),
        triggerDeploy: argv.includes('--trigger-deploy'),
        ack: argv.includes('--ack-gbp'),
        parkGbp: !argv.includes('--no-park-gbp'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase28-advance' || action === 'continuity') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase28(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipLatticeHeal: argv.includes('--skip-lattice-heal'),
        skipLattice: argv.includes('--skip-lattice'),
        skipObserve: argv.includes('--skip-observe'),
        skipDesk: argv.includes('--skip-desk'),
        skipPresence: argv.includes('--skip-presence'),
        skipThrone: argv.includes('--skip-throne'),
        skipHorizon: argv.includes('--skip-horizon'),
        skipCourier: argv.includes('--skip-courier'),
        skipForge: argv.includes('--skip-forge'),
        skipHotpatch: argv.includes('--skip-hotpatch'),
        skipCloser: argv.includes('--skip-closer'),
        skipIndex: argv.includes('--skip-index'),
        skipYield: argv.includes('--skip-yield'),
        skipSitemap: argv.includes('--skip-sitemap'),
        skipDeploy: argv.includes('--skip-deploy'),
        triggerDeploy: argv.includes('--trigger-deploy'),
        ack: argv.includes('--ack-gbp'),
        parkGbp: !argv.includes('--no-park-gbp'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase29-advance' || action === 'chronos') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase29(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipLatticeHeal: argv.includes('--skip-lattice-heal'),
        skipLattice: argv.includes('--skip-lattice'),
        skipContinuity: argv.includes('--skip-continuity'),
        skipObserve: argv.includes('--skip-observe'),
        skipDesk: argv.includes('--skip-desk'),
        skipPresence: argv.includes('--skip-presence'),
        skipThrone: argv.includes('--skip-throne'),
        skipHorizon: argv.includes('--skip-horizon'),
        skipCourier: argv.includes('--skip-courier'),
        skipForge: argv.includes('--skip-forge'),
        skipHotpatch: argv.includes('--skip-hotpatch'),
        skipCloser: argv.includes('--skip-closer'),
        skipIndex: argv.includes('--skip-index'),
        skipYield: argv.includes('--skip-yield'),
        skipSitemap: argv.includes('--skip-sitemap'),
        skipDeploy: argv.includes('--skip-deploy'),
        triggerDeploy: argv.includes('--trigger-deploy'),
        ack: argv.includes('--ack-gbp'),
        parkGbp: !argv.includes('--no-park-gbp'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase30-advance' || action === 'dominion') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase30(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipLatticeHeal: argv.includes('--skip-lattice-heal'),
        skipLattice: argv.includes('--skip-lattice'),
        skipContinuity: argv.includes('--skip-continuity'),
        skipChronos: argv.includes('--skip-chronos'),
        skipObserve: argv.includes('--skip-observe'),
        skipDesk: argv.includes('--skip-desk'),
        skipPresence: argv.includes('--skip-presence'),
        skipThrone: argv.includes('--skip-throne'),
        skipHorizon: argv.includes('--skip-horizon'),
        skipCourier: argv.includes('--skip-courier'),
        skipForge: argv.includes('--skip-forge'),
        skipHotpatch: argv.includes('--skip-hotpatch'),
        skipCloser: argv.includes('--skip-closer'),
        skipIndex: argv.includes('--skip-index'),
        skipYield: argv.includes('--skip-yield'),
        skipSitemap: argv.includes('--skip-sitemap'),
        skipDeploy: argv.includes('--skip-deploy'),
        triggerDeploy: argv.includes('--trigger-deploy'),
        ack: argv.includes('--ack-gbp'),
        parkGbp: !argv.includes('--no-park-gbp'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase31-advance' || action === 'observe' || action === 'steward' || action === 'guard') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await advancePhase31(profile, {
        outDir: resolve(outDir),
        apply: !argv.includes('--no-apply'),
        syncGh: argv.includes('--sync-gh'),
        skipHeal: argv.includes('--skip-heal'),
        skipLatticeHeal: argv.includes('--skip-lattice-heal'),
        skipLattice: argv.includes('--skip-lattice'),
        skipContinuity: argv.includes('--skip-continuity'),
        skipChronos: argv.includes('--skip-chronos'),
        skipDominion: argv.includes('--skip-dominion'),
        skipObserve: argv.includes('--skip-observe'),
        skipDesk: argv.includes('--skip-desk'),
        skipPresence: argv.includes('--skip-presence'),
        skipThrone: argv.includes('--skip-throne'),
        skipHorizon: argv.includes('--skip-horizon'),
        skipCourier: argv.includes('--skip-courier'),
        skipForge: argv.includes('--skip-forge'),
        skipHotpatch: argv.includes('--skip-hotpatch'),
        skipCloser: argv.includes('--skip-closer'),
        skipIndex: argv.includes('--skip-index'),
        skipYield: argv.includes('--skip-yield'),
        skipSitemap: argv.includes('--skip-sitemap'),
        skipDeploy: argv.includes('--skip-deploy'),
        triggerDeploy: argv.includes('--trigger-deploy'),
        ack: argv.includes('--ack-gbp'),
        parkGbp: !argv.includes('--no-park-gbp'),
        gscProxy: !argv.includes('--no-gsc-proxy'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'quarterly-digest') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeQuarterlyDigest(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'meta-polish') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await polishMeta(profile, {
        outDir: resolve(outDir),
        apply: argv.includes('--apply'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'phase0-wizard') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writePhase0Wizard(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'og-share-pack') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeOgSharePack(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'indexing-queue') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeIndexingQueue(profile, {
        outDir: resolve(outDir),
        skipInspect: argv.includes('--skip-inspect'),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (action === 'locale-decision') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await assessLocaleDecision(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    console.error(`Unknown act action: ${action || '(none)'}`);
    printHelp();
    process.exit(2);
  }

  if (cmd === 'unlock-verify') {
    const { spawn } = await import('node:child_process');
    const script = resolve(PKG, 'scripts/unlock-verify.mjs');
    const extra = argv.slice(1);
    const code = await new Promise((resolvePromise) => {
      const child = spawn(process.execPath, [script, ...extra], {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'inherit',
        windowsHide: true,
      });
      child.on('close', (c) => resolvePromise(c ?? 1));
    });
    process.exit(code);
  }

  if (cmd === 'profiles') {
    const registry = resolve(PKG, 'profiles/index.json');
    try {
      const data = JSON.parse(await readFile(registry, 'utf8'));
      console.log(JSON.stringify(data, null, 2));
      for (const p of data.profiles || []) {
        console.error(`  ${p.id} → ${p.path} (${p.env})`);
      }
    } catch (e) {
      console.error(`No profiles registry: ${e.message || e}`);
      process.exit(1);
    }
    return;
  }

  if (cmd === 'init-profile') {
    const dest = argValue(argv, '--out') || './meridian.profile.json';
    const example = resolve(PKG, 'profiles/acme.example.json');
    const { copyFile } = await import('node:fs/promises');
    await copyFile(example, resolve(dest));
    console.log(`Wrote ${resolve(dest)} — edit origin/brand/paths, then: meridian run --profile ${dest}`);
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exit(2);
}

function argValue(argv, flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function printHelp() {
  console.log(`Meridian — SEO Command Center (automation-first)

Usage:
  meridian run --profile ./profiles/site.json [--out ./out]
  meridian verify --profile ./profiles/site.json
  meridian autopilot --profile ./profiles/site.json [--skip-act] [--apply-meta] [--limit 5]
  meridian act submit-sitemap --profile ./profiles/site.json [--feed https://…/sitemap.xml]
  meridian act bing-submit-sitemap --profile ./profiles/site.json
  meridian act inspect-url --profile ./profiles/site.json --url https://…
  meridian act inspect-priority --profile ./profiles/site.json [--limit 5]
  meridian act inspect-sitemap-delta --profile ./profiles/site.json [--limit 10]
  meridian act sitemap-health --profile ./profiles/site.json [--limit 120]
  meridian act form-health | image-weight | image-optimize --profile ./profiles/site.json
  meridian act orphan-remediate [--apply] | content-briefs | content-seed | schema-validate --profile ./profiles/site.json
  meridian act hreflang-validate | nap-audit | keyword-map --profile ./profiles/site.json
  meridian act citations-playbook | city-pages-readiness | backlink-outreach --profile ./profiles/site.json
  meridian act unlock-readiness | ops-cockpit --profile ./profiles/site.json
  meridian act rich-results-pack | top20-meta-pack | review-kit | content-calendar --profile ./profiles/site.json
  meridian act speed-baseline | preprod-removals | quarterly-digest --profile ./profiles/site.json
  meridian act meta-polish [--apply] | phase0-wizard | og-share-pack | indexing-queue | locale-decision
  meridian act phase2-advance [--apply] [--force] --profile ./profiles/site.json
  meridian act phase3-advance [--apply] [--force] --profile ./profiles/site.json
  meridian act phase5-advance --profile ./profiles/site.json
  meridian act phase4-advance [--apply] [--skip-api] --profile ./profiles/site.json
  meridian act phase6-advance --profile ./profiles/site.json
  meridian act phase7-advance [--apply] --profile ./profiles/site.json
  meridian act phase8-advance --profile ./profiles/site.json
  meridian act phase9-advance [--skip-form] --profile ./profiles/site.json
  meridian act phase10-advance [--no-apply] [--skip-act] [--sync-gh] [--force] --profile ./profiles/site.json
  meridian act phase11-advance [--skip-verify] [--skip-phase10] --profile ./profiles/site.json
  meridian act phase12-advance [--no-apply] [--trigger-deploy] [--skip-scan] [--skip-verify] --profile ./profiles/site.json
  meridian act phase13-advance [--no-apply] [--no-restart] [--skip-act] [--skip-verify] --profile ./profiles/site.json
  meridian act phase14-advance [--no-apply] [--skip-heal] --profile ./profiles/site.json
  meridian act phase15-advance [--sync-gh] [--dispatch] [--skip-heal] [--skip-phase14] --profile ./profiles/site.json
  meridian act phase16-advance [--sync-gh] [--skip-scan] [--skip-meta] [--skip-phase15] --profile ./profiles/site.json
  meridian act phase17-advance|guard [--skip-phase16] [--skip-scan] --profile ./profiles/site.json
  meridian act phase18-advance [--skip-heal] [--no-gsc-proxy] --profile ./profiles/site.json
  meridian act phase19-advance [--skip-observe] [--skip-heal] --profile ./profiles/site.json
  meridian act phase20-advance|desk [--skip-observe] [--skip-canon] [--skip-heal] --profile ./profiles/site.json
  meridian act phase21-advance|presence [--skip-desk] [--ack-gbp] [--skip-heal] --profile ./profiles/site.json
  meridian act phase22-advance|throne [--skip-presence] [--ack-gbp] [--no-park-gbp] --profile ./profiles/site.json
  meridian act phase23-advance|horizon [--trigger-deploy] [--skip-deploy] [--skip-throne] --profile ./profiles/site.json
  meridian act phase24-advance|courier [--skip-hotpatch] [--trigger-deploy] [--force-gh-deploy] --profile ./profiles/site.json
  meridian act phase25-advance|forge [--skip-closer] [--skip-courier] --profile ./profiles/site.json
  meridian act phase26-advance|yield [--skip-forge] [--skip-yield] [--skip-sitemap] --profile ./profiles/site.json
  meridian act phase27-advance|lattice [--skip-lattice-heal] [--skip-yield] --profile ./profiles/site.json
  meridian act phase28-advance|continuity [--skip-lattice] [--skip-yield] --profile ./profiles/site.json
  meridian act phase29-advance|chronos [--skip-continuity] [--skip-yield] --profile ./profiles/site.json
  meridian act phase30-advance|dominion [--skip-chronos] [--skip-yield] --profile ./profiles/site.json
  meridian act phase31-advance|observe|steward|guard [--skip-dominion] [--skip-yield] --profile ./profiles/site.json
  meridian act ack-gbp --profile ./profiles/site.json
  meridian act canon --profile ./profiles/site.json
  meridian act draft-meta | apply-meta | draft-alt | apply-alt --profile ./profiles/site.json
  meridian act weekly-digest | monthly-digest --profile ./profiles/site.json
  meridian profiles
  meridian unlock-verify [--act]
  meridian init-profile --out ./my-site.json
  meridian help

Autopilot = full remediation + Phase 0–27 packs + integrity lattice + digests.
Forever ops: npm run meridian:observe  (steward · dominion · chronos · continuity · re-seal: meridian:guard)

Env:
  MERIDIAN_GOOGLE_* / MERIDIAN_GA4_PROPERTY_ID / MERIDIAN_BING_API_KEY / MERIDIAN_PSI_API_KEY
  MERIDIAN_WEBHOOK_URL          POST summary JSON after autopilot
  MERIDIAN_FAIL_ON_REGRESSION=1 Fail autopilot/verify CI when score drops ≥3
  MERIDIAN_AUTO_APPLY_META=1    Write drafted meta (+ alt) into CMS empty fields
  MERIDIAN_AUTO_APPLY_ALT=1     Write drafted image alt only
  MERIDIAN_AUTO_APPLY_SAMEAS=1  Write verified social URLs into Site Settings (Phase 2)

Docs: packages/meridian/SETUP.md · AUTOMATION.md
`);
}
