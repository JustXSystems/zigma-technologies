'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { withBasePath } from '@/lib/base-path';

type Env = 'prod' | 'preprod';

type ReadinessField = {
  id: string;
  label: string;
  set: boolean;
  requiredFor: string[];
  howTo: string;
};

type Readiness = {
  docsPath?: string;
  fields?: ReadinessField[];
  connectors?: Record<string, { ready: boolean; missing: string[] }>;
};

type Report = {
  meta?: { runId?: string; finishedAt?: string; durationMs?: number };
  scorecard?: {
    overall?: number;
    grade?: string;
    summary?: string;
    pillars?: Record<string, number>;
  };
  trend?: { status?: string; message?: string; delta?: number | null };
  findings?: { code: string; severity: string; title: string; remediation: string; owner: string }[];
  connectors?: { id: string; label: string; status: string; message?: string }[];
  roadmap?: { priority: number; title: string; owner: string; phase: string }[];
  profile?: { origin?: string; displayName?: string };
  signals?: {
    note?: string;
    gsc?: { topQueries?: { query: string; clicks: number; position: number }[]; sitemaps?: unknown[] };
    ga4?: { organic?: { sessions: number; keyEvents: number }; totals?: { sessions: number } };
    pagespeed?: { performanceScore?: number; lab?: { lcp?: { displayValue?: string } } };
    bing?: { siteUrl?: string };
  };
};

type JobStatus = {
  action?: string;
  status?: 'running' | 'ok' | 'error';
  startedAt?: string;
  finishedAt?: string;
  error?: string;
};

async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith('<')) {
    throw new Error(
      `Server returned HTML instead of JSON (HTTP ${res.status}). Often a proxy timeout — use Run autopilot (background) or retry a lighter action.`
    );
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid JSON from Meridian API (HTTP ${res.status}): ${trimmed.slice(0, 120)}`);
  }
}

export default function MeridianPanel() {
  const [env, setEnv] = useState<Env>('prod');
  const [report, setReport] = useState<Report | null>(null);
  const [autopilot, setAutopilot] = useState<Record<string, unknown> | null>(null);
  const [digest, setDigest] = useState<Record<string, unknown> | null>(null);
  const [unlock, setUnlock] = useState<Record<string, unknown> | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string>('');
  const [pending, startTransition] = useTransition();

  const load = useCallback(async (e: Env) => {
    setError(null);
    const res = await fetch(withBasePath(`/api/admin/meridian?env=${e}`), { credentials: 'include' });
    const data = await readApiJson(res);
    if (!res.ok) {
      setError(String(data.error || 'Failed to load report'));
      setReport(null);
      return;
    }
    setReport((data.report as Report) || null);
    setAutopilot((data.autopilot as Record<string, unknown>) || null);
    setDigest((data.digest as Record<string, unknown>) || null);
    setUnlock((data.unlock as Record<string, unknown>) || null);
    setReadiness((data.readiness as Readiness) || null);
    setJob((data.job as JobStatus) || null);
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load(env);
    });
  }, [env, load]);

  // Poll while background autopilot is running
  useEffect(() => {
    if (job?.status !== 'running') return;
    const id = window.setInterval(() => {
      void load(env).then(() => {
        /* load updates job */
      });
    }, 8000);
    return () => window.clearInterval(id);
  }, [job?.status, env, load]);

  useEffect(() => {
    if (job?.status === 'ok') {
      setLog((prev) =>
        prev.includes('Autopilot finished') ? prev : `Autopilot finished at ${job.finishedAt || '—'}.\n${prev}`
      );
    } else if (job?.status === 'error') {
      setError(job.error || 'Autopilot failed');
    }
  }, [job?.status, job?.finishedAt, job?.error]);

  function postAction(payload: Record<string, unknown>, label: string) {
    setError(null);
    setLog(`${label}…`);
    startTransition(async () => {
      try {
        const res = await fetch(withBasePath('/api/admin/meridian'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ env, ...payload }),
        });
        const data = await readApiJson(res);
        if (!res.ok) {
          setError(String(data.error || `${label} failed`));
          setLog(String(data.stderr || data.stdout || ''));
          return;
        }
        if (data.job) setJob(data.job as JobStatus);
        if (data.started || data.alreadyRunning) {
          setLog(String(data.message || 'Autopilot running in background…'));
          await load(env);
          return;
        }
        if (data.report) setReport(data.report as Report);
        if (data.autopilot) setAutopilot(data.autopilot as Record<string, unknown>);
        if (data.digest) setDigest(data.digest as Record<string, unknown>);
        await load(env);
        const out = data.autopilot
          ? JSON.stringify(data.autopilot, null, 2)
          : data.result
            ? JSON.stringify(data.result, null, 2)
            : [data.stdout, data.stderr].filter(Boolean).join('\n');
        setLog(String(out).slice(-4000));
      } catch (err) {
        setError(err instanceof Error ? err.message : `${label} failed`);
      }
    });
  }

  function runScan() {
    postAction({ action: 'scan' }, 'Running Meridian');
  }

  const jobRunning = job?.status === 'running';

  const score = report?.scorecard?.overall;
  const grade = report?.scorecard?.grade;

  return (
    <div className="meridian-panel">
      <style jsx>{`
        .meridian-panel {
          --m-bg: #0b121c;
          --m-panel: #121a26;
          --m-line: rgba(255, 255, 255, 0.08);
          --m-cyan: #3de0ff;
          --m-muted: #8b9bb0;
          --m-text: #e8eef7;
          font-family: 'IBM Plex Sans', var(--font-body, system-ui), sans-serif;
          color: var(--m-text);
          background: radial-gradient(800px 320px at 0% 0%, rgba(61, 224, 255, 0.1), transparent 55%), var(--m-bg);
          border: 1px solid var(--m-line);
          border-radius: 16px;
          padding: 1.35rem 1.4rem 1.6rem;
        }
        .head {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
        }
        .mark {
          font-family: 'IBM Plex Mono', var(--font-mono, monospace);
          font-size: 0.7rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--m-cyan);
        }
        h2 {
          margin: 0.25rem 0 0;
          font-size: 1.35rem;
          letter-spacing: -0.02em;
        }
        .sub {
          color: var(--m-muted);
          font-size: 0.9rem;
          margin: 0.35rem 0 0;
          max-width: 42rem;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }
        select,
        button {
          font: inherit;
          border-radius: 8px;
          border: 1px solid var(--m-line);
          background: var(--m-panel);
          color: var(--m-text);
          padding: 0.55rem 0.85rem;
          cursor: pointer;
        }
        button.primary {
          background: linear-gradient(120deg, #168a9e, #3de0ff);
          color: #061018;
          border: none;
          font-weight: 600;
        }
        button:disabled {
          opacity: 0.55;
          cursor: wait;
        }
        a.link {
          color: var(--m-cyan);
          font-size: 0.85rem;
        }
        .more-actions {
          width: 100%;
          margin: 0 0 1.1rem;
          border: 1px solid var(--m-line);
          border-radius: 10px;
          padding: 0.55rem 0.75rem 0.75rem;
          background: rgba(18, 26, 38, 0.65);
        }
        .more-actions summary {
          cursor: pointer;
          color: var(--m-muted);
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
        }
        .more-actions[open] summary {
          margin-bottom: 0.65rem;
          color: var(--m-text);
        }
        .score-row {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 1rem;
          margin: 1rem 0 1.25rem;
        }
        @media (max-width: 700px) {
          .score-row {
            grid-template-columns: 1fr;
          }
        }
        .dial {
          border: 1px solid var(--m-line);
          border-radius: 16px;
          background: var(--m-panel);
          padding: 1.1rem;
          text-align: center;
        }
        .dial .n {
          font-size: 2.8rem;
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .dial .g {
          font-family: 'IBM Plex Mono', monospace;
          color: var(--m-cyan);
          letter-spacing: 0.14em;
          font-size: 0.75rem;
          margin-top: 0.35rem;
        }
        .summary {
          border: 1px solid var(--m-line);
          border-radius: 16px;
          background: var(--m-panel);
          padding: 1rem 1.1rem;
        }
        .pillars {
          display: grid;
          gap: 0.35rem;
          margin-top: 0.75rem;
        }
        .pillar {
          display: grid;
          grid-template-columns: 88px 1fr 32px;
          gap: 0.45rem;
          align-items: center;
          font-size: 0.8rem;
        }
        .pillar span:first-child {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          color: var(--m-muted);
          text-transform: capitalize;
        }
        .bar {
          height: 5px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 99px;
          overflow: hidden;
        }
        .bar i {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #1a9bb5, var(--m-cyan));
        }
        .section-title {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--m-muted);
          margin: 1.25rem 0 0.65rem;
        }
        .connectors {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 0.55rem;
        }
        .connector {
          border: 1px solid var(--m-line);
          border-radius: 10px;
          padding: 0.7rem 0.8rem;
          background: rgba(0, 0, 0, 0.2);
          font-size: 0.82rem;
        }
        .connector strong {
          display: block;
        }
        .connector .st {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--m-cyan);
          margin: 0.25rem 0;
        }
        .findings {
          display: grid;
          gap: 0.5rem;
        }
        .finding {
          border: 1px solid var(--m-line);
          border-left: 3px solid var(--m-muted);
          border-radius: 8px;
          padding: 0.65rem 0.8rem;
          font-size: 0.88rem;
        }
        .finding.critical {
          border-left-color: #ff5c5c;
        }
        .finding.high {
          border-left-color: #ff9f43;
        }
        .finding.medium {
          border-left-color: #f6c945;
        }
        .err {
          color: #ff8b8b;
          margin: 0.5rem 0;
        }
        .log {
          margin-top: 1rem;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.72rem;
          color: var(--m-muted);
          white-space: pre-wrap;
          max-height: 160px;
          overflow: auto;
          border-top: 1px solid var(--m-line);
          padding-top: 0.75rem;
        }
        .empty {
          color: var(--m-muted);
          font-size: 0.92rem;
        }
        .ready-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
          margin-top: 0.5rem;
        }
        .ready-table th,
        .ready-table td {
          text-align: left;
          padding: 0.45rem 0.4rem;
          border-bottom: 1px solid var(--m-line);
          vertical-align: top;
        }
        .ready-table th {
          color: var(--m-muted);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .badge {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .badge.on {
          color: #3dd68c;
        }
        .badge.off {
          color: #ff9f43;
        }
        .howto {
          color: var(--m-muted);
          font-size: 0.78rem;
          margin-top: 0.15rem;
        }
      `}</style>

      <div className="head">
        <div>
          <div className="mark">Meridian · SEO Command</div>
          <h2>Command desk</h2>
          <p className="sub">
            Day-to-day: use <strong>Run autopilot</strong> (covers packs + unlock + cockpit). Extra buttons are
            optional one-offs — still valid, not required weekly.
          </p>
          {jobRunning ? (
            <p className="sub" style={{ color: 'var(--accent, #0b6e4f)', marginTop: '0.35rem' }}>
              Autopilot running in background since {job?.startedAt || '…'} — this page refreshes every few seconds.
            </p>
          ) : null}
        </div>
        <div className="actions">
          <select
            value={env}
            disabled={pending || jobRunning}
            onChange={(e) => setEnv(e.target.value as Env)}
            aria-label="Environment"
          >
            <option value="prod">Production</option>
            <option value="preprod">PreProd</option>
          </select>
          <button
            type="button"
            className="primary"
            disabled={pending || jobRunning}
            onClick={() => postAction({ action: 'autopilot', skipAct: env === 'preprod' }, 'Starting autopilot')}
          >
            {jobRunning ? 'Autopilot running…' : pending ? 'Working…' : 'Run autopilot'}
          </button>
          <button
            type="button"
            disabled={pending || jobRunning}
            onClick={() =>
              postAction(
                { action: 'autopilot', skipAct: env === 'preprod', applyMeta: true },
                'Starting autopilot + apply'
              )
            }
            title="Writes drafted meta + image alt into empty CMS fields"
          >
            Autopilot + apply
          </button>
          <button type="button" disabled={pending || jobRunning} onClick={runScan}>
            Scan only
          </button>
          <button
            type="button"
            disabled={pending || jobRunning || env !== 'prod'}
            onClick={() => postAction({ action: 'submit-sitemap' }, 'Submitting GSC sitemap')}
          >
            GSC sitemap
          </button>
          <button
            type="button"
            disabled={pending || jobRunning || env !== 'prod'}
            onClick={() => postAction({ action: 'bing-submit-sitemap' }, 'Submitting Bing sitemap')}
          >
            Bing sitemap
          </button>
          <button
            type="button"
            disabled={pending || jobRunning || env !== 'prod'}
            onClick={() => postAction({ action: 'inspect-priority', limit: 5 }, 'Inspecting priority URLs')}
          >
            Inspect top URLs
          </button>
          <a className="link" href={withBasePath(`/api/admin/meridian?env=${env}&format=html`)} target="_blank" rel="noreferrer">
            HTML report
          </a>
          <a
            className="link"
            href={withBasePath(`/api/admin/meridian?env=${env}&format=cockpit`)}
            target="_blank"
            rel="noreferrer"
          >
            Ops cockpit
          </a>
        </div>
      </div>

      <details className="more-actions">
        <summary>More one-off actions (optional — already inside autopilot)</summary>
        <div className="actions">
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'draft-meta' }, 'Drafting meta')}>
              Draft meta
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'apply-meta' }, 'Applying meta')}>
              Apply meta
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'draft-alt' }, 'Drafting alt')}>
              Draft alt
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'apply-alt' }, 'Applying alt')}>
              Apply alt
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'sitemap-health', limit: 120 }, 'Sitemap health crawl')}>
              Sitemap health
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'form-health' }, 'Form health probe')}>
              Form health
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'image-weight' }, 'Image weight scan')}>
              Image weight
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'image-optimize' }, 'Optimizing heavy images')}>
              Optimize images
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'orphan-remediate', apply: true }, 'Remediating orphans')}>
              Fix orphans
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'content-briefs' }, 'Writing content briefs')}>
              Content briefs
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'schema-validate' }, 'Validating JSON-LD')}>
              Schema check
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'nap-audit' }, 'NAP / GBP audit')}>
              NAP / GBP
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'hreflang-validate' }, 'Checking hreflang')}>
              hreflang
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'keyword-map' }, 'Building keyword map')}>
              Keyword map
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'content-seed' }, 'Seeding FAQ content')}>
              Seed content
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'citations-playbook' }, 'Citations playbook')}>
              Citations
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'city-pages-readiness' }, 'City pages readiness')}>
              City pages
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'backlink-outreach' }, 'Backlink outreach pack')}>
              Backlinks
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'unlock-readiness' }, 'Unlock readiness')}>
              Unlock %
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'ops-cockpit' }, 'Writing ops cockpit')}>
              Regen cockpit
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase2-advance', apply: true }, 'Phase 2 advance (sameAs + Rich Results)')}
            >
              Phase 2
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase3-advance', apply: true }, 'Phase 3 advance (meta + alt)')}
            >
              Phase 3
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase5-advance' }, 'Phase 5 local SEO ops pack')}
            >
              Phase 5
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase4-advance', apply: true }, 'Phase 4 speed ops')}
            >
              Phase 4
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase6-advance' }, 'Phase 6 city & locale ops')}
            >
              Phase 6
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase7-advance', apply: true }, 'Phase 7 content ops')}
            >
              Phase 7
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase8-advance' }, 'Phase 8 backlink ops')}
            >
              Phase 8
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase9-advance' }, 'Phase 9 command center')}
            >
              Phase 9
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase10-advance' }, 'Phase 10 continuous unlock')}
            >
              Phase 10
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase11-advance' }, 'Phase 11 live convergence')}
            >
              Phase 11
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase12-advance' }, 'Phase 12 score lift')}
            >
              Phase 12
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase13-advance' }, 'Phase 13 sovereign autoclose')}
            >
              Phase 13
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase14-advance' }, 'Phase 14 perpetual ops')}
            >
              Phase 14
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase15-advance', syncGh: true }, 'Phase 15 sovereign fleet')}
            >
              Phase 15
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase16-advance' }, 'Phase 16 autonomous continuum')}
            >
              Phase 16
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase17-advance' }, 'Phase 17 mission archive')}
            >
              Phase 17 / Guard
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase18-advance' }, 'Phase 18 observatory')}
            >
              Phase 18
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase19-advance' }, 'Phase 19 living canon')}
            >
              Phase 19 / Canon
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase20-advance' }, 'Phase 20 autonomic desk')}
            >
              Phase 20 / Desk
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase21-advance' }, 'Phase 21 presence sentinel')}
            >
              Phase 21 / Presence
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase22-advance' }, 'Phase 22 quiet throne')}
            >
              Phase 22 / Throne
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase23-advance' }, 'Phase 23 eternal horizon')}
            >
              Phase 23 / Horizon
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase24-advance' }, 'Phase 24 deploy courier')}
            >
              Phase 24 / Courier
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase25-advance' }, 'Phase 25 growth closer')}
            >
              Phase 25 / Forge
            </button>
            <button
              type="button"
              disabled={pending || jobRunning}
              onClick={() => postAction({ action: 'phase25-advance', ack: true, skipObserve: true }, 'Ack GBP verified')}
            >
              Ack GBP
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'rich-results-pack' }, 'Rich Results pack')}>
              Rich Results
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'top20-meta-pack' }, 'Top meta pack')}>
              Top meta
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'review-kit' }, 'Review kit')}>
              Review kit
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'content-calendar' }, 'Content calendar')}>
              Calendar
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'speed-baseline' }, 'Speed baseline')}>
              Speed
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'preprod-removals' }, 'PreProd removals check')}>
              PreProd
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'quarterly-digest' }, 'Quarterly digest')}>
              Quarterly
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'phase0-wizard' }, 'Phase 0 wizard')}>
              Phase 0
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'meta-polish', apply: true }, 'Polishing meta')}>
              Polish meta
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'indexing-queue' }, 'Indexing queue')}>
              Index queue
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'og-share-pack' }, 'OG share pack')}>
              OG share
            </button>
            <button type="button" disabled={pending || jobRunning} onClick={() => postAction({ action: 'locale-decision' }, 'Locale decision')}>
              Locales
            </button>
            <button
              type="button"
              disabled={pending || jobRunning || env !== 'prod'}
              onClick={() => postAction({ action: 'inspect-sitemap-delta', limit: 10 }, 'Inspecting new sitemap URLs')}
            >
              Inspect new URLs
            </button>
            <a className="link" href={withBasePath(`/api/admin/meridian?env=${env}&format=phase0`)} target="_blank" rel="noreferrer">
              Phase 0 HTML
            </a>
        </div>
      </details>

      {error ? <p className="err">{error}</p> : null}

      {readiness?.fields?.length ? (
        <>
          <div className="section-title">Connectors readiness</div>
          <p className="sub" style={{ marginBottom: '0.5rem' }}>
            Secrets are set on the server <code>.env</code> (never shown here). Full click-by-click guide:{' '}
            <code>{readiness.docsPath || 'packages/meridian/SETUP.md'}</code> and SEO-GUIDE Appendix G.
          </p>
          <table className="ready-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Status</th>
                <th>How to get the value</th>
              </tr>
            </thead>
            <tbody>
              {readiness.fields.map((f) => (
                <tr key={f.id}>
                  <td>
                    <code>{f.id}</code>
                    <div className="howto">{f.label}</div>
                  </td>
                  <td>
                    <span className={`badge ${f.set ? 'on' : 'off'}`}>{f.set ? 'set' : 'missing'}</span>
                  </td>
                  <td className="howto">{f.howTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {!report ? (
        <p className="empty">No report yet. Run a scan to generate the consolidated Meridian report.</p>
      ) : (
        <>
          <div className="score-row">
            <div className="dial">
              <div className="n">{score ?? '—'}</div>
              <div className="g">GRADE {grade ?? '—'}</div>
            </div>
            <div className="summary">
              <div className="mark">Scorecard</div>
              <p style={{ margin: '0.4rem 0 0' }}>{report.scorecard?.summary}</p>
              {report.trend?.message ? (
                <p className="sub" style={{ marginTop: '0.5rem' }}>
                  Trend: {report.trend.message}
                </p>
              ) : null}
              {autopilot && typeof autopilot === 'object' && 'meta' in autopilot ? (
                <p className="sub" style={{ marginTop: '0.35rem' }}>
                  Last autopilot:{' '}
                  {String((autopilot.meta as { finishedAt?: string })?.finishedAt || '—')} · score{' '}
                  {String((autopilot.scorecard as { overall?: number })?.overall ?? '—')}
                </p>
              ) : null}
              {unlock && typeof unlock.percent === 'number' ? (
                <p className="sub" style={{ marginTop: '0.5rem' }}>
                  Automation unlock: <strong>{String(unlock.percent)}%</strong> (
                  {String(unlock.grade || '—')})
                  {Array.isArray(unlock.nextUnlock) && unlock.nextUnlock.length > 0
                    ? ` · next: ${String((unlock.nextUnlock[0] as { label?: string })?.label || '')}`
                    : ''}
                </p>
              ) : null}
              {digest && Array.isArray(digest.humanChecklist) && (digest.humanChecklist as unknown[]).length > 0 ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <div className="mark">Phase 9 — still needs a human</div>
                  <ul className="sub" style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                    {(digest.humanChecklist as { task?: string; who?: string }[]).slice(0, 6).map((h, i) => (
                      <li key={i}>
                        {h.task} <em>({h.who || 'You'})</em>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="pillars">
                {Object.entries(report.scorecard?.pillars || {}).map(([k, v]) => (
                  <div className="pillar" key={k}>
                    <span>{k}</span>
                    <div className="bar">
                      <i style={{ width: `${v}%` }} />
                    </div>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              <p className="sub" style={{ marginTop: '0.75rem' }}>
                {report.profile?.origin} · run {report.meta?.runId} · {report.meta?.finishedAt}
              </p>
            </div>
          </div>

          <div className="section-title">Connectors</div>
          <div className="connectors">
            {(report.connectors || []).map((c) => (
              <div className="connector" key={c.id}>
                <strong>{c.label}</strong>
                <div className="st">{c.status}</div>
                <div style={{ color: 'var(--m-muted)' }}>{c.message}</div>
              </div>
            ))}
          </div>

          {(report.signals?.gsc || report.signals?.ga4 || report.signals?.pagespeed || report.signals?.bing) && (
            <>
              <div className="section-title">Signals</div>
              <div className="connectors">
                {report.signals.gsc ? (
                  <div className="connector">
                    <strong>Search Console</strong>
                    <div className="st">live</div>
                    <div style={{ color: 'var(--m-muted)' }}>
                      {(report.signals.gsc.sitemaps || []).length} sitemaps · top query:{' '}
                      {report.signals.gsc.topQueries?.[0]?.query || '—'}
                    </div>
                  </div>
                ) : null}
                {report.signals.ga4 ? (
                  <div className="connector">
                    <strong>GA4</strong>
                    <div className="st">live</div>
                    <div style={{ color: 'var(--m-muted)' }}>
                      Organic {report.signals.ga4.organic?.sessions ?? 0} sessions ·{' '}
                      {report.signals.ga4.organic?.keyEvents ?? 0} key events
                    </div>
                  </div>
                ) : null}
                {report.signals.pagespeed ? (
                  <div className="connector">
                    <strong>PageSpeed</strong>
                    <div className="st">live</div>
                    <div style={{ color: 'var(--m-muted)' }}>
                      Mobile {report.signals.pagespeed.performanceScore}/100 · LCP{' '}
                      {report.signals.pagespeed.lab?.lcp?.displayValue || '—'}
                    </div>
                  </div>
                ) : null}
                {report.signals.bing ? (
                  <div className="connector">
                    <strong>Bing</strong>
                    <div className="st">live</div>
                    <div style={{ color: 'var(--m-muted)' }}>{report.signals.bing.siteUrl}</div>
                  </div>
                ) : null}
              </div>
            </>
          )}

          <div className="section-title">Top findings</div>
          <div className="findings">
            {(report.findings || []).slice(0, 8).map((f) => (
              <div key={f.code + f.title} className={`finding ${f.severity}`}>
                <strong>
                  [{f.severity}] {f.title}
                </strong>
                <div style={{ color: 'var(--m-muted)', marginTop: 4 }}>{f.remediation}</div>
              </div>
            ))}
            {!report.findings?.length ? <p className="empty">No findings.</p> : null}
          </div>

          <div className="section-title">Roadmap</div>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--m-muted)', fontSize: '0.9rem' }}>
            {(report.roadmap || []).slice(0, 6).map((r) => (
              <li key={r.priority} style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--m-text)' }}>{r.title}</span> — {r.owner} · {r.phase}
              </li>
            ))}
          </ol>
        </>
      )}

      {log ? <pre className="log">{log}</pre> : null}
    </div>
  );
}
