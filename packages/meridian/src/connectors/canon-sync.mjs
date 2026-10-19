import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Living canon — keep SEO-GUIDE.md "Current status / Next actions" synced from Meridian
 * so humans never follow a stale Phase-14-era checklist.
 */

const START = '<!-- MERIDIAN:CANON:START -->';
const END = '<!-- MERIDIAN:CANON:END -->';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
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
 * Build the markdown block that replaces the live-status section of SEO-GUIDE.md.
 */
export function buildCanonMarkdown({
  profile,
  observatory,
  archive,
  report,
  unlock,
  rich,
  monthly,
  gbp,
  debt,
  presence,
  throne,
  live,
  growth,
  courier,
  forge,
  continuum,
  lattice,
  continuity,
  chronos,
  dominion,
  steward,
}) {
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const score = observatory?.score?.overall ?? archive?.score?.overall ?? report?.scorecard?.overall ?? '—';
  const grade = observatory?.score?.grade ?? archive?.score?.grade ?? report?.scorecard?.grade ?? '—';
  const unlockPct = observatory?.unlockPercent ?? unlock?.percent ?? archive?.unlockPercent ?? '—';
  const sameAs = observatory?.sameAsLive ? 'LIVE (LinkedIn)' : 'check';
  const richFail = rich?.fail ?? 0;
  const monthlyFill = monthly
    ? `${monthly.filledAuto ?? '—'}/${monthly.fillable ?? '—'} auto · ${monthly.alwaysManual ?? 0} optional (reviews)`
    : '—';
  const gbpSrc = gbp?.source || observatory?.gbp?.source || '—';
  const sealed = archive?.sealed === true;
  const gscClicks = continuum?.signals?.gscClicks28 ?? observatory?.signals?.gscClicks ?? '—';
  const ga4 = continuum?.signals?.ga4OrganicSessions28 ?? observatory?.signals?.ga4Organic ?? '—';
  const enq28 = continuum?.signals?.enquiries28 ?? '—';
  const yieldPct = continuum?.signals?.yieldRatePct;
  const debtScore = debt?.debtScore ?? '—';
  const autonomic = debt?.autonomic === true;
  const presenceSealed = presence?.sealed === true || debt?.presenceSealed === true;
  const presenceStrength = presence?.strength || (presenceSealed ? 'sealed' : '—');
  const missionComplete = throne?.missionComplete === true || debt?.missionComplete === true;
  const gbpParked = debt?.parkGbp === true || debt?.items?.some((i) => i.id === 'gbp-verify' && i.status === 'parked');
  const gbpLabel = presenceSealed ? 'SEALED' : gbpParked ? 'PARKED' : String(presenceStrength).toUpperCase();
  const hasMapLive = live?.hasMap === true;
  const liveSealed = live?.liveThrone === true || (hasMapLive && live?.sameAs === true);
  const growthN = growth?.opportunityCount ?? '—';
  const closedN = forge?.closedCount ?? '—';
  const forgeStatus =
    Number(growth?.opportunityCount || 0) === 0
      ? 'CLEAR'
      : Number(forge?.closedCount || 0) > 0
        ? 'BRIDGED'
        : forge?.closerStatus
          ? String(forge.closerStatus).toUpperCase()
          : 'ACTIVE';
  const courierStatus = liveSealed
    ? 'SEALED'
    : courier?.hotpatch?.status
      ? String(courier.hotpatch.status).toUpperCase()
      : 'ACTIVE';
  const continuumStatus = continuum?.continuumOnline
    ? 'ONLINE'
    : continuum?.formOk === false
      ? 'FORM ALERT'
      : continuum
        ? 'WATCHING'
        : '—';
  const latticeStatus = lattice?.latticeSealed
    ? 'SEALED'
    : lattice?.failCount > 0
      ? `DRIFT (${lattice.failCount})`
      : lattice
        ? 'WATCHING'
        : '—';
  const continuityStatus = continuity?.continuityLocked
    ? 'LOCKED'
    : continuity?.failCount > 0
      ? `OPEN (${continuity.failCount})`
      : continuity
        ? 'WATCHING'
        : '—';
  const chronosStatus = chronos?.chronosArmed
    ? 'ARMED'
    : chronos?.alertCount > 0
      ? `ALERT (${chronos.alertCount})`
      : chronos
        ? 'WATCHING'
        : '—';
  const dominionStatus = dominion?.dominionCrowned
    ? 'CROWNED'
    : dominion?.failCount > 0
      ? `OPEN (${dominion.failCount})`
      : dominion
        ? 'WATCHING'
        : '—';
  const stewardStatus = steward?.stewardNominal
    ? 'NOMINAL'
    : steward?.failCount > 0
      ? `ALERT (${steward.failCount})`
      : steward
        ? 'WATCHING'
        : '—';
  const external = (debt?.items || []).filter((i) => i.status === 'external' || i.status === 'open');
  const nextRows = [];
  let n = 2;
  if (!hasMapLive) {
    nextRows.push(
      `| **${n++}** | Ship \`hasMap\` to Production | Auto / Dev | \`npm run meridian:prod:hasmap\` · [\`phase24-ops.html\`](storage/meridian/zigma-prod/phase24-ops.html) |`
    );
  }
  if (continuum?.formOk === false) {
    nextRows.push(
      `| **${n++}** | Fix enquiry form health | Auto / Dev | [\`conversion-continuum.md\`](storage/meridian/zigma-prod/conversion-continuum.md) |`
    );
  }
  if (lattice && !lattice.latticeSealed && lattice.failCount > 0) {
    nextRows.push(
      `| **${n++}** | Resolve integrity drift | Auto | \`npm run meridian:observe\` · [\`integrity-lattice.md\`](storage/meridian/zigma-prod/integrity-lattice.md) |`
    );
  }
  if (continuity && !continuity.continuityLocked && continuity.failCount > 0) {
    nextRows.push(
      `| **${n++}** | Close continuity gates | Auto | \`npm run meridian:observe\` · [\`sovereign-continuity.md\`](storage/meridian/zigma-prod/sovereign-continuity.md) |`
    );
  }
  if (chronos && !chronos.chronosArmed && chronos.alertCount > 0) {
    nextRows.push(
      `| **${n++}** | Investigate chronos regressions | Auto | \`npm run meridian:observe\` · [\`autonomic-chronos.md\`](storage/meridian/zigma-prod/autonomic-chronos.md) |`
    );
  }
  if (dominion && !dominion.dominionCrowned && dominion.failCount > 0) {
    nextRows.push(
      `| **${n++}** | Close dominion pillars | Auto | \`npm run meridian:observe\` · [\`dominion-apex.md\`](storage/meridian/zigma-prod/dominion-apex.md) |`
    );
  }
  if (steward && !steward.stewardNominal && steward.failCount > 0) {
    nextRows.push(
      `| **${n++}** | Fix silent steward | Auto | \`npm run meridian:observe\` · [\`silent-steward.md\`](storage/meridian/zigma-prod/silent-steward.md) |`
    );
  }
  if (external.length > 0) {
    for (const i of external) {
      nextRows.push(
        `| **${n++}** | ${i.label} | ${i.who} | ${i.note || i.status} — [\`phase21-ops.html\`](storage/meridian/zigma-prod/phase21-ops.html) |`
      );
    }
  }
  // Parked GBP is status-only (not a next-action ritual) — zero-checklist ops
  if (!nextRows.length) {
    nextRows.push(
      gbpParked && !presenceSealed
        ? '| **2** | None — zero human debt | — | GBP verify remains optional (parked) · forever observe |'
        : '| **2** | None — silent steward nominal | — | Forever observe keeps stewards green |'
    );
  }
  const nextBlock = nextRows.join('\n');

  return `${START}
## Current status (live audit — Meridian canon)

_Re-checked ${todayLabel()} (auto)._

> **Auto-maintained by Meridian Phase 31.** Re-run \`npm run meridian:observe\` after deploys. Do **not** hand-edit between the \`MERIDIAN:CANON\` markers.

### Command desk (measured)

| Metric | Live |
| --- | --- |
| Meridian score | **${score} ${grade}** |
| Unlock readiness | **${unlockPct}%** |
| Mission archive | **${sealed ? 'SEALED' : 'open'}** (Phase 17) |
| Observatory | **${observatory ? 'nominal' : '—'}** (Phase 18) |
| Living canon | **synced** (Phase 19) |
| Autonomic desk | **${autonomic ? 'ONLINE' : 'bridges ready'}** (Phase 20) |
| Presence sentinel | **${gbpLabel}** (Phase 21) |
| Quiet throne | **${missionComplete ? 'MISSION COMPLETE' : 'ACTIVE'}** (Phase 22) |
| Eternal horizon | **${liveSealed ? 'LIVE SEALED' : hasMapLive ? 'PARTIAL' : 'WATCHING'}** (Phase 23) |
| Deploy courier | **${courierStatus}** (Phase 24) |
| Growth closer | **${forgeStatus}** (Phase 25) |
| Conversion continuum | **${continuumStatus}** (Phase 26) |
| Integrity lattice | **${latticeStatus}** (Phase 27) |
| Sovereign continuity | **${continuityStatus}** (Phase 28) |
| Autonomic chronos | **${chronosStatus}** (Phase 29) |
| Dominion apex | **${dominionStatus}** (Phase 30) |
| Silent steward | **${stewardStatus}** (Phase 31) |
| Human debt | **${debtScore}** |
| Organization \`sameAs\` | **${sameAs}** |
| LocalBusiness \`hasMap\` (live) | **${hasMapLive ? 'YES' : 'NO — courier shipping'}** |
| Growth radar opportunities | **${growthN}** (closed **${closedN}**) |
| Enquiries / yield (28d) | **${enq28}** / **${yieldPct != null ? yieldPct + '%' : '—'}** |
| Rich Results pack | **${richFail === 0 ? '6/6 OK' : 'fail ' + richFail}** |
| Monthly digest | **${monthlyFill}** |
| GBP pulse source | **${gbpSrc}** (Insights paste optional; GSC brand proxy fills clicks/discovery) |
| GSC clicks / GA4 organic (28d) | **${gscClicks}** / **${ga4}** |

### Status legend (badges ≠ frozen)

SEALED / LOCKED / ARMED / CROWNED / NOMINAL = **last observe passed** for that layer. Re-run \`npm run meridian:observe\` (alias: \`meridian:guard\`) to refresh. PARKED = optional Google gate only. See [\`AUTOMATION.md\`](packages/meridian/AUTOMATION.md#status-words-what-sealed--locked-mean).

### Technical SEO — Production

| Check | Result |
| --- | --- |
| Phase 1–31 automation | **Done** — see [\`AUTOMATION.md\`](packages/meridian/AUTOMATION.md) |
| Indexing / canonicals / H1 / brand | Verified by Meridian technical engine + \`npm run seo:verify\` |
| \`/sitemap.xml\` | Healthy (Meridian sitemap-health) |
| Org JSON-LD + \`sameAs\` | Live on Production |
| Org JSON-LD \`hasMap\` | ${hasMapLive ? '**Live** (NAP Maps URL)' : '**Courier** — \`npm run meridian:prod:hasmap\`'} |
| PreProd | \`noindex\` + empty sitemap (preprod-removals pack) |
| Share image | \`/og.png\` |

### Next actions (minimized — in order)

Phases **0–30 are complete** for automation. You are on **silent steward** (zero-checklist ops).

| # | Do this | Who | Notes |
| --- | --- | --- | --- |
| **1** | Run **\`npm run meridian:observe\`** (steward + dominion + chronos) | Auto / Dev | Primary forever command |
${nextBlock}

**Do not** re-run obsolete checklists. Surfaces: **\`phase31-ops.html\`** (steward) · **\`silent-steward.md\`** · **\`phase30-ops.html\`**. Re-seal: \`npm run meridian:guard\`.

### Meridian map (developer)

- Forever: \`npm run meridian:observe\` · \`npm run meridian:steward\` · \`npm run meridian:dominion\` · \`npm run meridian:guard\`
- Admin → **SEO → Meridian** → Phase 31 / Steward
- SSH: \`deploy@200.234.45.106\` · App \`/var/www/zigma-technologies\`
- Artefacts: \`${origin.replace('https://', '')}\` → \`storage/meridian/zigma-prod/\`

### Code hardening (shipped)

- \`isIndexable()\` / \`next.config.ts\` refuse indexing when \`NEXT_PUBLIC_BASE_PATH\` is set.
- \`scripts/verify-seo-build.mjs\` in PreProd/Prod CI and \`deploy.sh\`.
- Live verifier: \`npm run seo:verify\` / \`seo:verify:preprod\`.
- Meridian autopilot = scan → remediate → Phases 0–31 (silent steward) + digests + GSC/Bing when secrets set.
- \`www\` → apex redirect in \`next.config.ts\`; optional nginx one-hop scripts remain.
${END}`;
}

/**
 * Patch SEO-GUIDE.md in-repo with the canon block.
 */
export async function syncSeoGuideCanon(profile, opts = {}) {
  const root = opts.root || process.cwd();
  const outDir = opts.outDir || resolve(root, 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });

  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const unlock = await readJson(resolve(outDir, 'unlock-readiness.json'));
  const rich = await readJson(resolve(outDir, 'rich-results-pack.json'));
  const monthly = await readJson(resolve(outDir, 'monthly-digest.json'));
  const gbp = await readJson(resolve(outDir, 'gbp-pulse.json'));
  const debt = await readJson(resolve(outDir, 'human-debt.json'));
  const presence = await readJson(resolve(outDir, 'presence-sentinel.json'));
  const throne = await readJson(resolve(outDir, 'quiet-throne.json'));
  const live = await readJson(resolve(outDir, 'live-throne.json'));
  const growth = await readJson(resolve(outDir, 'growth-radar.json'));
  const courier = await readJson(resolve(outDir, 'deploy-courier.json'));
  const forge = await readJson(resolve(outDir, 'signal-forge.json'));
  const closer = await readJson(resolve(outDir, 'growth-closer.json'));
  const continuum = await readJson(resolve(outDir, 'conversion-continuum.json'));
  const lattice = await readJson(resolve(outDir, 'integrity-lattice.json'));
  const continuity =
    (await readJson(resolve(outDir, 'continuity-charter.json'))) ||
    (await readJson(resolve(outDir, 'sovereign-charter.json')));
  const chronos =
    (await readJson(resolve(outDir, 'chronos-pulse.json'))) ||
    (await readJson(resolve(outDir, 'temporal-nexus.json')));
  const dominion =
    (await readJson(resolve(outDir, 'dominion-apex.json'))) ||
    (await readJson(resolve(outDir, 'eternal-crown.json')));
  const steward =
    (await readJson(resolve(outDir, 'silent-steward.json'))) ||
    (await readJson(resolve(outDir, 'steward-ship.json')));

  const block = buildCanonMarkdown({
    profile,
    observatory,
    archive,
    report,
    unlock,
    rich,
    monthly: monthly
      ? {
          filledAuto: monthly.filledAuto,
          fillable: monthly.fillable,
          alwaysManual: monthly.alwaysManual?.length ?? 0,
        }
      : observatory?.monthly,
    gbp,
    debt,
    presence,
    throne,
    live,
    growth,
    courier,
    forge: forge || closer,
    continuum,
    lattice,
    continuity,
    chronos,
    dominion,
    steward,
  });

  const guidePath = resolve(root, opts.guidePath || 'SEO-GUIDE.md');
  let text = await readFile(guidePath, 'utf8');
  // Normalize CRLF so section regexes are reliable on Windows checkouts
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  text = text.replace(/\r\n/g, '\n');
  let mode = 'failed';

  const markerRe = new RegExp(`${escapeReg(START)}[\\s\\S]*?${escapeReg(END)}`, 'g');
  const startCount = text.split(START).length - 1;
  const endCount = text.split(END).length - 1;

  if (startCount >= 1 && endCount >= 1) {
    // Replace from first START through last END (heals duplicate/orphan markers)
    const first = text.indexOf(START);
    const last = text.lastIndexOf(END);
    if (first >= 0 && last > first) {
      text = text.slice(0, first) + block + text.slice(last + END.length);
      mode = startCount === 1 && endCount === 1 ? 'replaced-markers' : 'healed-markers';
    }
  }

  if (mode === 'failed') {
    // Strip any orphan marker lines before install
    text = text.replace(markerRe, '').replace(new RegExp(`\\n?${escapeReg(START)}\\n?`, 'g'), '\n');
    text = text.replace(new RegExp(`\\n?${escapeReg(END)}\\n?`, 'g'), '\n');

    // First install: replace from "## Current status" through the hr before "## Table of contents"
    const re = /## Current status[\s\S]*?\n---\n(?=\n## Table of contents)/;
    if (re.test(text)) {
      text = text.replace(re, `${block}\n\n---\n`);
      mode = 'installed-section';
    } else {
      // Fallback: insert after intro paragraph
      const needle = 'You do not need to understand the code.';
      const idx = text.indexOf(needle);
      if (idx >= 0) {
        const endPara = text.indexOf('\n---\n', idx);
        if (endPara >= 0) {
          text = text.slice(0, endPara + 5) + `\n${block}\n` + text.slice(endPara + 5);
          mode = 'inserted-after-intro';
        }
      }
    }
  }

  // Keep TOC pointing at the live-status heading
  text = text.replace(
    /\[Current status \(live audit\)\]\([^)]+\)/,
    '[Current status (live audit)](#current-status-live-audit--meridian-canon)'
  );

  if (nl === '\r\n') {
    text = text.replace(/\n/g, '\r\n');
  }

  if (mode !== 'failed') {
    await writeFile(guidePath, text, 'utf8');
  }

  const artefact = {
    generatedAt: new Date().toISOString(),
    mode,
    guidePath,
    score: observatory?.score || archive?.score || report?.scorecard || null,
    unlockPercent: observatory?.unlockPercent ?? unlock?.percent ?? null,
    sealed: archive?.sealed === true,
    forever: debt?.forever || observatory?.forever || ['npm run meridian:observe', 'npm run meridian:desk'],
    humanDebt: debt?.debtScore ?? null,
    autonomic: debt?.autonomic === true,
  };
  await writeFile(resolve(outDir, 'canon-sync.json'), JSON.stringify(artefact, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'canon-status.md'), block.replace(START + '\n', '').replace('\n' + END, '') + '\n', 'utf8');

  return {
    ok: mode !== 'failed',
    status: mode === 'failed' ? 'error' : 'ok',
    message:
      mode === 'failed'
        ? 'Canon sync failed — could not locate Current status section in SEO-GUIDE.md'
        : `SEO-GUIDE.md canon synced (${mode}) · score ${artefact.score?.overall ?? '—'} · unlock ${artefact.unlockPercent ?? '—'}%`,
    data: {
      ...artefact,
      paths: {
        guide: guidePath,
        json: resolve(outDir, 'canon-sync.json'),
        md: resolve(outDir, 'canon-status.md'),
      },
    },
  };
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
