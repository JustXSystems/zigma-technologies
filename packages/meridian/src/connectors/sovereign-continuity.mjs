import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sovereign Continuity — board charter proving the sealed stack stays forever-operable.
 * Verifies artefacts, GH Action, CLI forever aliases, lattice + yield — zero spreadsheet ritual.
 */
export async function runSovereignContinuity(profile, opts = {}) {
  const root = opts.root || process.cwd();
  const outDir = opts.outDir || resolve(root, 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');

  const lattice = await readJson(resolve(outDir, 'integrity-lattice.json'));
  const perpetual = await readJson(resolve(outDir, 'perpetual-seal.json'));
  const continuum = await readJson(resolve(outDir, 'conversion-continuum.json'));
  const live = await readJson(resolve(outDir, 'live-throne.json'));
  const debt = await readJson(resolve(outDir, 'human-debt.json'));
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const matrix = await readJson(resolve(outDir, 'phase-matrix.json'));
  const pkg = await readJson(resolve(root, 'package.json'));

  const gates = [];
  const scripts = pkg?.scripts || {};

  gates.push({
    id: 'lattice-sealed',
    ok: lattice?.latticeSealed === true || perpetual?.latticeSealed === true,
    detail: lattice?.boardLine || perpetual?.boardLine || 'no lattice artefact',
  });
  gates.push({
    id: 'continuum-online',
    ok: continuum?.continuumOnline === true || continuum?.formOk === true,
    detail: continuum?.boardLine || 'no continuum artefact',
  });
  gates.push({
    id: 'live-throne',
    ok: live?.liveThrone === true || (live?.hasMap === true && live?.sameAs === true),
    detail: `hasMap=${!!live?.hasMap} sameAs=${!!live?.sameAs}`,
  });
  gates.push({
    id: 'human-debt-zero',
    ok: (debt?.debtScore ?? 0) === 0 && (debt?.openCount ?? 0) === 0,
    detail: `debt=${debt?.debtScore ?? '—'} open=${debt?.openCount ?? '—'}`,
  });
  gates.push({
    id: 'observe-alias',
    ok: typeof scripts['meridian:observe'] === 'string' && /observe|phase2[789]|phase30|lattice|continuity|chronos|dominion/.test(scripts['meridian:observe']),
    detail: scripts['meridian:observe'] || 'missing',
  });
  gates.push({
    id: 'continuity-alias',
    ok: typeof scripts['meridian:continuity'] === 'string' || typeof scripts['meridian:act:phase28'] === 'string',
    detail: scripts['meridian:continuity'] || scripts['meridian:act:phase28'] || 'wiring',
  });
  gates.push({
    id: 'gh-autopilot',
    ok: await exists(resolve(root, '.github/workflows/meridian-autopilot.yml')),
    detail: 'meridian-autopilot.yml',
  });
  gates.push({
    id: 'phase27-ops',
    ok: await exists(resolve(outDir, 'phase27-ops.html')),
    detail: 'phase27-ops.html',
  });

  const packIds = new Set((matrix?.matrix || []).map((m) => String(m.id)));
  const packCount = packIds.size;
  gates.push({
    id: 'phase-packs',
    ok: packCount >= 27 || packIds.has('27') || packIds.has('28'),
    detail: `packs registered ${packCount}`,
  });

  const score = observatory?.score?.overall ?? null;
  gates.push({
    id: 'score-floor',
    ok: score == null || score >= 90,
    detail: `score=${score ?? '—'}`,
  });

  const failed = gates.filter((g) => !g.ok);
  const continuityLocked = failed.length === 0;
  const charter = {
    generatedAt: new Date().toISOString(),
    phase: '28',
    origin,
    continuityLocked,
    gateCount: gates.length,
    failCount: failed.length,
    gates,
    executive: {
      score: observatory?.score || null,
      unlockPercent: observatory?.unlockPercent ?? null,
      latticeSealed: !!lattice?.latticeSealed,
      continuumOnline: !!continuum?.continuumOnline,
      enquiries28: continuum?.signals?.enquiries28 ?? null,
      yieldPct: continuum?.signals?.yieldRatePct ?? null,
      gscClicks28: continuum?.signals?.gscClicks28 ?? null,
      organicSessions28: continuum?.signals?.ga4OrganicSessions28 ?? null,
      humanDebt: debt?.debtScore ?? 0,
      hasMap: !!live?.hasMap,
      sameAs: !!live?.sameAs,
    },
    boardLine: continuityLocked
      ? `Sovereign continuity LOCKED · ${gates.length}/${gates.length} gates · lattice SEALED · yield ONLINE`
      : `Sovereign continuity OPEN · ${failed.length} gate(s): ${failed.map((f) => f.id).join(', ')}`,
    forever: ['npm run meridian:observe', 'npm run meridian:continuity', 'Monday meridian-autopilot.yml'],
  };

  await writeFile(resolve(outDir, 'continuity-charter.json'), JSON.stringify(charter, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'sovereign-continuity.md'),
    [
      `# Sovereign continuity — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${charter.generatedAt}`,
      '',
      charter.boardLine,
      '',
      '## Executive brief',
      '',
      `| Signal | Value |`,
      `| --- | ---: |`,
      `| Score | ${charter.executive.score?.overall ?? '—'} ${charter.executive.score?.grade || ''} |`,
      `| Unlock | ${charter.executive.unlockPercent ?? '—'}% |`,
      `| Lattice | ${charter.executive.latticeSealed ? 'SEALED' : 'DRIFT'} |`,
      `| Continuum | ${charter.executive.continuumOnline ? 'ONLINE' : 'WATCHING'} |`,
      `| Enquiries 28d | ${charter.executive.enquiries28 ?? '—'} |`,
      `| Yield | ${charter.executive.yieldPct != null ? charter.executive.yieldPct + '%' : '—'} |`,
      `| GSC clicks | ${charter.executive.gscClicks28 ?? '—'} |`,
      `| Organic sessions | ${charter.executive.organicSessions28 ?? '—'} |`,
      `| Human debt | ${charter.executive.humanDebt} |`,
      `| hasMap / sameAs | ${charter.executive.hasMap ? 'YES' : 'NO'} / ${charter.executive.sameAs ? 'YES' : 'NO'} |`,
      '',
      '## Continuity gates',
      '',
      '| Gate | Status | Detail |',
      '| --- | --- | --- |',
      ...gates.map((g) => `| ${g.id} | ${g.ok ? 'OK' : 'FAIL'} | ${g.detail} |`),
      '',
      'Forever: `npm run meridian:observe`',
      '',
    ].join('\n'),
    'utf8'
  );

  return {
    ok: true,
    status: continuityLocked ? 'locked' : 'open',
    message: charter.boardLine,
    data: {
      ...charter,
      paths: {
        json: resolve(outDir, 'continuity-charter.json'),
        md: resolve(outDir, 'sovereign-continuity.md'),
      },
    },
    findings: failed.map((f) => ({
      code: `CONTINUITY_${f.id.toUpperCase().replace(/-/g, '_')}`,
      severity: 'medium',
      title: `Continuity gate open: ${f.id}`,
      detail: f.detail,
      remediation: 'npm run meridian:observe',
      owner: 'developer',
      pillar: 'technical',
    })),
  };
}
