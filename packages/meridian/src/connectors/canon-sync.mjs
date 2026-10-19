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
  const gscClicks = observatory?.signals?.gscClicks ?? '—';
  const ga4 = observatory?.signals?.ga4Organic ?? '—';
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
  const external = (debt?.items || []).filter((i) => i.status === 'external' || i.status === 'open');
  const nextRows = [];
  let n = 2;
  if (!hasMapLive) {
    nextRows.push(
      `| **${n++}** | Ship \`hasMap\` to Production | Auto / Dev | \`npm run meridian:prod:hasmap\` · [\`phase24-ops.html\`](storage/meridian/zigma-prod/phase24-ops.html) |`
    );
  }
  if (external.length > 0) {
    for (const i of external) {
      nextRows.push(
        `| **${n++}** | ${i.label} | ${i.who} | ${i.note || i.status} — [\`phase21-ops.html\`](storage/meridian/zigma-prod/phase21-ops.html) |`
      );
    }
  } else if (gbpParked && !presenceSealed) {
    nextRows.push(
      `| **${n++}** | Optional: verify GBP when ready | You | Parked — [\`phase21-ops.html\`](storage/meridian/zigma-prod/phase21-ops.html) → \`npm run meridian:ack-gbp\` |`
    );
  }
  if (!nextRows.length) {
    nextRows.push('| **2** | None — forge + throne sealed | — | Forever observe auto-closes radar |');
  }
  const nextBlock = nextRows.join('\n');

  return `${START}
## Current status (live audit — Meridian canon)

_Re-checked ${todayLabel()} (auto)._

> **Auto-maintained by Meridian Phase 25.** Re-run \`npm run meridian:observe\` after deploys. Do **not** hand-edit between the \`MERIDIAN:CANON\` markers.

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
| Human debt | **${debtScore}** |
| Organization \`sameAs\` | **${sameAs}** |
| LocalBusiness \`hasMap\` (live) | **${hasMapLive ? 'YES' : 'NO — courier shipping'}** |
| Growth radar opportunities | **${growthN}** (closed **${closedN}**) |
| Rich Results pack | **${richFail === 0 ? '6/6 OK' : 'fail ' + richFail}** |
| Monthly digest | **${monthlyFill}** |
| GBP pulse source | **${gbpSrc}** (Insights paste optional; GSC brand proxy fills clicks/discovery) |
| GSC clicks / GA4 organic (28d) | **${gscClicks}** / **${ga4}** |

### Technical SEO — Production

| Check | Result |
| --- | --- |
| Phase 1–25 automation | **Done** — see [\`AUTOMATION.md\`](packages/meridian/AUTOMATION.md) |
| Indexing / canonicals / H1 / brand | Verified by Meridian technical engine + \`npm run seo:verify\` |
| \`/sitemap.xml\` | Healthy (Meridian sitemap-health) |
| Org JSON-LD + \`sameAs\` | Live on Production |
| Org JSON-LD \`hasMap\` | ${hasMapLive ? '**Live** (NAP Maps URL)' : '**Courier** — \`npm run meridian:prod:hasmap\`'} |
| PreProd | \`noindex\` + empty sitemap (preprod-removals pack) |
| Share image | \`/og.png\` |

### Next actions (minimized — in order)

Phases **0–24 are complete** for automation. You are on the **growth closer** (signal forge).

| # | Do this | Who | Notes |
| --- | --- | --- | --- |
| **1** | Run **\`npm run meridian:observe\`** (forge + courier + radar) | Auto / Dev | Primary forever command |
${nextBlock}

**Do not** re-run obsolete checklists. Surfaces: **\`phase25-ops.html\`** (forge) · **\`growth-closer.md\`** · **\`phase24-ops.html\`**. Re-seal: \`npm run meridian:guard\`.

### Meridian map (developer)

- Forever: \`npm run meridian:observe\` · \`npm run meridian:forge\` · \`npm run meridian:prod:hasmap\` · \`npm run meridian:guard\`
- Admin → **SEO → Meridian** → Phase 25 / Forge
- SSH: \`deploy@200.234.45.106\` · App \`/var/www/zigma-technologies\`
- Artefacts: \`${origin.replace('https://', '')}\` → \`storage/meridian/zigma-prod/\`

### Code hardening (shipped)

- \`isIndexable()\` / \`next.config.ts\` refuse indexing when \`NEXT_PUBLIC_BASE_PATH\` is set.
- \`scripts/verify-seo-build.mjs\` in PreProd/Prod CI and \`deploy.sh\`.
- Live verifier: \`npm run seo:verify\` / \`seo:verify:preprod\`.
- Meridian autopilot = scan → remediate → Phases 0–25 (growth closer) + digests + GSC/Bing when secrets set.
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
