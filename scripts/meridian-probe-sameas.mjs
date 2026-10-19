#!/usr/bin/env node
const origin = (process.argv.find((a) => a.startsWith('--origin=')) || '--origin=https://zigma-technologies.com').slice(9);
const bust = `${origin.replace(/\/$/, '')}/?meridian=${Date.now()}`;
const res = await fetch(bust, { headers: { 'user-agent': 'MeridianProbe/1.0', 'cache-control': 'no-cache' } });
const body = await res.text();
const urls = [];
for (const m of body.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
  try {
    const data = JSON.parse(m[1]);
    const nodes = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
    for (const n of nodes) {
      const sa = n?.sameAs;
      if (Array.isArray(sa)) urls.push(...sa.filter((u) => typeof u === 'string'));
      else if (typeof sa === 'string') urls.push(sa);
    }
  } catch {
    /* ignore */
  }
}
const out = {
  ok: res.ok,
  status: res.status,
  hasSameAs: urls.length > 0,
  urls: [...new Set(urls)],
  hasOrganization: /Organization/.test(body),
};
console.log(JSON.stringify(out, null, 2));
process.exit(0);
