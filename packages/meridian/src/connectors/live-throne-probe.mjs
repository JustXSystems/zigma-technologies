import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

function extractLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      /* ignore */
    }
  }
  return blocks;
}

function walkNodes(data, out = []) {
  if (!data) return out;
  if (Array.isArray(data)) {
    for (const n of data) walkNodes(n, out);
    return out;
  }
  if (typeof data === 'object') {
    if (data['@graph']) walkNodes(data['@graph'], out);
    else out.push(data);
  }
  return out;
}

/**
 * Probe live origin for Quiet Throne signals (hasMap / sameAs / LocalBusiness).
 */
export async function probeLiveThrone(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');

  let html = '';
  let fetchOk = false;
  let status = 0;
  try {
    const res = await fetch(origin + '/', {
      headers: { 'user-agent': 'MeridianLiveThrone/1.0 (+https://zigma-technologies.com)' },
      signal: AbortSignal.timeout(25000),
      redirect: 'follow',
    });
    status = res.status;
    html = await res.text();
    fetchOk = res.ok;
  } catch (e) {
    const payload = {
      generatedAt: new Date().toISOString(),
      origin,
      fetchOk: false,
      status: 0,
      error: String(e?.message || e),
      hasMap: false,
      sameAs: false,
      localBusiness: false,
      liveThrone: false,
      needsDeploy: true,
    };
    await writeFile(resolve(outDir, 'live-throne.json'), JSON.stringify(payload, null, 2), 'utf8');
    return {
      ok: false,
      status: 'error',
      message: `Live throne probe failed — ${payload.error}`,
      data: { ...payload, paths: { json: resolve(outDir, 'live-throne.json') } },
    };
  }

  const nodes = [];
  for (const b of extractLdBlocks(html)) walkNodes(b, nodes);

  let hasMap = false;
  let sameAs = false;
  let localBusiness = false;
  let hasMapValue = null;
  let sameAsCount = 0;

  for (const n of nodes) {
    const types = [].concat(n['@type'] || []).map(String);
    if (types.some((t) => /Organization|LocalBusiness/i.test(t))) {
      if (types.some((t) => /LocalBusiness/i.test(t))) localBusiness = true;
      if (n.hasMap) {
        hasMap = true;
        hasMapValue = String(n.hasMap);
      }
      const sa = Array.isArray(n.sameAs) ? n.sameAs : [];
      if (sa.length) {
        sameAs = true;
        sameAsCount = sa.length;
      }
    }
  }

  const liveThrone = fetchOk && hasMap && sameAs && localBusiness;
  const payload = {
    generatedAt: new Date().toISOString(),
    origin,
    fetchOk,
    status,
    hasMap,
    hasMapValue,
    sameAs,
    sameAsCount,
    localBusiness,
    liveThrone,
    needsDeploy: !hasMap,
    note: hasMap
      ? 'Production emits LocalBusiness hasMap — live throne sealed'
      : 'hasMap missing on Production — deploy code that emits NAP hasMap (Phase 22)',
  };

  await writeFile(resolve(outDir, 'live-throne.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'live-throne.md'),
    [
      `# Live throne probe — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Fetch: **${fetchOk ? 'OK' : 'FAIL'}** (${status})`,
      `- LocalBusiness: **${localBusiness}**`,
      `- sameAs: **${sameAs}** (${sameAsCount})`,
      `- hasMap: **${hasMap}**${hasMapValue ? ` · \`${hasMapValue}\`` : ''}`,
      `- Live throne: **${liveThrone ? 'SEALED' : 'PENDING DEPLOY'}**`,
      '',
      payload.note,
      '',
    ].join('\n'),
    'utf8'
  );

  return {
    ok: fetchOk,
    status: liveThrone ? 'ok' : needsDeployStatus(payload),
    message: liveThrone
      ? 'Live throne SEALED · hasMap + sameAs on Production'
      : `Live throne pending · hasMap ${hasMap ? 'ok' : 'MISSING'} · sameAs ${sameAs ? 'ok' : 'missing'}`,
    data: {
      ...payload,
      paths: {
        json: resolve(outDir, 'live-throne.json'),
        md: resolve(outDir, 'live-throne.md'),
      },
    },
  };
}

function needsDeployStatus(payload) {
  return payload.needsDeploy ? 'pending' : 'ok';
}
