import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Optional CMS SEO-gap scan via host script (Zigma: scripts/meridian-cms-gaps.mjs).
 * Keeps Meridian portable — script is host-specific.
 */
export async function collectCmsGaps(profile) {
  const cfg = profile.connectors?.cmsGaps || profile.connectors?.['cms-gaps'] || {};
  if (cfg.enabled === false) {
    return { id: 'cms-gaps', label: 'CMS SEO gaps', status: 'skipped', message: 'Disabled in profile' };
  }

  const scriptRel = cfg.script || process.env.MERIDIAN_CMS_GAPS_SCRIPT || 'scripts/meridian-cms-gaps.mjs';
  const script = resolve(process.cwd(), scriptRel);

  try {
    await access(script);
  } catch {
    return {
      id: 'cms-gaps',
      label: 'CMS SEO gaps',
      status: 'skipped',
      message: `No host script at ${scriptRel} (optional)`,
    };
  }

  try {
    const raw = await runNodeJson(script, ['--json']);
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const gaps = Array.isArray(data.gaps) ? data.gaps : [];
    // One scorecard finding + details in data (avoid tanking score with dozens of medium hits)
    const findings =
      gaps.length === 0
        ? []
        : [
            {
              code: 'CMS_SEO_GAPS',
              // Cap at medium so content debt never fails deploy/autopilot hard gate (critical/high)
              severity: gaps.length >= 5 ? 'medium' : 'low',
              title: `${gaps.length} CMS SEO gap(s) (missing/short meta)`,
              detail: gaps
                .slice(0, 8)
                .map((g) => g.title || g.path)
                .join('; '),
              remediation:
                'Run Meridian autopilot (draft-meta) or Admin → SEO → Meridian → Draft meta, then Apply meta / set MERIDIAN_AUTO_APPLY_META=1. Or hand-edit SEO tabs. List: signals.cmsGaps.',
              owner: 'marketing',
              pillar: 'onpage',
              evidence: `scanned catalog=${data.scanned?.catalog ?? '?'} pages=${data.scanned?.pages ?? '?'}`,
            },
          ];

    return {
      id: 'cms-gaps',
      label: 'CMS SEO gaps',
      status: 'ok',
      message: gaps.length ? `${gaps.length} content SEO gap(s) found` : 'No CMS SEO gaps detected',
      data: { gaps: gaps.slice(0, 80), scanned: data.scanned || null, errors: data.errors || [] },
      findings,
    };
  } catch (e) {
    // Soft-fail: CMS gaps are advisory; do not block autopilot hard-fail on script issues
    return {
      id: 'cms-gaps',
      label: 'CMS SEO gaps',
      status: 'degraded',
      message: `Gap scan unavailable: ${String(e.message || e).slice(0, 200)}`,
    };
  }
}

function runNodeJson(script, args) {
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
      if (code !== 0) {
        reject(new Error(stderr.trim() || `cms-gaps script exit ${code}`));
        return;
      }
      resolvePromise(stdout.trim());
    });
    child.on('error', reject);
  });
}
