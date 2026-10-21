import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runGrowthRadar } from './growth-radar.mjs';
import { writeCityDraft } from './city-draft.mjs';
import { writeReviewKit } from './review-kit.mjs';
import { writeContentCalendar } from './content-calendar.mjs';
import { assessCityPages } from './city-pages-readiness.mjs';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Growth Desk — one corporate forever surface for ranking growth.
 * Auto-refreshes radar · city drafts (staged) · review kit · calendar.
 * Never auto-indexes thin city pages or auto-sends review emails.
 */
export async function writeGrowthDesk(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const brand = profile.brand?.name || profile.displayName || profile.id;
  const origin = String(profile.origin || '').replace(/\/$/, '');

  const radar = opts.skipRadar
    ? { ok: true, data: (await readJson(resolve(outDir, 'growth-radar.json'))) || { opportunityCount: 0, opportunities: [] } }
    : await runGrowthRadar(profile, { outDir });

  if (!opts.skipCity) {
    await writeCityDraft(profile, { outDir });
    await assessCityPages(profile, { outDir });
  }
  if (!opts.skipReviews) {
    await writeReviewKit(profile, { outDir });
  }
  if (!opts.skipCalendar) {
    try {
      await writeContentCalendar(profile, { outDir });
    } catch {
      /* calendar optional if DB missing */
    }
  }

  const city = await readJson(resolve(outDir, 'city-pages-readiness.json'));
  const review = await readJson(resolve(outDir, 'review-kit.json'));
  const calendar = await readJson(resolve(outDir, 'content-calendar.json'));
  const cityDraft = await readJson(resolve(outDir, 'city-draft.json'));
  const ops = radar.data?.opportunities || [];

  const held =
    (city?.pages || city?.data?.pages || []).filter((p) => p.noindex || !p.readyToIndex).length ||
    city?.heldCount ||
    0;

  const nextActions = [];
  for (const o of ops.slice(0, 5)) {
    nextActions.push({
      kind: 'gsc',
      priority: o.kind === 'ctr-lift' ? 1 : o.kind === 'page-2-push' ? 2 : 3,
      title: o.briefTitle || o.query,
      detail: o.action,
      query: o.query,
    });
  }
  if (cityDraft?.path) {
    nextActions.push({
      kind: 'city',
      priority: 4,
      title: `Review staged city draft ${cityDraft.path}`,
      detail:
        'Add unique local photos/proof, then Admin → SEO → Meridian → City promote (runtime allowlist) — never auto-index thin templates.',
      path: cityDraft.path,
    });
  }
  if (review?.reviewLink) {
    nextActions.push({
      kind: 'reviews',
      priority: 2,
      title: 'Send review requests after completed jobs',
      detail: `Use review-kit templates · link auto: ${review.reviewLink}. Closing an enquiry in Admin drafts a mailto automatically.`,
      href: review.reviewLink,
    });
  }

  nextActions.sort((a, b) => a.priority - b.priority);

  const board = {
    generatedAt: new Date().toISOString(),
    brand,
    origin,
    opportunityCount: ops.length,
    cityTemplatesHeld: held,
    reviewLink: review?.reviewLink || null,
    calendarSlots: calendar?.slots?.length ?? calendar?.weeks?.length ?? null,
    cityDraftPath: cityDraft?.path || null,
    nextActions: nextActions.slice(0, 8),
    forever: [
      'Sunday Meridian SEO report refreshes this desk',
      'npm run meridian:observe · growth closer auto-applies safe FAQ/meta bridges',
      'Admin enquiry → closed drafts + opens review mailto (never auto-sends)',
      'City promote is one Admin click after unique proof (storage/seo allowlist)',
    ],
    qualityGates: [
      'City pages stay noindex until Admin City promote + unique-proof ack',
      'No paid/fake reviews',
      'No auto-outreach without human click',
    ],
  };

  await writeFile(resolve(outDir, 'growth-desk.json'), JSON.stringify(board, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'growth-desk.md'),
    [
      `# Growth Desk — ${brand}`,
      '',
      `Generated: ${board.generatedAt}`,
      '',
      `GSC opportunities: **${board.opportunityCount}** · City templates held: **${board.cityTemplatesHeld}**`,
      '',
      '## Next actions (auto)',
      '',
      ...nextActions.map((a, i) => `${i + 1}. **[${a.kind}]** ${a.title} — ${a.detail}`),
      '',
      '## Quality gates',
      '',
      ...board.qualityGates.map((g) => `- ${g}`),
      '',
      'Open **`growth-desk.html`** in Admin → SEO → Meridian.',
      '',
    ].join('\n'),
    'utf8'
  );

  const rows = nextActions
    .map(
      (a) =>
        `<tr><td><span class="tag">${esc(a.kind)}</span></td><td><strong>${esc(a.title)}</strong><div class="muted">${esc(a.detail)}</div></td></tr>`
    )
    .join('') || '<tr><td colspan="2" class="muted">No open growth actions this cycle — desk is clear.</td></tr>';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Growth Desk — ${esc(brand)}</title>
<style>
  :root { --bg:#0b121c; --panel:#121a26; --line:rgba(255,255,255,.08); --text:#e8eef7; --muted:#8b9bb4; --accent:#3dd68c; --warn:#ff9f43; }
  * { box-sizing: border-box; }
  body { margin:0; font:15px/1.5 "Segoe UI", system-ui, sans-serif; background:radial-gradient(1200px 600px at 10% -10%, #1a2a40, var(--bg)); color:var(--text); }
  .wrap { max-width: 920px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
  h1 { font-size: 1.65rem; margin: 0 0 .35rem; letter-spacing: -.02em; }
  .sub { color: var(--muted); margin: 0 0 1.5rem; }
  .metrics { display:grid; grid-template-columns: repeat(auto-fit,minmax(140px,1fr)); gap:.75rem; margin-bottom:1.5rem; }
  .metric { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:.85rem 1rem; }
  .metric span { display:block; color:var(--muted); font-size:.7rem; letter-spacing:.08em; text-transform:uppercase; }
  .metric b { font-size:1.35rem; }
  table { width:100%; border-collapse:collapse; background:var(--panel); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  th, td { text-align:left; padding:.75rem 1rem; border-bottom:1px solid var(--line); vertical-align:top; }
  th { font-size:.7rem; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
  .tag { display:inline-block; font-size:.65rem; letter-spacing:.06em; text-transform:uppercase; padding:.15rem .4rem; border-radius:4px; background:rgba(61,214,140,.12); color:var(--accent); }
  .muted { color:var(--muted); font-size:.85rem; margin-top:.25rem; }
  .gates { margin-top:1.5rem; color:var(--muted); font-size:.85rem; }
  a.btn { display:inline-block; margin:.35rem .5rem .35rem 0; padding:.45rem .85rem; border-radius:8px; background:#1e2d44; color:var(--text); text-decoration:none; border:1px solid var(--line); }
  a.btn.primary { background:var(--accent); color:#062016; font-weight:600; border:none; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>Growth Desk</h1>
    <p class="sub">${esc(brand)} · ${esc(origin)} · auto-refreshed · quality gates on</p>
    <div class="metrics">
      <div class="metric"><span>GSC opportunities</span><b>${esc(board.opportunityCount)}</b></div>
      <div class="metric"><span>City held</span><b>${esc(board.cityTemplatesHeld)}</b></div>
      <div class="metric"><span>Review link</span><b style="font-size:.95rem">${board.reviewLink ? 'LIVE' : '—'}</b></div>
    </div>
    <p>
      <a class="btn primary" href="command-brief.html">Command Brief</a>
      <a class="btn" href="growth-radar.md">Radar</a>
      <a class="btn" href="city-draft.md">City draft</a>
      <a class="btn" href="review-kit.md">Review kit</a>
    </p>
    <table>
      <thead><tr><th>Lane</th><th>Next action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="gates">
      <strong>Quality gates:</strong> ${board.qualityGates.map(esc).join(' · ')}
    </div>
  </div>
</body>
</html>`;

  await writeFile(resolve(outDir, 'growth-desk.html'), html, 'utf8');

  return {
    ok: true,
    status: 'ok',
    message: `Growth desk · ${ops.length} opportunity(ies) · ${nextActions.length} next action(s)`,
    data: board,
    findings: [],
  };
}
