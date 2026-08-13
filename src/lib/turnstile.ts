/** Cloudflare Turnstile verification (optional). Fail-open when keys unset. */

export async function verifyTurnstile(token: string | undefined, request: Request): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;
  if (!token?.trim()) return false;

  try {
    const form = new URLSearchParams();
    form.set('secret', secret);
    form.set('response', token.trim());
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '';
    if (ip) form.set('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch (err) {
    console.error('[turnstile]', err);
    return false;
  }
}

export function turnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';
}
