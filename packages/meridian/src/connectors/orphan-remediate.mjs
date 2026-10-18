import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

function hubFor(url, origin) {
  try {
    const u = new URL(url);
    const p = u.pathname;
    if (p.startsWith('/projects/')) return { hub: `${origin}/projects`, hubLabel: 'Projects', kind: 'catalog-project' };
    if (p.startsWith('/products/')) return { hub: `${origin}/products`, hubLabel: 'Products', kind: 'catalog-product' };
    if (p.startsWith('/services/')) return { hub: `${origin}/services`, hubLabel: 'Services', kind: 'catalog-service' };
    if (p.startsWith('/industries/')) return { hub: `${origin}/industries`, hubLabel: 'Industries', kind: 'industry' };
    if (p.startsWith('/press')) return { hub: `${origin}/`, hubLabel: 'Home', kind: 'press' };
    if (p.startsWith('/hi/') || p.startsWith('/kn/'))
      return { hub: `${origin}/locations`, hubLabel: 'Locations (EN)', kind: 'hreflang' };
    if (p === '/projects101') return { hub: `${origin}/projects`, hubLabel: 'Projects', kind: 'landing' };
    return { hub: origin, hubLabel: 'Home', kind: 'other' };
  } catch {
    return { hub: origin, hubLabel: 'Home', kind: 'other' };
  }
}

/**
 * Build orphan → hub link prescriptions from link-graph.json (or health payload).
 * Optional apply via host script for catalog description footers.
 */
export async function remediateOrphans(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  let orphans = opts.orphans || [];
  if (!orphans.length) {
    try {
      const graph = JSON.parse(await readFile(resolve(outDir, 'link-graph.json'), 'utf8'));
      orphans = graph.orphans || graph.topOrphans || [];
    } catch {
      orphans = [];
    }
  }

  const prescriptions = orphans.map((url) => {
    const hub = hubFor(url, origin);
    return {
      orphan: url,
      ...hub,
      action:
        hub.kind === 'hreflang'
          ? 'Ensure language switcher + hreflang point here; add EN locations hub link in locale chrome.'
          : `Add contextual internal link from ${hub.hubLabel} (${hub.hub}) and 1–2 related detail pages.`,
      applyable: /catalog-(project|product|service)/.test(hub.kind),
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    count: prescriptions.length,
    prescriptions,
  };

  await mkdir(outDir, { recursive: true });
  const jsonPath = resolve(outDir, 'orphan-prescriptions.json');
  const mdPath = resolve(outDir, 'orphan-prescriptions.md');
  await writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    mdPath,
    [
      `# Orphan link prescriptions — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt} · ${prescriptions.length} orphan(s)`,
      '',
      ...prescriptions.map(
        (p) =>
          `- **${p.orphan.replace(origin, '')}** → link from [${p.hubLabel}](${p.hub}) _(${p.kind})_\n  - ${p.action}`
      ),
      '',
    ].join('\n'),
    'utf8'
  );

  const findings =
    prescriptions.length >= 3
      ? [
          {
            code: 'ORPHAN_REMEDIATE',
            severity: 'medium',
            title: `${prescriptions.length} orphan page(s) — prescriptions ready`,
            detail: prescriptions
              .slice(0, 6)
              .map((p) => p.orphan.replace(origin, ''))
              .join('; '),
            remediation: 'Review orphan-prescriptions.md; Autopilot can apply catalog hub footers when MERIDIAN_AUTO_APPLY_ORPHANS=1.',
            owner: 'marketing',
            pillar: 'onpage',
          },
        ]
      : [];

  let applyResult = null;
  const wantApply =
    opts.apply === true ||
    process.env.MERIDIAN_AUTO_APPLY_ORPHANS === '1' ||
    profile.autopilot?.autoApplyOrphans === true;

  if (wantApply && prescriptions.some((p) => p.applyable)) {
    applyResult = await runApplyScript(jsonPath);
  }

  return {
    ok: true,
    status: 'ok',
    message: applyResult
      ? `Prescribed ${prescriptions.length} orphan(s); apply: ${applyResult.message}`
      : `Prescribed ${prescriptions.length} orphan → hub link(s)`,
    data: { ...payload, paths: { jsonPath, mdPath }, apply: applyResult },
    findings,
  };
}

function runApplyScript(prescriptionsPath) {
  const script = resolve(process.cwd(), 'scripts/meridian-orphan-apply.mjs');
  return new Promise(async (resolvePromise) => {
    try {
      await access(script);
    } catch {
      resolvePromise({ ok: false, message: 'orphan apply script missing' });
      return;
    }
    const child = spawn(process.execPath, [script, '--apply', '--json', '--file', prescriptionsPath], {
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
      try {
        const data = JSON.parse(stdout.trim() || '{}');
        resolvePromise({ ok: code === 0, message: data.message || `exit ${code}`, data });
      } catch {
        resolvePromise({ ok: code === 0, message: stderr.slice(0, 200) || `exit ${code}` });
      }
    });
  });
}
