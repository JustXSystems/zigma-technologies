import { spawn } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MERIDIAN_BIN = path.join(ROOT, 'packages', 'meridian', 'bin', 'meridian.mjs');

export type MeridianEnv = 'prod' | 'preprod';

export type MeridianAct =
  | { action: 'scan' }
  | { action: 'autopilot'; skipAct?: boolean; applyMeta?: boolean }
  | { action: 'submit-sitemap'; feed?: string }
  | { action: 'bing-submit-sitemap'; feed?: string }
  | { action: 'inspect-url'; url: string }
  | { action: 'inspect-priority'; limit?: number }
  | { action: 'inspect-sitemap-delta'; limit?: number }
  | { action: 'sitemap-health'; limit?: number }
  | { action: 'form-health' }
  | { action: 'image-weight' }
  | { action: 'image-optimize' }
  | { action: 'orphan-remediate'; apply?: boolean }
  | { action: 'content-briefs' }
  | { action: 'content-seed' }
  | { action: 'schema-validate' }
  | { action: 'hreflang-validate' }
  | { action: 'nap-audit' }
  | { action: 'keyword-map' }
  | { action: 'citations-playbook' }
  | { action: 'city-pages-readiness' }
  | { action: 'backlink-outreach' }
  | { action: 'unlock-readiness' }
  | { action: 'ops-cockpit' }
  | { action: 'rich-results-pack' }
  | { action: 'top20-meta-pack' }
  | { action: 'review-kit' }
  | { action: 'content-calendar' }
  | { action: 'speed-baseline' }
  | { action: 'preprod-removals' }
  | { action: 'quarterly-digest' }
  | { action: 'meta-polish'; apply?: boolean }
  | { action: 'phase0-wizard' }
  | { action: 'og-share-pack' }
  | { action: 'indexing-queue' }
  | { action: 'locale-decision' }
  | { action: 'phase2-advance'; apply?: boolean; force?: boolean }
  | { action: 'phase3-advance'; apply?: boolean; force?: boolean }
  | { action: 'phase5-advance' }
  | { action: 'draft-meta' }
  | { action: 'apply-meta'; dryRun?: boolean; force?: boolean }
  | { action: 'draft-alt' }
  | { action: 'apply-alt'; dryRun?: boolean; force?: boolean };

const PROFILES: Record<MeridianEnv, string> = {
  prod: path.join(ROOT, 'packages', 'meridian', 'profiles', 'zigma.prod.json'),
  preprod: path.join(ROOT, 'packages', 'meridian', 'profiles', 'zigma.preprod.json'),
};

export function meridianProfilePath(env: MeridianEnv) {
  return PROFILES[env];
}

export function meridianLatestPaths(env: MeridianEnv) {
  const dir = path.join(ROOT, 'storage', 'meridian', env === 'prod' ? 'zigma-prod' : 'zigma-preprod');
  return {
    dir,
    json: path.join(dir, 'report-latest.json'),
    html: path.join(dir, 'report-latest.html'),
    autopilot: path.join(dir, 'autopilot-latest.json'),
    digest: path.join(dir, 'weekly-digest.json'),
    digestMd: path.join(dir, 'weekly-digest.md'),
    sitemapHealth: path.join(dir, 'sitemap-health.json'),
    unlock: path.join(dir, 'unlock-readiness.json'),
    opsCockpit: path.join(dir, 'ops-cockpit.html'),
    opsCockpitJson: path.join(dir, 'ops-cockpit.json'),
    phase0Wizard: path.join(dir, 'phase0-wizard.html'),
    jobStatus: path.join(dir, 'job-status.json'),
  };
}

export type MeridianJobStatus = {
  action: string;
  status: 'running' | 'ok' | 'error';
  startedAt: string;
  finishedAt?: string;
  pid?: number;
  code?: number | null;
  error?: string;
  applyMeta?: boolean;
  skipAct?: boolean;
};

export async function readMeridianJobStatus(env: MeridianEnv): Promise<MeridianJobStatus | null> {
  const { jobStatus, dir } = meridianLatestPaths(env);
  try {
    await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
    await access(/*turbopackIgnore: true*/ jobStatus);
    const raw = await readFile(/*turbopackIgnore: true*/ jobStatus, 'utf8');
    return JSON.parse(raw) as MeridianJobStatus;
  } catch {
    return null;
  }
}

async function writeMeridianJobStatus(env: MeridianEnv, status: MeridianJobStatus) {
  const { jobStatus, dir } = meridianLatestPaths(env);
  await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ jobStatus, JSON.stringify(status, null, 2), 'utf8');
}

/**
 * Start a long Meridian job (autopilot ~3 min) without blocking the HTTP request.
 * Nginx/proxy often times out at ~60s and returns HTML — that caused Admin JSON parse errors.
 */
export async function startMeridianAutopilotBackground(
  env: MeridianEnv,
  opts: { skipAct?: boolean; applyMeta?: boolean } = {}
): Promise<{ started: boolean; job: MeridianJobStatus; alreadyRunning?: boolean }> {
  const existing = await readMeridianJobStatus(env);
  if (existing?.status === 'running') {
    const ageMs = Date.now() - new Date(existing.startedAt).getTime();
    // Allow a stuck lock older than 20 minutes to be replaced
    if (Number.isFinite(ageMs) && ageMs < 20 * 60 * 1000) {
      return { started: false, alreadyRunning: true, job: existing };
    }
  }

  const profile = meridianProfilePath(env);
  const args = ['autopilot', '--profile', profile];
  if (opts.skipAct || env === 'preprod') args.push('--skip-act');
  if (opts.applyMeta) args.push('--apply-meta');

  const startedAt = new Date().toISOString();
  const job: MeridianJobStatus = {
    action: 'autopilot',
    status: 'running',
    startedAt,
    applyMeta: !!opts.applyMeta,
    skipAct: !!(opts.skipAct || env === 'preprod'),
  };
  await writeMeridianJobStatus(env, job);

  const child = spawn(process.execPath, [MERIDIAN_BIN, ...args], {
    cwd: ROOT,
    env: process.env,
    windowsHide: true,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  job.pid = child.pid;
  await writeMeridianJobStatus(env, job);

  child.on('error', (err) => {
    void writeMeridianJobStatus(env, {
      ...job,
      status: 'error',
      finishedAt: new Date().toISOString(),
      error: String(err),
    });
  });
  child.on('exit', (code) => {
    void writeMeridianJobStatus(env, {
      ...job,
      status: code === 0 ? 'ok' : 'error',
      finishedAt: new Date().toISOString(),
      code,
      error: code === 0 ? undefined : `autopilot exited with code ${code}`,
    });
  });

  return { started: true, job };
}

export async function readLatestUnlock(env: MeridianEnv) {
  const { unlock, dir } = meridianLatestPaths(env);
  try {
    await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
    await access(/*turbopackIgnore: true*/ unlock);
    const raw = await readFile(/*turbopackIgnore: true*/ unlock, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function readLatestMeridianReport(env: MeridianEnv) {
  const { json, dir } = meridianLatestPaths(env);
  try {
    await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
    await access(/*turbopackIgnore: true*/ json);
    const raw = await readFile(/*turbopackIgnore: true*/ json, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function readLatestAutopilot(env: MeridianEnv) {
  const { autopilot, dir } = meridianLatestPaths(env);
  try {
    await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
    await access(/*turbopackIgnore: true*/ autopilot);
    const raw = await readFile(/*turbopackIgnore: true*/ autopilot, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function readLatestDigest(env: MeridianEnv) {
  const { digest, dir } = meridianLatestPaths(env);
  try {
    await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
    await access(/*turbopackIgnore: true*/ digest);
    const raw = await readFile(/*turbopackIgnore: true*/ digest, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function spawnMeridian(args: string[]): Promise<{
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [MERIDIAN_BIN, ...args], {
      cwd: ROOT,
      env: process.env,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('close', (code) => {
      resolvePromise({ ok: code === 0, code, stdout, stderr });
    });
    child.on('error', (err) => {
      resolvePromise({ ok: false, code: null, stdout, stderr: String(err) });
    });
  });
}

function envSet(name: string) {
  return !!(process.env[name] || '').trim();
}

/**
 * Connector readiness for Admin (booleans only — never returns secret values).
 * Docs: packages/meridian/SETUP.md
 */
export function meridianConnectorReadiness() {
  const googleClientId = envSet('MERIDIAN_GOOGLE_CLIENT_ID');
  const googleClientSecret = envSet('MERIDIAN_GOOGLE_CLIENT_SECRET');
  const googleRefreshToken = envSet('MERIDIAN_GOOGLE_REFRESH_TOKEN');
  const googleOk = googleClientId && googleClientSecret && googleRefreshToken;
  const ga4PropertyId = envSet('MERIDIAN_GA4_PROPERTY_ID');
  const bingApiKey = envSet('MERIDIAN_BING_API_KEY');
  const psiApiKey = envSet('MERIDIAN_PSI_API_KEY');

  return {
    docsPath: 'packages/meridian/SETUP.md',
    fields: [
      {
        id: 'MERIDIAN_GOOGLE_CLIENT_ID',
        label: 'Google OAuth Client ID',
        set: googleClientId,
        requiredFor: ['gsc', 'ga4', 'act'],
        howTo: 'Google Cloud → APIs & Services → Credentials → OAuth client (Desktop) → Client ID. SETUP.md Part A.5.',
      },
      {
        id: 'MERIDIAN_GOOGLE_CLIENT_SECRET',
        label: 'Google OAuth Client Secret',
        set: googleClientSecret,
        requiredFor: ['gsc', 'ga4', 'act'],
        howTo: 'Same OAuth client → Client secret. SETUP.md Part A.5.',
      },
      {
        id: 'MERIDIAN_GOOGLE_REFRESH_TOKEN',
        label: 'Google OAuth Refresh Token',
        set: googleRefreshToken,
        requiredFor: ['gsc', 'ga4', 'act'],
        howTo: 'Run: node packages/meridian/scripts/google-oauth-setup.mjs after Client ID/Secret are set. SETUP.md Part A.6.',
      },
      {
        id: 'MERIDIAN_GA4_PROPERTY_ID',
        label: 'GA4 Property ID (numeric)',
        set: ga4PropertyId,
        requiredFor: ['ga4'],
        howTo: 'GA4 → Admin → Property settings → Property ID (digits only, NOT G-…). SETUP.md Part B.',
      },
      {
        id: 'MERIDIAN_BING_API_KEY',
        label: 'Bing Webmaster API key',
        set: bingApiKey,
        requiredFor: ['bing'],
        howTo: 'Bing Webmaster → Settings → API Access → create key. SETUP.md Part D.',
      },
      {
        id: 'MERIDIAN_PSI_API_KEY',
        label: 'PageSpeed Insights API key',
        set: psiApiKey,
        requiredFor: ['pagespeed'],
        howTo: 'Google Cloud → Credentials → API key; enable PageSpeed Insights API. SETUP.md Part E.',
      },
    ],
    connectors: {
      gsc: { ready: googleOk, missing: googleOk ? [] : ['MERIDIAN_GOOGLE_CLIENT_ID', 'MERIDIAN_GOOGLE_CLIENT_SECRET', 'MERIDIAN_GOOGLE_REFRESH_TOKEN'].filter((k) => !envSet(k)) },
      ga4: {
        ready: googleOk && ga4PropertyId,
        missing: [
          ...(!googleOk
            ? ['MERIDIAN_GOOGLE_CLIENT_ID', 'MERIDIAN_GOOGLE_CLIENT_SECRET', 'MERIDIAN_GOOGLE_REFRESH_TOKEN'].filter((k) => !envSet(k))
            : []),
          ...(!ga4PropertyId ? ['MERIDIAN_GA4_PROPERTY_ID'] : []),
        ],
      },
      bing: { ready: bingApiKey, missing: bingApiKey ? [] : ['MERIDIAN_BING_API_KEY'] },
      pagespeed: { ready: psiApiKey, missing: psiApiKey ? [] : ['MERIDIAN_PSI_API_KEY'] },
      act: { ready: googleOk, missing: googleOk ? [] : ['MERIDIAN_GOOGLE_* refresh with webmasters scope'] },
    },
  };
}

/** Run Meridian CLI as a child process (server-side only). */
export function runMeridianCli(env: MeridianEnv) {
  const profile = meridianProfilePath(env);
  return spawnMeridian(['run', '--profile', profile]);
}

export function runMeridianAct(env: MeridianEnv, act: MeridianAct) {
  const profile = meridianProfilePath(env);
  if (act.action === 'scan') {
    return spawnMeridian(['run', '--profile', profile]);
  }
  if (act.action === 'autopilot') {
    const args = ['autopilot', '--profile', profile];
    if (act.skipAct || env === 'preprod') args.push('--skip-act');
    if (act.applyMeta) args.push('--apply-meta');
    return spawnMeridian(args);
  }
  if (act.action === 'submit-sitemap') {
    const args = ['act', 'submit-sitemap', '--profile', profile];
    if (act.feed) args.push('--feed', act.feed);
    return spawnMeridian(args);
  }
  if (act.action === 'bing-submit-sitemap') {
    const args = ['act', 'bing-submit-sitemap', '--profile', profile];
    if (act.feed) args.push('--feed', act.feed);
    return spawnMeridian(args);
  }
  if (act.action === 'inspect-url') {
    return spawnMeridian(['act', 'inspect-url', '--profile', profile, '--url', act.url]);
  }
  if (act.action === 'inspect-priority') {
    const args = ['act', 'inspect-priority', '--profile', profile];
    if (act.limit) args.push('--limit', String(act.limit));
    return spawnMeridian(args);
  }
  if (act.action === 'inspect-sitemap-delta') {
    const args = ['act', 'inspect-sitemap-delta', '--profile', profile];
    if (act.limit) args.push('--limit', String(act.limit));
    return spawnMeridian(args);
  }
  if (act.action === 'sitemap-health') {
    const args = ['act', 'sitemap-health', '--profile', profile];
    if (act.limit) args.push('--limit', String(act.limit));
    return spawnMeridian(args);
  }
  if (act.action === 'form-health') {
    return spawnMeridian(['act', 'form-health', '--profile', profile]);
  }
  if (act.action === 'image-weight') {
    return spawnMeridian(['act', 'image-weight', '--profile', profile]);
  }
  if (act.action === 'image-optimize') {
    return spawnMeridian(['act', 'image-optimize', '--profile', profile]);
  }
  if (act.action === 'orphan-remediate') {
    const args = ['act', 'orphan-remediate', '--profile', profile];
    if (act.apply) args.push('--apply');
    return spawnMeridian(args);
  }
  if (act.action === 'content-briefs') {
    return spawnMeridian(['act', 'content-briefs', '--profile', profile]);
  }
  if (act.action === 'content-seed') {
    return spawnMeridian(['act', 'content-seed', '--profile', profile]);
  }
  if (act.action === 'schema-validate') {
    return spawnMeridian(['act', 'schema-validate', '--profile', profile]);
  }
  if (act.action === 'hreflang-validate') {
    return spawnMeridian(['act', 'hreflang-validate', '--profile', profile]);
  }
  if (act.action === 'nap-audit') {
    return spawnMeridian(['act', 'nap-audit', '--profile', profile]);
  }
  if (act.action === 'keyword-map') {
    return spawnMeridian(['act', 'keyword-map', '--profile', profile]);
  }
  if (act.action === 'citations-playbook') {
    return spawnMeridian(['act', 'citations-playbook', '--profile', profile]);
  }
  if (act.action === 'city-pages-readiness') {
    return spawnMeridian(['act', 'city-pages-readiness', '--profile', profile]);
  }
  if (act.action === 'backlink-outreach') {
    return spawnMeridian(['act', 'backlink-outreach', '--profile', profile]);
  }
  if (act.action === 'unlock-readiness') {
    return spawnMeridian(['act', 'unlock-readiness', '--profile', profile]);
  }
  if (act.action === 'ops-cockpit') {
    return spawnMeridian(['act', 'ops-cockpit', '--profile', profile]);
  }
  if (act.action === 'rich-results-pack') {
    return spawnMeridian(['act', 'rich-results-pack', '--profile', profile]);
  }
  if (act.action === 'top20-meta-pack') {
    return spawnMeridian(['act', 'top20-meta-pack', '--profile', profile]);
  }
  if (act.action === 'review-kit') {
    return spawnMeridian(['act', 'review-kit', '--profile', profile]);
  }
  if (act.action === 'content-calendar') {
    return spawnMeridian(['act', 'content-calendar', '--profile', profile]);
  }
  if (act.action === 'speed-baseline') {
    return spawnMeridian(['act', 'speed-baseline', '--profile', profile, '--skip-api']);
  }
  if (act.action === 'preprod-removals') {
    return spawnMeridian(['act', 'preprod-removals', '--profile', profile]);
  }
  if (act.action === 'quarterly-digest') {
    return spawnMeridian(['act', 'quarterly-digest', '--profile', profile]);
  }
  if (act.action === 'meta-polish') {
    const args = ['act', 'meta-polish', '--profile', profile];
    if (act.apply) args.push('--apply');
    return spawnMeridian(args);
  }
  if (act.action === 'phase0-wizard') {
    return spawnMeridian(['act', 'phase0-wizard', '--profile', profile]);
  }
  if (act.action === 'og-share-pack') {
    return spawnMeridian(['act', 'og-share-pack', '--profile', profile]);
  }
  if (act.action === 'indexing-queue') {
    return spawnMeridian(['act', 'indexing-queue', '--profile', profile]);
  }
  if (act.action === 'locale-decision') {
    return spawnMeridian(['act', 'locale-decision', '--profile', profile]);
  }
  if (act.action === 'phase2-advance') {
    const args = ['act', 'phase2-advance', '--profile', profile];
    if (act.apply) args.push('--apply');
    if (act.force) args.push('--force');
    return spawnMeridian(args);
  }
  if (act.action === 'phase3-advance') {
    const args = ['act', 'phase3-advance', '--profile', profile];
    if (act.apply) args.push('--apply');
    if (act.force) args.push('--force');
    return spawnMeridian(args);
  }
  if (act.action === 'phase5-advance') {
    return spawnMeridian(['act', 'phase5-advance', '--profile', profile]);
  }
  if (act.action === 'draft-meta') {
    return spawnMeridian(['act', 'draft-meta', '--profile', profile]);
  }
  if (act.action === 'apply-meta') {
    const args = ['act', 'apply-meta', '--profile', profile];
    if (act.dryRun) args.push('--dry-run');
    if (act.force) args.push('--force');
    return spawnMeridian(args);
  }
  if (act.action === 'draft-alt') {
    return spawnMeridian(['act', 'draft-alt', '--profile', profile]);
  }
  if (act.action === 'apply-alt') {
    const args = ['act', 'apply-alt', '--profile', profile];
    if (act.dryRun) args.push('--dry-run');
    if (act.force) args.push('--force');
    return spawnMeridian(args);
  }
  return Promise.resolve({ ok: false, code: 2, stdout: '', stderr: 'Unknown action' });
}
