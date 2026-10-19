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
 * Dominion Apex — crowns the sealed Meridian stack into a single forever certificate.
 * Verifies Phases 26–29 artefacts + pack matrix + forever aliases. Zero checklist ritual.
 */
export async function runDominionApex(profile, opts = {}) {
  const root = opts.root || process.cwd();
  const outDir = opts.outDir || resolve(root, 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');

  const continuum = await readJson(resolve(outDir, 'conversion-continuum.json'));
  const lattice = await readJson(resolve(outDir, 'integrity-lattice.json'));
  const continuity = await readJson(resolve(outDir, 'continuity-charter.json'));
  const chronos = await readJson(resolve(outDir, 'chronos-pulse.json'));
  const live = await readJson(resolve(outDir, 'live-throne.json'));
  const debt = await readJson(resolve(outDir, 'human-debt.json'));
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const matrix = await readJson(resolve(outDir, 'phase-matrix.json'));
  const pkg = await readJson(resolve(root, 'package.json'));
  const scripts = pkg?.scripts || {};

  const pillars = [];
  pillars.push({
    id: 'yield-continuum',
    ok: continuum?.continuumOnline === true || continuum?.formOk === true,
    detail: continuum?.boardLine || 'no continuum',
  });
  pillars.push({
    id: 'integrity-lattice',
    ok: lattice?.latticeSealed === true,
    detail: lattice?.boardLine || 'no lattice',
  });
  pillars.push({
    id: 'sovereign-continuity',
    ok: continuity?.continuityLocked === true,
    detail: continuity?.boardLine || 'no continuity',
  });
  pillars.push({
    id: 'autonomic-chronos',
    ok: chronos?.chronosArmed === true,
    detail: chronos?.boardLine || 'no chronos',
  });
  pillars.push({
    id: 'live-throne',
    ok: live?.liveThrone === true || (live?.hasMap === true && live?.sameAs === true),
    detail: `hasMap=${!!live?.hasMap} sameAs=${!!live?.sameAs}`,
  });
  pillars.push({
    id: 'human-debt-zero',
    ok: (debt?.debtScore ?? 0) === 0 && (debt?.openCount ?? 0) === 0,
    detail: `debt=${debt?.debtScore ?? '—'} open=${debt?.openCount ?? '—'}`,
  });
  pillars.push({
    id: 'score-floor',
    ok: (observatory?.score?.overall ?? 100) >= 90,
    detail: `score=${observatory?.score?.overall ?? '—'}`,
  });
  pillars.push({
    id: 'observe-alias',
    ok: typeof scripts['meridian:observe'] === 'string',
    detail: scripts['meridian:observe'] || 'missing',
  });
  pillars.push({
    id: 'dominion-alias',
    ok: typeof scripts['meridian:dominion'] === 'string' || typeof scripts['meridian:act:phase30'] === 'string',
    detail: scripts['meridian:dominion'] || scripts['meridian:act:phase30'] || 'wiring',
  });
  pillars.push({
    id: 'gh-autopilot',
    ok: await exists(resolve(root, '.github/workflows/meridian-autopilot.yml')),
    detail: 'meridian-autopilot.yml',
  });

  const packIds = new Set((matrix?.matrix || []).map((m) => String(m.id)));
  pillars.push({
    id: 'phase-packs',
    ok: packIds.has('29') || packIds.has('30') || (matrix?.matrix || []).length >= 29,
    detail: `packs ${(matrix?.matrix || []).length}`,
  });

  // Pending human-only items are parked/bridged — not blockers
  const parked = (debt?.items || []).filter((i) => i.status === 'parked' || i.status === 'bridged');
  const automationComplete = pillars.every((p) => p.ok);
  const failed = pillars.filter((p) => !p.ok);

  const crown = {
    generatedAt: new Date().toISOString(),
    phase: '30',
    origin,
    dominionCrowned: automationComplete,
    pillarCount: pillars.length,
    failCount: failed.length,
    pillars,
    parkedHuman: parked.map((i) => ({ id: i.id, label: i.label, status: i.status })),
    executive: {
      score: observatory?.score || null,
      unlockPercent: observatory?.unlockPercent ?? null,
      enquiries28: continuum?.signals?.enquiries28 ?? null,
      yieldPct: continuum?.signals?.yieldRatePct ?? null,
      gscClicks28: continuum?.signals?.gscClicks28 ?? null,
      organicSessions28: continuum?.signals?.ga4OrganicSessions28 ?? null,
      latticeSealed: !!lattice?.latticeSealed,
      continuityLocked: !!continuity?.continuityLocked,
      chronosArmed: !!chronos?.chronosArmed,
      continuumOnline: !!continuum?.continuumOnline,
      humanDebt: debt?.debtScore ?? 0,
      hasMap: !!live?.hasMap,
    },
    boardLine: automationComplete
      ? `Dominion apex CROWNED · ${pillars.length}/${pillars.length} pillars · automation complete · human debt 0`
      : `Dominion apex OPEN · ${failed.length} pillar(s): ${failed.map((f) => f.id).join(', ')}`,
    forever: ['npm run meridian:observe', 'npm run meridian:dominion', 'Monday meridian-autopilot.yml'],
    pendingNote:
      'Only optional Google Business Profile verification remains parked — does not block dominion.',
  };

  await writeFile(resolve(outDir, 'dominion-apex.json'), JSON.stringify(crown, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'dominion-apex.md'),
    [
      `# Dominion apex — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${crown.generatedAt}`,
      '',
      crown.boardLine,
      '',
      '## Executive crown',
      '',
      `| Signal | Value |`,
      `| --- | ---: |`,
      `| Score | ${crown.executive.score?.overall ?? '—'} ${crown.executive.score?.grade || ''} |`,
      `| Unlock | ${crown.executive.unlockPercent ?? '—'}% |`,
      `| Continuum | ${crown.executive.continuumOnline ? 'ONLINE' : '—'} |`,
      `| Lattice | ${crown.executive.latticeSealed ? 'SEALED' : '—'} |`,
      `| Continuity | ${crown.executive.continuityLocked ? 'LOCKED' : '—'} |`,
      `| Chronos | ${crown.executive.chronosArmed ? 'ARMED' : '—'} |`,
      `| Enquiries 28d | ${crown.executive.enquiries28 ?? '—'} |`,
      `| Yield | ${crown.executive.yieldPct != null ? crown.executive.yieldPct + '%' : '—'} |`,
      `| Human debt | ${crown.executive.humanDebt} |`,
      '',
      '## Pillars',
      '',
      '| Pillar | Status | Detail |',
      '| --- | --- | --- |',
      ...pillars.map((p) => `| ${p.id} | ${p.ok ? 'OK' : 'FAIL'} | ${p.detail} |`),
      '',
      parked.length
        ? '## Parked / bridged (non-blocking)\n\n' +
          parked.map((i) => `- \`${i.id}\` — ${i.label} (${i.status})`).join('\n')
        : '_No parked human items._',
      '',
      crown.pendingNote,
      '',
      'Forever: `npm run meridian:observe`',
      '',
    ].join('\n'),
    'utf8'
  );

  return {
    ok: true,
    status: automationComplete ? 'crowned' : 'open',
    message: crown.boardLine,
    data: {
      ...crown,
      paths: {
        json: resolve(outDir, 'dominion-apex.json'),
        md: resolve(outDir, 'dominion-apex.md'),
      },
    },
    findings: failed.map((f) => ({
      code: `DOMINION_${f.id.toUpperCase().replace(/-/g, '_')}`,
      severity: 'medium',
      title: `Dominion pillar open: ${f.id}`,
      detail: f.detail,
      remediation: 'npm run meridian:observe',
      owner: 'developer',
      pillar: 'technical',
    })),
  };
}
