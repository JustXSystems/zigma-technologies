/** Hidden field name — must stay in sync with HoneypotField component. */
export const HONEYPOT_FIELD = '_hp';

const buckets = new Map<string, number[]>();

export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    const oldest = hits[0] ?? now;
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      const fresh = v.filter((t) => now - t < windowMs);
      if (fresh.length) buckets.set(k, fresh);
      else buckets.delete(k);
    }
  }

  return { ok: true };
}

export type FormGuardResult =
  | { action: 'continue' }
  | { action: 'honeypot' }
  | { action: 'rate_limited'; retryAfterSec: number };

/** Honeypot + per-IP rate limit for public POST endpoints. */
export function guardPublicForm(
  request: Request,
  scope: string,
  honeypot?: unknown,
  opts?: { max?: number; windowMs?: number }
): FormGuardResult {
  if (isHoneypotFilled(honeypot)) return { action: 'honeypot' };

  const ip = getClientIp(request);
  const max = opts?.max ?? 6;
  const windowMs = opts?.windowMs ?? 15 * 60 * 1000;
  const limit = checkRateLimit(`${scope}:${ip}`, max, windowMs);
  if (!limit.ok) return { action: 'rate_limited', retryAfterSec: limit.retryAfterSec };

  return { action: 'continue' };
}
