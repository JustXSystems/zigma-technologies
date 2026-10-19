import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const FILE = 'ops-cadence.json';

/**
 * Cadence tracker — suppresses repetitive human checklist items until due again.
 */
export async function loadOpsCadence(outDir) {
  try {
    return JSON.parse(await readFile(resolve(outDir, FILE), 'utf8'));
  } catch {
    return {
      schemaVersion: 1,
      completed: {},
      lastShown: {},
      notes: {},
    };
  }
}

export async function saveOpsCadence(outDir, cadence) {
  await mkdir(outDir, { recursive: true });
  const next = { ...cadence, updatedAt: new Date().toISOString() };
  await writeFile(resolve(outDir, FILE), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

/** True if lastShown[id] is older than `days` (or never shown). */
export function isDue(cadence, id, days) {
  const iso = cadence?.lastShown?.[id];
  if (!iso) return true;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return true;
  return Date.now() - t >= days * 86400000;
}

export function markShown(cadence, ids = []) {
  const lastShown = { ...(cadence.lastShown || {}) };
  const now = new Date().toISOString();
  for (const id of ids) lastShown[id] = now;
  return { ...cadence, lastShown };
}

export function markCompleted(cadence, id, note) {
  return {
    ...cadence,
    completed: {
      ...(cadence.completed || {}),
      [id]: { at: new Date().toISOString(), note: note || null },
    },
  };
}
