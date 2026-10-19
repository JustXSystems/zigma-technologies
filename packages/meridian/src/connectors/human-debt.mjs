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
  const reviewLink = !!(process.env.MERIDIAN_GBP_REVIEW_LINK || '').trim();
  const icsReady = await exists(resolve(outDir, 'phase9-routine.ics'));
  const deskReady = await exists(resolve(outDir, 'phase20-ops.html'));
  const sealed = archive?.sealed === true;
  const gbpSealed = presenceSeal?.sealed === true || presence?.sealed === true || done('gbp-verify');
  const parkGbp =
    opts.parkGbp === true ||
    (opts.parkGbp !== false && (throne?.parkGbp === true || throne?.missionComplete === true) && !gbpSealed);
  const gbpHasReviews =
    gbp?.metrics?.reviews != null ||
    gbp?.metrics?.rating != null ||
    gbp?.rating != null ||
    gbp?.source === 'insights-paste';

  const dirRows = cites?.directories || [];
  const dirTodo = dirRows.filter((d) => d.url && !claimed.has(d.id)).length;

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
      label: 'Subscribe SEO routine calendar (one-click from desk)',
      who: 'You',
      status: done('calendar-ics') ? 'done' : icsReady || deskReady ? 'bridged' : 'open',
      href: 'phase20-ops.html#calendar',
      note: 'Google / Outlook template links — no file import ritual',
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
          ? 'Parked on Quiet Throne — optional Google gate; does not block forever ops'
          : `Sentinel ${presence?.strength || 'watching'} — verify in Google, then npm run meridian:ack-gbp (or set MERIDIAN_GBP_PLACE_ID)`,
    },
    {
      id: 'gbp-reviews',
      label: 'Optional: paste GBP reviews/rating into pulse',
      who: 'You',
      status: done('gbp-reviews') || gbpHasReviews ? 'done' : reviewLink ? 'bridged' : 'bridged',
      href: 'phase20-ops.html#gbp',
      note: 'Clicks/discovery already via GSC proxy',
    },
    {
      id: 'citations',
      label: 'Claim directories (NAP copy vault on desk)',
      who: 'You',
      status: done('citations') || dirTodo === 0 ? 'done' : 'bridged',
      href: 'phase20-ops.html#citations',
      note: dirTodo ? `${dirTodo} launchpad link(s)` : 'All marked claimed or none listed',
    },
    {
      id: 'outreach',
      label: 'Optional partner outreach (mailto packs)',
      who: 'You',
      status: done('outreach') ? 'done' : 'bridged',
      href: 'phase8-ops.html',
      note: 'Never buy links',
    },
    {
      id: 'city-proof',
      label: 'Optional: one real city page before indexing',
      who: 'You',
      status: done('city-proof') ? 'done' : 'bridged',
      href: 'phase6-ops.html',
      note: 'Keep templates noindex until proof',
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
