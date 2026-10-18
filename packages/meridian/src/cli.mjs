import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProfile, runMeridian } from './orchestrator.mjs';
import { runAutopilot } from './autopilot.mjs';
import { inspectPriorityUrls, inspectUrl, submitSitemap } from './connectors/gsc-act.mjs';

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
    console.log(`Meridian autopilot → ${profile.displayName || profile.id}`);
    const result = await runAutopilot(profile, {
      outDir: outDir ? resolve(outDir) : undefined,
      skipAct,
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
  meridian autopilot --profile ./profiles/site.json [--skip-act] [--limit 5]
  meridian act submit-sitemap --profile ./profiles/site.json [--feed https://…/sitemap.xml]
  meridian act inspect-url --profile ./profiles/site.json --url https://…
  meridian act inspect-priority --profile ./profiles/site.json [--limit 5]
  meridian init-profile --out ./my-site.json
  meridian help

Autopilot = scan + (if OAuth ready) submit sitemap + inspect priority URLs + trend + optional webhook.

Env:
  MERIDIAN_GOOGLE_* / MERIDIAN_GA4_PROPERTY_ID / MERIDIAN_BING_API_KEY / MERIDIAN_PSI_API_KEY
  MERIDIAN_WEBHOOK_URL          POST summary JSON after autopilot
  MERIDIAN_FAIL_ON_REGRESSION=1 Fail autopilot/verify CI when score drops ≥3

Docs: packages/meridian/SETUP.md · AUTOMATION.md
`);
}
