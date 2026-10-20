import { spawn } from 'node:child_process';
import { access, writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dbReady, dbSkipReason } from '../lib/db-ready.mjs';
import { googleEnvStatus } from './google-auth.mjs';
import { inspectUrl } from './gsc-act.mjs';
import { fetchManual, schemaTypesOf } from '../lib/html.mjs';

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
      if (code !== 0) reject(new Error(stderr.trim() || `catalog-steward exit ${code}`));
      else resolvePromise(stdout.trim());
    });
    child.on('error', reject);
  });
}

/**
 * Catalog Continuum — Inventory / Media / Products / Services / Projects.
 * Auto-heals meta/alt/OG; probes recent live URLs; queues GSC inspect for healed paths.
 */
export async function runCatalogSteward(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');

  if (!dbReady()) {
    return {
      ok: true,
      status: 'skipped',
      message: `Catalog steward skipped — ${dbSkipReason()}`,
      data: { skippedDb: true, continuumNominal: true },
    };
  }

  const script = resolve(
    process.cwd(),
    process.env.MERIDIAN_CATALOG_STEWARD_SCRIPT || 'scripts/meridian-catalog-steward.mjs'
  );
  try {
    await access(script);
  } catch {
    return {
      ok: true,
      status: 'skipped',
      message: 'No catalog-steward host script',
      data: { continuumNominal: true },
    };
  }

  const outFile = resolve(outDir, 'catalog-steward.json');
  const wantApply =
    opts.apply !== false &&
    (opts.apply === true ||
      process.env.MERIDIAN_AUTO_CATALOG_STEWARD !== '0' ||
      profile.autopilot?.autoCatalogSteward !== false);

  try {
    const args = ['--json', '--out', outFile];
    if (wantApply) args.push('--apply');
    if (opts.force === true || process.env.MERIDIAN_FORCE_CATALOG_META === '1') args.push('--force');
    if (opts.id) args.push('--id', String(opts.id));

    const raw = await runNodeJson(script, args);
    const data = JSON.parse(raw);
    const stats = data.stats || {};
    const indexPaths = data.indexPaths || [];

    // Live probe recently healed / sample catalog URLs
    const probePaths = (
      indexPaths.length
        ? indexPaths
        : [profile.sampleDetailPath, '/products', '/services', '/projects'].filter(Boolean)
    ).slice(0, opts.probeLimit ?? profile.autopilot?.catalogProbeLimit ?? 6);

    const probes = [];
    if (profile.indexable && opts.skipProbe !== true) {
      for (const path of probePaths) {
        const url = path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? path : `/${path}`}`;
        try {
          // eslint-disable-next-line no-await-in-loop
          const res = await fetchManual(url, { forceBody: true });
          const types = schemaTypesOf(res.body || '');
          const hasBreadcrumb = types.some((t) => /BreadcrumbList/i.test(t));
          const titleOk = /<title>[^<]{10,}<\/title>/i.test(res.body || '');
          const canonOk = /rel=["']canonical["']/i.test(res.body || '');
          const ok = res.status >= 200 && res.status < 300 && hasBreadcrumb && titleOk;
          probes.push({
            path,
            url,
            status: res.status,
            types,
            hasBreadcrumb,
            titleOk,
            canonOk,
            ok,
          });
        } catch (e) {
          probes.push({ path, url, ok: false, error: String(e.message || e).slice(0, 160) });
        }
      }
    }

    // GSC inspect healed URLs + unpublished/deleted removal queue
    const inspections = [];
    const removalInspections = [];
    const auth = googleEnvStatus();
    const wantInspect =
      opts.skipIndex !== true &&
      profile.indexable &&
      auth.ok &&
      (opts.inspect === true ||
        process.env.MERIDIAN_AUTO_CATALOG_INDEX !== '0' ||
        profile.autopilot?.autoCatalogIndex !== false);

    if (wantInspect && indexPaths.length > 0) {
      for (const path of indexPaths.slice(0, opts.inspectLimit ?? profile.autopilot?.catalogInspectLimit ?? 5)) {
        const url = `${origin}${path}`;
        try {
          // eslint-disable-next-line no-await-in-loop
          const r = await inspectUrl(profile, url);
          inspections.push({ url, ok: r.ok, message: r.message, coverage: r.data?.coverageState });
        } catch (e) {
          inspections.push({ url, ok: false, message: String(e.message || e).slice(0, 160) });
        }
      }
    }

    const removalQueue = data.removalQueue || [];
    if (wantInspect && removalQueue.length && opts.skipRemovals !== true) {
      const processedIds = [];
      for (const row of removalQueue.slice(0, opts.removalLimit ?? 8)) {
        const url = `${origin}${row.path}`;
        try {
          // eslint-disable-next-line no-await-in-loop
          const r = await inspectUrl(profile, url);
          removalInspections.push({
            url,
            ok: r.ok,
            event: row.event,
            coverage: r.data?.coverageState,
            message: r.message,
          });
          processedIds.push(row.id);
        } catch (e) {
          removalInspections.push({ url, ok: false, event: row.event, message: String(e.message || e).slice(0, 160) });
          processedIds.push(row.id);
        }
      }
      if (processedIds.length) {
        try {
          await runNodeJson(script, ['--json', '--mark-inspected', processedIds.join(',')]);
        } catch {
          /* best-effort mark */
        }
      }
    }

    const probeFails = probes.filter((p) => !p.ok).length;
    const dupes = Number(stats.duplicateTitleGroups || 0);
    const dupesFixed = Number(stats.duplicatesFixed || 0);
    const continuumNominal = probeFails === 0 && (stats.actionCount || 0) < 200;

    const board = {
      generatedAt: new Date().toISOString(),
      phase: '32',
      origin,
      continuumNominal,
      apply: wantApply,
      scanned: data.scanned ?? 0,
      scannedBy: data.scannedBy || null,
      stats,
      probeFails,
      probes,
      inspections,
      removalInspections,
      duplicates: data.duplicates || [],
      indexPaths,
      removalQueue,
      boardLine: continuumNominal
        ? `Content continuum NOMINAL · scanned ${data.scanned ?? 0} · meta ${stats.healedMeta || 0} · alt ${stats.healedAlt || 0} · OG ${stats.healedOg || 0} · dupes fixed ${dupesFixed}/${dupes} · removals ${removalInspections.length}`
        : `Content continuum ALERT · probe fails ${probeFails} · actions ${stats.actionCount || 0}`,
    };

    await writeFile(resolve(outDir, 'catalog-continuum.json'), JSON.stringify(board, null, 2), 'utf8');
    await writeFile(
      resolve(outDir, 'catalog-continuum.md'),
      [
        `# Catalog Continuum — ${profile.displayName || profile.id}`,
        '',
        `Generated: ${board.generatedAt}`,
        '',
        board.boardLine,
        '',
        '| Check | Result |',
        '| --- | --- |',
        `| Scanned | ${board.scanned} |`,
        `| Meta heals | ${stats.healedMeta || 0} |`,
        `| Stale refreshes | ${stats.staleRefreshed || 0} |`,
        `| OG syncs | ${stats.healedOg || 0} |`,
        `| Alt fills | ${stats.healedAlt || 0} |`,
        `| Manual preserved | ${stats.preservedManual || 0} |`,
        `| Live probes | ${probes.length} (fail ${probeFails}) |`,
        `| GSC inspects | ${inspections.length} |`,
        `| Duplicate titles | ${dupes} |`,
        '',
        'Inventory saves auto-heal via `catalog-seo-steward`. Fleet pass runs on every observe / autopilot.',
        '',
        'See `catalog-steward.md` for heal detail.',
        '',
      ].join('\n'),
      'utf8'
    );

    // Keep host md next to json if script wrote it
    try {
      await readFile(resolve(outDir, 'catalog-steward.md'), 'utf8');
    } catch {
      /* optional */
    }

    const findings = [];
    if (dupes > 0) {
      findings.push({
        code: 'CATALOG_DUPLICATE_TITLES',
        severity: dupesFixed >= dupes - 1 ? 'low' : dupes >= 5 ? 'medium' : 'low',
        title:
          dupesFixed > 0
            ? `${dupes} duplicate title group(s); auto-fixed ${dupesFixed} Meridian-owned`
            : `${dupes} duplicate meta title group(s) (manual titles preserved)`,
        remediation:
          dupesFixed > 0
            ? 'Automatic — review catalog-steward.md. Manual SEO titles were left untouched.'
            : 'Admin SEO tab: uniquify remaining manual duplicates.',
        owner: 'marketing',
        pillar: 'onpage',
      });
    }
    if (removalInspections.length > 0) {
      findings.push({
        code: 'SEO_REMOVAL_QUEUE',
        severity: 'low',
        title: `Inspected ${removalInspections.length} unpublished/deleted URL(s) in GSC`,
        remediation: 'Hub 301 already applied when possible. Confirm coverage drops in Search Console over days.',
        owner: 'developer',
        pillar: 'technical',
      });
    }
    if (probeFails > 0) {
      findings.push({
        code: 'CATALOG_LIVE_PROBE',
        severity: 'medium',
        title: `${probeFails} catalog URL(s) failed live SEO probe`,
        remediation: 'Check canonical / BreadcrumbList / title on failed paths in catalog-continuum.json.',
        owner: 'developer',
        pillar: 'technical',
      });
    }
    if ((stats.healedMeta || 0) + (stats.healedAlt || 0) + (stats.healedOg || 0) > 0) {
      findings.push({
        code: 'CATALOG_STEWARD_HEALED',
        severity: 'low',
        title: `Catalog steward healed meta=${stats.healedMeta || 0} alt=${stats.healedAlt || 0} og=${stats.healedOg || 0}`,
        remediation: 'Automatic — no human action. Review catalog-steward.md if needed.',
        owner: 'developer',
        pillar: 'onpage',
      });
    }

    return {
      ok: true,
      status: continuumNominal ? 'nominal' : 'alert',
      message: board.boardLine,
      data: {
        ...board,
        paths: {
          json: outFile,
          continuum: resolve(outDir, 'catalog-continuum.json'),
          md: resolve(outDir, 'catalog-continuum.md'),
        },
      },
      findings,
    };
  } catch (e) {
    return {
      ok: false,
      status: 'error',
      message: `Catalog steward failed: ${String(e.message || e).slice(0, 240)}`,
      data: { continuumNominal: false },
      findings: [
        {
          code: 'CATALOG_STEWARD_ERROR',
          severity: 'medium',
          title: 'Catalog steward failed',
          detail: String(e.message || e).slice(0, 200),
          remediation: 'Check DB credentials and scripts/meridian-catalog-steward.mjs',
          owner: 'developer',
          pillar: 'technical',
        },
      ],
    };
  }
}
