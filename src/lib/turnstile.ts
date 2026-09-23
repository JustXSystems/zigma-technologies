/** Cloudflare Turnstile verification (optional). */

export function turnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';
}

export function turnstileSecretKey() {
  return process.env.TURNSTILE_SECRET_KEY?.trim() || '';
}

/**
 * Enforce captcha only when both the public site key and server secret are configured.
 * Secret-only (or site-key-only) misconfig fails open so public forms keep working.
 */
export function isTurnstileEnforced(): boolean {
  return Boolean(turnstileSecretKey() && turnstileSiteKey());
}

/** True in the browser when the Turnstile widget should be shown / a token is expected. */
export function isTurnstileClientEnabled(): boolean {
  return Boolean(turnstileSiteKey());
}

export async function verifyTurnstile(token: string | undefined, request: Request): Promise<boolean> {
  if (!isTurnstileEnforced()) return true;
  if (!token?.trim()) return false;

  try {
    const form = new URLSearchParams();
    form.set('secret', turnstileSecretKey());
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
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      console.warn('[turnstile] siteverify failed', data['error-codes'] || data);
    }
    return Boolean(data.success);
  } catch (err) {
    console.error('[turnstile]', err);
    // Network blip to Cloudflare — do not lock out every enquiry.
    return true;
  }
}
