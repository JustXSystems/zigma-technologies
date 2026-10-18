import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Read previous report-latest.json (if any) before overwrite.
 * @param {string} outDir
 */
export async function readPreviousReport(outDir) {
  try {
    return JSON.parse(await readFile(resolve(outDir, 'report-latest.json'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * @param {object|null} previous
 * @param {object} scorecard
 * @param {object[]} currentFindings
 */
export function buildScoreTrend(previous, scorecard, currentFindings) {
  if (!previous?.scorecard) {
    return {
      hasPrevious: false,
      previousOverall: null,
      delta: null,
      status: 'baseline',
      message: 'First Meridian report for this profile — trend starts next run.',
      newFindingCodes: [],
      resolvedFindingCodes: [],
    };
  }

  const prev = previous.scorecard.overall;
  const curr = scorecard?.overall;
  if (typeof prev !== 'number' || typeof curr !== 'number') {
    return {
      hasPrevious: true,
      previousOverall: prev ?? null,
      delta: null,
      status: 'unknown',
      message: 'Previous report missing numeric score.',
      newFindingCodes: [],
      resolvedFindingCodes: [],
    };
  }

  const delta = curr - prev;
  let status = 'stable';
  let message = `Score unchanged at ${curr}.`;
  if (delta >= 3) {
    status = 'improved';
    message = `Score up ${delta} points (${prev} → ${curr}).`;
  } else if (delta <= -3) {
    status = 'regressed';
    message = `Score down ${Math.abs(delta)} points (${prev} → ${curr}) — review new findings.`;
  } else if (delta !== 0) {
    message = `Score moved ${delta > 0 ? '+' : ''}${delta} (${prev} → ${curr}).`;
  }

  const prevCodes = new Set((previous.findings || []).map((f) => f.code));
  const currCodes = new Set((currentFindings || []).map((f) => f.code));
  const newFindingCodes = [...currCodes].filter((c) => !prevCodes.has(c));
  const resolvedFindingCodes = [...prevCodes].filter((c) => !currCodes.has(c));

  if (newFindingCodes.length) message += ` New: ${newFindingCodes.slice(0, 6).join(', ')}.`;
  if (resolvedFindingCodes.length) message += ` Resolved: ${resolvedFindingCodes.slice(0, 6).join(', ')}.`;

  return {
    hasPrevious: true,
    previousOverall: prev,
    previousGrade: previous.scorecard.grade ?? null,
    previousRunId: previous.meta?.runId ?? null,
    previousFinishedAt: previous.meta?.finishedAt ?? null,
    delta,
    status,
    message,
    newFindingCodes,
    resolvedFindingCodes,
  };
}
