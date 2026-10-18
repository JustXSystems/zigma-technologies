#!/usr/bin/env node
/**
 * One-time helper to obtain MERIDIAN_GOOGLE_REFRESH_TOKEN.
 *
 * Prerequisites (Google Cloud Console):
 * 1. Create a project (or use existing).
 * 2. Enable APIs: "Google Search Console API", "Google Analytics Data API".
 * 3. Configure OAuth consent screen (External or Internal).
 * 4. Create OAuth Client ID → type "Desktop app".
 * 5. Copy Client ID + Client Secret.
 *
 * Usage:
 *   set MERIDIAN_GOOGLE_CLIENT_ID=...
 *   set MERIDIAN_GOOGLE_CLIENT_SECRET=...
 *   node packages/meridian/scripts/google-oauth-setup.mjs
 *
 * Scopes requested: Search Console + GA4 read.
 */
import { createServer } from 'node:http';
import { URL } from 'node:url';

const CLIENT_ID = (process.env.MERIDIAN_GOOGLE_CLIENT_ID || '').trim();
const CLIENT_SECRET = (process.env.MERIDIAN_GOOGLE_CLIENT_SECRET || '').trim();
const PORT = Number(process.env.MERIDIAN_OAUTH_PORT || 8765);
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;

// webmasters (full) required for M2 sitemap submit + URL inspect; readonly is not enough.
const SCOPES = [
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(`Set MERIDIAN_GOOGLE_CLIENT_ID and MERIDIAN_GOOGLE_CLIENT_SECRET first.

Google Cloud → APIs & Services → Credentials → Create OAuth client → Desktop app.
Enable: Search Console API + Google Analytics Data API.
`);
  process.exit(1);
}

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\nMeridian Google OAuth setup\n');
console.log('1. Add this Authorized redirect URI to your Desktop OAuth client:');
console.log(`   ${REDIRECT}`);
console.log('\n2. Open this URL in Chrome (company Google account):\n');
console.log(authUrl.toString());
console.log('\n3. Approve access. This script will capture the code and print your refresh token.\n');

const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
    if (u.pathname !== '/callback') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const code = u.searchParams.get('code');
    const err = u.searchParams.get('error');
    if (err) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end(`OAuth error: ${err}`);
      console.error('OAuth error:', err);
      server.close();
      process.exit(1);
    }
    if (!code) {
      res.writeHead(400);
      res.end('Missing code');
      return;
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tokens, null, 2));
      console.error('Token exchange failed:', tokens);
      server.close();
      process.exit(1);
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Meridian connected</h1><p>You can close this tab and return to the terminal.</p>`);

    console.log('\n── Add these to Production / CI secrets (never commit) ──\n');
    console.log(`MERIDIAN_GOOGLE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`MERIDIAN_GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`MERIDIAN_GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || '(none — revoke app access and re-run with prompt=consent)'}`);
    console.log('\nAlso set for GA4:');
    console.log('MERIDIAN_GA4_PROPERTY_ID=<numeric property id from GA4 Admin>');
    console.log('\nOptional:');
    console.log('MERIDIAN_BING_API_KEY=...');
    console.log('MERIDIAN_PSI_API_KEY=...');
    console.log('');

    server.close();
    process.exit(tokens.refresh_token ? 0 : 1);
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end(String(e));
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Listening on ${REDIRECT} …`);
});
