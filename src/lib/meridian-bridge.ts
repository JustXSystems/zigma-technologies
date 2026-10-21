import { spawn } from 'node:child_process';
import { existsSync, openSync, closeSync } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { withBasePath } from '@/lib/base-path';
import { describeControlPlane, type ControlPlaneStatus } from '@/lib/seo/control-plane';
import {
  dispatchMeridianWorkflow,
  getMeridianWorkflowRun,
  listMeridianWorkflowRuns,
  mapGhRunToJobStatus,
  meridianGithubDeskStatus,
  waitForDispatchedRun,
  type GhDispatchInputs,
  type GhWorkflowId,
} from '@/lib/meridian-github';
import {
  enqueueMeridianSaasJob,
  mapSaasJobToAdminStatus,
  meridianSaasConfig,
  pollMeridianSaasJob,
} from '@/lib/meridian-saas';

const ROOT = process.cwd();

/** Prefer MERIDIAN_HOME so website deploys never need to ship the SEO toolkit. */
function resolveMeridianBin(): string {
  const home = (process.env.MERIDIAN_HOME || '').trim();
  if (home) return path.join(home, 'bin', 'meridian.mjs');
  return path.join(ROOT, 'packages', 'meridian', 'bin', 'meridian.mjs');
}

function resolveMeridianRoot(): string {
  const home = (process.env.MERIDIAN_HOME || '').trim();
  if (home) return home;
  return path.join(ROOT, 'packages', 'meridian');
}

export function meridianControlPlaneStatus(): ControlPlaneStatus {
  const home = (process.env.MERIDIAN_HOME || '').trim() || null;
  const binPath = resolveMeridianBin();
  return describeControlPlane({
    meridianHome: home,
    binPath,
    binExists: existsSync(binPath),
  });
}

async function assertMeridianCli(): Promise<string> {
  const bin = resolveMeridianBin();
  try {
    await access(bin);
    return bin;
  } catch {
    const status = meridianControlPlaneStatus();
    throw new Error(
      `Meridian control plane CLI missing at ${bin}. ${status.message} See ${status.architectureDoc}`
    );
  }
}

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
  | { action: 'growth-desk' }
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
  | {
      action: 'phase32-advance';
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
      skipPhase31?: boolean;
      forceCatalog?: boolean;
      skipYield?: boolean;
      skipSitemap?: boolean;
      skipDeploy?: boolean;
      triggerDeploy?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      gscProxy?: boolean;
    }
  | {
      action: 'phase33-advance';
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
      skipPhase31?: boolean;
      skipPhase32?: boolean;
      forceCatalog?: boolean;
      skipYield?: boolean;
      skipSitemap?: boolean;
      skipDeploy?: boolean;
      triggerDeploy?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      gscProxy?: boolean;
      windowDays?: number;
      topN?: number;
      theme?: string;
    }
  | {
      action: 'command-brief';
      windowDays?: number;
      topN?: number;
      theme?: string;
    }
  | {
      action: 'seo-report';
      windowDays?: number;
      topN?: number;
      theme?: string;
      skipScan?: boolean;
      skipLiveVerify?: boolean;
      skipPsi?: boolean;
    }
  | { action: 'draft-meta' }
  | { action: 'apply-meta'; dryRun?: boolean; force?: boolean }
  | { action: 'draft-alt' }
  | { action: 'apply-alt'; dryRun?: boolean; force?: boolean };

function meridianProfiles(env: MeridianEnv): string {
  const root = resolveMeridianRoot();
  return path.join(root, 'profiles', env === 'prod' ? 'zigma.prod.json' : 'zigma.preprod.json');
}

export function meridianProfilePath(env: MeridianEnv) {
  return meridianProfiles(env);
}

/** Website tree that owns `storage/meridian/*` (sidecar CLI must not invent /var/storage). */
export function meridianSiteRoot(): string {
  const site = (process.env.MERIDIAN_SITE_ROOT || process.env.ZIGMA_APP_DIR || '').trim();
  return site || ROOT;
}

export function meridianLatestPaths(env: MeridianEnv) {
  const dir = path.join(
    meridianSiteRoot(),
    'storage',
    'meridian',
    env === 'prod' ? 'zigma-prod' : 'zigma-preprod'
  );
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
    phase32Ops: path.join(dir, 'phase32-ops.html'),
    phase33Ops: path.join(dir, 'phase33-ops.html'),
    commandBrief: path.join(dir, 'command-brief.html'),
    commandBriefJson: path.join(dir, 'command-brief.json'),
    commandBriefMd: path.join(dir, 'command-brief.md'),
    seoReport: path.join(dir, 'seo-report-latest.html'),
    seoReportJson: path.join(dir, 'seo-report.json'),
    catalogContinuum: path.join(dir, 'catalog-continuum.json'),
    catalogContinuumMd: path.join(dir, 'catalog-continuum.md'),
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
    growthDesk: path.join(dir, 'growth-desk.html'),
    growthDeskJson: path.join(dir, 'growth-desk.json'),
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
    seoGuide: path.join(dir, 'seo-guide.md'),
    gbpPulse: path.join(dir, 'gbp-pulse.json'),
    phaseMatrix: path.join(dir, 'phase-matrix.json'),
    jobStatus: path.join(dir, 'job-status.json'),
  };
}

/**
 * Resolve root SEO-GUIDE.md for Admin desk links.
 * Not shipped in the website tarball — prefer Meridian storage snapshot, then
 * site/sidecar checkout paths, then GitHub (caller shows fallback UI).
 */
export async function readSeoGuideMarkdown(env: MeridianEnv): Promise<{ body: string; source: string } | null> {
  const { seoGuide } = meridianLatestPaths(env);
  const home = (process.env.MERIDIAN_HOME || '').trim();
  const candidates = [
    seoGuide,
    path.join(meridianSiteRoot(), 'SEO-GUIDE.md'),
    path.join(ROOT, 'SEO-GUIDE.md'),
    home ? path.join(home, 'SEO-GUIDE.md') : '',
    home ? path.join(home, '..', 'SEO-GUIDE.md') : '',
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      const body = await readFile(/*turbopackIgnore: true*/ p, 'utf8');
      if (body.trim()) return { body, source: p };
    } catch {
      /* try next */
    }
  }
  return null;
}

/** True when a readable artefact exists at any of the candidate paths. */
export async function meridianArtefactExists(...candidates: string[]): Promise<boolean> {
  for (const p of candidates) {
    try {
      await access(/*turbopackIgnore: true*/ p);
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

export async function readMeridianArtefactHtml(...candidates: string[]): Promise<string | null> {
  for (const p of candidates) {
    try {
      return await readFile(/*turbopackIgnore: true*/ p, 'utf8');
    } catch {
      /* try next */
    }
  }
  // Legacy mis-resolve from sidecar ../../storage → /var/storage (pre MERIDIAN_SITE_ROOT)
  for (const p of candidates) {
    const base = path.basename(p);
    const legacy = path.join('/var/storage/meridian', path.basename(path.dirname(p)), base);
    try {
      return await readFile(/*turbopackIgnore: true*/ legacy, 'utf8');
    } catch {
      /* ignore */
    }
  }
  return null;
}

export async function meridianArtefactAvailability(env: MeridianEnv) {
  const p = meridianLatestPaths(env);
  const [brief, cockpit, html, phase0, seoReport, growth] = await Promise.all([
    meridianArtefactExists(p.commandBrief, p.seoReport),
    meridianArtefactExists(p.opsCockpit),
    meridianArtefactExists(p.html, p.seoReport, p.commandBrief),
    meridianArtefactExists(p.phase0Wizard),
    meridianArtefactExists(p.seoReportJson, p.commandBriefJson),
    meridianArtefactExists(p.growthDesk, p.growthDeskJson),
  ]);
  return {
    dir: p.dir,
    siteRoot: meridianSiteRoot(),
    brief,
    cockpit,
    html,
    phase0,
    seoReport,
    growth,
  };
}

/**
 * When Command Brief / phase-ops HTML is served from `/api/admin/meridian?format=…`,
 * browsers resolve relative hrefs against that API path.
 * - `ops-cockpit.html` → `/api/admin/ops-cockpit.html` (rewrite to format=file)
 * - `../../../../SEO-GUIDE.md` → `/SEO-GUIDE.md` (404 on product plane — rewrite to format=guide)
 */
export function withMeridianFileBase(html: string, env: MeridianEnv): string {
  const prefix = withBasePath('/api/admin/meridian');
  const guideHref = `${prefix}?env=${encodeURIComponent(env)}&format=guide`;
  let out = html.replace(
    /\bhref=(["'])(?:https?:\/\/[^"'/]+)?(?:\/|\.\.\/)*SEO-GUIDE\.md\1/gi,
    (_m, q: string) => `href=${q}${guideHref}${q}`
  );
  out = out.replace(
    /\bhref=(["'])(?!https?:|\/|#|mailto:)([a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:html|md|json|ics))\1/gi,
    (_m, q: string, name: string) => {
      if (/^SEO-GUIDE\.md$/i.test(name)) {
        return `href=${q}${guideHref}${q}`;
      }
      return `href=${q}${prefix}?env=${encodeURIComponent(env)}&format=file&name=${encodeURIComponent(name)}${q}`;
    }
  );
  return out;
}

/** Absolute Admin URL for a Meridian desk file (Command Brief / MeridianPanel). */
export function meridianArtefactAdminHref(env: MeridianEnv, name: string): string {
  if (/^SEO-GUIDE\.md$/i.test(name)) {
    return withBasePath(`/api/admin/meridian?env=${encodeURIComponent(env)}&format=guide`);
  }
  return withBasePath(
    `/api/admin/meridian?env=${encodeURIComponent(env)}&format=file&name=${encodeURIComponent(name)}`
  );
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
  /** local = CLI on this node; github = Actions; saas = Meridian JBT worker */
  provider?: 'local' | 'github' | 'saas';
  workflow?: string;
  runId?: number;
  /** SaaS job id when provider=saas */
  saasJobId?: string;
  runUrl?: string;
  /** Zero-secret: open Actions → Run workflow when API dispatch is blocked */
  fallbackUrl?: string;
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

export async function writeMeridianJobStatus(env: MeridianEnv, status: MeridianJobStatus) {
  const { jobStatus, dir } = meridianLatestPaths(env);
  await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ jobStatus, JSON.stringify(status, null, 2), 'utf8');
}

/**
 * Prefer GitHub Actions for SEO report / autopilot so Production PM2 never hosts the CLI.
 * Writes job-status.json so Admin can poll until the run completes (and desk artefacts sync).
 */
export async function startMeridianGithubDispatch(
  env: MeridianEnv,
  kind: 'seo-report' | 'autopilot',
  opts: {
    windowDays?: number;
    theme?: string;
    skipScan?: boolean;
    skipAct?: boolean;
  } = {}
): Promise<{
  started: boolean;
  job: MeridianJobStatus;
  alreadyRunning?: boolean;
  message: string;
  fallbackUrl?: string;
  openFallback?: boolean;
}> {
  const existing = await readMeridianJobStatus(env);
  if (existing?.status === 'running') {
    const ageMs = Date.now() - new Date(existing.startedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs < 25 * 60 * 1000) {
      return {
        started: false,
        alreadyRunning: true,
        job: existing,
        message: 'A Meridian job is already running — wait for it to finish or open the Actions run link.',
        fallbackUrl: existing.runUrl || existing.fallbackUrl,
      };
    }
  }

  const workflow: GhWorkflowId =
    kind === 'seo-report' ? 'meridian-seo-report.yml' : 'meridian-autopilot.yml';
  const desk = meridianGithubDeskStatus();
  const fallbackUrl =
    kind === 'seo-report' ? desk.workflows.seoReport : desk.workflows.autopilot;

  if (kind === 'seo-report' && env !== 'prod') {
    const job: MeridianJobStatus = {
      action: 'dispatch-seo-report',
      status: 'error',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      provider: 'github',
      error: 'Meridian SEO report workflow is Production-only (PreProd stays noindex).',
      fallbackUrl,
    };
    await writeMeridianJobStatus(env, job);
    return { started: false, job, message: job.error || 'Production only', fallbackUrl };
  }

  // No App/PAT: still succeed operationally — Admin opens Actions (zero secrets).
  if (!desk.ready) {
    const job: MeridianJobStatus = {
      action: kind === 'seo-report' ? 'dispatch-seo-report' : 'dispatch-autopilot',
      status: 'error',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      provider: 'github',
      workflow,
      runUrl: fallbackUrl,
      fallbackUrl,
      error:
        'No GitHub App/PAT on this node. Open Actions → Run workflow (desk syncs after the run). Sunday schedule already covers this automatically.',
    };
    await writeMeridianJobStatus(env, job);
    return {
      started: false,
      openFallback: true,
      job,
      message: job.error || desk.message,
      fallbackUrl,
    };
  }

  const startedAt = new Date().toISOString();
  let inputs: GhDispatchInputs;
  if (kind === 'seo-report') {
    inputs = {
      window_days: String(opts.windowDays ?? 28),
      theme: opts.theme || 'aurora',
      skip_scan: opts.skipScan !== false,
    };
  } else {
    inputs = {
      target: env === 'preprod' ? 'preprod' : 'prod',
      skip_act: env === 'preprod' || !!opts.skipAct,
    };
  }

  const dispatched = await dispatchMeridianWorkflow(workflow, inputs);
  if (!dispatched.ok) {
    const job: MeridianJobStatus = {
      action: kind === 'seo-report' ? 'dispatch-seo-report' : 'dispatch-autopilot',
      status: 'error',
      startedAt,
      finishedAt: new Date().toISOString(),
      provider: 'github',
      workflow,
      runUrl: dispatched.fallbackUrl || fallbackUrl,
      fallbackUrl: dispatched.fallbackUrl || fallbackUrl,
      error: dispatched.message,
    };
    await writeMeridianJobStatus(env, job);
    return {
      started: false,
      openFallback: true,
      job,
      message: dispatched.message,
      fallbackUrl: dispatched.fallbackUrl || fallbackUrl,
    };
  }

  const run = await waitForDispatchedRun(workflow, startedAt);
  const job: MeridianJobStatus = {
    action: kind === 'seo-report' ? 'dispatch-seo-report' : 'dispatch-autopilot',
    status: run ? mapGhRunToJobStatus(run) : 'running',
    startedAt,
    provider: 'github',
    workflow,
    runId: run?.id,
    runUrl: run?.htmlUrl || desk.workflows[kind === 'seo-report' ? 'seoReport' : 'autopilot'],
    finishedAt: run && mapGhRunToJobStatus(run) !== 'running' ? new Date().toISOString() : undefined,
    error:
      run && mapGhRunToJobStatus(run) === 'error'
        ? `GitHub run concluded ${run.conclusion || 'failure'}`
        : undefined,
  };
  await writeMeridianJobStatus(env, job);
  return {
    started: true,
    job,
    message: run
      ? `Dispatched · run #${run.id} · ${run.htmlUrl}`
      : `Dispatched ${workflow} — run will appear in Actions shortly. Artefacts sync to this desk when the job finishes.`,
  };
}

/**
 * Dispatch SEO report to Meridian SaaS (MERIDIAN_MODE=saas|dual when configured).
 * Writes job-status.json so Admin can poll.
 */
export async function startMeridianSaasDispatch(
  env: MeridianEnv,
  type: 'seo-report' | 'observe' | 'verify' = 'seo-report'
): Promise<{
  started: boolean;
  job: MeridianJobStatus;
  alreadyRunning?: boolean;
  message: string;
  deskUrl?: string | null;
}> {
  const existing = await readMeridianJobStatus(env);
  if (existing?.status === 'running') {
    const ageMs = Date.now() - new Date(existing.startedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs < 25 * 60 * 1000) {
      return {
        started: false,
        alreadyRunning: true,
        job: existing,
        message: 'A Meridian job is already running — wait for it to finish.',
        deskUrl: existing.runUrl,
      };
    }
  }

  const startedAt = new Date().toISOString();
  const queued = await enqueueMeridianSaasJob(type);
  if (!queued.ok || !queued.jobId) {
    const job: MeridianJobStatus = {
      action: 'dispatch-saas-report',
      status: 'error',
      startedAt,
      finishedAt: new Date().toISOString(),
      provider: 'saas',
      error: queued.error || queued.message,
      runUrl: queued.deskUrl || undefined,
      fallbackUrl: queued.deskUrl || undefined,
    };
    await writeMeridianJobStatus(env, job);
    return { started: false, job, message: queued.message, deskUrl: queued.deskUrl };
  }

  const job: MeridianJobStatus = {
    action: 'dispatch-saas-report',
    status: 'running',
    startedAt,
    provider: 'saas',
    saasJobId: queued.jobId,
    runUrl: queued.deskUrl || undefined,
    fallbackUrl: queued.deskUrl || undefined,
  };
  await writeMeridianJobStatus(env, job);
  return {
    started: true,
    job,
    message: queued.message,
    deskUrl: queued.deskUrl,
  };
}

/** Refresh a SaaS-backed job-status from Meridian API (Admin poll). */
export async function refreshMeridianSaasJob(env: MeridianEnv): Promise<MeridianJobStatus | null> {
  const existing = await readMeridianJobStatus(env);
  if (!existing || existing.provider !== 'saas' || existing.status !== 'running') {
    return existing;
  }
  if (!existing.saasJobId) return existing;
  try {
    const polled = await pollMeridianSaasJob(existing.saasJobId);
    if (!polled.ok) {
      const next: MeridianJobStatus = { ...existing, error: polled.error };
      await writeMeridianJobStatus(env, next);
      return next;
    }
    const status = mapSaasJobToAdminStatus(polled.status);
    const next: MeridianJobStatus = {
      ...existing,
      status,
      finishedAt: status === 'running' ? undefined : polled.finishedAt || new Date().toISOString(),
      error: status === 'error' ? polled.error || 'Meridian SaaS job failed' : undefined,
    };
    await writeMeridianJobStatus(env, next);
    return next;
  } catch (err) {
    const next: MeridianJobStatus = {
      ...existing,
      error: err instanceof Error ? err.message : String(err),
    };
    await writeMeridianJobStatus(env, next);
    return next;
  }
}

/** Refresh a GitHub-backed job-status from the Actions API (Admin poll). */
export async function refreshMeridianGithubJob(env: MeridianEnv): Promise<MeridianJobStatus | null> {
  const existing = await readMeridianJobStatus(env);
  if (!existing || existing.provider !== 'github' || existing.status !== 'running') {
    return existing;
  }
  try {
    if (existing.runId) {
      const got = await getMeridianWorkflowRun(existing.runId);
      if (got.run) {
        const status = mapGhRunToJobStatus(got.run);
        const next: MeridianJobStatus = {
          ...existing,
          status,
          runUrl: got.run.htmlUrl,
          finishedAt: status === 'running' ? undefined : new Date().toISOString(),
          error:
            status === 'error'
              ? `GitHub run concluded ${got.run.conclusion || 'failure'}`
              : undefined,
        };
        await writeMeridianJobStatus(env, next);
        return next;
      }
    } else if (existing.workflow) {
      const listed = await listMeridianWorkflowRuns(existing.workflow as GhWorkflowId, 3);
      const run = listed.latest;
      if (run) {
        const status = mapGhRunToJobStatus(run);
        const next: MeridianJobStatus = {
          ...existing,
          runId: run.id,
          runUrl: run.htmlUrl,
          status,
          finishedAt: status === 'running' ? undefined : new Date().toISOString(),
          error:
            status === 'error' ? `GitHub run concluded ${run.conclusion || 'failure'}` : undefined,
        };
        await writeMeridianJobStatus(env, next);
        return next;
      }
    }
  } catch (err) {
    /* keep prior status; surface on next poll */
    const next: MeridianJobStatus = {
      ...existing,
      error: err instanceof Error ? err.message : String(err),
    };
    await writeMeridianJobStatus(env, next);
    return next;
  }
  return existing;
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

  const { dir } = meridianLatestPaths(env);
  await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
  const logPath = path.join(dir, 'autopilot-run.log');

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

  // Capture stdout/stderr so Admin can show why a non-zero exit happened
  let logFd: number | undefined;
  try {
    logFd = openSync(/*turbopackIgnore: true*/ logPath, 'w');
  } catch {
    logFd = undefined;
  }

  const bin = resolveMeridianBin();
  if (!existsSync(bin)) {
    const status = meridianControlPlaneStatus();
    job.status = 'error';
    job.finishedAt = new Date().toISOString();
    job.error = status.message;
    await writeMeridianJobStatus(env, job);
    return { started: false, job };
  }

  const child = spawn(process.execPath, [bin, ...args], {
    cwd: ROOT,
    env: {
      ...process.env,
      // Sidecar CLI must write under the website tree, not /var/storage
      MERIDIAN_SITE_ROOT: process.env.MERIDIAN_SITE_ROOT || process.env.ZIGMA_APP_DIR || ROOT,
      // Admin background jobs must finish green; packs record findings without failing the job
      MERIDIAN_ADMIN_SOFT_HARD: '1',
      MERIDIAN_CI_SOFT_HARD: process.env.MERIDIAN_CI_SOFT_HARD || '1',
    },
    windowsHide: true,
    detached: true,
    stdio: logFd != null ? ['ignore', logFd, logFd] : 'ignore',
  });
  if (logFd != null) {
    try {
      closeSync(logFd);
    } catch {
      /* child owns the fd */
    }
  }
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
    void (async () => {
      let tail = '';
      try {
        const raw = await readFile(/*turbopackIgnore: true*/ logPath, 'utf8');
        tail = raw.slice(-1200).trim();
      } catch {
        /* no log */
      }
      const failed = code !== 0;
      await writeMeridianJobStatus(env, {
        ...job,
        status: failed ? 'error' : 'ok',
        finishedAt: new Date().toISOString(),
        code,
        error: failed
          ? `autopilot exited with code ${code}${tail ? `\n\n${tail}` : ''}`
          : undefined,
      });
    })();
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

async function spawnMeridian(args: string[]): Promise<{
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  let bin: string;
  try {
    bin = await assertMeridianCli();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, code: null, stdout: '', stderr: msg };
  }
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [bin, ...args], {
      cwd: ROOT,
      env: {
        ...process.env,
        MERIDIAN_SITE_ROOT: process.env.MERIDIAN_SITE_ROOT || process.env.ZIGMA_APP_DIR || ROOT,
      },
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
  const webhookUrl = envSet('MERIDIAN_WEBHOOK_URL');
  const githubToken = envSet('MERIDIAN_GITHUB_TOKEN') || envSet('GH_TOKEN');
  const githubApp = envSet('MERIDIAN_GITHUB_APP_ID') && envSet('MERIDIAN_GITHUB_APP_INSTALLATION_ID') && envSet('MERIDIAN_GITHUB_APP_PRIVATE_KEY');

  const controlPlane = meridianControlPlaneStatus();
  const github = meridianGithubDeskStatus();
  const saas = meridianSaasConfig();

  return {
    docsPath: 'packages/meridian/ARCHITECTURE.md',
    setupPath: 'packages/meridian/SETUP.md',
    controlPlane,
    github,
    saas,
    fields: [
      {
        id: 'MERIDIAN_MODE',
        label: 'Meridian mode (local | dual | saas)',
        set: envSet('MERIDIAN_MODE') || saas.mode !== 'local',
        optional: true,
        requiredFor: ['saas-bridge'],
        howTo:
          'Default local (unchanged). dual = local forever + SaaS desk link. saas = Admin Generate report → Meridian SaaS worker. See packages/meridian/SAAS-MASTER-DESIGN.md §6.',
      },
      {
        id: 'MERIDIAN_SAAS_URL',
        label: 'Meridian SaaS console URL',
        set: !!saas.url,
        optional: true,
        requiredFor: ['saas-bridge'],
        howTo: 'e.g. https://justxsystems.com/jbt/tools/seo-meridian',
      },
      {
        id: 'MERIDIAN_SAAS_API_KEY',
        label: 'Meridian SaaS site API key (jbt_…)',
        set: saas.apiKeySet,
        optional: true,
        requiredFor: ['saas-bridge'],
        howTo: 'Mint in Meridian Connect → Product Agent after registering Zigma as a SaaS site.',
      },
      {
        id: 'MERIDIAN_SAAS_SITE_ID',
        label: 'Meridian SaaS site id (optional)',
        set: !!saas.siteId,
        optional: true,
        requiredFor: ['saas-bridge'],
        howTo: 'Optional — desk URL resolves via API /me when omitted.',
      },
      {
        id: 'MERIDIAN_GITHUB_APP_*',
        label: 'GitHub App (org-safe Admin dispatch)',
        set: githubApp,
        optional: true,
        requiredFor: ['github-dispatch'],
        howTo:
          'Preferred over PAT for org repos. Create a GitHub App → install on JustXSystems/zigma-technologies → permissions Actions:write, Contents:read → set MERIDIAN_GITHUB_APP_ID, MERIDIAN_GITHUB_APP_INSTALLATION_ID, MERIDIAN_GITHUB_APP_PRIVATE_KEY on Production .env. Or skip — use Actions → Meridian SEO report / Sunday cron.',
      },
      {
        id: 'MERIDIAN_GITHUB_TOKEN',
        label: 'GitHub classic PAT (fallback dispatch)',
        set: githubToken,
        optional: true,
        requiredFor: ['github-dispatch'],
        howTo: github.howTo,
      },
      {
        id: 'MERIDIAN_GOOGLE_CLIENT_ID',
        label: 'Google OAuth Client ID',
        set: googleClientId,
        requiredFor: ['gsc', 'ga4', 'act'],
        howTo: 'Google Cloud → APIs & Services → Credentials → OAuth client (Desktop) → Client ID. SETUP.md Part A.5. Also set as GitHub Actions secret.',
      },
      {
        id: 'MERIDIAN_GOOGLE_CLIENT_SECRET',
        label: 'Google OAuth Client Secret',
        set: googleClientSecret,
        requiredFor: ['gsc', 'ga4', 'act'],
        howTo: 'Same OAuth client → Client secret. SETUP.md Part A.5. Sync to Actions: npm run meridian:secrets:sync',
      },
      {
        id: 'MERIDIAN_GOOGLE_REFRESH_TOKEN',
        label: 'Google OAuth Refresh Token',
        set: googleRefreshToken,
        requiredFor: ['gsc', 'ga4', 'act'],
        howTo: 'Run: npm run meridian:oauth after Client ID/Secret are set. SETUP.md Part A.6.',
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
        optional: true,
        requiredFor: ['pagespeed'],
        howTo: 'Optional. Google Cloud → Credentials → API key; enable PageSpeed Insights API. SETUP.md Part E.',
      },
      {
        id: 'MERIDIAN_WEBHOOK_URL',
        label: 'Ops alert webhook (Slack/Discord/Teams)',
        set: webhookUrl,
        optional: true,
        requiredFor: ['alerts'],
        howTo: 'Optional — leave unset. Only if you want Slack/Discord/Teams pings on verify fail. Not required for SEO.',
      },
    ],
    connectors: {
      github: {
        ready: github.ready,
        missing: github.ready ? [] : [],
        optional: true,
        note: github.ready
          ? github.message
          : 'Optional — Sunday cron + Actions UI cover reports without a token',
      },
      saas: {
        ready: saas.configured || saas.mode === 'local',
        missing:
          saas.mode === 'local'
            ? []
            : [
                ...(!saas.url ? ['MERIDIAN_SAAS_URL'] : []),
                ...(!saas.apiKeySet ? ['MERIDIAN_SAAS_API_KEY'] : []),
              ],
        optional: true,
        note: saas.message,
      },
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
      pagespeed: {
        ready: psiApiKey,
        missing: [],
        optional: true,
        note: psiApiKey ? 'PageSpeed key set' : 'Optional — PSI skipped without key',
      },
      act: { ready: googleOk, missing: googleOk ? [] : ['MERIDIAN_GOOGLE_* refresh with webmasters scope'] },
      alerts: {
        ready: webhookUrl,
        missing: [],
        optional: true,
        note: webhookUrl ? 'Webhook set' : 'Optional — leave unset; no chat alerts',
      },
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
  if (act.action === 'growth-desk') {
    return spawnMeridian(['act', 'growth-desk', '--profile', profile]);
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
  if (act.action === 'phase32-advance') {
    const args = ['act', 'phase32-advance', '--profile', profile];
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
    if (act.skipPhase31) args.push('--skip-phase31');
    if (act.forceCatalog) args.push('--force-catalog');
    if (act.skipYield) args.push('--skip-yield');
    if (act.skipSitemap) args.push('--skip-sitemap');
    if (act.skipDeploy) args.push('--skip-deploy');
    if (act.triggerDeploy) args.push('--trigger-deploy');
    if (act.ack) args.push('--ack-gbp');
    if (act.parkGbp === false) args.push('--no-park-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    return spawnMeridian(args);
  }
  if (act.action === 'phase33-advance') {
    const args = ['act', 'phase33-advance', '--profile', profile];
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
    if (act.skipPhase31) args.push('--skip-phase31');
    if (act.skipPhase32) args.push('--skip-phase32');
    if (act.forceCatalog) args.push('--force-catalog');
    if (act.skipYield) args.push('--skip-yield');
    if (act.skipSitemap) args.push('--skip-sitemap');
    if (act.skipDeploy) args.push('--skip-deploy');
    if (act.triggerDeploy) args.push('--trigger-deploy');
    if (act.ack) args.push('--ack-gbp');
    if (act.parkGbp === false) args.push('--no-park-gbp');
    if (act.gscProxy === false) args.push('--no-gsc-proxy');
    if (act.windowDays) args.push('--window', String(act.windowDays));
    if (act.topN) args.push('--top', String(act.topN));
    if (act.theme) args.push('--theme', act.theme);
    return spawnMeridian(args);
  }
  if (act.action === 'command-brief') {
    const args = ['act', 'command-brief', '--profile', profile];
    if (act.windowDays) args.push('--window', String(act.windowDays));
    if (act.topN) args.push('--top', String(act.topN));
    if (act.theme) args.push('--theme', act.theme);
    return spawnMeridian(args);
  }
  if (act.action === 'seo-report') {
    const args = ['act', 'seo-report', '--profile', profile];
    if (act.windowDays) args.push('--window', String(act.windowDays));
    if (act.topN) args.push('--top', String(act.topN));
    if (act.theme) args.push('--theme', act.theme);
    if (act.skipScan) args.push('--skip-scan');
    if (act.skipLiveVerify) args.push('--skip-verify');
    if (act.skipPsi) args.push('--skip-psi');
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
