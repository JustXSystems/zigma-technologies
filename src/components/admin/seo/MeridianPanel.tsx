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

export default function MeridianPanel() {
  const [env, setEnv] = useState<Env>('prod');
  const [report, setReport] = useState<Report | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string>('');
  const [pending, startTransition] = useTransition();

  const load = useCallback(async (e: Env) => {
    setError(null);
    const res = await fetch(withBasePath(`/api/admin/meridian?env=${e}`), { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load report');
      setReport(null);
      return;
    }
    setReport(data.report || null);
    setReadiness(data.readiness || null);
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load(env);
    });
  }, [env, load]);

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
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || `${label} failed`);
          setLog(data.stderr || data.stdout || '');
          return;
        }
        if (data.report) setReport(data.report);
        const out = data.result
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
            Verify → score → report → act. Connectors need server secrets (`MERIDIAN_GOOGLE_*`). Act commands submit
            the sitemap and inspect URLs in Search Console (Production only).
          </p>
        </div>
        <div className="actions">
          <select
            value={env}
            disabled={pending}
            onChange={(e) => setEnv(e.target.value as Env)}
            aria-label="Environment"
          >
            <option value="prod">Production</option>
            <option value="preprod">PreProd</option>
          </select>
          <button type="button" className="primary" disabled={pending} onClick={runScan}>
            {pending ? 'Working…' : 'Run scan'}
          </button>
          <button
            type="button"
            disabled={pending || env !== 'prod'}
            onClick={() => postAction({ action: 'submit-sitemap' }, 'Submitting sitemap')}
            title="Requires MERIDIAN_GOOGLE_* with webmasters scope"
          >
            Submit sitemap
          </button>
          <button
            type="button"
            disabled={pending || env !== 'prod'}
            onClick={() => postAction({ action: 'inspect-priority', limit: 5 }, 'Inspecting priority URLs')}
          >
            Inspect top URLs
          </button>
          <a className="link" href={withBasePath(`/api/admin/meridian?env=${env}&format=html`)} target="_blank" rel="noreferrer">
            Open HTML report
          </a>
        </div>
      </div>

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
