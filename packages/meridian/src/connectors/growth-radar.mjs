import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Growth radar — turn GSC query waste into automated content / CTR opportunities.
 * No human spreadsheet: briefs are regenerated every observe.
 */
export async function runGrowthRadar(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });

  let topQueries = [];
  const cache = await readJson(resolve(outDir, 'signal-cache.json'));
  topQueries = cache?.gsc?.topQueries || [];

  if (!topQueries.length) {
    try {
      const { collectGsc } = await import('./gsc.mjs');
      const gsc = await collectGsc(profile);
      topQueries = gsc.data?.topQueries || [];
    } catch {
      /* keep empty */
    }
  }

  const opportunities = [];
  for (const row of topQueries) {
    const impressions = Number(row.impressions) || 0;
    const clicks = Number(row.clicks) || 0;
    const ctr = Number(row.ctr) || (impressions ? clicks / impressions : 0);
    const position = Number(row.position) || 0;
    const query = String(row.query || '').trim();
    if (!query || impressions < 20) continue;

    let kind = null;
    let action = null;
    if (impressions >= 40 && ctr < 0.03 && position <= 20) {
      kind = 'ctr-lift';
      action = 'Rewrite title/description for this query intent; ensure H1 mirrors the phrase once.';
    } else if (position > 10 && position <= 30 && impressions >= 30) {
      kind = 'page-2-push';
      action = 'Strengthen on-page proof (project cites, FAQ) targeting this query; internal link from hub.';
    } else if (ctr >= 0.05 && position <= 8 && impressions >= 50) {
      kind = 'defend-winner';
      action = 'Keep page fresh; add FAQ / related projects so position does not slip.';
    }
    if (!kind) continue;

    opportunities.push({
      query,
      impressions,
      clicks,
      ctr: Math.round(ctr * 1000) / 1000,
      position: Math.round(position * 10) / 10,
      kind,
      action,
      briefTitle: `${kind === 'ctr-lift' ? 'CTR' : kind === 'page-2-push' ? 'Rank' : 'Defend'}: ${query}`,
    });
  }

  opportunities.sort((a, b) => b.impressions - a.impressions);
  const top = opportunities.slice(0, 12);

  const payload = {
    generatedAt: new Date().toISOString(),
    origin: String(profile.origin || '').replace(/\/$/, ''),
    sourceQueries: topQueries.length,
    opportunityCount: top.length,
    opportunities: top,
    forever: 'Auto-refreshed by npm run meridian:observe — no spreadsheet ritual',
  };

  await writeFile(resolve(outDir, 'growth-radar.json'), JSON.stringify(payload, null, 2), 'utf8');

  const md = [
    `# Growth radar — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `Opportunities: **${top.length}** from ${topQueries.length} GSC queries (28d sample).`,
    '',
    '| Query | Imp | CTR | Pos | Kind | Action |',
    '| --- | ---: | ---: | ---: | --- | --- |',
    ...top.map(
      (o) =>
        `| ${o.query} | ${o.impressions} | ${(o.ctr * 100).toFixed(1)}% | ${o.position} | ${o.kind} | ${o.action} |`
    ),
    '',
    top.length
      ? 'Publish improvements via Admin inventory/resources; Meridian meta polish covers empty fields.'
      : '_No high-signal opportunities this cycle — keep observe running._',
    '',
  ].join('\n');
  await writeFile(resolve(outDir, 'growth-radar.md'), md, 'utf8');

  // Machine briefs for calendar / content seed consumers
  await writeFile(
    resolve(outDir, 'growth-briefs.json'),
    JSON.stringify(
      {
        generatedAt: payload.generatedAt,
        briefs: top.map((o) => ({
          title: o.briefTitle,
          query: o.query,
          kind: o.kind,
          outline: [o.action, `Primary keyword: ${o.query}`, 'Include Bengaluru / service proof where natural'],
        })),
      },
      null,
      2
    ),
    'utf8'
  );

  return {
    ok: true,
    status: 'ok',
    message: `Growth radar · ${top.length} opportunity(ies) from ${topQueries.length} queries`,
    data: {
      ...payload,
      paths: {
        json: resolve(outDir, 'growth-radar.json'),
        md: resolve(outDir, 'growth-radar.md'),
        briefs: resolve(outDir, 'growth-briefs.json'),
      },
    },
  };
}
