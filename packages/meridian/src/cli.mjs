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
  meridian act draft-meta | apply-meta | draft-alt | apply-alt --profile ./profiles/site.json
  meridian act weekly-digest --profile ./profiles/site.json
  meridian init-profile --out ./my-site.json
  meridian help

Autopilot = scan + draft/apply meta+alt + sitemap health + Bing submit + GSC act + weekly digest + webhook.

Env:
  MERIDIAN_GOOGLE_* / MERIDIAN_GA4_PROPERTY_ID / MERIDIAN_BING_API_KEY / MERIDIAN_PSI_API_KEY
  MERIDIAN_WEBHOOK_URL          POST summary JSON after autopilot
  MERIDIAN_FAIL_ON_REGRESSION=1 Fail autopilot/verify CI when score drops ≥3
  MERIDIAN_AUTO_APPLY_META=1    Write drafted meta (+ alt) into CMS empty fields
  MERIDIAN_AUTO_APPLY_ALT=1     Write drafted image alt only

Docs: packages/meridian/SETUP.md · AUTOMATION.md
`);
}
