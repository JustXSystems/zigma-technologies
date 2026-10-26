/**
 * Static public-root Product Agent helpers (SPA / marketing HTML sites).
 * Writes robots/sitemap/Bing/IndexNow files and lightly patches index.html <head>.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function bareGscToken(raw) {
  const s = String(raw || '').trim();
  const nested = s.match(/content=["']([^"']+)["']/i);
  if (nested) return nested[1].trim();
  return s.replace(/^<meta\b[^>]*>$/i, '').trim() || s;
}

function patchHead(html, mutator) {
  const m = html.match(/<head([^>]*)>([\s\S]*?)<\/head>/i);
  if (!m) throw new Error('index.html missing <head>');
  const nextInner = mutator(m[2]);
  return html.slice(0, m.index) + `<head${m[1]}>${nextInner}</head>` + html.slice(m.index + m[0].length);
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * @param {string} publicRoot
 * @param {string} origin
 * @param {{ indexFile?: string, stateDir?: string }} [opts]
 */
export function collectStaticPublicInventory(publicRoot, origin, opts = {}) {
  const root = resolve(publicRoot);
  const originClean = String(origin || '').replace(/\/$/, '');
  const indexPath = resolve(root, opts.indexFile || 'index.html');
  const stateDir = resolve(opts.stateDir || resolve(root, '.meridian-agent'));
  const html = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
  const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [])[1] || '';
  const title = (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/\s+/g, ' ').trim() || '';
  const description =
    (head.match(/name=["']description["'][^>]*content=["']([^"']*)/i) ||
      head.match(/content=["']([^"']*)["'][^>]*name=["']description["']/i) || [])[1] || '';
  const canonical =
    (head.match(/rel=["']canonical["'][^>]*href=["']([^"']+)/i) ||
      head.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/i) || [])[1] || null;

  const media = [];
  const imgRe = /<img\b([^>]*)>/gi;
  let match;
  let i = 0;
  let skippedDataUri = 0;
  while ((match = imgRe.exec(html)) && media.length < 80) {
    const attrs = match[1];
    const srcRaw = (attrs.match(/\bsrc=["']([^"']+)/i) || [])[1];
    if (!srcRaw) continue;
    if (/^data:/i.test(srcRaw)) {
      skippedDataUri += 1;
      continue;
    }
    const src = srcRaw.startsWith('http')
      ? srcRaw
      : `${originClean}${srcRaw.startsWith('/') ? '' : '/'}${srcRaw}`;
    if (src.length > 500) continue;
    const altMatch = attrs.match(/\balt=["']([^"']*)["']/i);
    media.push({
      id: `img_${i++}`,
      src,
      alt: altMatch ? String(altMatch[1]).slice(0, 200) : '',
      onPaths: ['/'],
    });
  }

  const sitemapState = readJson(resolve(stateDir, 'sitemap-urls.json'), {
    urls: ['/'],
    excluded: [],
  });
  const pages = [
    {
      path: '/',
      url: `${originClean}/`,
      title: title.slice(0, 300),
      metaTitle: title.slice(0, 300),
      metaDescription: description.slice(0, 500),
      canonical,
      schemaJsonLd: /application\/ld\+json/i.test(head) ? { present: true } : null,
      indexable: true,
    },
  ];
  for (const p of sitemapState.excluded || []) {
    pages.push({
      path: p,
      url: `${originClean}${p}`,
      title: '',
      metaTitle: '',
      metaDescription: '',
      indexable: false,
    });
  }

  return {
    pages,
    media,
    meta: {
      cms: 'static-spa',
      publicRoot: root,
      hasRobotsTxt: existsSync(resolve(root, 'robots.txt')),
      hasSitemap: existsSync(resolve(root, 'sitemap.xml')),
      hasBingAuth: existsSync(resolve(root, 'BingSiteAuth.xml')),
      skippedDataUriImages: skippedDataUri,
    },
  };
}

/**
 * @param {object} patch
 * @param {{ publicRoot: string, origin: string, indexFile?: string, stateDir?: string }} ctx
 */
export async function applyStaticPublicPatch(patch, ctx) {
  const root = resolve(ctx.publicRoot);
  const originClean = String(ctx.origin || '').replace(/\/$/, '');
  const indexPath = resolve(root, ctx.indexFile || 'index.html');
  const stateDir = resolve(ctx.stateDir || resolve(root, '.meridian-agent'));
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(resolve(stateDir, 'backups'), { recursive: true });

  const kind = String(patch?.kind || '').toLowerCase();
  const payload = patch?.payload || {};

  function backupIndex() {
    if (!existsSync(indexPath)) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    copyFileSync(indexPath, resolve(stateDir, 'backups', `index-${stamp}.html`));
  }

  function writeRobots({ sitemapUrl, allowRoot, host }) {
    const path = resolve(root, 'robots.txt');
    let body = existsSync(path) ? readFileSync(path, 'utf8') : 'User-agent: *\nAllow: /\n';
    if (body.includes('<!DOCTYPE') || !/User-agent:/i.test(body)) {
      body = `User-agent: *\nAllow: /\n`;
    }
    if (allowRoot && !/Allow:\s*\//i.test(body)) {
      body = body.replace(/(User-agent:\s*\*[^\n]*\n)/i, `$1Allow: /\n`);
    }
    const sm = sitemapUrl || `${originClean}/sitemap.xml`;
    if (/^Sitemap:/im.test(body)) body = body.replace(/^Sitemap:.*$/im, `Sitemap: ${sm}`);
    else body = body.trimEnd() + `\n\nSitemap: ${sm}\n`;
    if (host) {
      const hostLine = `Host: ${String(host).replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
      if (/^Host:/im.test(body)) body = body.replace(/^Host:.*$/im, hostLine);
      else body = body.trimEnd() + `\n${hostLine}\n`;
    }
    writeFileSync(path, body.endsWith('\n') ? body : body + '\n', 'utf8');
    return { path, bytes: body.length };
  }

  function writeSitemap() {
    const statePath = resolve(stateDir, 'sitemap-urls.json');
    const state = readJson(statePath, { urls: ['/'], excluded: [] });
    const urls = [...new Set([...(state.urls || ['/'])])].filter(
      (u) => !(state.excluded || []).includes(u),
    );
    if (!urls.includes('/')) urls.unshift('/');
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map((u) => {
          const loc = u === '/' ? `${originClean}/` : `${originClean}${u}`;
          return `  <url><loc>${loc}</loc><changefreq>weekly</changefreq></url>`;
        })
        .join('\n') +
      `\n</urlset>\n`;
    writeFileSync(resolve(root, 'sitemap.xml'), xml, 'utf8');
    writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
    return { urls, excluded: state.excluded || [] };
  }

  if (kind === 'robots-hint') {
    const r = writeRobots({
      sitemapUrl: payload.sitemapUrl || `${originClean}/sitemap.xml`,
      allowRoot: payload.allowRoot !== false,
      host:
        payload.host ||
        originClean.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''),
    });
    writeSitemap();
    return r;
  }

  if (kind === 'sitemap-hint') {
    const statePath = resolve(stateDir, 'sitemap-urls.json');
    const state = readJson(statePath, { urls: ['/'], excluded: [] });
    const path = String(patch.path || '/');
    if (payload.include === false) {
      state.excluded = [...new Set([...(state.excluded || []), path])];
      state.urls = (state.urls || []).filter((u) => u !== path);
    } else if (payload.include === true) {
      state.urls = [...new Set([...(state.urls || []), path])];
      state.excluded = (state.excluded || []).filter((u) => u !== path);
    }
    writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
    return writeSitemap();
  }

  if (kind === 'bing-verify') {
    const code = String(
      payload.msvalidate || payload.authenticationCode || payload.content || '',
    ).trim();
    if (!code) throw new Error('bing code missing');
    writeFileSync(
      resolve(root, 'BingSiteAuth.xml'),
      `<?xml version="1.0"?>\n<users>\n\t<user>${code}</user>\n</users>\n`,
      'utf8',
    );
    return { ok: true, file: '/BingSiteAuth.xml' };
  }

  if (kind === 'indexnow-key') {
    const hex = String(payload.key || '').trim();
    if (!/^[a-f0-9]{8,64}$/i.test(hex)) throw new Error('invalid indexnow key');
    writeFileSync(resolve(root, `${hex}.txt`), hex, 'utf8');
    return { ok: true, file: `/${hex}.txt` };
  }

  if (kind === 'verify-meta') {
    const content = bareGscToken(payload.googleSiteVerification || payload.content || '');
    if (!/^[A-Za-z0-9_-]{10,}$/.test(content)) throw new Error('gsc content missing/invalid');
    backupIndex();
    let html = readFileSync(indexPath, 'utf8');
    const tag = `<meta name="google-site-verification" content="${escapeAttr(content)}">`;
    html = patchHead(html, (h) => {
      if (/name=["']google-site-verification["']/i.test(h)) {
        return h.replace(/<meta[^>]*name=["']google-site-verification["'][^>]*>/i, tag);
      }
      return tag + '\n' + h;
    });
    writeFileSync(indexPath, html, 'utf8');
    return { ok: true };
  }

  if (kind === 'canonical') {
    const canonical = String(payload.canonical || `${originClean}/`).trim();
    let html = readFileSync(indexPath, 'utf8');
    const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [])[1] || '';
    if (payload.onlyIfEmpty && /rel=["']canonical["']/i.test(head)) {
      return { ok: true, skipped: 'already-has-canonical' };
    }
    backupIndex();
    const tag = `<link rel="canonical" href="${escapeAttr(canonical)}">`;
    html = patchHead(html, (h) => {
      if (/rel=["']canonical["']/i.test(h)) {
        return h.replace(/<link[^>]*rel=["']canonical["'][^>]*>/i, tag);
      }
      return tag + '\n' + h;
    });
    writeFileSync(indexPath, html, 'utf8');
    return { ok: true, canonical };
  }

  if (kind === 'schema') {
    const schema = payload.schemaJsonLd;
    if (!schema) throw new Error('schemaJsonLd required');
    let html = readFileSync(indexPath, 'utf8');
    const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [])[1] || '';
    if (payload.onlyIfEmpty && /application\/ld\+json/i.test(head)) {
      return { ok: true, skipped: 'already-has-schema' };
    }
    backupIndex();
    const block =
      `<script type="application/ld+json">\n` + JSON.stringify(schema, null, 2) + `\n</script>`;
    html = patchHead(html, (h) => {
      if (/application\/ld\+json/i.test(h)) {
        return h.replace(
          /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i,
          block,
        );
      }
      return h + '\n' + block + '\n';
    });
    writeFileSync(indexPath, html, 'utf8');
    return { ok: true };
  }

  if (kind === 'meta') {
    const title = String(payload.title || '');
    const description = String(payload.description || '');
    const path = String(patch.path || '/');
    // Single index.html SPA: never rewrite shared <head> for non-root paths
    if (path !== '/') {
      throw new Error(`static SPA shares index.html — refuse meta apply for path ${path}`);
    }
    if (
      /thank\s*you/i.test(title) ||
      /no tag found/i.test(title) ||
      /no tag found/i.test(description) ||
      /thank\s*you/i.test(description)
    ) {
      throw new Error('refusing thank-you/garbage meta on homepage');
    }
    backupIndex();
    let html = readFileSync(indexPath, 'utf8');
    html = patchHead(html, (h) => {
      let next = h;
      if (payload.title) {
        next = /<title[\s>]/i.test(next)
          ? next.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(payload.title)}</title>`)
          : `<title>${escapeHtml(payload.title)}</title>\n` + next;
      }
      if (payload.description) {
        const descTag = `<meta name="description" content="${escapeAttr(payload.description)}">`;
        next = /name=["']description["']/i.test(next)
          ? next.replace(/<meta[^>]*name=["']description["'][^>]*>/i, descTag)
          : descTag + '\n' + next;
      }
      if (payload.ogTitle) {
        const tag = `<meta property="og:title" content="${escapeAttr(payload.ogTitle)}">`;
        next = /property=["']og:title["']/i.test(next)
          ? next.replace(/<meta[^>]*property=["']og:title["'][^>]*>/i, tag)
          : tag + '\n' + next;
      }
      if (payload.ogDescription) {
        const tag = `<meta property="og:description" content="${escapeAttr(payload.ogDescription)}">`;
        next = /property=["']og:description["']/i.test(next)
          ? next.replace(/<meta[^>]*property=["']og:description["'][^>]*>/i, tag)
          : tag + '\n' + next;
      }
      if (payload.ogImage) {
        const tag = `<meta property="og:image" content="${escapeAttr(payload.ogImage)}">`;
        if (payload.onlyIfEmpty && /property=["']og:image["']/i.test(next)) {
          /* keep existing */
        } else {
          next = /property=["']og:image["']/i.test(next)
            ? next.replace(/<meta[^>]*property=["']og:image["'][^>]*>/i, tag)
            : tag + '\n' + next;
        }
      }
      return next;
    });
    writeFileSync(indexPath, html, 'utf8');
    return { ok: true };
  }

  if (kind === 'redirect-hint') {
    const rulesPath = resolve(stateDir, 'redirects.json');
    const state = readJson(rulesPath, { rules: [] });
    const rule = {
      from: payload.from,
      to: payload.to,
      code: payload.code || 301,
      at: new Date().toISOString(),
    };
    state.rules = [...(state.rules || []).filter((r) => r.from !== rule.from), rule];
    writeFileSync(rulesPath, JSON.stringify(state, null, 2) + '\n', 'utf8');
    const host = originClean.replace(/^https?:\/\//, '').replace(/^www\./, '');
    writeFileSync(
      resolve(stateDir, 'nginx-www-apex.snippet.conf'),
      `# Meridian redirect-hint — apply in nginx when sudo available\nif ($host = www.${host}) {\n    return 301 https://${host}$request_uri;\n}\n`,
      'utf8',
    );
    return { ok: true, applied: 'state-recorded', needsNginxReload: true, rule };
  }

  if (kind === 'alt') {
    const src = String(payload.imageSrc || '').trim();
    const alt = String(payload.alt || '').trim();
    if (!src || !alt) throw new Error('alt requires imageSrc + alt');
    if (/^data:/i.test(src) || src.includes('#embedded-data-uri')) {
      throw new Error('cannot patch data-uri / synthetic inventory images');
    }
    backupIndex();
    let html = readFileSync(indexPath, 'utf8');
    const candidates = [src];
    try {
      const u = new URL(src, originClean);
      candidates.push(u.pathname, u.href);
    } catch {
      /* ignore */
    }
    let changed = 0;
    for (const c of candidates) {
      const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(<img\\b[^>]*\\bsrc=["']${esc}["'][^>]*)(>)`, 'i');
      if (!re.test(html)) continue;
      html = html.replace(re, (full, before, gt) => {
        if (/\balt=["'][^"']+["']/i.test(before) && payload.onlyIfEmpty) return full;
        if (/\balt=/i.test(before)) {
          return before.replace(/\balt=["'][^"']*["']/i, `alt="${escapeAttr(alt)}"`) + gt;
        }
        return `${before} alt="${escapeAttr(alt)}"${gt}`;
      });
      changed += 1;
      break;
    }
    if (!changed) throw new Error(`img src not found: ${src.slice(0, 80)}`);
    writeFileSync(indexPath, html, 'utf8');
    return { ok: true, changed };
  }

  throw new Error(`unhandled kind ${kind}`);
}

/**
 * Build a cron-friendly sync loop for static public roots.
 * @param {{ baseUrl: string, apiKey: string, publicRoot: string, origin: string, version?: string }} opts
 */
export function createStaticPublicAgent(opts) {
  const baseUrl = String(opts.baseUrl || '').replace(/\/$/, '');
  const apiKey = String(opts.apiKey || '').trim();
  const publicRoot = opts.publicRoot;
  const origin = opts.origin;
  const version = opts.version || 'static-public-0.3.0';

  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  return {
    async sync() {
      if (!apiKey.startsWith('jbt_')) throw new Error('apiKey must be jbt_…');
      const inventory = collectStaticPublicInventory(publicRoot, origin, {
        stateDir: opts.stateDir,
        indexFile: opts.indexFile,
      });
      await api('/api/v1/agent/heartbeat', {
        method: 'POST',
        body: {
          kind: 'webhook',
          version,
          capabilities: {
            apply: [
              'meta',
              'schema',
              'canonical',
              'sitemap-hint',
              'alt',
              'robots-hint',
              'verify-meta',
              'bing-verify',
              'redirect-hint',
              'indexnow-key',
            ],
            inventory: ['pages', 'media'],
            cms: 'static-spa',
          },
          meta: { publicRoot, origin },
          inventory,
        },
      });
      const pending = await api('/api/v1/agent/pending?limit=20');
      const results = [];
      for (const patch of pending.patches || []) {
        try {
          const detail = await applyStaticPublicPatch(patch, {
            publicRoot,
            origin,
            stateDir: opts.stateDir,
            indexFile: opts.indexFile,
          });
          await api('/api/v1/agent/ack', {
            method: 'POST',
            body: { patchId: patch.id, status: 'applied', detail },
          });
          results.push({ id: patch.id, kind: patch.kind, status: 'applied', detail });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await api('/api/v1/agent/ack', {
            method: 'POST',
            body: { patchId: patch.id, status: 'rejected', error: msg },
          });
          results.push({ id: patch.id, kind: patch.kind, status: 'rejected', error: msg });
        }
      }
      return { ok: true, pending: (pending.patches || []).length, results, inventory };
    },
  };
}
