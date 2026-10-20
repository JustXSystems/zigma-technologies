import { NextResponse } from 'next/server';
import {
  meridianLatestPaths,
  readMeridianArtefactHtml,
  withMeridianFileBase,
  type MeridianEnv,
} from '@/lib/meridian-bridge';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const MERIDIAN_ARTEFACT_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(html|md|json|ics)$/;

export function parseMeridianEnv(raw: string | null | undefined): MeridianEnv {
  return raw === 'preprod' ? 'preprod' : 'prod';
}

function contentType(name: string): string {
  if (name.endsWith('.html')) return 'text/html; charset=utf-8';
  if (name.endsWith('.md')) return 'text/markdown; charset=utf-8';
  if (name.endsWith('.json')) return 'application/json; charset=utf-8';
  if (name.endsWith('.ics')) return 'text/calendar; charset=utf-8';
  return 'application/octet-stream';
}

function missingHtml(name: string, dir: string) {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Missing ${name}</title>
<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.5}
code{background:#f0f3f7;padding:.1rem .35rem;border-radius:4px}</style></head><body>
<h1>Artefact not found</h1>
<p><code>${name}</code> is not on disk yet under <code>${dir}</code>.</p>
<p>Run <strong>Autopilot (heal)</strong> or the matching phase action in Admin → SEO → Command, then reload.</p>
</body></html>`;
  return new NextResponse(body, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Serve one Meridian desk file (HTML gets relative-link rewriting). */
export async function serveMeridianArtefact(env: MeridianEnv, nameRaw: string): Promise<NextResponse> {
  const name = decodeURIComponent(nameRaw || '');
  if (!MERIDIAN_ARTEFACT_NAME.test(name)) {
    return NextResponse.json({ error: 'Invalid artefact name' }, { status: 400 });
  }

  const { dir } = meridianLatestPaths(env);
  const file = path.resolve(dir, name);
  if (!file.startsWith(path.resolve(dir) + path.sep) && file !== path.resolve(dir)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (name.endsWith('.html')) {
    const html = await readMeridianArtefactHtml(file);
    if (!html) return missingHtml(name, dir);
    return new NextResponse(withMeridianFileBase(html, env), {
      headers: { 'Content-Type': contentType(name), 'Cache-Control': 'no-store' },
    });
  }

  try {
    const body = await readFile(/*turbopackIgnore: true*/ file);
    return new NextResponse(body, {
      headers: { 'Content-Type': contentType(name), 'Cache-Control': 'no-store' },
    });
  } catch {
    if (name.endsWith('.md') || name.endsWith('.json') || name.endsWith('.ics')) {
      return missingHtml(name, dir);
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
