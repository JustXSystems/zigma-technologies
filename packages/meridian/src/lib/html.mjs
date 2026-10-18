export function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function titleOf(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1].replace(/\s+/g, ' ').trim()) : '';
}

export function meta(html, name) {
  const m =
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}

export function prop(html, property) {
  const m =
    html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}

export function canonicalOf(html) {
  const m =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return m ? m[1] : '';
}

export function h1Count(html) {
  return (html.match(/<h1[\s>]/gi) || []).length;
}

export function brandCount(title, brand) {
  if (!brand) return 0;
  const re = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return (title.match(re) || []).length;
}

export function schemaTypesOf(html) {
  const types = new Set();
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      collectTypes(data, types);
    } catch {
      /* ignore invalid JSON-LD */
    }
  }
  return [...types];
}

function collectTypes(node, types) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const n of node) collectTypes(n, types);
    return;
  }
  if (typeof node !== 'object') return;
  if (node['@type']) {
    const t = node['@type'];
    if (Array.isArray(t)) t.forEach((x) => types.add(String(x)));
    else types.add(String(t));
  }
  if (node['@graph']) collectTypes(node['@graph'], types);
}

export async function fetchManual(url, { forceBody = false } = {}) {
  const res = await fetch(url, {
    redirect: 'manual',
    headers: { 'user-agent': 'MeridianSEO/0.1 (+https://justxsystems.com)' },
  });
  const headers = Object.fromEntries(res.headers.entries());
  let body = '';
  if ((res.status >= 200 && res.status < 300) || forceBody) {
    try {
      body = await res.text();
    } catch {
      body = '';
    }
  }
  return { status: res.status, headers, body, url };
}

export async function fetchFollow(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'MeridianSEO/0.1 (+https://justxsystems.com)' },
  });
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body: await res.text(), url: res.url };
}
