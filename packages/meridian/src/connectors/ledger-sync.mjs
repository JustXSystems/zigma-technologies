import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const START = '<!-- MERIDIAN:LEDGER:START -->';
const END = '<!-- MERIDIAN:LEDGER:END -->';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Compact automation ledger for Appendix F — authoritative vs hand-ticked boxes.
 */
export function buildLedgerMarkdown({ score, unlock, archive, presence, debt, throne, live, growth, courier, forge }) {
  const sealed = archive?.sealed === true;
  const presenceSealed = presence?.sealed === true || debt?.presenceSealed === true;
  const debtScore = debt?.debtScore ?? '—';
  const gbp =
    presenceSealed || debt?.items?.find((i) => i.id === 'gbp-verify')?.status === 'done'
      ? '**SEALED**'
      : debt?.items?.find((i) => i.id === 'gbp-verify')?.status === 'parked'
        ? '**PARKED** (Google gate — optional)'
        : 'Open (verify → `npm run meridian:ack-gbp`)';
  const liveThrone =
    live?.liveThrone === true || live?.hasMap === true
      ? '**SEALED**'
      : live?.hasMap === false
        ? '**PENDING** (hasMap)'
        : '—';
  const courierLine = courier?.liveThrone || courier?.hasMapLive
    ? '**SEALED**'
    : courier
      ? `**${String(courier.hotpatch?.status || 'ACTIVE').toUpperCase()}**`
      : '—';
  const forgeLine =
    Number(growth?.opportunityCount || 0) === 0
      ? '**CLEAR**'
      : Number(forge?.closedCount || 0) > 0
        ? `**BRIDGED** (${forge.closedCount}/${growth?.opportunityCount ?? '?'})`
        : forge
          ? `**${String(forge.closerStatus || 'ACTIVE').toUpperCase()}**`
          : '—';

  return `${START}
### Automation ledger (Meridian — authoritative)

_Re-checked ${todayLabel()} (auto). Do **not** hand-edit between \`MERIDIAN:LEDGER\` markers. Historical Phase 0–9 boxes below are archival._

| Area | Status |
| --- | --- |
| Technical Phase 1 + PreProd | **DONE** (live) |
| Structured data / sameAs / Rich Results | **DONE** (Meridian Phases 2–3) |
| Meta / alt / calendar / speed packs | **DONE** (Phases 3–4, 7) |
| Local NAP + citation launchpad | **DONE** (desk Phase 20) |
| Authority outreach packs | **DONE** (Phase 8 packs) |
| Mission archive / observatory / canon | **DONE** (Phases 17–19) |
| Autonomic desk | **ONLINE** (Phase 20) |
| Presence sentinel | **${presenceSealed ? 'SEALED' : String(presence?.strength || 'WATCHING').toUpperCase()}** (Phase 21) |
| Quiet throne / mission | **${throne?.missionComplete ? 'COMPLETE' : 'ACTIVE'}** (Phase 22) |
| Eternal horizon / live throne | ${liveThrone} (Phase 23) |
| Deploy courier (SSH hasMap) | ${courierLine} (Phase 24) |
| Growth closer / signal forge | ${forgeLine} (Phase 25) |
| Growth radar opportunities | **${growth?.opportunityCount ?? '—'}** |
| Meridian score / unlock | **${score?.overall ?? '—'} ${score?.grade || ''}** / **${unlock?.percent ?? '—'}%** |
| Archive | **${sealed ? 'SEALED' : 'open'}** |
| Human debt | **${debtScore}** |
| Google Business Profile | ${gbp} |

Forever: \`npm run meridian:observe\` · Forge: \`phase25-ops.html\` · Courier: \`npm run meridian:prod:hasmap\`
${END}`;
}

/**
 * Patch SEO-GUIDE.md Appendix F with living automation ledger.
 */
export async function syncAppendixLedger(profile, opts = {}) {
  const root = opts.root || process.cwd();
  const outDir = opts.outDir || resolve(root, 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });

  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const unlock = await readJson(resolve(outDir, 'unlock-readiness.json'));
  const presence = await readJson(resolve(outDir, 'presence-sentinel.json'));
  const debt = await readJson(resolve(outDir, 'human-debt.json'));
  const throne = await readJson(resolve(outDir, 'quiet-throne.json'));
  const live = await readJson(resolve(outDir, 'live-throne.json'));
  const growth = await readJson(resolve(outDir, 'growth-radar.json'));
  const courier = await readJson(resolve(outDir, 'deploy-courier.json'));
  const forge = (await readJson(resolve(outDir, 'signal-forge.json'))) || (await readJson(resolve(outDir, 'growth-closer.json')));
  const score = observatory?.score || archive?.score || report?.scorecard || {};

  const block = buildLedgerMarkdown({
    score,
    unlock: { percent: observatory?.unlockPercent ?? unlock?.percent },
    archive,
    presence,
    debt,
    throne,
    live,
    growth,
    courier,
    forge,
  });

  const guidePath = resolve(root, opts.guidePath || 'SEO-GUIDE.md');
  let text = await readFile(guidePath, 'utf8');
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  text = text.replace(/\r\n/g, '\n');
  let mode = 'failed';

  const first = text.indexOf(START);
  const last = text.lastIndexOf(END);
  if (first >= 0 && last > first) {
    text = text.slice(0, first) + block + text.slice(last + END.length);
    mode = 'replaced-markers';
  } else {
    const needle = '## Appendix F — Master checklist';
    const idx = text.indexOf(needle);
    if (idx >= 0) {
      const afterHeading = text.indexOf('\n', idx);
      const insertAt = afterHeading >= 0 ? afterHeading + 1 : idx + needle.length;
      text = text.slice(0, insertAt) + `\n${block}\n` + text.slice(insertAt);
      mode = 'installed-appendix';
    }
  }

  if (nl === '\r\n') text = text.replace(/\n/g, '\r\n');

  if (mode !== 'failed') {
    await writeFile(guidePath, text, 'utf8');
  }

  const artefact = {
    generatedAt: new Date().toISOString(),
    mode,
    guidePath,
    missionComplete: throne?.missionComplete === true,
    debtScore: debt?.debtScore ?? null,
  };
  await writeFile(resolve(outDir, 'ledger-sync.json'), JSON.stringify(artefact, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'automation-ledger.md'),
    block.replace(START + '\n', '').replace('\n' + END, '') + '\n',
    'utf8'
  );

  return {
    ok: mode !== 'failed',
    status: mode === 'failed' ? 'error' : 'ok',
    message:
      mode === 'failed'
        ? 'Ledger sync failed — Appendix F heading not found'
        : `Appendix F ledger synced (${mode}) · debt ${artefact.debtScore ?? '—'}`,
    data: {
      ...artefact,
      paths: {
        guide: guidePath,
        json: resolve(outDir, 'ledger-sync.json'),
        md: resolve(outDir, 'automation-ledger.md'),
      },
    },
  };
}
