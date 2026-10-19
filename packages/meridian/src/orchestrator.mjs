import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTechnicalEngine } from './engine/technical.mjs';
import { buildRoadmap, buildScorecard } from './engine/score.mjs';
import { buildScoreTrend, readPreviousReport } from './engine/trend.mjs';
import { findingsFromConnectors, runConnectors, signalsFromConnectors } from './connectors/registry.mjs';
import { renderHtmlReport } from './report/html.mjs';
import { renderMarkdownReport } from './report/markdown.mjs';

const MERIDIAN_VERSION = '0.4.0';
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @param {object} profile
 * @param {{ outDir?: string, failOnFindings?: boolean }} [opts]
 */
export async function runMeridian(profile, opts = {}) {
  const started = Date.now();
  const runId = randomUUID().slice(0, 8);

  const outDir = resolve(
    opts.outDir ||
      (profile.outputDir
        ? resolve(__dirname, '..', profile.outputDir)
        : resolve(__dirname, '..', 'out', profile.id || 'run'))
  );
  await mkdir(outDir, { recursive: true });
  const previous = await readPreviousReport(outDir);

  const technical = await runTechnicalEngine(profile);
  const connectors = await runConnectors(profile, { technical });
  const signalFindings = findingsFromSignals(connectors, profile);
  const connectorFindings = findingsFromConnectors(connectors);
  const findings = [...technical.findings, ...signalFindings, ...connectorFindings];

  // Continuum evidence (Phase 16) — lifts authority + suppresses stale sameAs findings
  let evidence = {};
  try {
    evidence = JSON.parse(await readFile(resolve(outDir, 'authority-evidence.json'), 'utf8')) || {};
  } catch {
    try {
      const nap = JSON.parse(await readFile(resolve(outDir, 'nap-audit.json'), 'utf8'));
      if ((nap.sameAsCount ?? nap.nap?.sameAs?.length ?? 0) > 0) evidence.sameAsLive = true;
    } catch {
      /* optional */
    }
    try {
      const cites = JSON.parse(await readFile(resolve(outDir, 'citations-playbook.json'), 'utf8'));
      if (cites && (cites.rows?.length || cites.count)) evidence.citationsReady = true;
    } catch {
      /* optional */
    }
    try {
      const bl = JSON.parse(await readFile(resolve(outDir, 'backlink-outreach.json'), 'utf8'));
      evidence.outreachDrafts = bl.drafts?.length || bl.count || bl.unsent || 0;
    } catch {
      /* optional */
    }
  }

  const scorecard = buildScorecard({ findings, connectors, evidence });
  const reportFindings = evidence.sameAsLive
    ? findings.filter((f) => f.code !== 'SCHEMA_SAMEAS' && f.code !== 'PHASE2_SAMEAS_APPLY')
    : findings;
  const roadmap = buildRoadmap({ findings: reportFindings, connectors, profile });
  const trend = buildScoreTrend(previous, scorecard, reportFindings);

  const report = {
    meta: {
      schemaVersion: 1,
      meridianVersion: MERIDIAN_VERSION,
      runId,
      startedAt: new Date(started).toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
    },
    profile: {
      id: profile.id,
      displayName: profile.displayName,
      origin: profile.origin,
      indexable: profile.indexable,
    },
    scorecard,
    trend,
    findings: reportFindings,
    pages: technical.pages.map(({ issues, ...rest }) => ({
      ...rest,
      issues: (issues || []).map((i) => i.code),
    })),
    connectors,
    signals: signalsFromConnectors(connectors),
    roadmap,
    extras: technical.extras || {},
  };

  const jsonPath = resolve(outDir, `report-${runId}.json`);
  const latestJson = resolve(outDir, 'report-latest.json');
  const htmlPath = resolve(outDir, `report-${runId}.html`);
  const latestHtml = resolve(outDir, 'report-latest.html');
  const mdPath = resolve(outDir, `report-${runId}.md`);

  const json = JSON.stringify(report, null, 2);
  const html = renderHtmlReport(report);
  const md = renderMarkdownReport(report);
  await writeFile(jsonPath, json, 'utf8');
  await writeFile(latestJson, json, 'utf8');
  await writeFile(htmlPath, html, 'utf8');
  await writeFile(latestHtml, html, 'utf8');
  await writeFile(mdPath, md, 'utf8');

  // Append to history (keep last 30)
  try {
    const histPath = resolve(outDir, 'score-history.jsonl');
    const line = JSON.stringify({
      at: report.meta.finishedAt,
      runId,
      overall: scorecard.overall,
      grade: scorecard.grade,
      hardFails: findings.filter((f) => f.severity === 'critical' || f.severity === 'high').length,
      trend: trend.status,
    });
    const { appendFile, readFile: rf } = await import('node:fs/promises');
    await appendFile(histPath, line + '\n', 'utf8');
    try {
      const raw = await rf(histPath, 'utf8');
      const lines = raw.trim().split(/\n+/);
      if (lines.length > 30) {
        await writeFile(histPath, lines.slice(-30).join('\n') + '\n', 'utf8');
      }
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore history errors */
  }

  const hardFails = reportFindings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  return {
    report,
    paths: { outDir, jsonPath, htmlPath, mdPath, latestHtml, latestJson },
    ok: hardFails.length === 0,
    hardFailCount: hardFails.length,
  };
}

function findingsFromSignals(connectors, profile) {
  /** @type {object[]} */
  const out = [];
  const gsc = connectors.find((c) => c.id === 'gsc');
  if (gsc?.status === 'ok' && Array.isArray(gsc.data?.sitemaps) && gsc.data.sitemaps.length === 0) {
    out.push({
      code: 'GSC_NO_SITEMAP',
      severity: 'medium',
      title: 'Search Console has no sitemap records',
      detail: `Submit ${profile.origin.replace(/\/$/, '')}/sitemap.xml in GSC if not done.`,
      remediation: 'Run Meridian autopilot or GSC → Sitemaps → sitemap.xml',
      owner: 'marketing',
      pillar: 'signals',
      evidence: gsc.data?.siteUrl,
    });
  }
  const psi = connectors.find((c) => c.id === 'pagespeed');
  const score = psi?.data?.performanceScore;
  if (psi?.status === 'ok' && typeof score === 'number' && score < 50) {
    out.push({
      code: 'PSI_LOW',
      severity: 'medium',
      title: `Mobile PageSpeed lab score is low (${score})`,
      detail: 'Lab score is not a ranking guarantee but flags UX risk.',
      remediation: 'Run Phase 4 image/font work; re-check field CWV in the Meridian report.',
      owner: 'dev',
      pillar: 'signals',
      evidence: profile.origin,
    });
  }
  return out;
}

export async function loadProfile(profilePath) {
  const abs = resolve(profilePath);
  const raw = await readFile(abs, 'utf8');
  const profile = JSON.parse(raw);
  if (!profile.origin || !profile.id) {
    throw new Error('SiteProfile requires id and origin');
  }
  return profile;
}
