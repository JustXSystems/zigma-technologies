/**
 * Google OAuth2 refresh → access token (shared by GSC + GA4).
 * Env: MERIDIAN_GOOGLE_CLIENT_ID, MERIDIAN_GOOGLE_CLIENT_SECRET, MERIDIAN_GOOGLE_REFRESH_TOKEN
 */

export function googleEnvStatus() {
  const need = ['MERIDIAN_GOOGLE_CLIENT_ID', 'MERIDIAN_GOOGLE_CLIENT_SECRET', 'MERIDIAN_GOOGLE_REFRESH_TOKEN'];
  const missing = need.filter((k) => !(process.env[k] || '').trim());
  return { ok: missing.length === 0, missing };
}

/** @returns {Promise<{ accessToken: string, expiresIn: number }>} */
export async function getGoogleAccessToken() {
  const status = googleEnvStatus();
  if (!status.ok) {
    const err = new Error(`Missing Google OAuth env: ${status.missing.join(', ')}`);
    err.code = 'AUTH_REQUIRED';
    throw err;
  }

  const body = new URLSearchParams({
    client_id: process.env.MERIDIAN_GOOGLE_CLIENT_ID.trim(),
    client_secret: process.env.MERIDIAN_GOOGLE_CLIENT_SECRET.trim(),
    refresh_token: process.env.MERIDIAN_GOOGLE_REFRESH_TOKEN.trim(),
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const err = new Error(data.error_description || data.error || `Token refresh failed (${res.status})`);
    err.code = res.status === 400 || res.status === 401 ? 'AUTH_REQUIRED' : 'ERROR';
    err.details = data;
    throw err;
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in || 3600 };
}

export async function googleFetch(url, { method = 'GET', body, accessToken } = {}) {
  const token = accessToken || (await getGoogleAccessToken()).accessToken;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.error?.message || data?.error_description || `Google API ${res.status}`);
    err.code = res.status === 401 || res.status === 403 ? 'AUTH_REQUIRED' : 'ERROR';
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}
