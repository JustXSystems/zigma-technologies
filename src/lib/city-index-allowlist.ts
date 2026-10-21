/**
 * Runtime city × service index allowlist (product plane).
 * Complements the code Set INDEXABLE_CITY_SERVICES — Admin can promote pairs
 * without a code deploy. Quality gate stays human (confirmUniqueProof).
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FILE_NAME = 'indexable-city-services.json';

export type CityIndexAllowlistDoc = {
  updatedAt: string;
  pairs: string[];
  notes?: Record<string, string>;
};

let cache: { at: number; pairs: Set<string> } | null = null;
const CACHE_MS = 5_000;

function siteRoot() {
  return (process.env.MERIDIAN_SITE_ROOT || process.env.SITE_ROOT || process.cwd()).trim() || process.cwd();
}

function allowlistPath() {
  return path.join(siteRoot(), 'storage', 'seo', FILE_NAME);
}

function normalizePair(city: string, service: string) {
  return `${String(city).trim().toLowerCase()}/${String(service).trim().toLowerCase()}`;
}

export async function readCityIndexAllowlist(): Promise<CityIndexAllowlistDoc> {
  try {
    const raw = await readFile(/*turbopackIgnore: true*/ allowlistPath(), 'utf8');
    const parsed = JSON.parse(raw) as CityIndexAllowlistDoc;
    const pairs = Array.isArray(parsed.pairs)
      ? [...new Set(parsed.pairs.map((p) => String(p).trim().toLowerCase()).filter(Boolean))]
      : [];
    return {
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      pairs,
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
    };
  } catch {
    return { updatedAt: '', pairs: [], notes: {} };
  }
}

async function loadRuntimeSet(): Promise<Set<string>> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.pairs;
  const doc = await readCityIndexAllowlist();
  cache = { at: now, pairs: new Set(doc.pairs) };
  return cache.pairs;
}

/** Sync check for runtime allowlist only (code Set stays in location-services). */
export function isInRuntimeCityAllowlist(city: string, service: string): boolean {
  const key = normalizePair(city, service);
  if (cache?.pairs.has(key)) return true;
  void loadRuntimeSet();
  return false;
}

export async function hydrateCityIndexAllowlist(): Promise<Set<string>> {
  return loadRuntimeSet();
}

export async function isInRuntimeCityAllowlistAsync(city: string, service: string): Promise<boolean> {
  const runtime = await loadRuntimeSet();
  return runtime.has(normalizePair(city, service));
}

export async function listRuntimeCityPairs(): Promise<{
  runtime: string[];
  updatedAt: string;
  notes: Record<string, string>;
}> {
  const doc = await readCityIndexAllowlist();
  return {
    runtime: [...doc.pairs].sort(),
    updatedAt: doc.updatedAt,
    notes: doc.notes || {},
  };
}

export async function promoteCityService(
  city: string,
  service: string,
  opts: { note?: string; confirmUniqueProof: boolean }
): Promise<{ ok: true; pair: string; already: boolean } | { ok: false; error: string }> {
  if (!opts.confirmUniqueProof) {
    return {
      ok: false,
      error: 'Quality gate: confirm unique local proof (photos/copy ≥ ~600 words) before indexing.',
    };
  }
  const pair = normalizePair(city, service);
  if (!pair.includes('/') || pair.startsWith('/') || pair.endsWith('/')) {
    return { ok: false, error: 'Invalid city/service pair' };
  }
  const doc = await readCityIndexAllowlist();
  if (doc.pairs.includes(pair)) {
    return { ok: true, pair, already: true };
  }
  doc.pairs.push(pair);
  doc.pairs = [...new Set(doc.pairs)].sort();
  doc.updatedAt = new Date().toISOString();
  if (opts.note?.trim()) {
    doc.notes = { ...(doc.notes || {}), [pair]: opts.note.trim() };
  }
  const dir = path.dirname(allowlistPath());
  await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ allowlistPath(), JSON.stringify(doc, null, 2), 'utf8');
  cache = { at: Date.now(), pairs: new Set(doc.pairs) };
  return { ok: true, pair, already: false };
}

export async function demoteCityService(city: string, service: string): Promise<{ ok: true; pair: string }> {
  const pair = normalizePair(city, service);
  const doc = await readCityIndexAllowlist();
  doc.pairs = doc.pairs.filter((p) => p !== pair);
  if (doc.notes) delete doc.notes[pair];
  doc.updatedAt = new Date().toISOString();
  const dir = path.dirname(allowlistPath());
  await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ allowlistPath(), JSON.stringify(doc, null, 2), 'utf8');
  cache = { at: Date.now(), pairs: new Set(doc.pairs) };
  return { ok: true, pair };
}

/** Ensure file exists so ops can see the desk path on VPS. */
export async function ensureCityIndexAllowlistFile() {
  const p = allowlistPath();
  try {
    await access(/*turbopackIgnore: true*/ p);
  } catch {
    const dir = path.dirname(p);
    await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
    await writeFile(
      /*turbopackIgnore: true*/ p,
      JSON.stringify({ updatedAt: new Date().toISOString(), pairs: [], notes: {} } satisfies CityIndexAllowlistDoc, null, 2),
      'utf8'
    );
  }
}
