import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dbReady, dbSkipReason } from '../lib/db-ready.mjs';

/**
 * Host-side meta draft/apply via scripts/meridian-meta-*.mjs (portable: scripts optional).
 */

function skipDb(label) {
  const reason = dbSkipReason();
  return {
    ok: true,
    status: 'skipped',
    message: `${label} skipped — ${reason}`,
    data: { count: 0, skippedDb: true },
  };
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
        reject(new Error(stderr.trim() || `${script} exit ${code}`));
        return;
      }
      resolvePromise(stdout.trim());
    });
    child.on('error', reject);
  });
}

async function resolveScript(cfgKey, envKey, defaultRel) {
  const rel = process.env[envKey] || defaultRel;
  const script = resolve(process.cwd(), rel);
  try {
    await access(script);
    return { ok: true, script, rel };
  } catch {
    return { ok: false, script, rel };
  }
}

/**
 * Generate meta drafts for CMS gaps (Appendix B formulas). Always safe (writes JSON only).
 */
export async function draftMeta(profile, opts = {}) {
  const cfg = profile.connectors?.metaDraft || {};
  if (cfg.enabled === false) {
    return { ok: true, status: 'skipped', message: 'Meta draft disabled in profile', data: { count: 0 } };
  }
  if (!dbReady()) return skipDb('Meta draft');

  const found = await resolveScript('draft', 'MERIDIAN_META_DRAFT_SCRIPT', 'scripts/meridian-meta-draft.mjs');
  if (!found.ok) {
    return {
      ok: true,
      status: 'skipped',
      message: `No draft script at ${found.rel}`,
      data: { count: 0 },
    };
  }

  const outRel =
    opts.outFile ||
    cfg.outFile ||
    `storage/meridian/${profile.id || 'site'}/meta-drafts.json`;
  const outPath = resolve(process.cwd(), outRel);

  try {
    const raw = await runNodeJson(found.script, ['--json', '--out', outPath]);
    const data = JSON.parse(raw);
    const count = Number(data.count || 0);
    return {
      ok: true,
      status: 'ok',
      message: count ? `Drafted meta for ${count} CMS row(s)` : 'No CMS meta gaps to draft',
      data: { count, outPath, sample: (data.drafts || []).slice(0, 5) },
    };
  } catch (e) {
    return {
      ok: false,
      status: 'error',
      message: `Meta draft failed: ${String(e.message || e).slice(0, 240)}`,
      data: { count: 0 },
    };
  }
}

/**
 * Generate alt-text drafts for catalog_media missing alt.
 */
export async function draftAlt(profile, opts = {}) {
  const cfg = profile.connectors?.altDraft || {};
  if (cfg.enabled === false) {
    return { ok: true, status: 'skipped', message: 'Alt draft disabled in profile', data: { count: 0 } };
  }
  if (!dbReady()) return skipDb('Alt draft');

  const found = await resolveScript('alt-draft', 'MERIDIAN_ALT_DRAFT_SCRIPT', 'scripts/meridian-alt-draft.mjs');
  if (!found.ok) {
    return { ok: true, status: 'skipped', message: `No alt draft script at ${found.rel}`, data: { count: 0 } };
  }

  const outRel =
    opts.outFile || cfg.outFile || `storage/meridian/${profile.id || 'site'}/alt-drafts.json`;
  const outPath = resolve(process.cwd(), outRel);

  try {
    const raw = await runNodeJson(found.script, ['--json', '--out', outPath]);
    const data = JSON.parse(raw);
    const count = Number(data.count || 0);
    return {
      ok: true,
      status: 'ok',
      message: count ? `Drafted alt for ${count} media row(s)` : 'No media alt gaps to draft',
      data: { count, outPath, sample: (data.drafts || []).slice(0, 5) },
    };
  } catch (e) {
    return {
      ok: false,
      status: 'error',
      message: `Alt draft failed: ${String(e.message || e).slice(0, 240)}`,
      data: { count: 0 },
    };
  }
}

/**
 * Apply alt drafts to catalog_media.
 */
export async function applyAlt(profile, opts = {}) {
  const cfg = profile.connectors?.altApply || {};
  if (cfg.enabled === false) {
    return { ok: true, status: 'skipped', message: 'Alt apply disabled in profile', data: {} };
  }
  if (!dbReady()) return { ...skipDb('Alt apply'), data: {} };

  const found = await resolveScript('alt-apply', 'MERIDIAN_ALT_APPLY_SCRIPT', 'scripts/meridian-alt-apply.mjs');
  if (!found.ok) {
    return { ok: true, status: 'skipped', message: `No alt apply script at ${found.rel}`, data: {} };
  }

  const fileRel = opts.file || cfg.file || `storage/meridian/${profile.id || 'site'}/alt-drafts.json`;
  const filePath = resolve(process.cwd(), fileRel);
  const args = ['--json', '--file', filePath];
  if (opts.apply) args.push('--apply');
  else args.push('--dry-run');
  if (opts.force) args.push('--force');

  try {
    const raw = await runNodeJson(found.script, args);
    const data = JSON.parse(raw);
    return {
      ok: true,
      status: 'ok',
      message: data.dryRun
        ? `Dry-run: would update ${data.updated} of ${data.totalDrafts} alt drafts`
        : `Applied alt to ~${data.updated} media row(s)`,
      data,
    };
  } catch (e) {
    return {
      ok: false,
      status: 'error',
      message: `Alt apply failed: ${String(e.message || e).slice(0, 240)}`,
      data: {},
    };
  }
}

/**
 * Apply meta drafts to DB. Only fills empty/short fields unless force.
 * @param {{ apply?: boolean, force?: boolean, file?: string }} opts
 */
export async function applyMeta(profile, opts = {}) {
  const cfg = profile.connectors?.metaApply || {};
  if (cfg.enabled === false) {
    return { ok: true, status: 'skipped', message: 'Meta apply disabled in profile', data: {} };
  }
  if (!dbReady()) return { ...skipDb('Meta apply'), data: {} };

  const found = await resolveScript('apply', 'MERIDIAN_META_APPLY_SCRIPT', 'scripts/meridian-meta-apply.mjs');
  if (!found.ok) {
    return {
      ok: true,
      status: 'skipped',
      message: `No apply script at ${found.rel}`,
      data: {},
    };
  }

  const fileRel =
    opts.file ||
    cfg.file ||
    `storage/meridian/${profile.id || 'site'}/meta-drafts.json`;
  const filePath = resolve(process.cwd(), fileRel);
  const args = ['--json', '--file', filePath];
  if (opts.apply) args.push('--apply');
  else args.push('--dry-run');
  if (opts.force) args.push('--force');

  try {
    const raw = await runNodeJson(found.script, args);
    const data = JSON.parse(raw);
    return {
      ok: true,
      status: 'ok',
      message: data.dryRun
        ? `Dry-run: would update ${data.updated} of ${data.totalDrafts} drafts`
        : `Applied meta to ~${data.updated} CMS row(s)`,
      data,
    };
  } catch (e) {
    return {
      ok: false,
      status: 'error',
      message: `Meta apply failed: ${String(e.message || e).slice(0, 240)}`,
      data: {},
    };
  }
}
