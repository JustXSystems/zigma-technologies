import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { writeBacklinkOutreach } from './backlink-outreach.mjs';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function parseEmailDraft(draft) {
  const text = String(draft || '').trim();
  const subj = (text.match(/^Subject:\s*(.+)$/im) || [])[1] || 'Partnership / case study link';
  const body = text.replace(/^Subject:\s*.+\n+/i, '').trim();
  return {
    subject: subj.trim(),
    body,
    mailto: `mailto:?subject=${encodeURIComponent(subj.trim())}&body=${encodeURIComponent(body)}`,
  };
}

/**
 * Phase 8 advance — outreach pack + mailto deep links + progress tracker + HTML ops.
 */
export async function advancePhase8(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');

  const outreach = await writeBacklinkOutreach(profile, { outDir });

  let targets = [];
  try {
    const j = JSON.parse(await readFile(resolve(outDir, 'backlink-outreach.json'), 'utf8'));
    targets = j.targets || [];
  } catch {
    targets = outreach.data?.targets || [];
  }

  let progress = { sent: [], updatedAt: null };
  try {
    progress = JSON.parse(await readFile(resolve(outDir, 'backlink-progress.json'), 'utf8'));
  } catch {
    progress = { sent: [], updatedAt: new Date().toISOString(), note: 'Append project pageUrl when email sent' };
    await writeFile(resolve(outDir, 'backlink-progress.json'), JSON.stringify(progress, null, 2), 'utf8');
  }
  const sent = new Set(progress.sent || []);

  const enriched = targets.map((t, i) => {
    const mail = parseEmailDraft(t.emailDraft);
    const id = t.pageUrl || `target-${i}`;
    return {
      ...t,
      id,
      subject: mail.subject,
      mailto: mail.mailto,
      sent: sent.has(id) || sent.has(t.pageUrl),
    };
  });

  const todo = enriched.filter((t) => !t.sent).length;

  const csv = [
    'type,project,pageUrl,subject,sent,mailto',
    ...enriched.map((t) =>
      [t.type, t.project, t.pageUrl, t.subject, t.sent ? 'yes' : 'todo', t.mailto]
        .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');
  await writeFile(resolve(outDir, 'backlink-outreach.csv'), csv, 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 8 Authority Ops — ${esc(profile.displayName || profile.id)}</title>
<style>
body{font-family:Segoe UI,system-ui,sans-serif;background:#0c1117;color:#e8eef5;margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:920px;margin:0 auto}
h1{font-size:1.45rem;margin:0 0 .35rem}
.sub{color:#8b9aab}
.card{background:#151c26;border:1px solid #243041;border-radius:12px;padding:1rem;margin:.65rem 0}
.badge{font-size:.68rem;padding:.12rem .4rem;border-radius:999px;background:#243040;color:#8b9aab}
.badge.on{background:#163326;color:#3dd68c}.badge.off{background:#3a2a14;color:#e6b84d}
a.btn{display:inline-block;margin-top:.45rem;padding:.4rem .7rem;border-radius:8px;background:#3d9cf0;color:#041018;text-decoration:none;font-weight:650;font-size:.8rem}
a.secondary{background:#1e2c3d;color:#e8eef5;border:1px solid #243041;margin-left:.35rem}
pre{white-space:pre-wrap;background:#0f1620;border:1px solid #243041;border-radius:8px;padding:.65rem;font-size:.78rem;color:#c5d0dc}
</style></head><body><div class="wrap">
<h1>Phase 8 — Authority command</h1>
<p class="sub">${esc(origin)} · ${enriched.length} drafts · ${todo} unsent · never buy spam links</p>
<div class="card">
  <strong>Rules</strong>
  <ul class="sub">
    <li>Prefer clients, OEMs, associations — one polite ask, one reminder max.</li>
    <li>Click <em>Open email</em> → send from company mailbox → mark sent in <code>backlink-progress.json</code>.</li>
    <li>CSV export: <code>backlink-outreach.csv</code></li>
  </ul>
</div>
${enriched
  .map(
    (t, i) => `<div class="card">
  <div><strong>${i + 1}. ${esc(t.project)}</strong>
    <span class="badge">${esc(t.type)}</span>
    <span class="badge ${t.sent ? 'on' : 'off'}">${t.sent ? 'sent' : 'todo'}</span>
  </div>
  <p class="sub">${esc(t.ask)}</p>
  <p><a href="${esc(t.pageUrl)}" target="_blank" rel="noreferrer">${esc(t.pageUrl)}</a></p>
  <pre>${esc(t.emailDraft || '')}</pre>
  <a class="btn" href="${esc(t.mailto)}">Open email</a>
  <a class="btn secondary" href="${esc(t.pageUrl)}" target="_blank" rel="noreferrer">View case study</a>
</div>`
  )
  .join('') || '<div class="card">No targets — publish projects in Inventory, then re-run Phase 8 on a host with DB.</div>'}
</div></body></html>`;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '8',
    count: enriched.length,
    todo,
    sent: enriched.length - todo,
  };

  const md = [
    `# Phase 8 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Outreach: ${outreach.message}`,
    `- Unsent: ${todo} / ${enriched.length}`,
    '',
    'Open **`phase8-ops.html`** for one-click mailto drafts.',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'phase8-advance.json'), JSON.stringify({ ...payload, targets: enriched }, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase8-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase8-ops.html'), html, 'utf8');

  return {
    ok: outreach.ok !== false,
    status: todo > 0 ? 'degraded' : 'ok',
    message: `Phase 8 · ${enriched.length} outreach draft(s) · ${todo} unsent`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase8-ops.html'),
        csv: resolve(outDir, 'backlink-outreach.csv'),
        md: resolve(outDir, 'phase8-advance.md'),
      },
    },
    findings: [
      {
        code: 'PHASE8_OPS',
        severity: 'low',
        title: `${todo} backlink ask(s) ready to send`,
        remediation: 'Open phase8-ops.html → Open email per client/OEM → update backlink-progress.json.',
        owner: 'marketing',
        pillar: 'authority',
      },
    ],
  };
}
