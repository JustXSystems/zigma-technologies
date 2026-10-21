import { NextResponse } from 'next/server';
import { requireScreen } from '@/lib/auth';
import { serveMeridianArtefact } from '@/lib/meridian-artefact-http';
import {
  meridianArtefactAvailability,
  meridianConnectorReadiness,
  meridianLatestPaths,
  readLatestAutopilot,
  readLatestDigest,
  readLatestMeridianReport,
  readLatestUnlock,
  readMeridianArtefactHtml,
  readMeridianJobStatus,
  readSeoGuideMarkdown,
  refreshMeridianGithubJob,
  runMeridianAct,
  runMeridianCli,
  startMeridianAutopilotBackground,
  startMeridianGithubDispatch,
  withMeridianFileBase,
  type MeridianAct,
  type MeridianEnv,
} from '@/lib/meridian-bridge';
import { listMeridianWorkflowRuns, meridianGithubDeskStatus } from '@/lib/meridian-github';
import { readFile } from 'node:fs/promises';
import { withBasePath } from '@/lib/base-path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Live crawl + connectors can exceed default serverless limits on some hosts. */
export const maxDuration = 300;

function parseEnv(raw: unknown): MeridianEnv {
  return raw === 'preprod' ? 'preprod' : 'prod';
}

function authStatus(err: unknown) {
  const msg = err instanceof Error ? err.message : 'Error';
  if (msg === 'UNAUTHORIZED' || msg === 'Unauthorized') return 401;
  if (msg === 'FORBIDDEN') return 403;
  return 500;
}

function missingArtefactHtml(title: string, hint: string, dir: string) {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.5;color:#122}
code{background:#f0f3f7;padding:.1rem .35rem;border-radius:4px}</style></head><body>
<h1>${title}</h1>
<p>${hint}</p>
<p>Expected folder: <code>${dir}</code></p>
<p>In Admin → SEO → Command: use <strong>Generate report</strong> or <strong>Autopilot (heal)</strong>, then reopen this link.</p>
</body></html>`;
  return new NextResponse(body, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: Request) {
  try {
    await requireScreen('redirects');
    const url = new URL(request.url);
    const env = parseEnv(url.searchParams.get('env'));
    const format = url.searchParams.get('format') || 'json';
    const paths = meridianLatestPaths(env);

    if (format === 'html') {
      const body = await readMeridianArtefactHtml(paths.html, paths.seoReport, paths.commandBrief);
      if (body) {
        return new NextResponse(withMeridianFileBase(body, env), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
      return missingArtefactHtml(
        'No technical HTML report yet',
        'Run a Meridian scan or Generate report first.',
        paths.dir
      );
    }
    if (format === 'cockpit') {
      const body = await readMeridianArtefactHtml(paths.opsCockpit);
      if (body) {
        return new NextResponse(withMeridianFileBase(body, env), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
      return missingArtefactHtml(
        'No ops cockpit yet',
        'Run Autopilot (heal) once to build the cockpit HTML.',
        paths.dir
      );
    }
    if (format === 'brief' || format === 'command-brief') {
      const body = await readMeridianArtefactHtml(paths.commandBrief, paths.seoReport);
      if (body) {
        return new NextResponse(withMeridianFileBase(body, env), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
      return missingArtefactHtml(
        'No Command Brief yet',
        'Use <strong>Generate report (GitHub)</strong> (or local CLI), then reopen after the desk sync finishes.',
        paths.dir
      );
    }
    if (format === 'growth' || format === 'growth-desk') {
      const body = await readMeridianArtefactHtml(paths.growthDesk);
      if (body) {
        return new NextResponse(withMeridianFileBase(body, env), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
      return missingArtefactHtml(
        'No Growth Desk yet',
        'Run <strong>Generate report (GitHub)</strong> or Autopilot — Growth Desk is written beside the Command Brief.',
        paths.dir
      );
    }
    if (format === 'phase0') {
      const body = await readMeridianArtefactHtml(paths.phase0Wizard);
      if (body) {
        return new NextResponse(withMeridianFileBase(body, env), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
      return missingArtefactHtml(
        'No Phase 0 wizard yet',
        'Run Autopilot or the Phase 0 wizard action first.',
        paths.dir
      );
    }
    if (format === 'digest' || format === 'weekly-digest') {
      try {
        const body = await readFile(/*turbopackIgnore: true*/ paths.digestMd, 'utf8');
        return new NextResponse(body, {
          headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      } catch {
        return missingArtefactHtml(
          'No weekly digest yet',
          'Run Autopilot (heal) or Generate report so weekly-digest.md is written.',
          paths.dir
        );
      }
    }
    if (format === 'executive' || format === 'executive-brief') {
      try {
        const body = await readFile(/*turbopackIgnore: true*/ paths.executiveBrief, 'utf8');
        return new NextResponse(body, {
          headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      } catch {
        return missingArtefactHtml(
          'No executive brief yet',
          'Run Autopilot (heal) or Generate report so executive-brief.md is written.',
          paths.dir
        );
      }
    }
    if (format === 'file') {
      return serveMeridianArtefact(env, url.searchParams.get('name') || '');
    }
    if (format === 'guide' || format === 'seo-guide') {
      const guide = await readSeoGuideMarkdown(env);
      if (guide) {
        return new NextResponse(guide.body, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Meridian-Guide-Source': guide.source,
          },
        });
      }
      const gh = 'https://github.com/JustXSystems/zigma-technologies/blob/master/SEO-GUIDE.md';
      const desk = withBasePath(`/api/admin/meridian?env=${encodeURIComponent(env)}&format=brief`);
      return missingArtefactHtml(
        'SEO-GUIDE.md not on this node',
        `Root guide is not in the website tarball. Open <a href="${gh}">GitHub SEO-GUIDE.md</a>, or run Autopilot / canon-sync so a copy is written under storage/meridian. Desk: <a href="${desk}">Command Brief</a>.`,
        paths.dir
      );
    }
    const report = await readLatestMeridianReport(env);
    const autopilot = await readLatestAutopilot(env);
    const digest = await readLatestDigest(env);
    const unlock = await readLatestUnlock(env);
    const readiness = meridianConnectorReadiness();
    const artefacts = await meridianArtefactAvailability(env);
    let job = await readMeridianJobStatus(env);
    if (job?.provider === 'github' && job.status === 'running') {
      job = (await refreshMeridianGithubJob(env)) || job;
    }
    let githubRuns: unknown = null;
    if (readiness.github?.ready) {
      try {
        githubRuns = {
          seoReport: await listMeridianWorkflowRuns('meridian-seo-report.yml', 3),
          autopilot: await listMeridianWorkflowRuns('meridian-autopilot.yml', 3),
        };
      } catch {
        githubRuns = null;
      }
    }
    return NextResponse.json({
      env,
      report,
      autopilot,
      digest,
      unlock,
      job,
      hasReport: !!report,
      readiness,
      artefacts,
      github: meridianGithubDeskStatus(),
      githubRuns,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: authStatus(e) });
  }
}

export async function POST(request: Request) {
  try {
    await requireScreen('redirects');
    const body = (await request.json().catch(() => ({}))) as {
      env?: string;
      action?: string;
      feed?: string;
      url?: string;
      limit?: number;
      skipAct?: boolean;
      applyMeta?: boolean;
      apply?: boolean;
      dryRun?: boolean;
      force?: boolean;
      skipForm?: boolean;
      syncGh?: boolean;
      skipVerify?: boolean;
      skipPhase10?: boolean;
      triggerDeploy?: boolean;
      skipScan?: boolean;
      restart?: boolean;
      skipHeal?: boolean;
      dispatch?: boolean;
      skipPhase14?: boolean;
      skipMeta?: boolean;
      skipPhase15?: boolean;
      skipPhase16?: boolean;
      gscProxy?: boolean;
      skipObserve?: boolean;
      skipCanon?: boolean;
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
      skipLatticeHeal?: boolean;
      skipLattice?: boolean;
      skipContinuity?: boolean;
      skipChronos?: boolean;
      skipDominion?: boolean;
      skipBuild?: boolean;
      skipDeploy?: boolean;
      forceGhDeploy?: boolean;
      ack?: boolean;
      parkGbp?: boolean;
      skipPhase31?: boolean;
      skipPhase32?: boolean;
      forceCatalog?: boolean;
      windowDays?: number;
      topN?: number;
      theme?: string;
      skipLiveVerify?: boolean;
      skipPsi?: boolean;
    };
    const env = parseEnv(body.env);
    const action = body.action || 'scan';

    if (action === 'scan') {
      const result = await runMeridianCli(env);
      const report = await readLatestMeridianReport(env);
      return NextResponse.json({
        env,
        action,
        ok: result.ok,
        code: result.code,
        stdout: result.stdout.slice(-4000),
        stderr: result.stderr.slice(-2000),
        report,
      });
    }

    // Primary path: dispatch control plane on GitHub (no CLI on the web node).
    if (action === 'dispatch-seo-report' || action === 'github-seo-report') {
      const bg = await startMeridianGithubDispatch(env, 'seo-report', {
        windowDays: typeof body.windowDays === 'number' ? body.windowDays : 28,
        theme: typeof body.theme === 'string' ? body.theme : 'aurora',
        skipScan: body.skipScan !== false,
      });
      return NextResponse.json({
        env,
        action: 'dispatch-seo-report',
        ok: bg.started || !!bg.alreadyRunning || !!bg.openFallback,
        started: bg.started,
        alreadyRunning: !!bg.alreadyRunning,
        openFallback: !!bg.openFallback,
        fallbackUrl: bg.fallbackUrl,
        job: bg.job,
        message: bg.message,
        github: meridianGithubDeskStatus(),
      });
    }

    if (action === 'dispatch-autopilot' || action === 'github-autopilot') {
      const bg = await startMeridianGithubDispatch(env, 'autopilot', {
        skipAct: env === 'preprod' || !!body.skipAct,
      });
      return NextResponse.json({
        env,
        action: 'dispatch-autopilot',
        ok: bg.started || !!bg.alreadyRunning || !!bg.openFallback,
        started: bg.started,
        alreadyRunning: !!bg.alreadyRunning,
        openFallback: !!bg.openFallback,
        fallbackUrl: bg.fallbackUrl,
        job: bg.job,
        message: bg.message,
        github: meridianGithubDeskStatus(),
      });
    }

    if (action === 'github-job-refresh') {
      const job = await refreshMeridianGithubJob(env);
      return NextResponse.json({ env, action, ok: true, job });
    }

    if (action === 'autopilot') {
      // Prefer GitHub when token is set and no local CLI — keeps site blast radius zero.
      const readiness = meridianConnectorReadiness();
      if (readiness.github?.ready && readiness.controlPlane?.binExists === false) {
        const bg = await startMeridianGithubDispatch(env, 'autopilot', {
          skipAct: env === 'preprod' || !!body.skipAct,
        });
        return NextResponse.json({
          env,
          action: 'dispatch-autopilot',
          ok: bg.started || !!bg.alreadyRunning,
          started: bg.started,
          alreadyRunning: !!bg.alreadyRunning,
          job: bg.job,
          message: bg.message,
        });
      }
      // Background: full autopilot is ~3 min; waiting inline returns nginx HTML (not JSON) to the browser.
      const bg = await startMeridianAutopilotBackground(env, {
        skipAct: env === 'preprod' || !!body.skipAct,
        applyMeta: !!body.applyMeta,
      });
      return NextResponse.json({
        env,
        action,
        ok: true,
        started: bg.started,
        alreadyRunning: !!bg.alreadyRunning,
        job: bg.job,
        message: bg.alreadyRunning
          ? 'Autopilot already running — refresh in a minute.'
          : 'Autopilot started in the background (~2–4 min). This page will refresh when finished.',
      });
    }

    if (
      action === 'draft-meta' ||
      action === 'apply-meta' ||
      action === 'draft-alt' ||
      action === 'apply-alt' ||
      action === 'sitemap-health' ||
      action === 'form-health' ||
      action === 'image-weight' ||
      action === 'image-optimize' ||
      action === 'orphan-remediate' ||
      action === 'content-briefs' ||
      action === 'content-seed' ||
      action === 'schema-validate' ||
      action === 'hreflang-validate' ||
      action === 'nap-audit' ||
      action === 'keyword-map' ||
      action === 'citations-playbook' ||
      action === 'city-pages-readiness' ||
      action === 'backlink-outreach' ||
      action === 'unlock-readiness' ||
      action === 'ops-cockpit' ||
      action === 'rich-results-pack' ||
      action === 'top20-meta-pack' ||
      action === 'review-kit' ||
      action === 'growth-desk' ||
      action === 'content-calendar' ||
      action === 'speed-baseline' ||
      action === 'preprod-removals' ||
      action === 'quarterly-digest' ||
      action === 'meta-polish' ||
      action === 'phase0-wizard' ||
      action === 'og-share-pack' ||
      action === 'indexing-queue' ||
      action === 'locale-decision' ||
      action === 'phase2-advance' ||
      action === 'phase3-advance' ||
      action === 'phase5-advance' ||
      action === 'phase4-advance' ||
      action === 'phase6-advance' ||
      action === 'phase7-advance' ||
      action === 'phase8-advance' ||
      action === 'phase9-advance' ||
      action === 'phase10-advance' ||
      action === 'phase11-advance' ||
      action === 'phase12-advance' ||
      action === 'phase13-advance' ||
      action === 'phase14-advance' ||
      action === 'phase15-advance' ||
      action === 'phase16-advance' ||
      action === 'phase17-advance' ||
      action === 'phase18-advance' ||
      action === 'phase19-advance' ||
      action === 'phase20-advance' ||
      action === 'phase21-advance' ||
      action === 'phase22-advance' ||
      action === 'phase23-advance' ||
      action === 'phase24-advance' ||
      action === 'phase25-advance' ||
      action === 'phase26-advance' ||
      action === 'phase27-advance' ||
      action === 'phase28-advance' ||
      action === 'phase29-advance' ||
      action === 'phase30-advance' ||
      action === 'phase31-advance' ||
      action === 'phase32-advance' ||
      action === 'phase33-advance' ||
      action === 'command-brief' ||
      action === 'seo-report'
    ) {
      let act: MeridianAct;
      if (action === 'draft-meta') act = { action: 'draft-meta' };
      else if (action === 'apply-meta') act = { action: 'apply-meta', dryRun: !!body.dryRun, force: !!body.force };
      else if (action === 'draft-alt') act = { action: 'draft-alt' };
      else if (action === 'apply-alt') act = { action: 'apply-alt', dryRun: !!body.dryRun, force: !!body.force };
      else if (action === 'form-health') act = { action: 'form-health' };
      else if (action === 'image-weight') act = { action: 'image-weight' };
      else if (action === 'image-optimize') act = { action: 'image-optimize' };
      else if (action === 'orphan-remediate') act = { action: 'orphan-remediate', apply: !!body.apply };
      else if (action === 'content-briefs') act = { action: 'content-briefs' };
      else if (action === 'content-seed') act = { action: 'content-seed' };
      else if (action === 'schema-validate') act = { action: 'schema-validate' };
      else if (action === 'hreflang-validate') act = { action: 'hreflang-validate' };
      else if (action === 'nap-audit') act = { action: 'nap-audit' };
      else if (action === 'keyword-map') act = { action: 'keyword-map' };
      else if (action === 'citations-playbook') act = { action: 'citations-playbook' };
      else if (action === 'city-pages-readiness') act = { action: 'city-pages-readiness' };
      else if (action === 'backlink-outreach') act = { action: 'backlink-outreach' };
      else if (action === 'unlock-readiness') act = { action: 'unlock-readiness' };
      else if (action === 'ops-cockpit') act = { action: 'ops-cockpit' };
      else if (action === 'rich-results-pack') act = { action: 'rich-results-pack' };
      else if (action === 'top20-meta-pack') act = { action: 'top20-meta-pack' };
      else if (action === 'review-kit') act = { action: 'review-kit' };
      else if (action === 'growth-desk') act = { action: 'growth-desk' };
      else if (action === 'content-calendar') act = { action: 'content-calendar' };
      else if (action === 'speed-baseline') act = { action: 'speed-baseline' };
      else if (action === 'preprod-removals') act = { action: 'preprod-removals' };
      else if (action === 'quarterly-digest') act = { action: 'quarterly-digest' };
      else if (action === 'meta-polish') act = { action: 'meta-polish', apply: !!body.apply };
      else if (action === 'phase0-wizard') act = { action: 'phase0-wizard' };
      else if (action === 'og-share-pack') act = { action: 'og-share-pack' };
      else if (action === 'indexing-queue') act = { action: 'indexing-queue' };
      else if (action === 'locale-decision') act = { action: 'locale-decision' };
      else if (action === 'phase2-advance') {
        act = { action: 'phase2-advance', apply: body.apply !== false, force: !!body.force };
      } else if (action === 'phase3-advance') {
        act = { action: 'phase3-advance', apply: body.apply !== false, force: !!body.force };
      } else if (action === 'phase5-advance') act = { action: 'phase5-advance' };
      else if (action === 'phase4-advance') {
        act = { action: 'phase4-advance', apply: body.apply !== false };
      } else if (action === 'phase6-advance') act = { action: 'phase6-advance' };
      else if (action === 'phase7-advance') {
        act = { action: 'phase7-advance', apply: body.apply !== false };
      } else if (action === 'phase8-advance') act = { action: 'phase8-advance' };
      else if (action === 'phase9-advance') act = { action: 'phase9-advance', skipForm: !!body.skipForm };
      else if (action === 'phase10-advance') {
        act = {
          action: 'phase10-advance',
          apply: body.apply !== false,
          skipAct: !!body.skipAct,
          syncGh: !!body.syncGh,
          force: !!body.force,
        };
      } else if (action === 'phase11-advance') {
        act = {
          action: 'phase11-advance',
          skipVerify: !!body.skipVerify,
          skipPhase10: !!body.skipPhase10,
        };
      } else if (action === 'phase12-advance') {
        act = {
          action: 'phase12-advance',
          apply: body.apply !== false,
          triggerDeploy: !!body.triggerDeploy,
          skipScan: !!body.skipScan,
          skipVerify: !!body.skipVerify,
        };
      } else if (action === 'phase13-advance') {
        act = {
          action: 'phase13-advance',
          apply: body.apply !== false,
          restart: body.restart !== false,
          skipAct: !!body.skipAct,
          skipVerify: !!body.skipVerify,
        };
      } else if (action === 'phase14-advance') {
        act = {
          action: 'phase14-advance',
          apply: body.apply !== false,
          skipHeal: !!body.skipHeal,
        };
      } else if (action === 'phase15-advance') {
        act = {
          action: 'phase15-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          dispatch: !!body.dispatch,
          skipHeal: !!body.skipHeal,
          skipPhase14: !!body.skipPhase14,
        };
      } else if (action === 'phase16-advance') {
        act = {
          action: 'phase16-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipScan: !!body.skipScan,
          skipMeta: !!body.skipMeta,
          skipPhase15: !!body.skipPhase15,
        };
      } else if (action === 'phase17-advance') {
        act = {
          action: 'phase17-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipScan: !!body.skipScan,
          skipMeta: !!body.skipMeta,
          skipPhase16: !!body.skipPhase16,
        };
      } else if (action === 'phase18-advance') {
        act = {
          action: 'phase18-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase19-advance') {
        act = {
          action: 'phase19-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipObserve: !!body.skipObserve,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase20-advance') {
        act = {
          action: 'phase20-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipObserve: !!body.skipObserve,
          skipCanon: !!body.skipCanon,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase21-advance') {
        act = {
          action: 'phase21-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipObserve: !!body.skipObserve,
          skipCanon: !!body.skipCanon,
          skipDesk: !!body.skipDesk,
          ack: !!body.ack,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase22-advance') {
        act = {
          action: 'phase22-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipObserve: !!body.skipObserve,
          skipDesk: !!body.skipDesk,
          skipPresence: !!body.skipPresence,
          ack: !!body.ack,
          parkGbp: body.parkGbp !== false,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase23-advance') {
        act = {
          action: 'phase23-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipObserve: !!body.skipObserve,
          skipDesk: !!body.skipDesk,
          skipPresence: !!body.skipPresence,
          skipThrone: !!body.skipThrone,
          skipDeploy: !!body.skipDeploy,
          triggerDeploy: !!body.triggerDeploy,
          ack: !!body.ack,
          parkGbp: body.parkGbp !== false,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase24-advance') {
        act = {
          action: 'phase24-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipObserve: !!body.skipObserve,
          skipDesk: !!body.skipDesk,
          skipPresence: !!body.skipPresence,
          skipThrone: !!body.skipThrone,
          skipHorizon: !!body.skipHorizon,
          skipHotpatch: !!body.skipHotpatch,
          skipBuild: !!body.skipBuild,
          skipDeploy: !!body.skipDeploy,
          triggerDeploy: !!body.triggerDeploy,
          forceGhDeploy: !!body.forceGhDeploy,
          ack: !!body.ack,
          parkGbp: body.parkGbp !== false,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase25-advance') {
        act = {
          action: 'phase25-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipObserve: !!body.skipObserve,
          skipDesk: !!body.skipDesk,
          skipPresence: !!body.skipPresence,
          skipThrone: !!body.skipThrone,
          skipHorizon: !!body.skipHorizon,
          skipCourier: !!body.skipCourier,
          skipHotpatch: !!body.skipHotpatch,
          skipCloser: !!body.skipCloser,
          skipIndex: !!body.skipIndex,
          skipDeploy: !!body.skipDeploy,
          triggerDeploy: !!body.triggerDeploy,
          ack: !!body.ack,
          parkGbp: body.parkGbp !== false,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase26-advance') {
        act = {
          action: 'phase26-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipObserve: !!body.skipObserve,
          skipDesk: !!body.skipDesk,
          skipPresence: !!body.skipPresence,
          skipThrone: !!body.skipThrone,
          skipHorizon: !!body.skipHorizon,
          skipCourier: !!body.skipCourier,
          skipForge: !!body.skipForge,
          skipHotpatch: !!body.skipHotpatch,
          skipCloser: !!body.skipCloser,
          skipIndex: !!body.skipIndex,
          skipYield: !!body.skipYield,
          skipSitemap: !!body.skipSitemap,
          skipDeploy: !!body.skipDeploy,
          triggerDeploy: !!body.triggerDeploy,
          ack: !!body.ack,
          parkGbp: body.parkGbp !== false,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase27-advance') {
        act = {
          action: 'phase27-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipLatticeHeal: !!body.skipLatticeHeal,
          skipObserve: !!body.skipObserve,
          skipDesk: !!body.skipDesk,
          skipPresence: !!body.skipPresence,
          skipThrone: !!body.skipThrone,
          skipHorizon: !!body.skipHorizon,
          skipCourier: !!body.skipCourier,
          skipForge: !!body.skipForge,
          skipHotpatch: !!body.skipHotpatch,
          skipCloser: !!body.skipCloser,
          skipIndex: !!body.skipIndex,
          skipYield: !!body.skipYield,
          skipSitemap: !!body.skipSitemap,
          skipDeploy: !!body.skipDeploy,
          triggerDeploy: !!body.triggerDeploy,
          ack: !!body.ack,
          parkGbp: body.parkGbp !== false,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase28-advance') {
        act = {
          action: 'phase28-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipLatticeHeal: !!body.skipLatticeHeal,
          skipLattice: !!body.skipLattice,
          skipObserve: !!body.skipObserve,
          skipDesk: !!body.skipDesk,
          skipPresence: !!body.skipPresence,
          skipThrone: !!body.skipThrone,
          skipHorizon: !!body.skipHorizon,
          skipCourier: !!body.skipCourier,
          skipForge: !!body.skipForge,
          skipHotpatch: !!body.skipHotpatch,
          skipCloser: !!body.skipCloser,
          skipIndex: !!body.skipIndex,
          skipYield: !!body.skipYield,
          skipSitemap: !!body.skipSitemap,
          skipDeploy: !!body.skipDeploy,
          triggerDeploy: !!body.triggerDeploy,
          ack: !!body.ack,
          parkGbp: body.parkGbp !== false,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase29-advance') {
        act = {
          action: 'phase29-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipLatticeHeal: !!body.skipLatticeHeal,
          skipLattice: !!body.skipLattice,
          skipContinuity: !!body.skipContinuity,
          skipObserve: !!body.skipObserve,
          skipDesk: !!body.skipDesk,
          skipPresence: !!body.skipPresence,
          skipThrone: !!body.skipThrone,
          skipHorizon: !!body.skipHorizon,
          skipCourier: !!body.skipCourier,
          skipForge: !!body.skipForge,
          skipHotpatch: !!body.skipHotpatch,
          skipCloser: !!body.skipCloser,
          skipIndex: !!body.skipIndex,
          skipYield: !!body.skipYield,
          skipSitemap: !!body.skipSitemap,
          skipDeploy: !!body.skipDeploy,
          triggerDeploy: !!body.triggerDeploy,
          ack: !!body.ack,
          parkGbp: body.parkGbp !== false,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase30-advance') {
        act = {
          action: 'phase30-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipLatticeHeal: !!body.skipLatticeHeal,
          skipLattice: !!body.skipLattice,
          skipContinuity: !!body.skipContinuity,
          skipChronos: !!body.skipChronos,
          skipObserve: !!body.skipObserve,
          skipDesk: !!body.skipDesk,
          skipPresence: !!body.skipPresence,
          skipThrone: !!body.skipThrone,
          skipHorizon: !!body.skipHorizon,
          skipCourier: !!body.skipCourier,
          skipForge: !!body.skipForge,
          skipHotpatch: !!body.skipHotpatch,
          skipCloser: !!body.skipCloser,
          skipIndex: !!body.skipIndex,
          skipYield: !!body.skipYield,
          skipSitemap: !!body.skipSitemap,
          skipDeploy: !!body.skipDeploy,
          triggerDeploy: !!body.triggerDeploy,
          ack: !!body.ack,
          parkGbp: body.parkGbp !== false,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase31-advance') {
        act = {
          action: 'phase31-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipLatticeHeal: !!body.skipLatticeHeal,
          skipLattice: !!body.skipLattice,
          skipContinuity: !!body.skipContinuity,
          skipChronos: !!body.skipChronos,
          skipDominion: !!body.skipDominion,
          skipObserve: !!body.skipObserve,
          skipDesk: !!body.skipDesk,
          skipPresence: !!body.skipPresence,
          skipThrone: !!body.skipThrone,
          skipHorizon: !!body.skipHorizon,
          skipCourier: !!body.skipCourier,
          skipForge: !!body.skipForge,
          skipHotpatch: !!body.skipHotpatch,
          skipCloser: !!body.skipCloser,
          skipIndex: !!body.skipIndex,
          skipYield: !!body.skipYield,
          skipSitemap: !!body.skipSitemap,
          skipDeploy: !!body.skipDeploy,
          triggerDeploy: !!body.triggerDeploy,
          ack: !!body.ack,
          parkGbp: body.parkGbp !== false,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase32-advance') {
        act = {
          action: 'phase32-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipLatticeHeal: !!body.skipLatticeHeal,
          skipLattice: !!body.skipLattice,
          skipContinuity: !!body.skipContinuity,
          skipChronos: !!body.skipChronos,
          skipDominion: !!body.skipDominion,
          skipObserve: !!body.skipObserve,
          skipDesk: !!body.skipDesk,
          skipPresence: !!body.skipPresence,
          skipThrone: !!body.skipThrone,
          skipHorizon: !!body.skipHorizon,
          skipCourier: !!body.skipCourier,
          skipForge: !!body.skipForge,
          skipHotpatch: !!body.skipHotpatch,
          skipCloser: !!body.skipCloser,
          skipIndex: !!body.skipIndex,
          skipPhase31: !!body.skipPhase31,
          forceCatalog: !!body.forceCatalog,
          skipYield: !!body.skipYield,
          skipSitemap: !!body.skipSitemap,
          skipDeploy: !!body.skipDeploy,
          triggerDeploy: !!body.triggerDeploy,
          ack: !!body.ack,
          parkGbp: body.parkGbp !== false,
          gscProxy: body.gscProxy !== false,
        };
      } else if (action === 'phase33-advance') {
        act = {
          action: 'phase33-advance',
          apply: body.apply !== false,
          syncGh: !!body.syncGh,
          skipHeal: !!body.skipHeal,
          skipLatticeHeal: !!body.skipLatticeHeal,
          skipLattice: !!body.skipLattice,
          skipContinuity: !!body.skipContinuity,
          skipChronos: !!body.skipChronos,
          skipDominion: !!body.skipDominion,
          skipObserve: !!body.skipObserve,
          skipDesk: !!body.skipDesk,
          skipPresence: !!body.skipPresence,
          skipThrone: !!body.skipThrone,
          skipHorizon: !!body.skipHorizon,
          skipCourier: !!body.skipCourier,
          skipForge: !!body.skipForge,
          skipHotpatch: !!body.skipHotpatch,
          skipCloser: !!body.skipCloser,
          skipIndex: !!body.skipIndex,
          skipPhase31: !!body.skipPhase31,
          skipPhase32: !!body.skipPhase32,
          forceCatalog: !!body.forceCatalog,
          skipYield: !!body.skipYield,
          skipSitemap: !!body.skipSitemap,
          skipDeploy: !!body.skipDeploy,
          triggerDeploy: !!body.triggerDeploy,
          ack: !!body.ack,
          parkGbp: body.parkGbp !== false,
          gscProxy: body.gscProxy !== false,
          windowDays: typeof body.windowDays === 'number' ? body.windowDays : undefined,
          topN: typeof body.topN === 'number' ? body.topN : undefined,
          theme: typeof body.theme === 'string' ? body.theme : undefined,
        };
      } else if (action === 'command-brief') {
        act = {
          action: 'command-brief',
          windowDays: typeof body.windowDays === 'number' ? body.windowDays : undefined,
          topN: typeof body.topN === 'number' ? body.topN : undefined,
          theme: typeof body.theme === 'string' ? body.theme : undefined,
        };
      } else if (action === 'seo-report') {
        act = {
          action: 'seo-report',
          windowDays: typeof body.windowDays === 'number' ? body.windowDays : undefined,
          topN: typeof body.topN === 'number' ? body.topN : undefined,
          theme: typeof body.theme === 'string' ? body.theme : undefined,
          skipScan: !!body.skipScan,
          skipLiveVerify: !!body.skipLiveVerify,
          skipPsi: !!body.skipPsi,
        };
      } else act = { action: 'sitemap-health', limit: body.limit ?? 120 };
      const result = await runMeridianAct(env, act);
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(result.stdout);
      } catch {
        parsed = null;
      }
      return NextResponse.json({
        env,
        action,
        ok: result.ok,
        code: result.code,
        stdout: result.stdout.slice(-6000),
        stderr: result.stderr.slice(-2000),
        result: parsed,
        digest: action === 'sitemap-health' ? await readLatestDigest(env) : undefined,
      });
    }

    if (env === 'preprod') {
      return NextResponse.json(
        { error: 'GSC/Bing act commands are Production-only (PreProd must stay out of search indexes).' },
        { status: 400 }
      );
    }

    let act: MeridianAct;
    if (action === 'submit-sitemap') {
      act = { action: 'submit-sitemap', feed: body.feed };
    } else if (action === 'bing-submit-sitemap') {
      act = { action: 'bing-submit-sitemap', feed: body.feed };
    } else if (action === 'inspect-url') {
      if (!body.url?.trim()) {
        return NextResponse.json({ error: 'url is required for inspect-url' }, { status: 400 });
      }
      act = { action: 'inspect-url', url: body.url.trim() };
    } else if (action === 'inspect-priority') {
      act = { action: 'inspect-priority', limit: body.limit ?? 5 };
    } else if (action === 'inspect-sitemap-delta') {
      act = { action: 'inspect-sitemap-delta', limit: body.limit ?? 10 };
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const result = await runMeridianAct(env, act);
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      parsed = null;
    }
    return NextResponse.json({
      env,
      action,
      ok: result.ok,
      code: result.code,
      stdout: result.stdout.slice(-6000),
      stderr: result.stderr.slice(-2000),
      result: parsed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: authStatus(e) });
  }
}
