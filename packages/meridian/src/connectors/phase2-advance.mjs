import { writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fetchManual, meta } from '../lib/html.mjs';
import { writeRichResultsPack } from './rich-results-pack.mjs';
import { auditNap } from './nap-audit.mjs';

function runNode(script, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || stdout.trim() || `exit ${code}`));
      else resolvePromise(stdout.trim());
    });
    child.on('error', reject);
  });
}

async function probeLiveSameAs(origin) {
  const res = await fetchManual(`${origin}/`, { forceBody: true });
  const body = res.body || '';
  const robots = meta(body, 'robots');
  const hasSameAs = /"sameAs"\s*:/i.test(body);
  let urls = [];
  try {
    const blocks = [...body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const b of blocks) {
      try {
        const data = JSON.parse(b[1]);
        const nodes = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
        for (const n of nodes) {
          if (!n) continue;
          const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
          if (types.some((t) => /Organization|LocalBusiness/i.test(String(t || '')))) {
            const sa = n.sameAs;
            if (Array.isArray(sa)) urls = sa.map(String);
            else if (sa) urls = [String(sa)];
          }
        }
      } catch {
        /* next block */
      }
    }
  } catch {
    /* ignore */
  }
  return { status: res.status, robots, hasSameAs, urls };
}

/**
 * Phase 2 advance — sameAs apply + NAP recheck + Rich Results pack.
 * Autopilot runs with autoApplySameAs (default on for zigma.prod).
 */
export async function advancePhase2(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });

  const origin = String(profile.origin || '').replace(/\/$/, '');
  const wantApply =
    opts.apply === true ||
    process.env.MERIDIAN_AUTO_APPLY_SAMEAS === '1' ||
    profile.autopilot?.autoApplySameAs === true;

  let applyResult = null;
  const script = resolve(process.cwd(), process.env.MERIDIAN_SAMEAS_SCRIPT || 'scripts/seo-phase2-sameas.mjs');

  if (wantApply) {
    try {
      await access(script);
      const raw = await runNode(script, ['--json', ...(opts.force ? ['--force'] : [])]);
      applyResult = JSON.parse(raw);
    } catch (e) {
      applyResult = { ok: false, error: String(e.message || e), updated: 0 };
    }
  }

  let live = { hasSameAs: false, urls: [] };
  try {
    live = await probeLiveSameAs(origin);
  } catch (e) {
    live = { error: String(e.message || e), hasSameAs: false, urls: [] };
  }

  const nap = await auditNap(profile, { outDir });
  const rich = await writeRichResultsPack(profile, { outDir });

  const sameAsCount = live.urls?.length || nap.data?.sameAsCount || 0;
  const applied = Number(applyResult?.updated || 0);
  const pendingSameAs = sameAsCount === 0;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '2',
    apply: applyResult,
    live,
    sameAsCount,
    napStatus: nap.status,
    richFail: rich.data?.fail ?? rich.data?.payload?.fail,
    richChecked: rich.data?.checked,
  };

  const md = [
    `# Phase 2 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    wantApply
      ? applied
        ? `**Applied** ${applied} social field(s) to Site Settings.`
        : applyResult?.ok === false
          ? `**Apply failed:** ${applyResult.error || 'unknown'} — run on VPS with DB access.`
          : '**Apply:** no DB changes (already set or dry).'
      : '**Apply skipped** (set `autopilot.autoApplySameAs` or `MERIDIAN_AUTO_APPLY_SAMEAS=1`).',
    '',
    `Live sameAs: ${sameAsCount ? sameAsCount + ' URL(s)' : 'missing'}`,
    sameAsCount ? live.urls.map((u) => `- ${u}`).join('\n') : '',
    '',
    `NAP audit: ${nap.message || nap.status}`,
    `Rich Results pack: ${rich.message || rich.status}`,
    '',
    'Human (once): open Rich Results Test links in `rich-results-pack.md` and tick green.',
    'Parallel: start Google Business Profile verify (Phase 5.2) — `gbp-checklist.md`.',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'phase2-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase2-advance.md'), md, 'utf8');

  const findings = [];
  if (pendingSameAs) {
    findings.push({
      code: 'SCHEMA_SAMEAS',
      severity: 'medium',
      title: 'Organization JSON-LD missing sameAs',
      remediation:
        'Autopilot applies verified LinkedIn via seo-phase2-sameas.mjs on a host with DB; redeploy/restart if live HTML is stale. Add more networks in Admin → Site Settings.',
      owner: 'developer',
      pillar: 'technical',
    });
  }
  if (applyResult?.ok === false && wantApply) {
    findings.push({
      code: 'PHASE2_SAMEAS_APPLY',
      severity: 'high',
      title: 'Phase 2 sameAs apply failed',
      remediation: String(applyResult.error || 'Run scripts/seo-phase2-sameas.mjs on Production with DB_* set.'),
      owner: 'developer',
      pillar: 'technical',
    });
  }

  const ok = !(applyResult && applyResult.ok === false && wantApply);
  return {
    ok,
    status: pendingSameAs ? 'degraded' : 'ok',
    message: pendingSameAs
      ? applied
        ? `Phase 2: applied ${applied} social field(s); live HTML still missing sameAs (restart/redeploy)`
        : 'Phase 2: sameAs still empty — apply on VPS or fill Site Settings'
      : `Phase 2 advance OK · sameAs ${sameAsCount} · rich fail ${payload.richFail ?? 0}`,
    data: {
      ...payload,
      paths: { md: resolve(outDir, 'phase2-advance.md'), json: resolve(outDir, 'phase2-advance.json') },
      nap: nap.data,
      rich: rich.data,
    },
    findings,
  };
}
