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
import { writeContentCalendar } from './connectors/content-calendar.mjs';
import { writeSpeedBaseline } from './connectors/speed-baseline.mjs';
import { writePreprodRemovals } from './connectors/preprod-removals.mjs';
import { writeQuarterlyDigest } from './connectors/quarterly-digest.mjs';

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
      console.error('\nAUTOPILOT FAILED — hard findings' + (result.regressed ? ' and/or score regression' : '') + '.');
      process.exit(1);
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
    if (action === 'quarterly-digest') {
      const outDir = argValue(argv, '--out') || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
      const result = await writeQuarterlyDigest(profile, { outDir: resolve(outDir) });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    console.error(`Unknown act action: ${action || '(none)'}`);
    printHelp();
    process.exit(2);
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
  meridian act draft-meta | apply-meta | draft-alt | apply-alt --profile ./profiles/site.json
  meridian act weekly-digest | monthly-digest --profile ./profiles/site.json
  meridian init-profile --out ./my-site.json
  meridian help

Autopilot = full remediation + Phase 1–9 packs + unlock + ops cockpit + closed-loop + digests.

Env:
  MERIDIAN_GOOGLE_* / MERIDIAN_GA4_PROPERTY_ID / MERIDIAN_BING_API_KEY / MERIDIAN_PSI_API_KEY
  MERIDIAN_WEBHOOK_URL          POST summary JSON after autopilot
  MERIDIAN_FAIL_ON_REGRESSION=1 Fail autopilot/verify CI when score drops ≥3
  MERIDIAN_AUTO_APPLY_META=1    Write drafted meta (+ alt) into CMS empty fields
  MERIDIAN_AUTO_APPLY_ALT=1     Write drafted image alt only

Docs: packages/meridian/SETUP.md · AUTOMATION.md
`);
}
