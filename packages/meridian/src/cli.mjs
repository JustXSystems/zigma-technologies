import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProfile, runMeridian } from './orchestrator.mjs';
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
  console.log(`Meridian — SEO Command Center

Usage:
  meridian run --profile ./profiles/site.json [--out ./out]
  meridian verify --profile ./profiles/site.json
  meridian act submit-sitemap --profile ./profiles/site.json [--feed https://…/sitemap.xml]
  meridian act inspect-url --profile ./profiles/site.json --url https://…
  meridian act inspect-priority --profile ./profiles/site.json [--limit 5]
  meridian init-profile --out ./my-site.json
  meridian help

Profiles ship for Zigma:
  packages/meridian/profiles/zigma.prod.json
  packages/meridian/profiles/zigma.preprod.json

Connectors:
  MERIDIAN_GOOGLE_CLIENT_ID / SECRET / REFRESH_TOKEN  (scope: webmasters + analytics.readonly)
  MERIDIAN_GA4_PROPERTY_ID
  MERIDIAN_BING_API_KEY
  MERIDIAN_PSI_API_KEY

OAuth setup:
  node packages/meridian/scripts/google-oauth-setup.mjs
`);
}
