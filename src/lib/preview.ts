import { createHmac, timingSafeEqual } from 'crypto';

function previewSecret() {
  return process.env.PREVIEW_SECRET || process.env.AUTH_SECRET || 'zigma-preview-dev-secret';
}

export function createPreviewToken(slug: string, ttlSeconds = 60 * 60 * 12) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${slug}:${exp}`;
  const sig = createHmac('sha256', previewSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyPreviewToken(slug: string, token: string | null | undefined) {
  if (!token) return false;
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const [tokenSlug, expStr, sig] = raw.split(':');
    if (!tokenSlug || !expStr || !sig) return false;
    if (tokenSlug !== slug) return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
    const payload = `${tokenSlug}:${expStr}`;
    const expected = createHmac('sha256', previewSecret()).update(payload).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
