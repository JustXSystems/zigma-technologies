import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { polishMeta } from './meta-polish.mjs';
import { assessCityPages } from './city-pages-readiness.mjs';
import { writeReviewKit } from './review-kit.mjs';
import { writeCityDraft } from './city-draft.mjs';
import { seedThinContent } from './content-seed.mjs';
import { runGrowthRadar } from './growth-radar.mjs';
import { runGrowthCloser } from './growth-closer.mjs';
import { buildKeywordMap } from './keyword-map.mjs';
import { runCatalogSteward } from './catalog-steward.mjs';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function safe(id, fn) {
  try {
    const r = await fn();
    return { id, ok: r?.ok !== false, message: r?.message || id, status: r?.status, data: r?.data };
  } catch (e) {
    return { id, ok: false, message: String(e?.message || e).slice(0, 240), status: 'error' };
  }
}

/**
 * Silent Steward — auto-refresh remaining SEO ops that used to need humans.
 * Drafts/bridges only (no spam posts). City/review/meta/growth defend stay zero-ritual.
 */
export async function runSilentSteward(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const wantApply = opts.apply !== false;

  // Ensure Phase 1 pack surface exists (technical SEO was code-shipped; pack was missing)
  const phase1Html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<title>Phase 1 Technical — ${profile.displayName || profile.id}</title></head>
<body style="font-family:Segoe UI,system-ui,sans-serif;background:#0a0e14;color:#e8eef8;padding:2rem">
<h1>Phase 1 — Technical SEO</h1>
<p>Shipped live: canonicals, noindex PreProd, www→apex, H1, sitemap live, OG, verify hooks.</p>
<p>Re-check: <code>npm run seo:verify</code> · Forever: <code>npm run meridian:observe</code></p>
<p><a href="phase30-ops.html" style="color:#93c5fd">Dominion</a> ·
<a href="phase31-ops.html" style="color:#93c5fd">Steward</a> ·
<a href="../../../../SEO-GUIDE.md" style="color:#93c5fd">SEO-GUIDE</a></p>
</body></html>`;
  await writeFile(resolve(outDir, 'phase1-ops.html'), phase1Html, 'utf8');

  const stewards = [];
  if (opts.skipCatalogSteward === true) {
    stewards.push({
      id: 'catalog-steward',
      ok: true,
      message: 'Catalog continuum skipped (already healed this cycle)',
      status: 'skipped',
    });
  } else {
    stewards.push(
      await safe('catalog-steward', () =>
        runCatalogSteward(profile, {
          outDir,
          apply: wantApply && profile.autopilot?.autoCatalogSteward !== false,
          skipIndex: opts.skipIndex !== false,
          skipProbe: opts.skipCatalogProbe === true,
        })
      )
    );
  }
  stewards.push(
    await safe('meta-polish', () =>
      polishMeta(profile, {
        outDir,
        apply: wantApply && (process.env.MERIDIAN_AUTO_POLISH_META === '1' || profile.autopilot?.autoPolishMeta === true),
      })
    )
  );
  stewards.push(await safe('city-readiness', () => assessCityPages(profile, { outDir })));
  stewards.push(await safe('city-draft', () => writeCityDraft(profile, { outDir })));
  stewards.push(await safe('review-kit', () => writeReviewKit(profile, { outDir })));
  stewards.push(
    await safe('content-seed', () =>
      seedThinContent(profile, {
        outDir,
        apply: wantApply && (process.env.MERIDIAN_AUTO_SEED_CONTENT === '1' || profile.autopilot?.autoSeedContent === true),
      })
    )
  );
  stewards.push(await safe('keyword-map', () => buildKeywordMap(profile, { outDir })));

  const radar = await runGrowthRadar(profile, { outDir });
  stewards.push({ id: 'growth-radar', ok: radar.ok !== false, message: radar.message, status: radar.status });
  if (opts.skipCloser === true) {
    stewards.push({
      id: 'growth-closer',
      ok: true,
      message: 'Closer skipped (reseal) — already run this cycle',
      status: 'skipped',
    });
  } else if ((radar.data?.opportunityCount || 0) > 0) {
    const closer = await runGrowthCloser(profile, {
      outDir,
      apply: wantApply,
      radar,
      skipIndex: opts.skipIndex !== false,
    });
    stewards.push({
      id: 'growth-closer',
      ok: closer.ok !== false,
      message: closer.message,
      status: closer.status,
    });
  } else {
    stewards.push({ id: 'growth-closer', ok: true, message: 'No open opportunities', status: 'clear' });
  }

  const dominion = await readJson(resolve(outDir, 'dominion-apex.json'));
  const chronos = await readJson(resolve(outDir, 'chronos-pulse.json'));
  const continuum = await readJson(resolve(outDir, 'conversion-continuum.json'));
  const city = await readJson(resolve(outDir, 'city-pages-readiness.json'));
  const failStewards = stewards.filter((s) => !s.ok);
  const stewardNominal =
    (dominion?.dominionCrowned === true || opts.requireDominion === false) && failStewards.length === 0;

  const cityHeld = (city?.pages || city?.data?.pages || []).filter((p) => p.noindex || !p.readyToIndex).length;
  const board = {
    generatedAt: new Date().toISOString(),
    phase: '31',
    origin,
    stewardNominal,
    stewardCount: stewards.length,
    failCount: failStewards.length,
    stewards: stewards.map(({ id, ok, message, status }) => ({ id, ok, message, status })),
    signals: {
      dominionCrowned: !!dominion?.dominionCrowned,
      chronosArmed: !!chronos?.chronosArmed,
      continuumOnline: !!continuum?.continuumOnline,
      growthOpportunities: radar.data?.opportunityCount ?? null,
      cityTemplatesHeld: cityHeld || city?.heldCount || null,
      enquiries28: continuum?.signals?.enquiries28 ?? null,
    },
    boardLine: stewardNominal
      ? `Silent steward NOMINAL · ${stewards.length}/${stewards.length} stewards · dominion CROWNED · city templates held (quality gate)`
      : `Silent steward ALERT · ${failStewards.length} fail: ${failStewards.map((f) => f.id).join(', ')}`,
    forever: ['npm run meridian:observe', 'npm run meridian:steward', 'Monday meridian-autopilot.yml'],
    humanNote:
      'All pack rituals auto. Catalog continuum heals Inventory/Media/Products/Services/Projects each run + on Admin save. City draft staged (noindex). GBP verify stays optional Google-only gate.',
  };

  await writeFile(resolve(outDir, 'silent-steward.json'), JSON.stringify(board, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'silent-steward.md'),
    [
      `# Silent steward — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${board.generatedAt}`,
      '',
      board.boardLine,
      '',
      '| Steward | Status | Message |',
      '| --- | --- | --- |',
      ...stewards.map((s) => `| ${s.id} | ${s.ok ? 'OK' : 'FAIL'} | ${s.message} |`),
      '',
      board.humanNote,
      '',
      'Forever: `npm run meridian:observe`',
      '',
    ].join('\n'),
    'utf8'
  );

  return {
    ok: true,
    status: stewardNominal ? 'nominal' : 'alert',
    message: board.boardLine,
    data: {
      ...board,
      paths: {
        json: resolve(outDir, 'silent-steward.json'),
        md: resolve(outDir, 'silent-steward.md'),
        phase1: resolve(outDir, 'phase1-ops.html'),
      },
    },
    findings: failStewards.map((f) => ({
      code: `STEWARD_${f.id.toUpperCase().replace(/-/g, '_')}`,
      severity: 'medium',
      title: `Steward failed: ${f.id}`,
      detail: f.message,
      remediation: 'npm run meridian:observe',
      owner: 'developer',
      pillar: 'technical',
    })),
  };
}
