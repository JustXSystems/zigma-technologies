import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function pctDelta(curr, prev) {
  if (curr == null || prev == null || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function absDelta(curr, prev) {
  if (curr == null || prev == null) return null;
  return curr - prev;
}

/**
 * Autonomic Chronos — time-series yield/SEO telemetry + regression detection.
 * Snapshots each observe cycle; compares to prior point; zero spreadsheet ritual.
 */
export async function runAutonomicChronos(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const maxPoints = opts.maxPoints ?? 48;

  const continuum = await readJson(resolve(outDir, 'conversion-continuum.json'));
  const lattice = await readJson(resolve(outDir, 'integrity-lattice.json'));
  const continuity = await readJson(resolve(outDir, 'continuity-charter.json'));
  const live = await readJson(resolve(outDir, 'live-throne.json'));
  const debt = await readJson(resolve(outDir, 'human-debt.json'));
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const cache = await readJson(resolve(outDir, 'signal-cache.json'));

  const point = {
    at: new Date().toISOString(),
    score: observatory?.score?.overall ?? null,
    unlock: observatory?.unlockPercent ?? null,
    gscClicks28: continuum?.signals?.gscClicks28 ?? cache?.gsc?.totals?.clicks ?? null,
    organicSessions28: continuum?.signals?.ga4OrganicSessions28 ?? null,
    organicKeyEvents28: continuum?.signals?.ga4OrganicKeyEvents28 ?? null,
    enquiries28: continuum?.signals?.enquiries28 ?? null,
    enquiries7: continuum?.signals?.enquiries7 ?? null,
    yieldPct: continuum?.signals?.yieldRatePct ?? null,
    formOk: continuum?.formOk !== false,
    continuumOnline: continuum?.continuumOnline === true,
    latticeSealed: lattice?.latticeSealed === true,
    continuityLocked: continuity?.continuityLocked === true,
    hasMap: live?.hasMap === true,
    humanDebt: debt?.debtScore ?? 0,
  };

  const seriesPath = resolve(outDir, 'chronos-series.json');
  const prevDoc = (await readJson(seriesPath)) || { points: [] };
  const points = Array.isArray(prevDoc.points) ? [...prevDoc.points] : [];
  const prior = points.length ? points[points.length - 1] : null;

  // Avoid duplicate points within ~90s (re-seal within same observe)
  const lastAt = prior?.at ? Date.parse(prior.at) : 0;
  const nowMs = Date.parse(point.at);
  if (!prior || nowMs - lastAt > 90000) {
    points.push(point);
  } else {
    points[points.length - 1] = point;
  }
  while (points.length > maxPoints) points.shift();

  const baseline = points.length >= 2 ? points[points.length - 2] : null;
  const deltas = baseline
    ? {
        gscClicks28: absDelta(point.gscClicks28, baseline.gscClicks28),
        gscClicks28Pct: pctDelta(point.gscClicks28, baseline.gscClicks28),
        organicSessions28: absDelta(point.organicSessions28, baseline.organicSessions28),
        organicSessions28Pct: pctDelta(point.organicSessions28, baseline.organicSessions28),
        enquiries28: absDelta(point.enquiries28, baseline.enquiries28),
        enquiries28Pct: pctDelta(point.enquiries28, baseline.enquiries28),
        enquiries7: absDelta(point.enquiries7, baseline.enquiries7),
        yieldPct: absDelta(point.yieldPct, baseline.yieldPct),
        score: absDelta(point.score, baseline.score),
      }
    : null;

  const alerts = [];
  if (baseline) {
    if (point.formOk === false && baseline.formOk === true) {
      alerts.push({ id: 'form-regression', severity: 'critical', detail: 'Form health flipped OK → ALERT' });
    }
    if (point.latticeSealed === false && baseline.latticeSealed === true) {
      alerts.push({ id: 'lattice-regression', severity: 'critical', detail: 'Integrity lattice lost seal' });
    }
    if (point.continuityLocked === false && baseline.continuityLocked === true) {
      alerts.push({ id: 'continuity-regression', severity: 'high', detail: 'Sovereign continuity unlocked' });
    }
    if (deltas?.enquiries28Pct != null && deltas.enquiries28Pct <= -40) {
      alerts.push({
        id: 'enquiry-drop',
        severity: 'high',
        detail: `Enquiries 28d down ${deltas.enquiries28Pct}% (${baseline.enquiries28} → ${point.enquiries28})`,
      });
    }
    if (deltas?.gscClicks28Pct != null && deltas.gscClicks28Pct <= -50) {
      alerts.push({
        id: 'gsc-drop',
        severity: 'medium',
        detail: `GSC clicks 28d down ${deltas.gscClicks28Pct}% (${baseline.gscClicks28} → ${point.gscClicks28})`,
      });
    }
    if (point.hasMap === false && baseline.hasMap === true) {
      alerts.push({ id: 'hasmap-regression', severity: 'critical', detail: 'Live hasMap disappeared' });
    }
  }

  const critical = alerts.filter((a) => a.severity === 'critical' || a.severity === 'high');
  const chronosArmed =
    point.continuityLocked === true &&
    point.latticeSealed === true &&
    point.continuumOnline === true &&
    critical.length === 0;

  const board = {
    generatedAt: point.at,
    phase: '29',
    origin,
    chronosArmed,
    pointCount: points.length,
    baselineAt: baseline?.at ?? null,
    point,
    deltas,
    alerts,
    alertCount: alerts.length,
    boardLine: chronosArmed
      ? `Autonomic chronos ARMED · ${points.length} point(s) · ${alerts.length ? alerts.length + ' soft alert(s)' : 'no regressions'} · yield ${point.yieldPct ?? '—'}%`
      : alerts.length
        ? `Autonomic chronos ALERT · ${critical.length} regression(s): ${critical.map((a) => a.id).join(', ')}`
        : `Autonomic chronos WATCHING · continuity/lattice/yield not all green`,
    forever: ['npm run meridian:observe', 'npm run meridian:chronos', 'Monday meridian-autopilot.yml'],
  };

  await writeFile(seriesPath, JSON.stringify({ generatedAt: point.at, origin, points }, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'chronos-pulse.json'), JSON.stringify(board, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'autonomic-chronos.md'),
    [
      `# Autonomic chronos — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${board.generatedAt}`,
      '',
      board.boardLine,
      '',
      '## Current pulse',
      '',
      '| Signal | 28d | Δ vs prior |',
      '| --- | ---: | ---: |',
      `| GSC clicks | ${point.gscClicks28 ?? '—'} | ${fmtDelta(deltas?.gscClicks28, deltas?.gscClicks28Pct)} |`,
      `| Organic sessions | ${point.organicSessions28 ?? '—'} | ${fmtDelta(deltas?.organicSessions28, deltas?.organicSessions28Pct)} |`,
      `| Enquiries | ${point.enquiries28 ?? '—'} | ${fmtDelta(deltas?.enquiries28, deltas?.enquiries28Pct)} |`,
      `| Enquiries 7d | ${point.enquiries7 ?? '—'} | ${fmtDelta(deltas?.enquiries7)} |`,
      `| Yield % | ${point.yieldPct ?? '—'} | ${fmtDelta(deltas?.yieldPct)} |`,
      `| Score | ${point.score ?? '—'} | ${fmtDelta(deltas?.score)} |`,
      '',
      '## Stack',
      '',
      `- Lattice: ${point.latticeSealed ? 'SEALED' : 'DRIFT'}`,
      `- Continuity: ${point.continuityLocked ? 'LOCKED' : 'OPEN'}`,
      `- Continuum: ${point.continuumOnline ? 'ONLINE' : 'WATCHING'} · form ${point.formOk ? 'OK' : 'ALERT'}`,
      `- hasMap: ${point.hasMap ? 'YES' : 'NO'} · human debt: ${point.humanDebt}`,
      '',
      alerts.length
        ? '## Alerts\n\n' + alerts.map((a) => `- **${a.severity}** \`${a.id}\` — ${a.detail}`).join('\n')
        : '_No regressions detected._',
      '',
      `Series depth: **${points.length}** point(s) (cap ${maxPoints}).`,
      '',
      'Forever: `npm run meridian:observe`',
      '',
    ].join('\n'),
    'utf8'
  );

  return {
    ok: true,
    status: chronosArmed ? 'armed' : critical.length ? 'alert' : 'watching',
    message: board.boardLine,
    data: {
      ...board,
      paths: {
        json: resolve(outDir, 'chronos-pulse.json'),
        series: seriesPath,
        md: resolve(outDir, 'autonomic-chronos.md'),
      },
    },
    findings: alerts.map((a) => ({
      code: `CHRONOS_${a.id.toUpperCase().replace(/-/g, '_')}`,
      severity: a.severity,
      title: `Chronos: ${a.id}`,
      detail: a.detail,
      remediation: 'npm run meridian:observe (auto-heal stack) or inspect chronos-pulse.json',
      owner: 'developer',
      pillar: 'technical',
    })),
  };
}

function fmtDelta(abs, pct) {
  if (abs == null && pct == null) return '—';
  const a = abs == null ? '' : (abs > 0 ? `+${abs}` : `${abs}`);
  const p = pct == null ? '' : ` (${pct > 0 ? '+' : ''}${pct}%)`;
  return `${a}${p}` || '—';
}
