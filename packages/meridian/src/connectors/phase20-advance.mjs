import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase19 } from './phase19-advance.mjs';
import { assessHumanDebt } from './human-debt.mjs';
import { syncSeoGuideCanon } from './canon-sync.mjs';
import { advancePhase9 } from './phase9-advance.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function stampUtc(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

function nextMondayUtc9() {
  const now = new Date();
  const weekly = new Date(now);
  const day = weekly.getUTCDay();
  const addDays = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  weekly.setUTCDate(weekly.getUTCDate() + addDays);
  weekly.setUTCHours(9, 0, 0, 0);
  return weekly;
}

function gcalTemplate({ text, details, start, minutes = 30, rrule }) {
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text,
    dates: `${stampUtc(start)}/${stampUtc(end)}`,
    details,
  });
  if (rrule) params.set('recur', rrule);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function mapsSearchUrl(nap) {
  const q = [nap?.name, nap?.streetAddress, nap?.addressLocality, nap?.addressRegion, nap?.postalCode]
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || 'Zigma Technologies Bengaluru')}`;
}

/**
 * Phase 20 — Autonomic Desk.
 * Collapses remaining human rituals into one-click bridges; promotes forever ops.
 */
export async function advancePhase20(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p19 = { ok: true, message: 'phase19 skipped', data: {} };
  if (opts.skipCanon !== true) {
    p19 = await advancePhase19(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
      skipObserve: opts.skipObserve === true,
      gscProxy: opts.gscProxy !== false,
    });
    steps.push({ id: 'phase19', ok: p19.ok !== false, message: p19.message });
  }

  // Ensure ICS exists for calendar bridges
  if (!(await fileExists(resolve(outDir, 'phase9-routine.ics')))) {
    await advancePhase9(profile, { outDir, skipForm: true, actions: [] });
    steps.push({ id: 'phase9-ics', ok: true, message: 'phase9-routine.ics generated' });
  }

  const debt = await assessHumanDebt(profile, { outDir });
  steps.push({ id: 'human-debt', ok: debt.ok !== false, message: debt.message });

  const napAudit = await readJson(resolve(outDir, 'nap-audit.json'));
  const nap = napAudit?.nap || {};
  const cites = await readJson(resolve(outDir, 'citations-playbook.json'));
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const unlock = await assessUnlockReadiness(profile, { outDir });
  const score = observatory?.score || archive?.score || report?.scorecard || {};
  const progress = (await readJson(resolve(outDir, 'citations-progress.json'))) || { claimed: [] };
  const claimed = new Set(Array.isArray(progress.claimed) ? progress.claimed : []);

  const weeklyStart = nextMondayUtc9();
  const monthlyStart = new Date(Date.UTC(weeklyStart.getUTCFullYear(), weeklyStart.getUTCMonth() + 1, 1, 9, 0, 0));
  const calLinks = {
    weekly: gcalTemplate({
      text: 'Zigma SEO · Weekly (15 min)',
      details: `Open phase20-ops.html · npm run meridian:observe · ${origin}/admin`,
      start: weeklyStart,
      rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO',
    }),
    monthly: gcalTemplate({
      text: 'Zigma SEO · Monthly report',
      details: `Fill monthly-digest.md · skim CWV · ${origin}`,
      start: monthlyStart,
      rrule: 'RRULE:FREQ=MONTHLY;BYMONTHDAY=1',
    }),
    ics: 'phase9-routine.ics',
  };

  const fullAddress = [nap.streetAddress, nap.addressLocality, nap.addressRegion, nap.postalCode]
    .filter(Boolean)
    .join(', ');
  const napBlob = [
    nap.name || 'Zigma Technologies',
    nap.telephone || '',
    fullAddress,
    origin,
    nap.email || '',
  ]
    .filter(Boolean)
    .join('\n');

  const directories = (cites?.directories || []).filter((d) => d.url);
  const dirCards = directories
    .map((d) => {
      const isDone = claimed.has(d.id);
      return `<div class="dir ${isDone ? 'done' : ''}" data-id="${esc(d.id)}">
  <div><strong>${esc(d.name)}</strong><br/><span class="sub">${esc(d.why || '')}</span></div>
  <div class="row">
    <button type="button" class="btn copy-nap">Copy NAP</button>
    <a class="btn primary" href="${esc(d.url)}" target="_blank" rel="noreferrer">Open</a>
    <button type="button" class="btn mark" data-mark="${esc(d.id)}">${isDone ? 'Claimed ✓' : 'Mark claimed'}</button>
  </div>
</div>`;
    })
    .join('');

  const debtRows = (debt.data?.items || [])
    .map(
      (i) =>
        `<tr><td>${esc(i.label)}</td><td class="st-${esc(i.status)}">${esc(i.status)}</td><td>${esc(i.who)}</td></tr>`
    )
    .join('');

  const executive = {
    generatedAt: new Date().toISOString(),
    brand: profile.displayName || profile.id,
    origin,
    score: { overall: score.overall, grade: score.grade },
    unlockPercent: unlock.data?.percent ?? observatory?.unlockPercent ?? null,
    sealed: archive?.sealed === true,
    humanDebt: debt.data?.debtScore ?? null,
    autonomic: debt.data?.autonomic === true,
    signals: {
      gscClicks: observatory?.signals?.gscClicks ?? null,
      ga4Organic: observatory?.signals?.ga4Organic ?? null,
      sameAsLive: observatory?.sameAsLive === true,
      gbpSource: observatory?.gbp?.source || null,
    },
    forever: ['npm run meridian:observe', 'npm run meridian:desk'],
    boardLine: debt.data?.autonomic
      ? 'SEO automation autonomic — only Google Business Profile verification remains as an external gate.'
      : `Human debt ${debt.data?.debtScore}: open desk bridges; automation otherwise sealed.`,
  };
  await writeFile(resolve(outDir, 'executive-brief.json'), JSON.stringify(executive, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'executive-brief.md'),
    [
      `# Executive brief — ${executive.brand}`,
      '',
      `_${executive.generatedAt}_`,
      '',
      executive.boardLine,
      '',
      `| KPI | Value |`,
      `| --- | --- |`,
      `| Meridian score | **${executive.score.overall ?? '—'} ${executive.score.grade || ''}** |`,
      `| Unlock | **${executive.unlockPercent ?? '—'}%** |`,
      `| Archive | **${executive.sealed ? 'SEALED' : 'open'}** |`,
      `| Human debt | **${executive.humanDebt ?? '—'}** |`,
      `| GSC clicks / GA4 (28d) | **${executive.signals.gscClicks ?? '—'}** / **${executive.signals.ga4Organic ?? '—'}** |`,
      '',
      `Forever: \`${executive.forever.join('` · `')}\``,
      '',
    ].join('\n'),
    'utf8'
  );

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 20 Autonomic Desk — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#04060a;--card:#0c121c;--line:#1e2a3a;--text:#e7eef8;--muted:#8a9bb0;--accent:#c9a227;--ok:#2fd67b;--warn:#e6b84d;--ext:#6aa8ff}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(1000px 520px at 10% -10%,#1a2838,transparent),radial-gradient(800px 400px at 90% 0%,#2a2210,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.6rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem;font-size:.9rem}
.banner{border:1px solid #3a4a28;background:linear-gradient(105deg,#142018,#0c121c 55%);border-radius:14px;padding:1.05rem 1.2rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.3rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
h2{margin:0 0 .55rem;font-size:1rem;letter-spacing:.01em}
.btn,.btn.primary{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#152030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem;cursor:pointer}
.btn.primary{background:var(--accent);color:#1a1200;border-color:transparent}
.ok{color:var(--ok)}.warn{color:var(--warn)}.ext{color:var(--ext)}
table{width:100%;border-collapse:collapse;font-size:.84rem}td,th{border-bottom:1px solid var(--line);padding:.4rem .3rem;text-align:left}
.st-done{color:var(--ok)}.st-bridged{color:var(--accent)}.st-external{color:var(--ext)}.st-open{color:var(--warn)}
.dir{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.6rem;padding:.65rem 0;border-bottom:1px solid var(--line)}.dir.done{opacity:.55}
.row{display:flex;flex-wrap:wrap;align-items:center}
#toast{position:fixed;bottom:1.2rem;right:1.2rem;background:#1e3a2a;border:1px solid #2fd67b55;color:var(--ok);padding:.65rem 1rem;border-radius:10px;display:none;z-index:9;font-size:.85rem}
code{font-size:.78rem;background:#152030;padding:.1rem .35rem;border-radius:4px}
pre.nap{white-space:pre-wrap;background:#081018;border:1px solid var(--line);border-radius:10px;padding:.85rem;font-size:.84rem;margin:.5rem 0}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${debt.data?.autonomic ? 'ok' : 'warn'}">${debt.data?.autonomic ? 'AUTONOMIC DESK ONLINE' : 'DESK BRIDGES READY'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(executive.boardLine)}</p>
</div>
<h1>Phase 20 — Autonomic desk</h1>
<p class="sub">${esc(origin)} · one composition · zero ritual friction · corporate forever ops</p>
<div class="hero">
  <div class="metric"><span class="sub">Score</span><b class="ok">${esc(score.overall ?? '—')} ${esc(score.grade || '')}</b></div>
  <div class="metric"><span class="sub">Unlock</span><b class="ok">${esc(unlock.data?.percent ?? '—')}%</b></div>
  <div class="metric"><span class="sub">Human debt</span><b class="${(debt.data?.debtScore ?? 0) <= 1 ? 'ok' : 'warn'}">${esc(debt.data?.debtScore ?? '—')}</b></div>
  <div class="metric"><span class="sub">Archive</span><b class="${archive?.sealed ? 'ok' : ''}">${archive?.sealed ? 'SEALED' : '—'}</b></div>
</div>

<div class="card" id="nap">
  <h2>NAP vault (exact paste)</h2>
  <pre class="nap" id="nap-text">${esc(napBlob)}</pre>
  <button type="button" class="btn primary" id="copy-all-nap">Copy full NAP</button>
  <button type="button" class="btn" data-copy="${esc(nap.name || '')}">Name</button>
  <button type="button" class="btn" data-copy="${esc(nap.telephone || '')}">Phone</button>
  <button type="button" class="btn" data-copy="${esc(fullAddress)}">Address</button>
  <button type="button" class="btn" data-copy="${esc(origin)}">Website</button>
</div>

<div class="card" id="calendar">
  <h2>Calendar — no file import</h2>
  <p class="sub">One click adds recurring reminders to Google Calendar. ICS remains for Outlook.</p>
  <a class="btn primary" href="${esc(calLinks.weekly)}" target="_blank" rel="noreferrer">+ Weekly (Google)</a>
  <a class="btn primary" href="${esc(calLinks.monthly)}" target="_blank" rel="noreferrer">+ Monthly (Google)</a>
  <a class="btn" href="${esc(calLinks.ics)}">Download .ics</a>
</div>

<div class="card" id="gbp">
  <h2>Google Business Profile <span class="ext">(external gate)</span></h2>
  <p class="sub">Maps search + Business Profile — verification is the only Google-owned step.</p>
  <a class="btn primary" href="${esc(mapsSearchUrl(nap))}" target="_blank" rel="noreferrer">Search Maps</a>
  <a class="btn primary" href="https://business.google.com/create" target="_blank" rel="noreferrer">Create / manage GBP</a>
  <a class="btn" href="phase5-ops.html">Full GBP ops pack</a>
  <a class="btn" href="gbp-pulse.json">GBP pulse JSON</a>
</div>

<div class="card" id="citations">
  <h2>Citation launchpad</h2>
  <p class="sub">Copy NAP → Open directory → Mark claimed (saved in this browser + progress JSON hint).</p>
  ${dirCards || '<p class="ok">No directory URLs — run Phase 5 first.</p>'}
</div>

<div class="card">
  <h2>Debt ledger</h2>
  <table><thead><tr><th>Item</th><th>Status</th><th>Who</th></tr></thead><tbody>${debtRows}</tbody></table>
</div>

<div class="card">
  <h2>Forever</h2>
  <ul class="sub" style="margin:0;padding-left:1.1rem">
    <li><code>npm run meridian:observe</code> — desk + canon + sensors (primary)</li>
    <li><code>npm run meridian:desk</code> — desk only alias</li>
    <li><code>npm run meridian:guard</code> — full archive re-seal</li>
  </ul>
  <p style="margin:.7rem 0 0">
    <a class="btn" href="executive-brief.md">Executive brief</a>
    <a class="btn" href="SEO-GUIDE.md">SEO-GUIDE.md</a>
    <a class="btn" href="phase19-ops.html">Phase 19 canon</a>
    <a class="btn" href="phase18-ops.html">Phase 18</a>
    <a class="btn" href="${esc(origin)}/admin" target="_blank" rel="noreferrer">Admin</a>
  </p>
</div>
</div>
<div id="toast"></div>
<script>
const NAP = ${JSON.stringify(napBlob)};
const toast = (m) => { const el = document.getElementById('toast'); el.textContent = m; el.style.display = 'block'; setTimeout(() => el.style.display = 'none', 1600); };
const copy = async (t) => { try { await navigator.clipboard.writeText(t); toast('Copied'); } catch { toast('Copy failed'); } };
document.getElementById('copy-all-nap')?.addEventListener('click', () => copy(NAP));
document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => copy(b.getAttribute('data-copy') || '')));
document.querySelectorAll('.copy-nap').forEach((b) => b.addEventListener('click', () => copy(NAP)));
const KEY = 'meridian-citations-claimed';
const load = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); } };
const save = (s) => localStorage.setItem(KEY, JSON.stringify([...s]));
let claimed = load();
document.querySelectorAll('.dir').forEach((el) => { if (claimed.has(el.dataset.id)) el.classList.add('done'); });
document.querySelectorAll('[data-mark]').forEach((b) => b.addEventListener('click', () => {
  const id = b.getAttribute('data-mark');
  if (claimed.has(id)) claimed.delete(id); else claimed.add(id);
  save(claimed);
  b.closest('.dir')?.classList.toggle('done', claimed.has(id));
  b.textContent = claimed.has(id) ? 'Claimed ✓' : 'Mark claimed';
  toast(claimed.has(id) ? 'Marked claimed (local)' : 'Unmarked');
}));
</script>
</body></html>`;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '20',
    origin,
    score,
    unlockPercent: unlock.data?.percent ?? null,
    humanDebt: debt.data,
    executive,
    calendar: { weekly: calLinks.weekly, monthly: calLinks.monthly },
    steps,
  };

  await writeFile(resolve(outDir, 'phase20-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase20-advance.md'),
    [
      `# Phase 20 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Human debt **${debt.data?.debtScore ?? '—'}** · Autonomic **${debt.data?.autonomic ? 'YES' : 'NO'}**`,
      `- Score **${score.overall ?? '—'}** · Unlock **${payload.unlockPercent ?? '—'}%**`,
      `- ${p19.message}`,
      '',
      'Open **`phase20-ops.html`** (primary desk).',
      '',
    ].join('\n'),
    'utf8'
  );
  await writeFile(resolve(outDir, 'phase20-ops.html'), html, 'utf8');

  // Re-score debt now that desk HTML exists (calendar/citations become bridged)
  const debt2 = await assessHumanDebt(profile, { outDir });
  steps.push({ id: 'human-debt-refresh', ok: debt2.ok !== false, message: debt2.message });
  payload.humanDebt = debt2.data;
  executive.humanDebt = debt2.data?.debtScore ?? null;
  executive.autonomic = debt2.data?.autonomic === true;
  executive.boardLine = debt2.data?.autonomic
    ? 'SEO automation autonomic — only Google Business Profile verification remains as an external gate.'
    : `Human debt ${debt2.data?.debtScore}: open desk bridges; automation otherwise sealed.`;
  await writeFile(resolve(outDir, 'executive-brief.json'), JSON.stringify(executive, null, 2), 'utf8');

  // Re-sync guide so next-actions reflect desk + debt
  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon-refresh', ok: canon.ok !== false, message: canon.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase20-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const scan = {
    report: report || { scorecard: score, findings: [] },
    ok: true,
    hardFailCount: 0,
    paths: { outDir },
  };
  const p9 = await advancePhase9(profile, {
    outDir,
    scan,
    actions: [
      { id: 'phase20-advance', ok: true, message: debt.message, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase20-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '20'),
    { id: '20', name: 'Phase 20 Autonomic Desk', file: 'phase20-ops.html', kind: 'html', ready: true, href: 'phase20-ops.html' },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  const finalDebt = debt2?.data || debt.data;
  return {
    ok: p19.ok !== false && debt.ok !== false,
    status: 'ok',
    message: `Phase 20 desk · debt ${finalDebt?.debtScore ?? '—'} · ${finalDebt?.autonomic ? 'autonomic' : 'bridges ready'} · score ${score.overall ?? '—'}`,
    data: {
      ...payload,
      humanDebt: finalDebt,
      paths: {
        html: resolve(outDir, 'phase20-ops.html'),
        md: resolve(outDir, 'phase20-advance.md'),
        executive: resolve(outDir, 'executive-brief.md'),
        debt: resolve(outDir, 'human-debt.json'),
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      {
        code: 'PHASE20_DESK',
        severity: 'low',
        title: 'Autonomic desk online',
        remediation: 'Open phase20-ops.html for one-click GBP/calendar/citations. Forever: npm run meridian:observe.',
        owner: 'developer',
        pillar: 'ops',
      },
    ],
  };
}
