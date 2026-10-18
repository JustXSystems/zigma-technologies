import { NextResponse } from 'next/server';
import { requireScreen } from '@/lib/auth';
import {
  meridianConnectorReadiness,
  meridianLatestPaths,
  readLatestAutopilot,
  readLatestMeridianReport,
  runMeridianAct,
  runMeridianCli,
  type MeridianAct,
  type MeridianEnv,
} from '@/lib/meridian-bridge';
import { readFile } from 'node:fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Live crawl + connectors can exceed default serverless limits on some hosts. */
export const maxDuration = 120;

function parseEnv(raw: unknown): MeridianEnv {
  return raw === 'preprod' ? 'preprod' : 'prod';
}

function authStatus(err: unknown) {
  const msg = err instanceof Error ? err.message : 'Error';
  if (msg === 'UNAUTHORIZED' || msg === 'Unauthorized') return 401;
  if (msg === 'FORBIDDEN') return 403;
  return 500;
}

export async function GET(request: Request) {
  try {
    await requireScreen('redirects');
    const url = new URL(request.url);
    const env = parseEnv(url.searchParams.get('env'));
    const format = url.searchParams.get('format') || 'json';
    if (format === 'html') {
      const { html } = meridianLatestPaths(env);
      try {
        const body = await readFile(html, 'utf8');
        return new NextResponse(body, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      } catch {
        return NextResponse.json({ error: 'No report yet — run a scan first.' }, { status: 404 });
      }
    }
    const report = await readLatestMeridianReport(env);
    const autopilot = await readLatestAutopilot(env);
    const readiness = meridianConnectorReadiness();
    return NextResponse.json({ env, report, autopilot, hasReport: !!report, readiness });
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
      dryRun?: boolean;
      force?: boolean;
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

    if (action === 'autopilot') {
      const result = await runMeridianAct(env, {
        action: 'autopilot',
        skipAct: env === 'preprod' || !!body.skipAct,
        applyMeta: !!body.applyMeta,
      });
      const report = await readLatestMeridianReport(env);
      const autopilot = await readLatestAutopilot(env);
      return NextResponse.json({
        env,
        action,
        ok: result.ok,
        code: result.code,
        stdout: result.stdout.slice(-6000),
        stderr: result.stderr.slice(-2000),
        report,
        autopilot,
      });
    }

    if (action === 'draft-meta' || action === 'apply-meta') {
      const act: MeridianAct =
        action === 'draft-meta'
          ? { action: 'draft-meta' }
          : { action: 'apply-meta', dryRun: !!body.dryRun, force: !!body.force };
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
    }

    if (env === 'preprod') {
      return NextResponse.json(
        { error: 'GSC act commands are Production-only (PreProd must stay out of Google).' },
        { status: 400 }
      );
    }

    let act: MeridianAct;
    if (action === 'submit-sitemap') {
      act = { action: 'submit-sitemap', feed: body.feed };
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
