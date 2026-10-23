/**
 * Lightweight read of Product Agent verify-meta token (no DB / CMS imports).
 * Kept separate so root layout does not pull the full agent apply graph.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const VERIFY_META_PATH = join(process.cwd(), 'storage', 'meridian', 'agent', 'verify-meta.json');

/** Google site-verification token applied by Product Agent (or null). */
export async function readAgentGoogleVerification(): Promise<string | null> {
  try {
    const raw = await readFile(/*turbopackIgnore: true*/ VERIFY_META_PATH, 'utf8');
    const data = JSON.parse(raw) as { googleSiteVerification?: string };
    const token = String(data.googleSiteVerification || '').trim();
    return token || null;
  } catch {
    return null;
  }
}
