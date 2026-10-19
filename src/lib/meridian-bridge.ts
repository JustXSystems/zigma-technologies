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
  | { action: 'phase4-advance'; apply?: boolean }
  | { action: 'phase6-advance' }
  | { action: 'phase7-advance'; apply?: boolean }
  | { action: 'phase8-advance' }
  | { action: 'phase9-advance'; skipForm?: boolean }
  | { action: 'phase10-advance'; apply?: boolean; skipAct?: boolean; syncGh?: boolean; force?: boolean }
  | { action: 'phase11-advance'; skipVerify?: boolean; skipPhase10?: boolean }
  | { action: 'phase12-advance'; apply?: boolean; triggerDeploy?: boolean; skipScan?: boolean; skipVerify?: boolean }
  | { action: 'phase13-advance'; apply?: boolean; restart?: boolean; skipAct?: boolean; skipVerify?: boolean }
  | { action: 'phase14-advance'; apply?: boolean; skipHeal?: boolean }
  | {
      action: 'phase15-advance';
      apply?: boolean;
      syncGh?: boolean;
      dispatch?: boolean;
      skipHeal?: boolean;
      skipPhase14?: boolean;
    }
  | {
      action: 'phase16-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipScan?: boolean;
      skipMeta?: boolean;
      skipPhase15?: boolean;
    }
  | {
      action: 'phase17-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipScan?: boolean;
      skipMeta?: boolean;
      skipPhase16?: boolean;
    }
  | {
      action: 'phase18-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase19-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipObserve?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase20-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipObserve?: boolean;
      skipCanon?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase21-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipObserve?: boolean;
      skipCanon?: boolean;
      skipDesk?: boolean;
      ack?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase22-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipObserve?: boolean;
      skipDesk?: boolean;
      skipPresence?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase23-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipObserve?: boolean;
      skipDesk?: boolean;
      skipPresence?: boolean;
      skipThrone?: boolean;
      skipDeploy?: boolean;
      triggerDeploy?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase24-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipObserve?: boolean;
      skipDesk?: boolean;
      skipPresence?: boolean;
      skipThrone?: boolean;
      skipHorizon?: boolean;
      skipHotpatch?: boolean;
      skipBuild?: boolean;
      skipDeploy?: boolean;
      triggerDeploy?: boolean;
      forceGhDeploy?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase25-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipObserve?: boolean;
      skipDesk?: boolean;
      skipPresence?: boolean;
      skipThrone?: boolean;
      skipHorizon?: boolean;
      skipCourier?: boolean;
      skipHotpatch?: boolean;
      skipCloser?: boolean;
      skipIndex?: boolean;
      skipDeploy?: boolean;
      triggerDeploy?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase26-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipObserve?: boolean;
      skipDesk?: boolean;
      skipPresence?: boolean;
      skipThrone?: boolean;
      skipHorizon?: boolean;
      skipCourier?: boolean;
      skipForge?: boolean;
      skipHotpatch?: boolean;
      skipCloser?: boolean;
      skipIndex?: boolean;
      skipYield?: boolean;
      skipSitemap?: boolean;
      skipDeploy?: boolean;
      triggerDeploy?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase27-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipLatticeHeal?: boolean;
      skipObserve?: boolean;
      skipDesk?: boolean;
      skipPresence?: boolean;
      skipThrone?: boolean;
      skipHorizon?: boolean;
      skipCourier?: boolean;
      skipForge?: boolean;
      skipHotpatch?: boolean;
      skipCloser?: boolean;
      skipIndex?: boolean;
      skipYield?: boolean;
      skipSitemap?: boolean;
      skipDeploy?: boolean;
      triggerDeploy?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase28-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipLatticeHeal?: boolean;
      skipLattice?: boolean;
      skipObserve?: boolean;
      skipDesk?: boolean;
      skipPresence?: boolean;
      skipThrone?: boolean;
      skipHorizon?: boolean;
      skipCourier?: boolean;
      skipForge?: boolean;
      skipHotpatch?: boolean;
      skipCloser?: boolean;
      skipIndex?: boolean;
      skipYield?: boolean;
      skipSitemap?: boolean;
      skipDeploy?: boolean;
      triggerDeploy?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase29-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipLatticeHeal?: boolean;
      skipLattice?: boolean;
      skipContinuity?: boolean;
      skipObserve?: boolean;
      skipDesk?: boolean;
      skipPresence?: boolean;
      skipThrone?: boolean;
      skipHorizon?: boolean;
      skipCourier?: boolean;
      skipForge?: boolean;
      skipHotpatch?: boolean;
      skipCloser?: boolean;
      skipIndex?: boolean;
      skipYield?: boolean;
      skipSitemap?: boolean;
      skipDeploy?: boolean;
      triggerDeploy?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase30-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipLatticeHeal?: boolean;
      skipLattice?: boolean;
      skipContinuity?: boolean;
      skipChronos?: boolean;
      skipObserve?: boolean;
      skipDesk?: boolean;
      skipPresence?: boolean;
      skipThrone?: boolean;
      skipHorizon?: boolean;
      skipCourier?: boolean;
      skipForge?: boolean;
      skipHotpatch?: boolean;
      skipCloser?: boolean;
      skipIndex?: boolean;
      skipYield?: boolean;
      skipSitemap?: boolean;
      skipDeploy?: boolean;
      triggerDeploy?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase31-advance';
      apply?: boolean;
      syncGh?: boolean;
      skipHeal?: boolean;
      skipLatticeHeal?: boolean;
      skipLattice?: boolean;
      skipContinuity?: boolean;
      skipChronos?: boolean;
      skipDominion?: boolean;
      skipObserve?: boolean;
      skipDesk?: boolean;
      skipPresence?: boolean;
      skipThrone?: boolean;
      skipHorizon?: boolean;
      skipCourier?: boolean;
      skipForge?: boolean;
      skipHotpatch?: boolean;
      skipCloser?: boolean;
      skipIndex?: boolean;
      skipYield?: boolean;
      skipSitemap?: boolean;
      skipDeploy?: boolean;
      triggerDeploy?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      gscProxy?: boolean;
    }
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
    phase9Ops: path.join(dir, 'phase9-ops.html'),
    phase9Ics: path.join(dir, 'phase9-routine.ics'),
    phase10Ops: path.join(dir, 'phase10-ops.html'),
    phase11Ops: path.join(dir, 'phase11-ops.html'),
    phase12Ops: path.join(dir, 'phase12-ops.html'),
    phase13Ops: path.join(dir, 'phase13-ops.html'),
    phase14Ops: path.join(dir, 'phase14-ops.html'),
    phase15Ops: path.join(dir, 'phase15-ops.html'),
    phase16Ops: path.join(dir, 'phase16-ops.html'),
    phase17Ops: path.join(dir, 'phase17-ops.html'),
    phase18Ops: path.join(dir, 'phase18-ops.html'),
    phase19Ops: path.join(dir, 'phase19-ops.html'),
    phase20Ops: path.join(dir, 'phase20-ops.html'),
    phase21Ops: path.join(dir, 'phase21-ops.html'),
    phase22Ops: path.join(dir, 'phase22-ops.html'),
    phase23Ops: path.join(dir, 'phase23-ops.html'),
    phase24Ops: path.join(dir, 'phase24-ops.html'),
    phase25Ops: path.join(dir, 'phase25-ops.html'),
    phase26Ops: path.join(dir, 'phase26-ops.html'),
    phase27Ops: path.join(dir, 'phase27-ops.html'),
    phase28Ops: path.join(dir, 'phase28-ops.html'),
    phase29Ops: path.join(dir, 'phase29-ops.html'),
    phase30Ops: path.join(dir, 'phase30-ops.html'),
    phase31Ops: path.join(dir, 'phase31-ops.html'),
    fleetAssurance: path.join(dir, 'fleet-assurance.json'),
    continuumOps: path.join(dir, 'continuum-ops.json'),
    missionArchive: path.join(dir, 'mission-archive.json'),
    observatory: path.join(dir, 'observatory.json'),
    canonSync: path.join(dir, 'canon-sync.json'),
    humanDebt: path.join(dir, 'human-debt.json'),
    presenceSentinel: path.join(dir, 'presence-sentinel.json'),
    presenceSeal: path.join(dir, 'presence-seal.json'),
    quietThrone: path.join(dir, 'quiet-throne.json'),
    sovereignCertificate: path.join(dir, 'sovereign-certificate.html'),
    liveThrone: path.join(dir, 'live-throne.json'),
    growthRadar: path.join(dir, 'growth-radar.md'),
    deployCourier: path.join(dir, 'deploy-courier.json'),
    growthCloser: path.join(dir, 'growth-closer.md'),
    signalForge: path.join(dir, 'signal-forge.json'),
    conversionContinuum: path.join(dir, 'conversion-continuum.md'),
    yieldApex: path.join(dir, 'yield-apex.json'),
    integrityLattice: path.join(dir, 'integrity-lattice.md'),
    perpetualSeal: path.join(dir, 'perpetual-seal.json'),
    sovereignContinuity: path.join(dir, 'sovereign-continuity.md'),
    continuityCharter: path.join(dir, 'continuity-charter.json'),
    autonomicChronos: path.join(dir, 'autonomic-chronos.md'),
    chronosPulse: path.join(dir, 'chronos-pulse.json'),
    temporalNexus: path.join(dir, 'temporal-nexus.json'),
    dominionApex: path.join(dir, 'dominion-apex.md'),
    eternalCrown: path.join(dir, 'eternal-crown.json'),
    silentSteward: path.join(dir, 'silent-steward.md'),
    stewardShip: path.join(dir, 'steward-ship.json'),
    automationLedger: path.join(dir, 'automation-ledger.md'),
    executiveBrief: path.join(dir, 'executive-brief.md'),
    gbpPulse: path.join(dir, 'gbp-pulse.json'),
    phaseMatrix: path.join(dir, 'phase-matrix.json'),
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
  if (act.action === 'phase4-advance') {
    const args = ['act', 'phase4-advance', '--profile', profile];
    if (act.apply) args.push('--apply');
    return spawnMeridian(args);
  }
  if (act.action === 'phase6-advance') {
    return spawnMeridian(['act', 'phase6-advance', '--profile', profile]);
  }
  if (act.action === 'phase7-advance') {
    const args = ['act', 'phase7-advance', '--profile', profile];
    if (act.apply) args.push('--apply');
    return spawnMeridian(args);
  }
  if (act.action === 'phase8-advance') {
    return spawnMeridian(['act', 'phase8-advance', '--profile', profile]);
  }
  if (act.action === 'phase9-advance') {
    const args = ['act', 'phase9-advance', '--profile', profile];
    if (act.skipForm) args.push('--skip-form');
    return spawnMeridian(args);
  }
  if (act.action === 'phase10-advance') {
    const args = ['act', 'phase10-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.skipAct) args.push('--skip-act');
    if (act.syncGh) args.push('--sync-gh');
    if (act.force) args.push('--force');
    return spawnMeridian(args);
  }
  if (act.action === 'phase11-advance') {
    const args = ['act', 'phase11-advance', '--profile', profile];
    if (act.skipVerify) args.push('--skip-verify');
    if (act.skipPhase10) args.push('--skip-phase10');
    return spawnMeridian(args);
  }
  if (act.action === 'phase12-advance') {
    const args = ['act', 'phase12-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.triggerDeploy) args.push('--trigger-deploy');
    if (act.skipScan) args.push('--skip-scan');
    if (act.skipVerify) args.push('--skip-verify');
    return spawnMeridian(args);
  }
  if (act.action === 'phase13-advance') {
    const args = ['act', 'phase13-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.restart === false) args.push('--no-restart');
    if (act.skipAct) args.push('--skip-act');
    if (act.skipVerify) args.push('--skip-verify');
    return spawnMeridian(args);
  }
  if (act.action === 'phase14-advance') {
    const args = ['act', 'phase14-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.skipHeal) args.push('--skip-heal');
    return spawnMeridian(args);
  }
  if (act.action === 'phase15-advance') {
    const args = ['act', 'phase15-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.dispatch) args.push('--dispatch');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipPhase14) args.push('--skip-phase14');
    return spawnMeridian(args);
  }
  if (act.action === 'phase16-advance') {
    const args = ['act', 'phase16-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipScan) args.push('--skip-scan');
    if (act.skipMeta) args.push('--skip-meta');
    if (act.skipPhase15) args.push('--skip-phase15');
    return spawnMeridian(args);
  }
  if (act.action === 'phase17-advance') {
    const args = ['act', 'phase17-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipScan) args.push('--skip-scan');
    if (act.skipMeta) args.push('--skip-meta');
    if (act.skipPhase16) args.push('--skip-phase16');
    return spawnMeridian(args);
  }
  if (act.action === 'phase18-advance') {
    const args = ['act', 'phase18-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase19-advance') {
    const args = ['act', 'phase19-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase20-advance') {
    const args = ['act', 'phase20-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.skipCanon) args.push('--skip-canon');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase21-advance') {
    const args = ['act', 'phase21-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.skipCanon) args.push('--skip-canon');
    if (act.skipDesk) args.push('--skip-desk');
    if (act.ack) args.push('--ack-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase22-advance') {
    const args = ['act', 'phase22-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.skipDesk) args.push('--skip-desk');
    if (act.skipPresence) args.push('--skip-presence');
    if (act.ack) args.push('--ack-gbp');
    if (act.parkGbp === false) args.push('--no-park-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase23-advance') {
    const args = ['act', 'phase23-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.skipDesk) args.push('--skip-desk');
    if (act.skipPresence) args.push('--skip-presence');
    if (act.skipThrone) args.push('--skip-throne');
    if (act.skipDeploy) args.push('--skip-deploy');
    if (act.triggerDeploy) args.push('--trigger-deploy');
    if (act.ack) args.push('--ack-gbp');
    if (act.parkGbp === false) args.push('--no-park-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase24-advance') {
    const args = ['act', 'phase24-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.skipDesk) args.push('--skip-desk');
    if (act.skipPresence) args.push('--skip-presence');
    if (act.skipThrone) args.push('--skip-throne');
    if (act.skipHorizon) args.push('--skip-horizon');
    if (act.skipHotpatch) args.push('--skip-hotpatch');
    if (act.skipBuild) args.push('--skip-build');
    if (act.skipDeploy) args.push('--skip-deploy');
    if (act.triggerDeploy) args.push('--trigger-deploy');
    if (act.forceGhDeploy) args.push('--force-gh-deploy');
    if (act.ack) args.push('--ack-gbp');
    if (act.parkGbp === false) args.push('--no-park-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase25-advance') {
    const args = ['act', 'phase25-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.skipDesk) args.push('--skip-desk');
    if (act.skipPresence) args.push('--skip-presence');
    if (act.skipThrone) args.push('--skip-throne');
    if (act.skipHorizon) args.push('--skip-horizon');
    if (act.skipCourier) args.push('--skip-courier');
    if (act.skipHotpatch) args.push('--skip-hotpatch');
    if (act.skipCloser) args.push('--skip-closer');
    if (act.skipIndex) args.push('--skip-index');
    if (act.skipDeploy) args.push('--skip-deploy');
    if (act.triggerDeploy) args.push('--trigger-deploy');
    if (act.ack) args.push('--ack-gbp');
    if (act.parkGbp === false) args.push('--no-park-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase26-advance') {
    const args = ['act', 'phase26-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.skipDesk) args.push('--skip-desk');
    if (act.skipPresence) args.push('--skip-presence');
    if (act.skipThrone) args.push('--skip-throne');
    if (act.skipHorizon) args.push('--skip-horizon');
    if (act.skipCourier) args.push('--skip-courier');
    if (act.skipForge) args.push('--skip-forge');
    if (act.skipHotpatch) args.push('--skip-hotpatch');
    if (act.skipCloser) args.push('--skip-closer');
    if (act.skipIndex) args.push('--skip-index');
    if (act.skipYield) args.push('--skip-yield');
    if (act.skipSitemap) args.push('--skip-sitemap');
    if (act.skipDeploy) args.push('--skip-deploy');
    if (act.triggerDeploy) args.push('--trigger-deploy');
    if (act.ack) args.push('--ack-gbp');
    if (act.parkGbp === false) args.push('--no-park-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase27-advance') {
    const args = ['act', 'phase27-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipLatticeHeal) args.push('--skip-lattice-heal');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.skipDesk) args.push('--skip-desk');
    if (act.skipPresence) args.push('--skip-presence');
    if (act.skipThrone) args.push('--skip-throne');
    if (act.skipHorizon) args.push('--skip-horizon');
    if (act.skipCourier) args.push('--skip-courier');
    if (act.skipForge) args.push('--skip-forge');
    if (act.skipHotpatch) args.push('--skip-hotpatch');
    if (act.skipCloser) args.push('--skip-closer');
    if (act.skipIndex) args.push('--skip-index');
    if (act.skipYield) args.push('--skip-yield');
    if (act.skipSitemap) args.push('--skip-sitemap');
    if (act.skipDeploy) args.push('--skip-deploy');
    if (act.triggerDeploy) args.push('--trigger-deploy');
    if (act.ack) args.push('--ack-gbp');
    if (act.parkGbp === false) args.push('--no-park-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase28-advance') {
    const args = ['act', 'phase28-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipLatticeHeal) args.push('--skip-lattice-heal');
    if (act.skipLattice) args.push('--skip-lattice');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.skipDesk) args.push('--skip-desk');
    if (act.skipPresence) args.push('--skip-presence');
    if (act.skipThrone) args.push('--skip-throne');
    if (act.skipHorizon) args.push('--skip-horizon');
    if (act.skipCourier) args.push('--skip-courier');
    if (act.skipForge) args.push('--skip-forge');
    if (act.skipHotpatch) args.push('--skip-hotpatch');
    if (act.skipCloser) args.push('--skip-closer');
    if (act.skipIndex) args.push('--skip-index');
    if (act.skipYield) args.push('--skip-yield');
    if (act.skipSitemap) args.push('--skip-sitemap');
    if (act.skipDeploy) args.push('--skip-deploy');
    if (act.triggerDeploy) args.push('--trigger-deploy');
    if (act.ack) args.push('--ack-gbp');
    if (act.parkGbp === false) args.push('--no-park-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase29-advance') {
    const args = ['act', 'phase29-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipLatticeHeal) args.push('--skip-lattice-heal');
    if (act.skipLattice) args.push('--skip-lattice');
    if (act.skipContinuity) args.push('--skip-continuity');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.skipDesk) args.push('--skip-desk');
    if (act.skipPresence) args.push('--skip-presence');
    if (act.skipThrone) args.push('--skip-throne');
    if (act.skipHorizon) args.push('--skip-horizon');
    if (act.skipCourier) args.push('--skip-courier');
    if (act.skipForge) args.push('--skip-forge');
    if (act.skipHotpatch) args.push('--skip-hotpatch');
    if (act.skipCloser) args.push('--skip-closer');
    if (act.skipIndex) args.push('--skip-index');
    if (act.skipYield) args.push('--skip-yield');
    if (act.skipSitemap) args.push('--skip-sitemap');
    if (act.skipDeploy) args.push('--skip-deploy');
    if (act.triggerDeploy) args.push('--trigger-deploy');
    if (act.ack) args.push('--ack-gbp');
    if (act.parkGbp === false) args.push('--no-park-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase30-advance') {
    const args = ['act', 'phase30-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipLatticeHeal) args.push('--skip-lattice-heal');
    if (act.skipLattice) args.push('--skip-lattice');
    if (act.skipContinuity) args.push('--skip-continuity');
    if (act.skipChronos) args.push('--skip-chronos');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.skipDesk) args.push('--skip-desk');
    if (act.skipPresence) args.push('--skip-presence');
    if (act.skipThrone) args.push('--skip-throne');
    if (act.skipHorizon) args.push('--skip-horizon');
    if (act.skipCourier) args.push('--skip-courier');
    if (act.skipForge) args.push('--skip-forge');
    if (act.skipHotpatch) args.push('--skip-hotpatch');
    if (act.skipCloser) args.push('--skip-closer');
    if (act.skipIndex) args.push('--skip-index');
    if (act.skipYield) args.push('--skip-yield');
    if (act.skipSitemap) args.push('--skip-sitemap');
    if (act.skipDeploy) args.push('--skip-deploy');
    if (act.triggerDeploy) args.push('--trigger-deploy');
    if (act.ack) args.push('--ack-gbp');
    if (act.parkGbp === false) args.push('--no-park-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase31-advance') {
    const args = ['act', 'phase31-advance', '--profile', profile];
    if (act.apply === false) args.push('--no-apply');
    if (act.syncGh) args.push('--sync-gh');
    if (act.skipHeal) args.push('--skip-heal');
    if (act.skipLatticeHeal) args.push('--skip-lattice-heal');
    if (act.skipLattice) args.push('--skip-lattice');
    if (act.skipContinuity) args.push('--skip-continuity');
    if (act.skipChronos) args.push('--skip-chronos');
    if (act.skipDominion) args.push('--skip-dominion');
    if (act.skipObserve) args.push('--skip-observe');
    if (act.skipDesk) args.push('--skip-desk');
    if (act.skipPresence) args.push('--skip-presence');
    if (act.skipThrone) args.push('--skip-throne');
    if (act.skipHorizon) args.push('--skip-horizon');
    if (act.skipCourier) args.push('--skip-courier');
    if (act.skipForge) args.push('--skip-forge');
    if (act.skipHotpatch) args.push('--skip-hotpatch');
    if (act.skipCloser) args.push('--skip-closer');
    if (act.skipIndex) args.push('--skip-index');
    if (act.skipYield) args.push('--skip-yield');
    if (act.skipSitemap) args.push('--skip-sitemap');
    if (act.skipDeploy) args.push('--skip-deploy');
    if (act.triggerDeploy) args.push('--trigger-deploy');
    if (act.ack) args.push('--ack-gbp');
    if (act.parkGbp === false) args.push('--no-park-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
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
