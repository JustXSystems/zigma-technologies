import { writeFile, readFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadOpsCadence } from '../lib/ops-cadence.mjs';

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
 * Human debt — remaining optional rituals after automation.
 * status: open | bridged | done | external
 * Only `open` + `external` count toward debtScore (external = Google verify, can't code away).
 */
export async function assessHumanDebt(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const cadence = await loadOpsCadence(outDir);
  const done = (id) => !!cadence?.completed?.[id];

  const gbp = await readJson(resolve(outDir, 'gbp-pulse.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const presence = await readJson(resolve(outDir, 'presence-sentinel.json'));
  const presenceSeal = await readJson(resolve(outDir, 'presence-seal.json'));
  const throne = await readJson(resolve(outDir, 'quiet-throne.json'));
  const cites = await readJson(resolve(outDir, 'citations-playbook.json'));
  const progress = (await readJson(resolve(outDir, 'citations-progress.json'))) || { claimed: [] };
  const claimed = new Set(Array.isArray(progress.claimed) ? progress.claimed : []);
  const icsReady = await exists(resolve(outDir, 'phase9-routine.ics'));
  const deskReady = await exists(resolve(outDir, 'phase20-ops.html'));
  const outreachReady = await exists(resolve(outDir, 'phase8-ops.html'));
  const cityDraftReady = await exists(resolve(outDir, 'city-draft.md'));
  const reviewKit = await readJson(resolve(outDir, 'review-kit.json'));
  const sealed = archive?.sealed === true;
  const gbpSealed = presenceSeal?.sealed === true || presence?.sealed === true || done('gbp-verify');
  const parkGbp =
    opts.parkGbp === true ||
    (opts.parkGbp !== false && (throne?.parkGbp === true || throne?.missionComplete === true) && !gbpSealed);
  const gbpHasReviews =
    gbp?.metrics?.reviews != null ||
    gbp?.metrics?.rating != null ||
    gbp?.rating != null ||
    gbp?.source === 'insights-paste' ||
    gbp?.source === 'gsc-proxy';

  const dirRows = cites?.directories || [];
  const dirLaunchpad = dirRows.filter((d) => d.url).length;

  // Packs that already eliminate ritual → status done (optional growth remains voluntary)
  const items = [
    {
      id: 'forever-observe',
      label: 'Keep Monday autopilot / npm run meridian:observe',
      who: 'Auto',
      status: 'done',
      note: 'Wired — GitHub Action + desk',
    },
    {
      id: 'calendar-ics',
      label: 'SEO routine calendar (auto-generated)',
      who: 'Auto',
      status: done('calendar-ics') || icsReady || deskReady ? 'done' : 'open',
      href: 'phase20-ops.html#calendar',
      note: 'ICS + Google/Outlook links on desk — personal subscribe optional',
    },
    {
      id: 'gbp-verify',
      label: 'Claim & verify Google Business Profile (Google gate)',
      who: 'You',
      status: gbpSealed ? 'done' : parkGbp ? 'parked' : 'external',
      href: 'phase21-ops.html',
      note: gbpSealed
        ? 'Presence sealed — sentinel closed this gate'
        : parkGbp
          ? 'Parked — optional Google gate; GSC proxy covers discovery; does not block forever ops'
          : `Sentinel ${presence?.strength || 'watching'} — verify in Google, then npm run meridian:ack-gbp`,
    },
    {
      id: 'gbp-reviews',
      label: 'Review kit + discovery pulse',
      who: 'Auto',
      status: done('gbp-reviews') || gbpHasReviews || reviewKit?.reviewLinkSet ? 'done' : 'bridged',
      href: 'phase20-ops.html#gbp',
      note: 'Review templates auto-linked via Maps/Place ID · clicks via GSC proxy',
    },
    {
      id: 'citations',
      label: 'Directory NAP launchpad',
      who: 'Auto',
      status: done('citations') || dirLaunchpad > 0 || deskReady ? 'done' : 'open',
      href: 'phase20-ops.html#citations',
      note: dirLaunchpad
        ? `${dirLaunchpad} launchpad link(s) ready — claim anytime (optional growth)`
        : 'Desk citations vault',
    },
    {
      id: 'outreach',
      label: 'Partner outreach mailto packs',
      who: 'Auto',
      status: done('outreach') || outreachReady ? 'done' : 'open',
      href: 'phase8-ops.html',
      note: 'Packs ready — send when pursuing links (never buy links)',
    },
    {
      id: 'city-proof',
      label: 'City page draft (staged, noindex)',
      who: 'Auto',
      status: done('city-proof') || cityDraftReady ? 'done' : 'bridged',
      href: 'city-draft.md',
      note: 'Auto-drafted from NAP + projects — promote only after unique proof',
    },
  ];

  const open = items.filter((i) => i.status === 'open');
  const external = items.filter((i) => i.status === 'external');
  const parked = items.filter((i) => i.status === 'parked');
  const bridged = items.filter((i) => i.status === 'bridged');
  // Parked Google gates do not count — Quiet Throne mission can complete without them
  const debtScore = open.length + external.length;
  const autonomic = debtScore === 0 || (open.length === 0 && external.length <= 1 && sealed);
  const missionComplete = debtScore === 0 && sealed;

  const payload = {
    generatedAt: new Date().toISOString(),
    debtScore,
    openCount: open.length,
    externalCount: external.length,
    parkedCount: parked.length,
    bridgedCount: bridged.length,
    autonomic,
    missionComplete,
    sealed,
    observatoryNominal: !!observatory,
    items,
    presenceSealed: gbpSealed,
    parkGbp: parkGbp && !gbpSealed,
    forever: ['npm run meridian:observe', 'npm run meridian:desk', 'Monday meridian-autopilot.yml'],
  };

  await writeFile(resolve(outDir, 'human-debt.json'), JSON.stringify(payload, null, 2), 'utf8');

  const md = [
    `# Human debt — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `**Debt score:** ${debtScore} · **Autonomic:** ${autonomic ? 'YES' : 'NO'}`,
    '',
    '| Item | Status | Who |',
    '| --- | --- | --- |',
    ...items.map((i) => `| ${i.label} | ${i.status} | ${i.who} |`),
    '',
    'Open **`phase20-ops.html`** for one-click bridges.',
    '',
  ].join('\n');
  await writeFile(resolve(outDir, 'human-debt.md'), md, 'utf8');

  return {
    ok: true,
    status: 'ok',
    message: `Human debt ${debtScore} · ${autonomic ? 'autonomic' : 'bridge remaining'} · external ${external.length}`,
    data: {
      ...payload,
      paths: {
        json: resolve(outDir, 'human-debt.json'),
        md: resolve(outDir, 'human-debt.md'),
      },
    },
  };
}
